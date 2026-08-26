// Optional, opt-in only: links a completed run to a Chef account by email,
// so the Chef can reference someone's Pizzeria Panic stats in chat. Nothing
// about the default anonymous play/leaderboard flow requires this or even
// shows it prominently -- see play.html's "Link this run to your Chef
// account" toggle, collapsed by default.
//
// Same play-session validation as api/leaderboard.js (real elapsed time vs.
// claimed score, signed by session.js), so this can't be used to fabricate
// a stat line without actually playing. Reuses the leaderboard's own KV
// instance -- this is a small side record, not a second datastore.
const { sign } = require('./session.js');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX_SCORE = 100000;
const MIN_MS_PER_POINT = 120;
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

module.exports = async (req, res) => {
  if (!KV_URL || !KV_TOKEN) {
    res.status(503).json({ error: 'storage not configured' });
    return;
  }

  // GET is server-to-server only: the Chef pulling a linked stat back out,
  // gated by a shared secret (never exposed to the browser).
  if (req.method === 'GET') {
    const expectedKey = process.env.PPP_BRIDGE_KEY;
    if (!expectedKey || req.headers['x-bridge-key'] !== expectedKey) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'valid email required' });
      return;
    }
    try {
      const raw = await redis('get', `ppp_chef_link:${email}`);
      res.status(200).json({ ok: true, link: raw ? JSON.parse(raw) : null });
    } catch (e) {
      res.status(500).json({ error: 'lookup failed' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const email = String(body.email || '').trim().toLowerCase();
      const score = Number(body.score);
      if (!EMAIL_RE.test(email)) {
        res.status(400).json({ error: 'valid email required' });
        return;
      }
      if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        res.status(400).json({ error: 'invalid score' });
        return;
      }
      if (!validSession(Number(body.ts), String(body.sig || ''), score)) {
        res.status(400).json({ error: 'invalid or expired play session' });
        return;
      }
      const record = { score, linkedAt: new Date().toISOString() };
      await redis('set', `ppp_chef_link:${email}`, JSON.stringify(record));
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'link failed' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'method not allowed' });
};
