// Run from the project root: node tests/e2e.mjs   (needs playwright and @axe-core/playwright installed, see PW_ROOT)
import { createRequire } from 'node:module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const req = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT + '/' : process.cwd() + '/');
const { chromium, devices } = req('playwright'); const { default: Axe } = await import(req.resolve('@axe-core/playwright'));
const root = process.cwd(); const type = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': type[path.extname(f)] || 'text/plain' }); r.end(b); } }); }).listen(8124);
const B = 'http://localhost:8124/'; let fails = 0, passed = 0;
const ok = (c, m) => { if (c) passed++; else { fails++; console.log('FAIL', m); } };
const b = await chromium.launch();
const open = async (opt = { viewport: { width: 1280, height: 800 } }, motion = 'reduce') => {
  const c = await b.newContext({ ...opt, reducedMotion: motion }), p = await c.newPage(), errs = [], ext = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__o = []; window.open = (u, t, f) => { window.__o.push([u, t, f]); return null; }; });
  p.on('request', (r) => { if (!r.url().startsWith(B) && !r.url().startsWith('data:')) ext.push(r.url()); });
  await p.goto(B); return { p, errs, ext };
};
const cycle = async (p) => { await p.click('#warp'); await p.click('#reveal'); };
const cmd = (p, c) => p.evaluate((c) => run(c), c);

for (const [name, opt] of [['desktop', undefined], ['mobile', { ...devices['Pixel 7'] }]]) {
  const { p, errs, ext } = await open(opt);
  // home is the one action
  ok((await p.textContent('#warp-word')) === '[REDACTED]', name + ' button says [REDACTED]');
  ok((await p.locator('#warp').isVisible()) && (await p.locator('#daily-go').isVisible()), name + ' home actions');
  ok((await p.locator('#warp').boundingBox()).y + 40 < (await p.viewportSize()).height, name + ' main button above the fold');
  ok((await p.evaluate(() => document.querySelector('#random').innerText.split(/\s+/).length)) < 30, name + ' home stays short');
  await p.click('#warp');
  const o = await p.evaluate(() => window.__o);
  ok(o.length === 1 && o[0][2] === 'noopener,noreferrer' && o[0][0].startsWith('http'), name + ' opens protected tab');
  ok((await p.textContent('#status')) === 'Signal transmitted', name + ' transmitted');
  ok(!(await p.textContent('#random')).includes(new URL(o[0][0]).hostname), name + ' destination stays hidden');
  await p.click('#reveal');
  ok((await p.textContent('#report')).includes('GWW-') && (await p.textContent('#report')).includes('Link checked') && (await p.textContent('#r-note')).length > 5, name + ' one click reveals the discovery report');
  ok((await p.textContent('#count')) === '001', name + ' discovery logged');
  const favName = await p.textContent('#status');
  await p.click('#save'); ok((await p.textContent('#save')).includes('Favorited') && (await p.getAttribute('#save', 'aria-pressed')) === 'true', name + ' favorite');
  await p.reload();
  await p.click('[data-page=archive]');
  await p.click('[data-view=saved]'); ok((await p.locator('#file-list .row').count()) === 1, name + ' favorite survives reload');
  ok((await p.textContent('#file-list')).includes(favName.trim()) && (await p.locator('#file-list .row a').count()) === 1, name + ' favorite listed with its link');
  await p.click('#file-list .fav'); ok((await p.textContent('#count-saved')) === '0' && (await p.textContent('#file-list')).includes('No favorites yet'), name + ' unfavorite from archive');
  await p.click('[data-view=found]'); await p.click('#file-list .fav');
  ok((await p.textContent('#count-saved')) === '1' && (await p.getAttribute('#file-list .fav', 'aria-pressed')) === 'true', name + ' refavorite from archive');
  await p.click('[data-view=saved]');
  await p.click('[data-view=found]'); ok((await p.locator('#file-list .row').count()) === 1, name + ' discovered list');
  ok((await p.locator('.nav button').last().getAttribute('data-page')) === 'archive', name + ' archive is the last tab');
  await p.click('[data-view=all]');
  ok((await p.locator('#unlock').isVisible()) && (await p.locator('#file-list .row').count()) === 0 && await p.locator('#file-search').isHidden(), name + ' full archive locked');
  await p.fill('#unlock-input', 'admin1234'); await p.click('#unlock-go');
  ok((await p.textContent('#unlock-msg')).includes('numbers') && await p.locator('#unlock').isVisible(), name + ' wrong password refused with a hint');
  ok(!(await p.textContent('#unlock')).toLowerCase().includes('password of'), name + ' no hint shown before a try');
  ok((await p.textContent('#unlock')).includes('Admin access required') && (await p.getAttribute('#unlock-input', 'placeholder')) === 'Enter admin password', name + ' admin lock wording');
  await p.fill('#unlock-input', 'Admin'); await p.press('#unlock-input', 'Enter');
  ok((await p.textContent('#unlock-msg')).includes('lowercase') && await p.locator('#unlock').isVisible(), name + ' capitals refused');
  await p.fill('#unlock-input', 'admin'); await p.press('#unlock-input', 'Enter');
  ok(await p.locator('#unlock').isHidden(), name + ' lowercase admin unlocks');
  await p.reload(); await p.click('[data-page=archive]'); await p.click('[data-view=all]');
  ok((await p.locator('#file-list .row').count()) === 40, name + ' unlock persists and all files paged');
  await p.click('#more-files'); ok((await p.locator('#file-list .row').count()) === 80, name + ' show more');
  await p.fill('#file-search', 'emulator'); await p.waitForTimeout(60); ok((await p.locator('#file-list .row').count()) > 0, name + ' file search');
  await p.fill('#file-search', 'zzzqqq'); await p.waitForTimeout(60); ok((await p.textContent('#file-list')).includes('NO FILES'), name + ' empty search');
  await p.fill('#file-search', '');
  ok((await p.locator('text=quarantin').count()) === 0, name + ' no quarantine in public');
  await p.click('[data-page=random]');
  // no repeat
  await p.evaluate(() => localStorage.clear()); await p.reload();
  for (let i = 0; i < 60; i++) await cycle(p);
  const urls = await p.evaluate(() => window.__o.map((x) => x[0]));
  ok(new Set(urls).size === urls.length, name + ' no repeat in 60 draws, got ' + new Set(urls).size);
  // blackbox
  ok((await p.evaluate(() => { run('blackbox'); return mode.blackbox; })), name + ' blackbox unlocked');
  await p.click('#warp');
  ok(await p.locator('#reveal').isHidden(), name + ' blackbox needs logging first');
  await p.click('#confirm');
  ok((await p.textContent('#reveal')) === 'Decrypt file' && (await p.textContent('#status')) === 'Discovery recorded', name + ' blackbox sealed');
  await p.click('#reveal'); ok((await p.textContent('#report')).includes('GWW-'), name + ' blackbox decrypts');
  await cmd(p, 'blackbox');
  // discard, follow, daily
  await p.click('#warp');
  const d = await p.evaluate(() => window.__o.at(-1)[0]);
  await p.click('#skip');
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('gww-random-v2-passport')).discarded.length)) === 1, name + ' discard stored');
  for (let i = 0; i < 25; i++) await cycle(p);
  ok(!(await p.evaluate(() => window.__o.slice(-25).map((x) => x[0]))).includes(d), name + ' discarded not redrawn');
  const before = await p.evaluate(() => window.__o.length);
  ok((await p.locator('#deeper').count()) === 0, name + ' no follow button on screen');
  await p.evaluate(() => run('rabbit')); ok((await p.evaluate(() => window.__o.length)) === before + 1, name + ' rabbit command still follows a connection');
  await p.click('#reveal');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#daily-go'); const d1 = await p.evaluate(() => window.__o.at(-1)[0]);
  await p.reload(); await p.click('#daily-go');
  ok((await p.evaluate(() => window.__o.at(-1)[0])) === d1, name + ' daily stable');
  await p.reload();
  // preview first
  await cmd(p, 'preview'); const b2 = await p.evaluate(() => window.__o.length); await p.click('#warp');
  ok((await p.evaluate(() => window.__o.length)) === b2 && (await p.textContent('#report')).includes('GWW-'), name + ' preview does not open');
  await p.click('#reopen'); ok((await p.evaluate(() => window.__o.length)) === b2 + 1 && (await p.textContent('#count')) !== '000', name + ' preview opens and logs on demand');
  await cmd(p, 'preview');
  // filters
  await p.click('#freq [data-cat=SCIENCE]'); await cmd(p, 'chaos on');
  for (let i = 0; i < 5; i++) { await p.click('#warp'); await p.click('#reveal'); ok((await p.textContent('#r-field')).includes('Science'), name + ' filter holds'); }
  await p.click('#freq [data-cat=SCIENCE]'); await cmd(p, 'chaos off');
  ok((await p.getAttribute('#freq [data-cat=SCIENCE]', 'aria-pressed')) === 'false', name + ' frequency chip toggles off');
  // terminal
  await p.click('[data-page=terminal]');
  const term = async (c) => { await p.fill('#command-input', c); await p.press('#command-input', 'Enter'); return p.textContent('#terminal-output'); };
  ok((await term('status')).includes('discoveries'), name + ' terminal');
  ok((await term('help')).includes('rabbit'), name + ' help');
  ok((await term('search emulator')).includes('files'), name + ' term search');
  ok((await term('filter nope')).includes('unknown category'), name + ' term bad filter');
  ok((await term('filter retro')).includes('RETRO'), name + ' term filter');
  ok((await p.getAttribute('#freq [data-cat=RETRO]', 'aria-pressed')) === 'true', name + ' frequency chip follows filter'); await term('filter all');
  ok((await term('categories')).includes('MYSTERY'), name + ' term categories');
  ok((await term('nonsense')).includes('unknown command'), name + ' term unknown');
  await p.evaluate(() => { state.unlocked = false; state.history = []; save(); });
  ok((await term('search emulator')).startsWith('0 files'), name + ' locked search stays within discoveries');
  ok((await term('login 123456')).includes('favourite'), name + ' term login refuses');
  ok((await term('login admin')).includes('granted') && (await term('search emulator')).match(/^[1-9]/), name + ' term login unlocks');
  // reset needs two clicks
  await p.click('[data-page=profile]'); await p.click('#reset'); ok((await p.textContent('#reset')) === 'Confirm reset', name + ' reset arms');
  await p.click('#reset'); ok((await p.textContent('#count')) === '000', name + ' reset clears');
  ok((await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, name + ' no horizontal scroll');
  ok((await p.locator('svg,img,canvas').count()) === 0, name + ' no drawing');
  ok(!/not even gary|nobody gets|real links\./i.test(await p.evaluate(() => document.body.innerText)), name + ' no taglines');
  ok(await p.evaluate(() => document.fonts.check('16px Geist')), name + ' Geist loaded locally');
  ok(errs.length === 0, name + ' no error ' + errs[0]); ok(ext.length === 0, name + ' no external request ' + ext[0]);
  for (const page of ['random', 'archive', 'terminal', 'profile']) {
    await p.click(`[data-page=${page}]`); await p.waitForTimeout(150);
    const v = (await new Axe({ page: p }).analyze()).violations;
    if (v.length) console.log('A11Y', name, page, v.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0].target}`).join(' | '));
    ok(v.length === 0, name + ' a11y ' + page);
  }
  await p.context().close();
}
{ // the name surfaces from noise, and the button never shows a destination
  const { p, errs } = await open(undefined, 'no-preference');
  await p.click('#warp'); await p.click('#reveal');
  const mid = await p.textContent('#status'); await p.waitForTimeout(900);
  const end = await p.textContent('#status');
  ok(/[█▓▒░]/.test(mid) && !/[█▓▒░]/.test(end) && (await p.textContent('#r-note')).length > 0, 'site name decrypts');
  ok((await p.getAttribute('#decoded', 'rel')).includes('noopener') && (await p.getAttribute('#status', 'aria-busy')) === null, 'link protected, status settled');
  await p.hover('#warp'); await p.waitForTimeout(800);
  ok((await p.textContent('#warp-word')) === '[REDACTED]', 'button settles after hover');
  await p.click('#warp'); await p.click('#skip');
  ok((await p.textContent('#status')) === 'Destination classified', 'leaving mid decode is clean');
  ok(errs.length === 0, 'no error during decoding ' + errs[0]);
  await p.context().close();
}
{ // the file also works opened straight from disk, CSP included
  const c = await b.newContext(); const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + root + '/index.html');
  ok((await p.locator('#freq button').count()) > 3 && errs.length === 0, 'works from file:// ' + errs[0]);
  await c.close();
}
{ // sharing: the link carries the file, and a friend opens it blind
  const { p, errs } = await open();
  await p.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await p.click('#warp'); const first = await p.evaluate(() => window.__o[0][0]); await p.click('#reveal');
  ok(await p.locator('#share').isVisible(), 'share offered after reveal');
  await p.click('#share');
  const file = await p.textContent('#r-file');
  const x = decodeURIComponent(await p.getAttribute('#sh-x', 'href'));
  ok(x.startsWith('https://x.com/intent/post?') && x.includes('#s=' + file) && !x.includes(new URL(first).hostname), 'share link names the file, not the site');
  for (const id of ['sh-bsky', 'sh-reddit', 'sh-wa']) ok((await p.getAttribute('#' + id, 'rel')).includes('noopener') && decodeURIComponent(await p.getAttribute('#' + id, 'href')).includes('#s=' + file), id + ' link');
  const q = await p.context().newPage(); await q.addInitScript(() => { window.__o = []; window.open = (u, t, f) => { window.__o.push([u, t, f]); return null; }; });
  await q.goto(B + '#s=' + file);
  ok((await q.textContent('#status')) === 'Incoming signal' && !(await q.textContent('#random')).includes(new URL(first).hostname), 'friend sees an incoming sealed signal');
  ok((await q.evaluate(() => location.hash)) === '', 'hash cleared');
  await q.click('#warp'); ok((await q.evaluate(() => window.__o[0][0])) === first, 'friend opens the same destination');
  await q.click('#reveal'); ok((await q.textContent('#r-file')) === file, 'friend gets the same report');
  await q.goto('about:blank'); await q.goto(B + '#s=GWW-9999'); ok((await q.textContent('#status')) === 'Destination classified', 'unknown file ignored');
  const s2 = await p.context().newPage(); await s2.addInitScript(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d; }; window.open = () => null; });
  await s2.goto(B); await s2.click('#warp'); await s2.click('#reveal'); await s2.click('#share');
  ok((await s2.evaluate(() => window.__shared?.url || '')).includes('#s=GWW-') && await s2.locator('#share-panel').isHidden(), 'native share sheet used when available');
  ok(errs.length === 0, 'no error while sharing ' + errs[0]);
  await p.context().close();
}
{ // sharing from a file on disk still links to the public site
  const c = await b.newContext(); const p = await c.newPage(); await p.addInitScript(() => { window.open = () => null; });
  await p.goto('file://' + root + '/index.html'); await p.click('#warp'); await p.click('#reveal'); await p.click('#share');
  ok((await p.getAttribute('#sh-x', 'href')).includes(encodeURIComponent('https://911corp.github.io/garys-weird-web/#s=GWW-')), 'share links point to the public address');
  await c.close();
}
{ // reporting a site that is down
  const { p, errs } = await open();
  await p.click('#warp'); const u = await p.evaluate(() => window.__o[0][0]); await p.click('#reveal');
  ok((await p.textContent('#report-down')).includes('Report it'), 'report link offered');
  await p.click('#report-down');
  ok((await p.isDisabled('#report-down')) && (await p.textContent('#note')).includes('will not be drawn again'), 'report confirmed');
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('gww-random-v2-passport')).reported);
  ok(st.length === 1 && st[0].url === u, 'report stored in the passport');
  for (let i = 0; i < 40; i++) await cycle(p);
  ok(!(await p.evaluate(() => window.__o.slice(1).map((x) => x[0]))).includes(u), 'reported site not drawn again');
  ok((await p.evaluate(() => window.__o.length)) === 41, 'no mail window without a report address');
  await p.click('[data-page=terminal]'); await p.fill('#command-input', 'reports'); await p.press('#command-input', 'Enter');
  ok((await p.textContent('#terminal-output')).includes(u), 'terminal lists reports');
  ok(errs.length === 0, 'no error while reporting ' + errs[0]);
  await p.context().close();
}
{ // phones skip files marked unsuitable
  const { p } = await open({ ...devices['Pixel 7'] });
  const bad = await p.evaluate(() => window.GWW_CATALOG.filter((x) => x.mobile === false).map((x) => x.url));
  for (let i = 0; i < 30; i++) await cycle(p);
  ok(!(await p.evaluate(() => window.__o.map((x) => x[0]))).some((u) => bad.includes(u)), 'phone skips non-mobile files');
  await p.context().close();
}
{ // randomness
  const { p } = await open();
  const r = await p.evaluate(`(()=>{
    const n={};for(let i=0;i<40000;i++){const x=pick();n[x.id]=(n[x.id]||0)+1}
    const by={};for(const x of drawable())(by[x.category]||=[]).push(n[x.id]||0);
    const avg=Object.values(by).map(a=>a.reduce((s,v)=>s+v,0)/a.length);
    const seq=[];for(let i=0;i<300;i++){const x=pick();seq.push(x);current=x;remember(x);state.seen.push(x.id)}
    let c=0,f=0;for(let i=1;i<seq.length;i++){if(seq[i].category===seq[i-1].category)c++;if(seq.slice(Math.max(0,i-14),i).some(y=>family(y)===family(seq[i])))f++}
    return {reach:Object.keys(n).length,total:drawable().length,spread:Math.max(...avg)/Math.min(...avg),c,f}})()`);
  const notes = await p.evaluate(() => ({ same: catalog.every((x) => garyNote(x) === garyNote(x)), kinds: new Set(catalog.map(garyNote)).size }));
  ok(notes.same && notes.kinds >= 30, 'gary notes are stable per site and varied ' + notes.kinds);
  const fx = await p.evaluate(() => ({ gh: family({ url: 'https://a.github.io/x' }) !== family({ url: 'https://b.github.io/y' }), toys: family({ url: 'https://paint.toys/' }) === family({ url: 'https://optical.toys/' }), uk: family({ url: 'https://www.bbc.co.uk/' }) !== family({ url: 'https://x.co.uk/' }), daily: dailyPool.every((x) => x.mobile !== false) && dailyPool.includes(dailyFile()) }));
  ok(fx.gh && fx.toys && fx.uk, 'site families: one maker per shared host, toys together');
  ok(fx.daily, 'daily signal never picks a desktop-only file');
  ok((await p.evaluate(() => { const x = catalog.find((y) => y.editorial?.sources?.[0] === y.url); showReport(x); return document.getElementById('r-source').classList.contains('hidden') && document.getElementById('r-checked').textContent.includes('Description validated on'); })), 'report does not repeat the address as its source');
  ok(r.reach === r.total, 'every file can be drawn ' + r.reach + '/' + r.total);
  ok(r.spread < 2.2, 'no category heavily favoured ' + r.spread.toFixed(2));
  ok(r.c === 0, 'no two draws in a row from one category ' + r.c);
  ok(r.f === 0, 'no site family repeats within 14 draws ' + r.f);
  await p.evaluate(() => { state.unlocked = true; save(); }); await p.reload();
  const order = async () => { await p.click('[data-page=archive]'); await p.click('[data-view=all]'); await p.waitForTimeout(40); return p.evaluate(() => [...document.querySelectorAll('#file-list .row')].slice(0, 12).map((e) => e.firstChild.firstChild.textContent).join()); };
  const a = await order(); await p.reload(); ok(a !== await order(), 'archive order changes between visits');
  await p.context().close();
}
{ // old passports
  const { p } = await open();
  await p.evaluate(() => localStorage.setItem('gww-random-v2-passport', JSON.stringify({ version: 1, history: [{ id: 'zoomquilt', at: '2026-11-04T10:00:00Z' }], seen: ['zoomquilt'], attempts: 1, skips: 0 })));
  await p.reload(); await p.click('[data-page=archive]'); await p.click('[data-view=found]');
  ok((await p.textContent('#file-list')).includes('Zoomquilt'), 'old passport migrated');
  await p.evaluate(() => localStorage.setItem('gww-random-v2-passport', '{broken')); await p.reload();
  ok((await p.textContent('#count')) === '000', 'corrupted passport survives');
  await p.context().close();
}
await b.close(); srv.close();
console.log(`${passed} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
