// Second verification pass: open every catalog page in Chromium, keep rendered text and a screenshot.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, catalogPath, out, shots] = process.argv;
const entries = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).destinations.filter((d) => d.url.startsWith('https:'));
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const res = []; let n = 0;
async function worker() {
  while (n < entries.length) {
    const d = entries[n++];
    const ctx = await b.newContext({ viewport: { width: 960, height: 600 } });
    const p = await ctx.newPage();
    const r = { id: d.id, url: d.url };
    try {
      const resp = await p.goto(d.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(Number(process.env.WAIT||6000));
      Object.assign(r, { code: resp?.status(), final: p.url(), title: await p.title(),
        text: (await p.evaluate(() => document.body?.innerText || '')).replace(/\s+/g, ' ').slice(0, 320) });
      await p.screenshot({ path: `${shots}/${d.file}.jpg`, type: 'jpeg', quality: 45, timeout: 15000 });
    } catch (e) { r.error = String(e).slice(0, 120); }
    res.push(r); await ctx.close();
    fs.writeFileSync(out, JSON.stringify({ checked_at: new Date().toISOString(), method: 'chromium render', results: res }, null, 1));
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
await b.close(); console.log('done', res.length);
