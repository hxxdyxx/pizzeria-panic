const { sign } = require('./session.js');

// Anonymous run stats, so difficulty tuning can use real runs instead of guesses.
// POST: one record per play session (the same signed token the leaderboard uses), no
// initials or ids. GET: a summary over the last ?days=N (default 7) of stored runs.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = 'ppp_runs';
const KEEP = 20000;
const MAX_TOKEN_AGE_MS = 3 * 60 * 60 * 1000;

const CAUSES = ['lives', 'ceiling', 'quit'];
const KILLERS = ['drop', 'pepper', 'pineapple', 'brick', 'none'];
const CONTROLS = ['touch', 'tilt', 'other'];

async function redis(...args) {
  const path = args.map(a => encodeURIComponent(a)).join('/');
  const r = await fetch(`${KV_URL}/${path}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  if (!r.ok) throw new Error('redis error ' + r.status);
  return (await r.json()).result;
}

const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const pick = (v, list) => (list.includes(v) ? v : list[list.length - 1]);

function clean(b) {
  return {
    t: Date.now(),
    score: int(b.score, 100000),
    secs: int(b.secs, 7200),
    cause: pick(b.cause, CAUSES),
    killer: pick(b.killer, KILLERS),
    progress: int(b.progress, 100000),
    level: int(b.level, 20),
    combo: int(b.maxCombo, 10000),
    hits: int(b.hits, 10000),
    drops: int(b.drops, 10000),
    cont: b.cont ? 1 : 0,
    ctl: pick(b.ctl, CONTROLS),
    r3d: b.r3d ? 1 : 0,
    n: int(b.n, 100000)
  };
}

const quant = (arr, q) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const count = (runs, f) => runs.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});

function summarize(runs) {
  const secs = runs.map(r => r.secs), scores = runs.map(r => r.score);
  const bucket = s => (s < 30 ? 'a <30s' : s < 60 ? 'b 30-60s' : s < 120 ? 'c 1-2m' : s < 240 ? 'd 2-4m' : 'e 4m+');
  const byRunNumber = {};
  [['first run', r => r.n <= 1], ['runs 2-5', r => r.n >= 2 && r.n <= 5], ['runs 6+', r => r.n >= 6]].forEach(([k, f]) => {
    const g = runs.filter(f);
    byRunNumber[k] = { runs: g.length, medianSecs: quant(g.map(r => r.secs), 0.5), medianScore: quant(g.map(r => r.score), 0.5) };
  });
  return {
    runs: runs.length,
    score: { median: quant(scores, 0.5), p90: quant(scores, 0.9), max: Math.max(0, ...scores) },
    secs: { median: quant(secs, 0.5), p90: quant(secs, 0.9) },
    length: count(runs, r => bucket(r.secs)),
    cause: count(runs, r => r.cause),
    lastLifeLostTo: count(runs.filter(r => r.cause === 'lives'), r => r.killer),
    shiftReached: count(runs, r => r.level),
    continueRate: runs.length ? +(runs.filter(r => r.cont).length / runs.length).toFixed(3) : 0,
    controls: count(runs, r => r.ctl),
    renderer3d: runs.length ? +(runs.filter(r => r.r3d).length / runs.length).toFixed(3) : 0,
    byRunNumber
  };
}

module.exports = async (req, res) => {
  if (!KV_URL || !KV_TOKEN) {
    res.status(503).json({ error: 'storage not configured' });
    return;
  }
  try {
    if (req.method === 'POST') {
      let body = req.body || {};
      if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
      const ts = Number(body.ts);
      const age = Date.now() - ts;
      if (!ts || sign(ts) !== String(body.sig || '') || age < 0 || age > MAX_TOKEN_AGE_MS) {
        res.status(400).json({ error: 'invalid session' });
        return;
      }
      // one record per play session
      const fresh = await redis('set', `ppp_run_seen:${ts}`, '1', 'NX', 'EX', '10800');
      if (fresh) {
        await redis('lpush', KEY, JSON.stringify(clean(body)));
        await redis('ltrim', KEY, '0', String(KEEP - 1));
      }
      res.status(204).end();
      return;
    }
    if (req.method === 'GET') {
      const days = Math.max(1, Math.min(90, Number(req.query && req.query.days) || 7));
      const since = Date.now() - days * 86400000;
      const raw = (await redis('lrange', KEY, '0', '-1')) || [];
      const runs = raw.map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(r => r && r.t >= since);
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(200).json({ days, ...summarize(runs) });
      return;
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: 'run stats error' });
  }
};
