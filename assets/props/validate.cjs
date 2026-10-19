const fs = require('node:fs');
const path = require('node:path');
const validator = require('gltf-validator');
(async () => {
  const reports = [];
  for (const name of fs.readdirSync(__dirname).filter(n => n.endsWith('.glb')).sort()) {
    const bytes = fs.readFileSync(path.join(__dirname, name));
    const report = await validator.validateBytes(new Uint8Array(bytes), { uri: name });
    reports.push({ file: name, bytes: bytes.length, ...report.issues });
  }
  fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(reports, null, 2) + '\n');
  console.log(reports.map(r => `${r.file}: ${r.bytes} bytes, ${r.numErrors} errors, ${r.numWarnings} warnings`).join('\n'));
  if (reports.length !== 8 || reports.some(r => r.numErrors || r.bytes >= 150000)) process.exitCode = 1;
})();
