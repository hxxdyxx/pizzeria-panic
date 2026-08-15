const { sign } = require('./session.js');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = 'ppp_leaderboard';
const MAX_SCORE = 100000;
const KEEP = 50;

// A run needs to spend real time on screen to earn points -- the fastest
// realistic pace (max combo multiplier, fastest spawn rate late-game) is
// roughly one scored point per ~0.12s. Anything faster than that for the
// claimed score is not a real run. Generous on purpose: this is meant to
// stop trivial spoofed POSTs, not to police legitimate skilled play.
const MIN_MS_PER_POINT = 120;
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000; // a session can't be replayed hours later

function validSession(ts, sig, score) {
  if (!ts || !sig) return false;
  if (sign(ts) !== sig) return false;
  const elapsed = Date.now() - ts;
  if (elapsed < 0 || elapsed > MAX_TOKEN_AGE_MS) return false;
  if (elapsed < score * MIN_MS_PER_POINT) return false;
  return true;
}

async function redis(...args) {
  const path = args.map(a => encodeURIComponent(a)).join('/');
  const r = await fetch(`${KV_URL}/${path}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  if (!r.ok) throw new Error('redis error ' + r.status);
  const data = await r.json();
  return data.result;
}

function parseEntries(raw) {
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const [initials, ts] = String(raw[i]).split('|');
    entries.push({ initials, date: Number(ts) || 0, score: Number(raw[i + 1]) });
  }
  return entries;
}

async function topTen() {
  const raw = await redis('zrange', KEY, '0', '9', 'REV', 'WITHSCORES');
  return parseEntries(raw || []);
}

module.exports = async (req, res) => {
  if (!KV_URL || !KV_TOKEN) {
    res.status(503).json({ error: 'leaderboard storage not configured' });
    return;
  }
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
      res.status(200).json(await topTen());
      return;
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const score = Number(body.score);
      if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        res.status(400).json({ error: 'invalid score' });
        return;
      }
      if (!validSession(Number(body.ts), String(body.sig || ''), score)) {
        res.status(400).json({ error: 'invalid or expired play session' });
        return;
      }
      const initials = String(body.initials || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
      const member = `${initials}|${Date.now()}|${Math.random().toString(36).slice(2, 8)}`;
      await redis('zadd', KEY, String(score), member);
      await redis('zremrangebyrank', KEY, '0', String(-(KEEP + 1)));
      res.status(200).json(await topTen());
      return;
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: 'leaderboard error' });
  }
};
