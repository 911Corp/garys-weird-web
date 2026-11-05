#!/usr/bin/env python3
"""Writes what the app loads. Only verified entries reach data/catalog.js.
RANDOM is blind, so plain utilities (weirdness 1) stay listed in the Archive but are not drawn.
The quarantine stays in catalog/pending.json: it is editorial work, not something to show visitors."""
import json, re, runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('editorial-audit.py')))
from urllib.parse import urlparse
LABEL={'weird':'ABSURD','games':'GAMES','tools':'TOOLS','archives':'RETRO','art':'ART','retro':'RETRO','world':'SCIENCE','mysteries':'MYSTERY'}
src=json.load(open('catalog/catalog.v1.json',encoding='utf8'))
editorial=json.load(open('catalog/editorial-overrides.json',encoding='utf8'))
changes=editorial['changes']
OFFLINE=editorial.get('offline',{}); PAUSED=editorial.get('paused',{}); URLFIX=editorial.get('url_fixes',{}); NAMEFIX=editorial.get('name_fixes',{}); TRUSTED=editorial.get('trusted',{}).get('ids',{})
def revise(row):
    row['url']=URLFIX.get(row['id'],row['url']); row['name']=NAMEFIX.get(row['id'],row['name'])
    change=changes.get(row['id'])
    if change:
        row['desc']=change[0]
        if len(change)>2: row['garyNote']=change[2]
    sources=change[1] if change and len(change)>1 else []
    if sources: row['editorial']={'status':'primary_source_checked','checked':editorial['review_date'],'sources':sources}
    elif row['id'] in TRUSTED: row['editorial']={'status':'source_trusted','checked':editorial['trusted']['date'],'sources':[],'basis':TRUSTED[row['id']]}
    else: row['editorial']={'status':'independent_review_pending','checked':None,'sources':[]}
    return row
rows=[]
for d in src['destinations']:
    assert d['status']=='verified' and d['verification']['content_reviewed'] and d['url'].startswith(('http://','https://'))
    rows.append(revise(dict(id=d['id'],file=d['file'],name=d['name'],url=d['url'],category=LABEL[d['category']],desc=d['description'],
      weird=d['weirdness'],tags=d['tags'],checked=d['last_checked'],random=d['weirdness']>=2 and d['random_eligible'],mobile=d['verification'].get('mobile_ok'))))
for i,l in enumerate(open('catalog/source/owner-approved.psv',encoding='utf8')):
    if not l.strip(): continue
    url,name,cat,w,u,n,t,tags,desc=l.rstrip('\n').split('|')
    assert url.startswith(('https://','http://'))
    rows.append(revise(dict(id='owner-'+re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-'),file=f'GWW-A{i+1:03d}',name=name,url=url,category=LABEL[cat],desc=desc,weird=int(w),tags=tags.split(','),checked=None,random=int(w)>=2,mobile=None,owner=True)))
rows=[r for r in rows if r['id'] not in OFFLINE]
for r in rows:
    if r['id'] in PAUSED: r['random']=False   # down at the last check: still listed, not drawn
js=lambda name,v:f'window.{name}={json.dumps(v,ensure_ascii=False,separators=(",",":"))};\n'
assert not re.search('[\u2013\u2014\u2015]',js('x',rows))
open('data/catalog.js','w',encoding='utf8').write(js('GWW_CATALOG',rows))
print(len(rows),'published,',sum(r['random'] for r in rows),'in RANDOM')
