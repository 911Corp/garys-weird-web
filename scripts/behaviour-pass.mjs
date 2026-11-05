// Loads each page as a phone and watches what it does. Facts only: the verdict is computed in build-catalog.py.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [,, catalogPath, out] = process.argv;
const entries = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).destinations.filter((d) => d.url.startsWith('https:') && d.verification?.method !== 'owner-browser');
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const res = []; let n = 0;
async function worker() {
  while (n < entries.length) {
    const d = entries[n++];
    const ctx = await b.newContext({ ...devices['Pixel 7'], permissions: [], acceptDownloads: true });
    const p = await ctx.newPage();
    const r = { id: d.id, url: d.url, popups: 0, dialogs: 0, downloads: 0, hosts: {} };
    p.on('popup', () => { r.popups++; }); p.on('dialog', (x) => { r.dialogs++; x.dismiss().catch(() => {}); }); p.on('download', () => { r.downloads++; });
    p.on('request', (q) => { try { const h = new URL(q.url()).hostname; r.hosts[h] = (r.hosts[h] || 0) + 1; } catch {} });
    try {
      const resp = await p.goto(d.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(5000);
      Object.assign(r, await p.evaluate(() => ({ text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 240), len: (document.body?.innerText || '').length,
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, canvas: document.querySelectorAll('canvas').length })));
      r.code = resp?.status(); r.final = p.url(); r.title = await p.title();
    } catch (e) { r.error = String(e).slice(0, 120); }
    r.hosts = Object.keys(r.hosts);
    res.push(r); await ctx.close().catch(() => {});
    if (res.length % 20 === 0) fs.writeFileSync(out, JSON.stringify({ checked_at: '2026-11-04', method: 'chromium as Pixel 7', results: res }, null, 0));
  }
}
await Promise.all(Array.from({ length: 7 }, worker));
fs.writeFileSync(out, JSON.stringify({ checked_at: '2026-11-04', method: 'chromium as Pixel 7', results: res }, null, 0));
await b.close(); console.log('done', res.length);
