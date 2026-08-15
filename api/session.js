// Issues a short-lived, signed play-session token when a run starts.
// The leaderboard endpoint requires this token on submission and checks
// that enough real time has elapsed for the claimed score to be plausible
// -- without it, anyone could POST a top score directly via curl with zero
// gameplay, which defeats the whole point of a competitive leaderboard.
const crypto = require('crypto');

// Reuses the existing KV token as an HMAC secret so this doesn't need a new
// env var. It's already server-only (never sent to the client).
const SECRET = process.env.KV_REST_API_TOKEN || 'ppp-fallback-secret';

function sign(ts) {
  return crypto.createHmac('sha256', SECRET).update(String(ts)).digest('hex');
}

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const ts = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ts, sig: sign(ts) });
};

module.exports.sign = sign;
