// Lists which optional 3D assets this deployment actually contains: prop
// models (assets/props/*.glb) and the effects module (assets/fx/effects.js).
// The 3D renderer asks here first so it never requests a missing file (a 404
// would show up as a console error). Missing props fall back to built-in
// primitive shapes. The assets are bundled with this function via
// "includeFiles" in vercel.json.
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const dir = path.join(process.cwd(), 'assets');
  let files = [];
  try {
    files = fs.readdirSync(path.join(dir, 'props')).filter(f => f.endsWith('.glb')).sort();
  } catch (e) {}
  const fx = fs.existsSync(path.join(dir, 'fx', 'effects.js'));
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600');
  res.status(200).json({ files, fx });
};
