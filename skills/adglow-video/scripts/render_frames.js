/**
 * render_frames.js — deterministic frame capture for an HTML "reel".
 *
 * The HTML must expose:
 *    window.seek(t)   // set the DOM to its exact visual state at time t (seconds)
 *    window.TOTAL     // total duration in seconds
 * and must NOT rely on CSS transitions / timers (every visual is a pure fn of t).
 *
 * Usage:
 *    node render_frames.js <reel.html> <outDir> [fps]
 * Env:
 *    PUPPETEER_EXECUTABLE  path to a Chrome/Chromium binary (defaults to macOS Chrome)
 *
 * Resolves puppeteer-core from node_modules or the npx cache (~/.npm/_npx/* ).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

function resolvePuppeteer() {
  try { return require('puppeteer'); } catch (e) {}
  try { return require('puppeteer-core'); } catch (e) {}
  const npx = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npx)) {
    for (const d of fs.readdirSync(npx)) {
      const p = path.join(npx, d, 'node_modules', 'puppeteer-core');
      if (fs.existsSync(p)) return require(p);
    }
  }
  throw new Error('puppeteer-core not found. Run: npx puppeteer-core (once) or npm i puppeteer-core');
}

const CHROME = process.env.PUPPETEER_EXECUTABLE ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const reel = path.resolve(process.argv[2]);
  const outDir = path.resolve(process.argv[3]);
  const fps = parseInt(process.argv[4] || '30', 10);
  const puppeteer = resolvePuppeteer();

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('file://' + reel, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 300));

  const TOTAL = await page.evaluate(() => window.TOTAL);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const N = Math.round(TOTAL * fps);
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.seek(t), f / fps);
    await page.screenshot({ path: path.join(outDir, `f${String(f).padStart(5, '0')}.png`) });
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  console.log('done', N, 'frames ->', outDir);
  await browser.close();
})();
