'use strict';
// G:// Gary's Weird Web. Local passport; external destinations receive ordinary web requests.

const KEY = 'gww-random-v2-passport';
const BLACKBOX_UNLOCK = 3;
const RECENT = 14;
const PAGE_SIZE = 40;

const $ = (id) => document.getElementById(id);
const catalog = window.GWW_CATALOG || [];
const byId = new Map(catalog.map((x) => [x.id, x]));
const LEGACY = { zoomquilt: 'the-zoomquilt', windows93: 'windows-93', scp: 'scp-foundation', pointer: 'pointer-pointer', trust: 'the-evolution-of-trust' };

const CLASS = { 1: 'ROUTINE', 2: 'ODD', 3: 'WEIRD', 4: 'VERY WEIRD', 5: 'PEAK WTF' };

// ----- Randomness -----
function rand32() {
  const a = new Uint32Array(1);
  if (crypto?.getRandomValues) crypto.getRandomValues(a); else a[0] = Math.floor(Math.random() * 2 ** 32);
  return a[0];
}
function roll(n) {
  const limit = 2 ** 32 - (2 ** 32 % n);
  let v;
  do { v = rand32(); } while (v >= limit);
  return v % n;
}
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = roll(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ----- Catalog helpers -----
function safe(x) {
  try { const u = new URL(x.url); return ['http:', 'https:'].includes(u.protocol) && !u.username; } catch { return false; }
}
// One maker, one family: the *.toys sites are all Tim Holman's. On shared hosts (github.io, pages.dev...)
// and two-part country suffixes (co.uk...), the label before the suffix is the maker.
const SHARED = /\.(github\.io|gitlab\.io|pages\.dev|vercel\.app|netlify\.app|web\.app|neocities\.org|glitch\.me|co\.uk|org\.uk|ac\.uk|com\.au|co\.jp|co\.nz|com\.br)$/;
function family(x) {
  const host = new URL(x.url).hostname.replace(/^www\./, '');
  const h = host.split('.');
  if (h.at(-1) === 'toys') return 'toys';
  return h.slice(SHARED.test(host) ? -3 : -2).join('.');
}
const phone = () => window.innerWidth <= 820;
const drawableAll = catalog.filter((x) => x.random && safe(x));
const drawable = () => drawableAll.filter((x) => !phone() || x.mobile !== false);
const CATS = [...new Set(catalog.map((x) => x.category))].sort();
const ownSource = (x) => x.editorial?.sources?.length === 1 && x.editorial.sources[0] === x.url;
const proof = (x) => (x.checked ? `Link checked ${x.checked}. ` : '') + (x.editorial?.checked ? `Description validated on ${x.editorial.checked}.` : 'Description not checked yet.');

// ----- State -----
const fresh = () => ({ version: 3, history: [], seen: [], discarded: [], saved: [], reported: [], trail: [], dailyDone: [], recent: [], attempts: 0, skips: 0, created: new Date().toISOString() });
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || typeof s !== 'object' || !Array.isArray(s.history) || !Array.isArray(s.seen)) return fresh();
    // Anything written by an older version or edited by hand is cleaned field by field, never trusted as is.
    const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === 'string').map((id) => LEGACY[id] || id))] : []);
    for (const k of ['seen', 'discarded', 'saved', 'trail', 'dailyDone', 'recent']) s[k] = ids(s[k]);
    s.reported = Array.isArray(s.reported) ? s.reported.filter((r) => r && typeof r.id === 'string') : [];
    s.history = s.history.filter((r) => r && typeof r.id === 'string').map((r) => ({ ...r, id: LEGACY[r.id] || r.id }));
    for (const k of ['attempts', 'skips']) s[k] = Number.isFinite(s[k]) && s[k] >= 0 ? Math.floor(s[k]) : 0;
    if (typeof s.created !== 'string') s.created = new Date().toISOString();
    return s;
  } catch { return fresh(); }
}
let state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* the session still works in memory */ } };
let current = null;
let freq = '';
// Advanced modes live in the terminal so the home screen stays about discovery.
const mode = { preview: false, chaos: false, blackbox: false };
let phase = 'idle';
let sealed = false;
// Recent draws survive a reload, so the next session does not start with the same family.
let recent = state.recent.map((id) => catalog.find((x) => x.id === id)).filter(Boolean);
const remember = (x) => { recent = [...recent, x].slice(-RECENT); state.recent = recent.map((r) => r.id); };

// ----- Drawing -----
function weighted(groups) {
  const keys = Object.keys(groups);
  const w = keys.map((k) => Math.sqrt(groups[k].length));
  let r = (rand32() / 2 ** 32) * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r < 0) return keys[i]; }
  return keys[keys.length - 1];
}
// Unseen first, discarded never. When the pool allows it: another category than the last draw,
// and a family not met recently. Categories weigh the square root of their size.
function draw(source) {
  const live = source.filter((x) => !state.discarded.includes(x.id) && !isReported(x.id));
  const base = live;
  let pool = base.filter((x) => !state.seen.includes(x.id));
  if (!pool.length) pool = base.filter((x) => x.id !== current?.id);
  if (!pool.length) pool = base;
  if (!pool.length) return null;
  const fams = new Set(recent.map(family));
  const unmet = pool.filter((x) => !fams.has(family(x)));
  if (unmet.length) pool = unmet;
  const other = pool.filter((x) => x.category !== recent.at(-1)?.category);
  if (other.length) pool = other;
  const groups = {};
  for (const x of pool) (groups[x.category] ||= []).push(x);
  const group = groups[weighted(groups)];
  return group[roll(group.length)];
}
function pick(cat) {
  const chosen = cat || freq;
  const chaos = mode.chaos;
  return draw(drawable().filter((x) => (!chosen || x.category === chosen) && (!chaos || x.weird >= 4)));
}
function related(from, chaos) {
  const pool = drawable().filter((x) => x.id !== from?.id);
  if (!from || chaos) return draw(pool);
  const scored = pool
    .map((x) => ({ x, n: x.tags.filter((t) => from.tags.includes(t)).length * 4 + (x.category === from.category ? 2 : 0) }))
    .filter((o) => o.n > 0);
  if (!scored.length) return draw(pool);
  const best = Math.max(...scored.map((o) => o.n));
  return draw(scored.filter((o) => o.n >= Math.max(1, best - 3)).map((o) => o.x));
}
// The day is the UTC day, so everyone shares the same signal at the same moment, wherever they are.
const today = () => new Date().toISOString().slice(0, 10);
// Avoids files marked unsuitable for phones.
const dailyPool = drawableAll.filter((x) => x.mobile !== false);
function fnv(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
// Each file gets a score for the day and the highest wins. Adding files elsewhere in the catalogue
// does not move the signal; it changes only if a new file beats it or the winner is withdrawn.
function dailyFrom(pool, day) {
  let best = null, top = -1;
  for (const x of pool) { const s = fnv(day + '|' + x.file); if (s > top) { top = s; best = x; } }
  return best;
}
const dailyFile = () => dailyFrom(dailyPool, today());

// ----- Router -----
function show(...ids) {
  for (const id of ['warp', 'daily-go', 'reveal', 'confirm', 'save', 'share', 'reopen', 'skip']) $(id).classList.toggle('hidden', !ids.includes(id));
}
// Text surfaces from noise, left to right. Used on the button and on the name of a revealed site.
const decoding = new WeakMap();
function decode(el, text) {
  clearInterval(decoding.get(el));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; return; }
  const noise = '█▓▒░';
  let done = 0;
  const paint = () => { el.textContent = text.slice(0, done) + Array.from({ length: text.length - done }, () => noise[roll(4)]).join(''); };
  el.setAttribute('aria-busy', 'true');
  paint();
  decoding.set(el, setInterval(() => {
    done = Math.min(text.length, done + Math.ceil(text.length / 16));
    paint();
    if (done === text.length) { clearInterval(decoding.get(el)); el.removeAttribute('aria-busy'); }
  }, 32));
}
function setNote(text) { $('note').textContent = text; $('note').classList.toggle('hidden', !text); }
function setScreen(status, message, note = '') { clearInterval(decoding.get($('status'))); $('report').classList.add('hidden'); $('share-panel').classList.add('hidden'); $('status').textContent = status; $('message').textContent = message; setNote(note); }
function idle() {
  phase = 'idle'; current = null; sealed = false;
  setScreen('Destination classified', '');
  show('warp', 'daily-go');
}
function openSite() {
  if (!current) return false;
  if (!safe(current)) { setNote('This address uses an unsupported URL format and will not open.'); return false; }
  window.open(current.url, '_blank', 'noopener,noreferrer');
  return true;
}
// Gary reacts to a category or a documented feature. Never an invented visit, test or guarantee.
const NOTES = {
  ABSURD: ['an excellent use of a domain name. allegedly.', 'requirements: unclear. commitment: impressive.', 'my kind of feature creep.', 'the roadmap can wait. this seems important.', 'this feels like something i would ship.'],
  GAMES: ['my backlog would like a word.', 'one more round sounds like a reasonable plan.', 'skill issue pending.', 'productivity has left the chat.', 'this is probably how side quests start.'],
  TOOLS: ['a tool. for my collection of unfinished plans.', 'this could become a project. dangerous thought.', 'tempted to call this research.', 'one more tool before i actually build something.', 'jarvis would probably ask for requirements.'],
  RETRO: ['the lore has a user interface.', 'legacy code. current obsession.', 'this belongs in my extremely specific rabbit hole.', 'the old internet had range.', 'archaeology, but with more tabs.'],
  ART: ['my browser has better taste than me.', 'art direction: yes. my understanding: pending.', 'pixels with a better plan than mine.', 'i would put this in the moodboard.', 'a good reason to stop scrolling for a second.'],
  SCIENCE: ['curiosity is doing the driving. i am holding the map upside down.', 'i have questions. naturally.', 'this is where i stop guessing and read.', 'my confidence should probably wait for the explanation.', 'adding this to my extremely informal syllabus.'],
  MYSTERY: ['one tab. famous last words.', 'the rabbit hole has a front door.', 'a lead. not a conclusion.', 'my attention span has found a side quest.', 'curiosity: online. conclusions: pending.'],
};
const VERDICT = { 1: '1/5 · routine', 2: '2/5 · odd', 3: '3/5 · weird', 4: '4/5 · very weird', 5: '5/5 · peak wtf' };
function seed(id) { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function garyNote(x) { if (x.garyNote) return x.garyNote; const pool = NOTES[x.category] || NOTES.ABSURD; return pool[seed(x.id) % pool.length]; }
function showReport(x) {
  $('r-file').textContent = x.file;
  $('r-field').textContent = [x.category, CLASS[x.weird] || CLASS[3]].map((w) => w[0] + w.slice(1).toLowerCase()).join(' · ');
  $('r-contents').textContent = x.desc;
  $('r-note').textContent = `“${garyNote(x)}”`;
  $('r-verdict').textContent = VERDICT[x.weird] || VERDICT[3];
  $('decoded').href = x.url;
  $('decoded').textContent = x.url.replace(/\/$/, '');
  $('r-checked').textContent = proof(x);
  const source = $('r-source'); source.replaceChildren();
  const sourceRow = Boolean(x.editorial?.sources?.length) && !ownSource(x);   // the site itself would only repeat the address
  $('r-source-label').classList.toggle('hidden', !sourceRow); source.classList.toggle('hidden', !sourceRow);
  if (x.editorial?.sources?.length) {
    for (const [i, url] of x.editorial.sources.entries()) {
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `Source ${i + 1} ↗`; source.append(a, ' ');
    }
  } else source.textContent = 'Not checked yet.';
  reportLabel();
  $('report').classList.remove('hidden');
}
function fileLine(x) { return `${x.file} / ${x.category} / ${CLASS[x.weird] || CLASS[3]} / ${x.desc}`; }
function transmit(next) {
  if (!next) { setScreen('No signal', 'Nothing matches this frequency.', ''); return false; }
  current = next; remember(next);
  sealed = mode.blackbox;
  state.attempts++; save();
  if (mode.preview && !sealed) {
    phase = 'preview';
    setScreen(next.name, '', '');
    showReport(next);
    $('reopen').textContent = 'Open site ↗';
    show('reopen', 'skip');
    return true;
  }
  phase = 'opened';
  setScreen('Signal transmitted', '', 'If nothing opened, use Open again.');
  $('reopen').textContent = 'Open again ↗';
  if (sealed) show('confirm', 'reopen', 'skip'); else show('reveal', 'reopen', 'skip');
  openSite();
  return true;
}
// ----- Reporting a site that is down -----
// No server: a report hides the site from this device's draws and goes into the passport export.
// Set REPORT_TO to an email address to also open a prefilled message to whoever maintains the catalog.
const REPORT_TO = '';
const isReported = (id) => state.reported.some((r) => r.id === id);
function reportLabel() {
  const done = current && isReported(current.id);
  $('report-down').textContent = done ? 'Reported. Thanks.' : 'Site down? Report it';
  $('report-down').disabled = !!done;
}
function reportDown() {
  if (!current || isReported(current.id)) return false;
  state.reported.push({ id: current.id, file: current.file, url: current.url, at: new Date().toISOString() });
  save(); reportLabel(); render();
  setNote(`Marked as down on this device. ${current.name} will not be drawn again.`);
  if (REPORT_TO) {
    const body = `${current.file} ${current.name}\n${current.url}\nReported ${new Date().toISOString().slice(0, 10)} from G:// Gary's Weird Web.`;
    window.open(`mailto:${REPORT_TO}?subject=${encodeURIComponent(`Site down: ${current.file}`)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  }
  return true;
}

// ----- Full archive lock -----
// A game lock, not security: the catalog has to be in the page for RANDOM to work.
const WRONG = {
  '123456': "the world's favourite. not gary's.", password: 'too obvious, even for gary.', motdepasse: 'too obvious, even for gary.',
  azerty: 'close to home. not it.', admin1234: 'gary would never bother adding numbers.', admin0000: 'gary would never bother adding numbers.',
  admin123: 'gary would never bother adding numbers.', root: 'wrong machine.', toor: 'wrong machine.', gary: 'flattering. wrong.',
};
let tries = 0;
function unlock(guess) {
  const raw = String(guess || '').trim(); const g = raw.toLowerCase();
  if (raw === 'admin') { state.unlocked = true; save(); render(); return 'access granted. gary is not proud of this.'; }
  tries++;
  if (g === 'admin') return 'so close. gary only types in lowercase.';
  return WRONG[g] || (tries >= 4 ? 'access denied. think of the first username anyone tries.' : ['access denied.', 'nope.', 'try simpler.'][tries % 3]);
}
function warp(cat) {
  if (incoming && !cat) { const x = incoming; incoming = null; return transmit(x); }
  return transmit(pick(cat));
}

// ----- Sharing -----
// No server: the link itself carries the file number, and the friend opens it blind.
// Set SITE_URL once the site has a public address; until then the current address is used.
const SITE_URL = 'https://911corp.github.io/garys-weird-web/';
let incoming = null;
function shareBase() {
  if (SITE_URL) return SITE_URL.replace(/[#?].*$/, '');
  return /^https?:$/.test(location.protocol) ? location.origin + location.pathname : '';
}
const shareUrl = (x) => `${shareBase()}#s=${x.file}`;
const shareText = (x) => `Incoming signal ${x.file} · weirdness ${x.weird}/5 · G:// Gary's Weird Web`;
function fillShare(x) {
  const url = encodeURIComponent(shareUrl(x)); const text = encodeURIComponent(shareText(x));
  $('sh-x').href = `https://x.com/intent/post?text=${text}&url=${url}`;
  $('sh-bsky').href = `https://bsky.app/intent/compose?text=${text}%20${url}`;
  $('sh-reddit').href = `https://www.reddit.com/submit?url=${url}&title=${text}`;
  $('sh-wa').href = `https://wa.me/?text=${text}%20${url}`;
}
async function share() {
  if (!current) return;
  if (!shareBase()) { setNote('Sharing works once the site is online.'); return; }
  const data = { title: "G:// Gary's Weird Web", text: shareText(current), url: shareUrl(current) };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  fillShare(current);
  $('share-panel').classList.toggle('hidden');
}
async function copyLink() {
  const url = shareUrl(current);
  try { await navigator.clipboard.writeText(url); setNote('Link copied.'); } catch { setNote(url); }
}
function receive() {
  const m = /^#s=(GWW-[A-Z0-9-]+)$/i.exec(location.hash);
  if (!m) return;
  const x = catalog.find((y) => y.file.toUpperCase() === m[1].toUpperCase());
  history.replaceState(null, '', location.pathname + location.search);
  if (!x || !safe(x)) return;
  incoming = x;
  setScreen('Incoming signal', '', `${x.file} · weirdness ${x.weird}/5`);
}
function dailyGo() {
  navigate('random');
  if (!state.dailyDone.includes(today())) { state.dailyDone.push(today()); save(); }
  transmit(dailyFile());
}
function follow(chaos) {
  const from = byId.get(state.trail.at(-1)) || current;
  navigate('random');
  return transmit(related(from, chaos));
}
function log() {
  if (!current) return;
  const x = current;
  state.history.unshift({ id: x.id, at: new Date().toISOString() });
  if (!state.seen.includes(x.id)) state.seen.push(x.id);
  if (state.trail.at(-1) !== x.id) state.trail = [...state.trail, x.id].slice(-30);
  save(); render();
}
function sealedLog() {
  phase = 'logged'; log();
  setScreen('Discovery recorded', 'Sealed until you decrypt it.');
  $('reveal').textContent = 'Decrypt file';
  show('reveal', 'warp');
}
function reveal() {
  if (!current) return;
  if (phase === 'opened' || phase === 'preview') log();
  phase = 'revealed';
  setScreen(current.name, '', '');
  $('reveal').textContent = 'Declassify';
  decode($('status'), current.name);
  showReport(current);
  saveLabel();
  show('warp', 'save', 'share', 'skip');
}
function discard() {
  state.skips++;
  if (current && !state.discarded.includes(current.id)) state.discarded.push(current.id);
  save(); idle(); setNote('Discarded. Excluded from random draws on this device.');
}
// Favorites live in state.saved, the key older passports already use.
const isFav = (id) => state.saved.includes(id);
function saveLabel() {
  if (!current) return;
  const on = isFav(current.id);
  const star = document.createElement('span'); star.className = 'star'; star.setAttribute('aria-hidden', 'true'); star.textContent = on ? '★' : '☆';
  $('save').replaceChildren(star, on ? ' Favorited' : ' Favorite');
  $('save').setAttribute('aria-pressed', String(on));
}
function toggleSave(id) {
  const i = state.saved.indexOf(id);
  if (i >= 0) state.saved.splice(i, 1); else state.saved.unshift(id);
  save(); saveLabel(); render();
  return i < 0;
}

// ----- Pages -----
const PAGES = ['random', 'terminal', 'profile', 'archive'];
function navigate(page) {
  for (const id of PAGES) $(id).classList.toggle('hidden', id !== page);
  document.querySelectorAll('[data-page]').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === page);
    if (b.closest('.nav')) { if (b.dataset.page === page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  });
  window.scrollTo({ top: 0 });
  if (page === 'terminal') $('command-input').focus();
}

const ACHIEVEMENTS = [
  ['FIRST CONTACT', 'log a discovery', (n) => n >= 1],
  ['BLACKBOX ACCESS', 'three discoveries unlock the blackbox command', (n) => n >= BLACKBOX_UNLOCK],
  ['RABBIT HOLE', 'five unique discoveries', (n) => n >= 5],
  ['DEEP DIVER', 'twenty-five unique discoveries', (n) => n >= 25],
  ['DAILY LISTENER', 'open a daily signal', () => state.dailyDone.length > 0],
  ['ARCHIVE DWELLER', 'ten unique discoveries', (n) => n >= 10],
  ['ALL FILES', 'every signal in the archive', (n) => n >= drawableAll.length],
];
function row(name, detail, right) {
  const el = document.createElement('div'); el.className = 'row';
  const left = document.createElement('div'); left.textContent = name;
  if (detail) { const sm = document.createElement('small'); sm.textContent = detail; left.append(sm); }
  el.append(left);
  if (right) { const r = document.createElement('span'); r.className = 'tag'; r.textContent = right; el.append(r); }
  return el;
}
function fileRow(x) {
  const el = row(x.name, `${x.file} / ${x.category} / ${x.desc}${isReported(x.id) ? ' / reported as down' : ''}`);
  const acts = document.createElement('span'); acts.className = 'acts';
  const s = document.createElement('button');
  const on = isFav(x.id);
  s.className = on ? 'fav on' : 'fav';
  s.textContent = on ? '★' : '☆';
  s.setAttribute('aria-pressed', String(on));
  s.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${x.name} ${on ? 'from' : 'to'} favorites`);
  s.onclick = () => toggleSave(x.id);
  acts.append(s);
  if (safe(x)) {
    const a = document.createElement('a');
    a.href = x.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open ↗';
    acts.append(a);
  }
  el.append(acts);
  return el;
}

// New order on every visit, stable during the visit so SHOW MORE never repeats a file.
const archiveOrder = shuffled(catalog);
let archiveView = 'found';
let fileLimit = PAGE_SIZE;
const search = (list, q) => list.filter((x) => !q || [x.name, x.desc, x.category, x.tags.join(' ')].join(' ').toLowerCase().includes(q));
function archiveList() {
  if (archiveView === 'saved') return state.saved.map((id) => byId.get(id)).filter(Boolean);
  if (archiveView === 'found') return [...new Set(state.history.map((h) => h.id))].map((id) => byId.get(id)).filter(Boolean);
  return archiveOrder;
}
function renderFiles() {
  const locked = archiveView === 'all' && !state.unlocked;
  $('unlock').classList.toggle('hidden', !locked);
  $('file-search').classList.toggle('hidden', locked);
  if (locked) { $('file-list').replaceChildren(); $('more-files').classList.add('hidden'); return; }
  const m = search(archiveList(), $('file-search').value.trim().toLowerCase());
  $('file-list').replaceChildren(...(m.length ? m.slice(0, fileLimit).map(fileRow) : [archiveView === 'saved' && !$('file-search').value.trim() ? row('No favorites yet', 'Tap ☆ Favorite after a discovery, or the star next to any file.') : row('NO FILES FOUND', archiveView === 'all' ? 'try another word' : 'try G:// RANDOM')]));
  $('more-files').classList.toggle('hidden', m.length <= fileLimit);
}
const pad = (n, w = 3) => String(n).padStart(w, '0');
function render() {
  const n = state.seen.length;
  const locked = n < BLACKBOX_UNLOCK;
  if (locked) mode.blackbox = false;
  $('count').textContent = pad(n);
  $('saved-total').textContent = pad(state.saved.length);
  $('profile-level').textContent = pad(Math.floor(n / 5) + 1, 2);
  $('bar').style.width = `${(n % 5) * 20}%`;
  $('next').textContent = `${n % 5} / 5 unique discoveries toward next level`;
  $('count-all').textContent = state.unlocked ? catalog.length : '🔒';
  $('count-saved').textContent = state.saved.length;
  $('count-found').textContent = n;
  $('top-level').textContent = pad(Math.floor(n / 5) + 1, 2);
  $('rotation').textContent = drawable().length;
  document.querySelectorAll('#freq button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === freq)));
  $('achievements').replaceChildren(...ACHIEVEMENTS.map(([name, detail, test]) => row(name, detail, test(n) ? 'UNLOCKED' : 'LOCKED')));
  renderFiles();
}

// ----- Terminal -----
const HELP = ['random [category]  transmit a blind signal', 'rabbit             follow a connection', 'chaos [on|off]     jump anywhere, or keep only the strangest files', 'daily              open today\'s signal', 'search <word>      search files', 'filter <category>  lock a category (filter all to reset)', 'blackbox           toggle sealed discoveries', 'preview            toggle preview before opening', 'login <password>   unlock the full archive', 'categories         list categories', 'fav                add the current site to favorites', 'share              share the current file', 'favs               list your favorites', 'report             report the current site as down', 'reports            list your reports', 'open               reopen the current site', 'file               read the current file', 'status             read telemetry', 'version            show the version'] .concat(['clear              clear this screen']).join('\n');
function run(command) {
  const [cmd = '', ...rest] = command.trim().toLowerCase().split(/\s+/);
  if (!cmd) return;
  const arg = rest.join(' ');
  const cat = CATS.find((c) => c.toLowerCase() === arg);
  const unknownCat = `unknown category: ${arg}. type categories.`;
  const list = (xs) => xs.map((x) => `${x.file}  ${x.name}`).join('\n');
  const out = (m) => { $('terminal-output').textContent = m; };
  switch (cmd) {
    case 'random': case 'warp': case 'next':
      if (arg && !cat) return out(unknownCat);
      navigate('random'); return out(warp(cat) ? 'external tab requested.' : 'no matching signal.');
    case 'rabbit': return out(follow(false) ? 'connection selected. external tab requested.' : 'no matching connection.');
    case 'chaos':
      if (arg === 'on' || arg === 'off') { mode.chaos = arg === 'on'; return out(`high chaos ${arg}.`); }
      return out(follow(true) ? 'chaos jump. external tab requested.' : 'no matching signal.');
    case 'daily': dailyGo(); return out('daily signal opened.');
    case 'search': { const f = search(state.unlocked ? archiveOrder : [...new Set(state.history.map((h) => h.id))].map((id) => byId.get(id)).filter(Boolean), arg); return out(arg ? `${f.length} files\n${list(f.slice(0, 12))}` : 'search needs a word.'); }
    case 'filter':
      if (arg === 'all' || !arg) { freq = ''; render(); return out('all frequencies.'); }
      if (!cat) return out(unknownCat);
      freq = cat; render(); return out(`signal filter: ${cat}`);
    case 'blackbox':
      if (state.seen.length < BLACKBOX_UNLOCK) return out(`blackbox unlocks after ${BLACKBOX_UNLOCK} discoveries (${state.seen.length}/${BLACKBOX_UNLOCK}).`);
      mode.blackbox = !mode.blackbox; return out(`blackbox ${mode.blackbox ? 'on' : 'off'}.`);
    case 'preview': mode.preview = !mode.preview; return out(`preview ${mode.preview ? 'on' : 'off'}.`);
    case 'login': return out(arg ? unlock(arg) : 'login needs a password.');
    case 'categories': return out(CATS.join('\n'));
    case 'fav': case 'save': if (phase !== 'revealed') return out('no declassified file.'); return out(toggleSave(current.id) ? 'added to favorites.' : 'removed from favorites.');
    case 'favs': case 'saved': return out(list(state.saved.map((id) => byId.get(id)).filter(Boolean)) || 'no favorites yet.');
    case 'share': if (phase !== 'revealed') return out('no declassified file.'); share(); return out(shareBase() ? shareUrl(current) : 'sharing works once the site is online.');
    case 'report': if (!current) return out('no active signal.'); return out(reportDown() ? 'reported as down. it will not be drawn again on this device.' : 'already reported.');
    case 'reports': return out(state.reported.map((r) => `${r.file}  ${r.url}`).join('\n') || 'no reports.');
    case 'open': if (!current) return out('no active signal.'); openSite(); return out('external tab requested.');
    case 'file': return out(phase === 'revealed' ? [current.name, fileLine(current), `gary's take: ${garyNote(current)}`, `weirdness (editorial): ${VERDICT[current.weird] || VERDICT[3]}`, proof(current), ...(current.editorial?.sources || [])].join('\n') : 'no declassified file.');
    case 'status': return out(`discoveries  ${state.seen.length}\nsignals      ${state.attempts}\ndiscarded    ${state.skips}\nfavorites    ${state.saved.length}`);
    case 'help': case '?': return out(HELP);
    case 'version': return out("G:// Gary's Weird Web V0.1");
    case 'clear': return out('');
    case 'gm': return out('gm');
    case 'sudo': return out('you are not in the sudoers file. this incident will be reported to gary.');
    default: return out(`unknown command: ${cmd}. type help.`);
  }
}

// ----- Wiring -----
for (const c of CATS) {
  const b = document.createElement('button'); b.dataset.cat = c; b.textContent = c[0] + c.slice(1).toLowerCase(); b.setAttribute('aria-pressed', 'false');
  b.onclick = () => { freq = freq === c ? '' : c; render(); };
  $('freq').append(b);
}
$('warp').onclick = () => warp();
$('share').onclick = share;
$('report-down').onclick = reportDown;
$('sh-copy').onclick = copyLink;
$('warp').onmouseenter = () => decode($('warp-word'), '[REDACTED]');
$('daily-go').onclick = dailyGo;
$('reveal').onclick = reveal;
$('confirm').onclick = sealedLog;
$('skip').onclick = discard;
$('save').onclick = () => current && toggleSave(current.id);
$('reopen').onclick = () => {
  const ok = openSite();
  if (ok && phase === 'preview') reveal();
};
document.querySelectorAll('[data-page]').forEach((b) => { b.onclick = () => navigate(b.dataset.page); });
document.querySelector('.sigil').onclick = (e) => { e.preventDefault(); navigate('random'); };
$('unlock-go').onclick = () => { $('unlock-msg').textContent = unlock($('unlock-input').value); $('unlock-input').value = ''; };
$('unlock-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('unlock-go').click(); } });
$('file-search').addEventListener('input', () => { fileLimit = PAGE_SIZE; renderFiles(); });
$('more-files').onclick = () => { fileLimit += PAGE_SIZE; renderFiles(); };
document.querySelectorAll('[data-view]').forEach((b) => {
  b.onclick = () => {
    archiveView = b.dataset.view; fileLimit = PAGE_SIZE;
    document.querySelectorAll('[data-view]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    renderFiles();
  };
});
$('command-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); run(e.target.value); e.target.value = ''; }
});
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'gww-passport.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let resetArmed = false;
$('reset').onclick = () => {
  if (!resetArmed) { resetArmed = true; $('reset').textContent = 'Confirm reset'; return; }
  resetArmed = false; $('reset').textContent = 'Reset local data';
  state = fresh(); save(); idle(); render();
};
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); navigate('terminal'); }
  if (e.key === 'Escape') navigate('random');
});
render();
receive();
