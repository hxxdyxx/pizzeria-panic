const crypto = require('crypto');
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX_BYTES = 48 * 1024;
const CODE_RE = /^[A-F0-9]{32}$/;
async function redis(...args) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error('storage unavailable');
  return (await r.json()).result;
}
function key(code) {
  return 'ppp_player:' + crypto.createHash('sha256').update(code).digest('hex');
}
function cleanSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid save');
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (!/^ppp_[a-zA-Z0-9_-]{1,64}$/.test(k) || k === 'ppp_cloud_code') continue;
    const raw = JSON.stringify(v);
    if (raw.length > 16000) continue;
    out[k] = v;
  }
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES) throw new Error('save is too large');
  return out;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!KV_URL || !KV_TOKEN) return res.status(503).json({ error: 'cloud saves unavailable' });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let code = String(body.code || '').toUpperCase().replace(/[^A-F0-9]/g, '');
    if (body.action === 'create') {
      code = crypto.randomBytes(16).toString('hex').toUpperCase();
      const saveKey = key(code);
      await redis('set', saveKey, JSON.stringify({ data: {}, updatedAt: Date.now() }), 'NX');
      return res.status(200).json({ code, data: {}, updatedAt: Date.now() });
    }
    if (!CODE_RE.test(code)) return res.status(400).json({ error: 'enter a valid recovery code' });
    const saveKey = key(code);
    if (body.action === 'load') {
      const raw = await redis('get', saveKey);
      if (!raw) return res.status(404).json({ error: 'recovery code not found' });
      return res.status(200).json(JSON.parse(raw));
    }
    if (body.action === 'save') {
      const data = cleanSnapshot(body.data);
      const now = Date.now();
      const baseUpdatedAt = Number(body.baseUpdatedAt) || 0;
      const script = "local raw=redis.call('GET',KEYS[1]); if not raw then return '-1' end; local rec=cjson.decode(raw); local current=tonumber(rec.updatedAt or 0) or 0; local base=tonumber(ARGV[3]) or 0; if current>base then return cjson.encode({conflict=true,record=rec}) end; rec.data=cjson.decode(ARGV[1]); rec.updatedAt=tonumber(ARGV[2]); redis.call('SET',KEYS[1],cjson.encode(rec)); return cjson.encode({conflict=false,record=rec})";
      const rawResult = await redis('eval', script, '1', saveKey, JSON.stringify(data), String(now), String(baseUpdatedAt));
      if (rawResult === '-1' || rawResult === -1) return res.status(404).json({ error: 'recovery code not found' });
      const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      if (result.conflict) return res.status(409).json({ error: 'cloud save changed on another device', data: result.record.data, updatedAt: result.record.updatedAt });
      return res.status(200).json({ ok: true, updatedAt: result.record.updatedAt });
    }
    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(400).json({ error: e.message === 'save is too large' ? e.message : 'could not process cloud save' });
  }
};
