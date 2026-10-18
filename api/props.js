// Lists which optional 3D prop models (assets/props/*.glb) this deployment
// actually contains. The 3D renderer asks here first so it never requests a
// missing file (a 404 would show up as a console error). Props that are not
// listed fall back to built-in primitive shapes. The .glb files are bundled
// with this function via "includeFiles" in vercel.json.
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(path.join(process.cwd(), 'assets', 'props')).filter(f => f.endsWith('.glb')).sort();
  } catch (e) {}
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600');
  res.status(200).json({ files });
};
