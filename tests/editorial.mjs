import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const sandbox={window:{innerWidth:1200},crypto:webcrypto,URL,localStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:()=>null}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('data/catalog.js','utf8'),sandbox);
const rows=sandbox.window.GWW_CATALOG;
const overrides=JSON.parse(fs.readFileSync('catalog/editorial-overrides.json'));
const expected=JSON.parse(fs.readFileSync('catalog/catalog.v1.json')).destinations.length+fs.readFileSync('catalog/source/owner-approved.psv','utf8').split('\n').filter(Boolean).length-Object.keys(overrides.offline||{}).length;
assert.equal(rows.length,expected);
for(const id of Object.keys(overrides.offline||{})) assert.ok(!rows.some(x=>x.id===id),'offline site still published: '+id);
assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);
const audit=JSON.parse(fs.readFileSync('catalog/editorial-audit.json'));
assert.equal(audit.records.length,rows.length);
for(const row of rows){
  assert.equal(row.desc,audit.records.find(x=>x.id===row.id).description);
  assert.equal(row.editorial.status==='primary_source_checked',row.editorial.sources.length>0);
  assert.equal(row.editorial.status==='source_trusted',row.id in (overrides.trusted?.ids||{})&&!row.editorial.sources.length,row.id);
}
assert.equal(rows.filter(x=>x.editorial.status==='primary_source_checked').length,Object.values(overrides.changes).filter(c=>c[1]?.length&&!overrides.offline?.[c]).length);
for(const id of overrides.self_check.pending) assert.equal(rows.find(x=>x.id===id)?.editorial.status,'independent_review_pending',id);
const app=fs.readFileSync('app.js','utf8').split('// ----- Wiring -----')[0];
vm.runInContext(app,sandbox);
// A discarded site must never reappear, including when the entire eligible pool is exhausted.
assert.equal(vm.runInContext("state.discarded = drawableAll.map(x=>x.id); pick()",sandbox),null);
vm.runInContext('state.discarded=[]',sandbox);
assert.ok(vm.runInContext('pick()?.id',sandbox));
// A description accepted on trust must say so, never claim a check.
for(const id of Object.keys(overrides.trusted?.ids||{})){
  const t=vm.runInContext(`proof(catalog.find(x=>x.id===${JSON.stringify(id)}))`,sandbox);
  assert.match(t,/Description validated on \d{4}-\d\d-\d\d\./,id); assert.doesNotMatch(t,/checked against the site itself|checked against its source/,id);
}
assert.match(rows.find(x=>x.id==='hotbits').desc,/retired/);
assert.match(rows.find(x=>x.id==='download-more-ram').desc,/joke website/);
assert.match(rows.find(x=>x.id==='voyager').desc,/not passed beyond/);
assert.match(rows.find(x=>x.id==='spurious-correlations').desc,/does not establish causation/);

// Nearly exhausted pool: the last unseen file is the one drawn, and an all-seen pool still draws.
{
  const last = vm.runInContext("(()=>{const all=drawable();state.seen=all.slice(1).map(x=>x.id);recent=all.slice(-14);return [all[0].id, pick()?.id]})()", sandbox);
  assert.equal(last[1], last[0]);
  assert.ok(vm.runInContext("state.seen=drawable().map(x=>x.id); pick()?.id", sandbox));
  vm.runInContext("state.seen=[]; recent=[]", sandbox);
}
// Corrupted or old local data never breaks loading.
for (const raw of ['not json', '{"history":5}', JSON.stringify({history:[null,{id:3},{id:'x'}],seen:[1,'a','a',null],saved:'oops',reported:[null,{id:'b'},7],attempts:-4,skips:'9',recent:{}}), JSON.stringify({history:[],seen:[]})]) {
  sandbox.localStorage.getItem = () => raw;
  const s = vm.runInContext('load()', sandbox);
  for (const k of ['seen','discarded','saved','trail','dailyDone','recent','reported','history']) assert.ok(Array.isArray(s[k]), raw + ' ' + k);
  assert.ok(s.seen.every((x) => typeof x === 'string') && s.saved.every((x) => typeof x === 'string'));
  assert.ok(s.reported.every((r) => typeof r.id === 'string') && s.history.every((r) => typeof r.id === 'string'));
  assert.ok(Number.isInteger(s.attempts) && s.attempts >= 0 && Number.isInteger(s.skips));
}
sandbox.localStorage.getItem = () => null;
// Today's signal: deterministic, UTC, and unmoved when unrelated files join the catalogue.
assert.equal(vm.runInContext("today()", sandbox), new Date().toISOString().slice(0, 10));
assert.equal(vm.runInContext("dailyFrom(dailyPool,'2026-11-05').id", sandbox), vm.runInContext("dailyFrom(dailyPool,'2026-11-05').id", sandbox));
let moved = 0;
for (let d = 1; d <= 28; d++) {
  const day = `2026-12-${String(d).padStart(2, '0')}`;
  const r = vm.runInContext(`(()=>{const a=dailyFrom(dailyPool,'${day}');const extra=[...dailyPool,{id:'new-1',file:'GWW-9001'},{id:'new-2',file:'GWW-9002'}];const b=dailyFrom(extra,'${day}');return [a.id,b.id]})()`, sandbox);
  if (r[0] !== r[1]) { moved++; assert.match(r[1], /^new-/); }
}
assert.ok(moved <= 2, 'adding two files moved the signal on ' + moved + ' days');
const notes=vm.runInContext('catalog.map(garyNote)',sandbox);
for(const note of notes) assert.doesNotMatch(note,/no sign-up|no catch|safe for|bookmarked|i tried|i closed the tab/);
assert.doesNotMatch(vm.runInContext('Object.values(VERDICT).join(" ")',sandbox),/harmless|safe|unstable|critical/i);
assert.ok(rows.every(x=>!/[\u2013\u2014\u2015]/.test(x.desc)));
console.log('PASS: '+rows.length+' records, audit consistency, source-status integrity, no discarded-pool recycling, factual regressions and Gary voice.');
