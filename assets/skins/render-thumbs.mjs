// Renders the Skins-shop previews from the real game: each Chef skin with the pan hidden (so the
// outfit shows) and each pan skin held by Classic Pietro. Serves this checkout at https://pp.test.
// Usage (macOS, Chrome installed): npm i puppeteer-core && node assets/skins/render-thumbs.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'ppp-skins-'));
const DEST = path.resolve(new URL('.', import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const props = () => ({ files: fs.readdirSync(path.join(ROOT, 'assets/props')).filter(f => f.endsWith('.glb')).sort(), fx: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage();
await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.evaluateOnNewDocument(() => { localStorage.setItem('ppp_tutorial_seen', '1'); });
await page.setRequestInterception(true);
page.on('request', r => {
  const u = new URL(r.url()); if (u.host !== 'pp.test') return r.continue();
  let p = u.pathname;
  if (p === '/api/props') return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(props()) });
  if (p === '/api/leaderboard') return r.respond({ status: 200, contentType: 'application/json', body: '[]' });
  if (p.startsWith('/api/')) return r.respond({ status: 200, contentType: 'application/json', body: '{}' });
  if (p === '/play') p = '/play.html';
  const f = path.join(ROOT, p); if (!fs.existsSync(f)) return r.respond({ status: 404, body: '' });
  let body = fs.readFileSync(f);
  if (p === '/js/render3d.js' && true) body = body.toString().replace('panGroup.position.copy(_pan);', 'panGroup.position.copy(_pan); panGroup.visible = !window.__hidePan;').replace('if (lowSecs >= 3 && tier > 0)', 'if (false)');
  if (p === '/play.html') body = body.toString()
    .replace("if(state==='playing')update(dt);", "if(state==='playing'&&!window.__manual)update(dt);")
    .replace('function loop(t){', 'window.__t={skins:()=>SKIN_CATALOG.map(s=>s.id),pans:()=>PAN_CATALOG.map(s=>s.id),set(s,p){activeSkin=s;activePan=p;},step(n){for(let i=0;i<n;i++)update(1/60);}};function loop(t){');
  r.respond({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body });
});
await page.goto('https://pp.test/play', { waitUntil: 'networkidle2' });
for (let t = 0; t < 45; t++) { if (await page.evaluate(() => PPP3D.active && PPP3D.props.includes('pan'))) break; await sleep(1000); }
await page.click('#startBtn'); await sleep(500);
await page.evaluate(() => { window.__manual = true;  document.getElementById('goalsCard').classList.add('hidden'); });
const skins = await page.evaluate(() => __t.skins()), pans = await page.evaluate(() => __t.pans());
const combos = [...skins.map(s => ['skin-' + s, s, 'classic', true]), ...pans.map(p => ['pan-' + p, 'classic', p, false])];
const clip = { x: 115, y: 605, width: 160, height: 170 };
for (const [name, s, p, hide] of combos) {
  await page.evaluate((s, p, hide) => { __t.set(s, p); window.__hidePan = hide; }, s, p, hide);
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
}
// 306x325 JPEGs (macOS sips); the shop shows them at 96x102 CSS px.
for (const [name] of combos) execFileSync('sips', ['-Z', '306', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', path.join(OUT, name + '.png'), '--out', path.join(DEST, name + '.jpg')]);
console.log(JSON.stringify({ wrote: combos.map(c => c[0] + '.jpg'), errors }));
await b.close();
