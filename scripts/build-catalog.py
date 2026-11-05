#!/usr/bin/env python3
"""Builds the catalog from editorial entries + recorded evidence.
An entry can only become `verified` if a recorded check supports it. Nothing is verified by hand."""
import csv, json, re, sys
from urllib.parse import urlparse
E='catalog/evidence/'
f=json.load(open(E+'fetch-round-1.json')); f2=json.load(open(E+'fetch-round-2.json')); f3=json.load(open(E+'fetch-round-3.json')); f5=json.load(open(E+'fetch-round-5.json')); f6=json.load(open(E+'fetch-round-6.json')); f7=json.load(open(E+'fetch-round-7.json')); f8=json.load(open(E+'fetch-round-8.json')); f9=json.load(open(E+'fetch-round-9.json')); fb=json.load(open(E+'browser-round-1.json'))
day=f['checked_at'][:10]
for rnd in (f,f2,f3,f5,f6,f7,f8,f9):   # each record keeps the date of the round that produced it
    for x in rnd['results']: x['_day']=rnd['checked_at'][:10]
fetch={x['url']:x for x in f['results']+f2['results']+f3['results']+f5['results']+f6['results']+f7['results']+f8['results']+f9['results']}
for x in fb['results']: fetch[x['url']]=dict(x,final=x['url'],browser=True)
pool={x['url']:x for x in json.load(open('catalog/research/merge_pool.json'))}
CAT={'history':'archives','creative':'art','emulation':'retro','science':'world','visualizations':'world','rabbit-holes':'mysteries'}
EXTRA={'emulation':'emulation','visualizations':'visualization'}
MOVE={'https://radio.garden/':'world','https://everynoise.com/':'art','https://publicdomainreview.org/':'archives'}
DROPPED={l.split('\t')[0]:l.rstrip('\n').split('\t')[1] for l in open('catalog/source/not-selected.tsv',encoding='utf8') if l.strip()}
LONG=re.compile('[\u2013\u2014\u2015]')
byfinal={re.sub(r'#.*','',x.get('final','')):x for x in f['results']+f3['results']+f5['results']+f7['results']+f8['results']+f9['results'] if x.get('final')}
# Later rounds win. A page must be rendered and looked at; plain-http pages cannot pass the proxy in Chromium.
render={}
for n in (1,2,3,4,5,6):
    for x in json.load(open(E+f'render-round-{n}.json'))['results']: render[x['url']]=x
for name in ('behaviour-pass-2.json','behaviour-pass-3.json','behaviour-pass-4.json'):
    for x in json.load(open(E+name))['results']:
        if x.get('code')==200: render[x['url']]=x
def norm(u): return re.sub(r'^https?://(www\.)?','',u).rstrip('/')
idx={}
for k,v in {**fetch,**byfinal}.items():   # http and https of one address share a key: a page that answered wins
    n=norm(k)
    if n not in idx or (v.get('code')==200 and idx[n].get('code')!=200): idx[n]=v
for x in fb['results']: idx[norm(x['url'])]=dict(x,final=x['url'],browser=True)
slug=lambda n:re.sub(r'[^a-z0-9]+','-',n.lower().replace('ë','e').replace('ô','o').replace('ö','o').replace('ü','u')).strip('-')
rows=[l.rstrip('\n').split('\t') for l in open('catalog/source/entries.tsv',encoding='utf8') if l.strip() and not l.startswith('#')]
out=[];used=set();fail=[]
TOO_KNOWN=set(open('catalog/source/too-known.txt').read().split())
for i,(url,name,cat,w,u,n,t,tags,desc) in enumerate(rows,1):
    if url in TOO_KNOWN: continue   # file numbers stay stable, the line just stops publishing
    ev=idx.get(norm(url))
    if not ev or ev.get('code')!=200 or ev.get('parked'): fail.append((url,ev and ev.get('code'))); continue
    used.add(ev['url'])
    rd=render.get(ev['url'])
    if ev.get('browser'):
        method='owner-browser'
    elif url.startswith('https:'):
        rd=rd or render.get(url)
        if not rd or rd.get('code')!=200: fail.append((url,'not rendered')); continue
        method='browser-render'
    else:
        if not ev.get('title') and not ev.get('text'): fail.append((url,'no content')); continue
        method='http-fetch'
    origin='gww-catalog-v1' if ev['url'] in pool and pool[ev['url']]['origin']=='attached' else 'editorial'
    tag_list=tags.split(',')
    if cat in EXTRA and EXTRA[cat] not in tag_list: tag_list.append(EXTRA[cat])
    cat=MOVE.get(url,CAT.get(cat,cat))
    out.append(dict(id=slug(name),file=f'GWW-{i:04d}',name=name,url=url,description=desc,category=cat,tags=tag_list,
      weirdness=int(w),usefulness=int(u),nostalgia=int(n),time_sink=int(t),thumbnail=None,status='verified',published=True,random_eligible=True,last_checked=ev.get('_day',day),
      source=origin,verification=dict(method=method,http_status=200,observed_title=LONG.sub('-',(ev.get('title') or (rd or {}).get('title') or ''))[:100],
        content_reviewed=True,mobile_checked=False,safety_reviewed=False)))
if fail: print('FAILED',fail); sys.exit(1)
pending=[]
seen_pending=set()
canon=lambda u:re.sub(r'^https?://(www\.)?','',u).rstrip('/').lower()
done={canon(d['url']) for d in out}
for x in f['results']+f3['results']+f5['results']+f7['results']+f8['results']+f9['results']:
    if x['url'] in used or x['url'] in seen_pending or canon(x['url']) in done or canon(x.get('final','')) in done: continue
    seen_pending.add(x['url'])
    rd=render.get(x['url']); c=x.get('code')
    if x.get('parked') : st,why='unavailable','domain is parked or for sale'
    elif c==404: st,why='unavailable','HTTP 404'
    elif c==200 and rd and urlparse(rd.get('final',x['url'])).netloc.replace('www.','')!=urlparse(x['url']).netloc.replace('www.',''): st,why='candidate','browser redirected to another domain: '+rd['final']
    elif c==200 and rd and 'Rate limit' in (rd.get('title') or ''): st,why='candidate','rate-limited during the check'
    elif c==200: st,why='candidate','reachable, description not written yet'
    elif c==403: st,why='candidate','blocked the automated check (HTTP 403), needs a check by a person'
    else: st,why='candidate',f'check failed ({c or x.get("error","error").strip()[:60]})'
    if x['url'] in TOO_KNOWN: why='not selected: too well known, nothing original enough for an exception'
    if x['url'] in DROPPED: why='not selected: '+DROPPED[x['url']]
    if rd and rd.get('code') not in (None,200) and x['url'] not in DROPPED: why=f"browser render failed ({rd.get('code')})"
    pending.append(dict(url=x['url'],status=st,reason=LONG.sub('-',why),last_checked=day))
# Mobile and behaviour pass: facts in evidence/behaviour-pass.json, verdicts here.
try:
    beh={x['url']:x for x in json.load(open(E+'behaviour-pass.json'))['results']}
    beh.update({x['url']:x for x in json.load(open(E+'behaviour-pass-2.json'))['results']})
    beh.update({x['url']:x for x in json.load(open(E+'behaviour-pass-3.json'))['results']})
    beh.update({x['url']:x for x in json.load(open(E+'behaviour-pass-4.json'))['results']})
    bad_hosts=set(json.load(open('catalog/evidence/blocklist-hosts.json')))
except FileNotFoundError:
    beh={}; bad_hosts=set()
DESK=re.compile(r'not optimised for mobile|mobile support coming soon|desktop only|not supported on mobile|not designed to work on phones|desktop only|desktop browser|best experienced on a computer|use a computer|requires a desktop|please use a desktop|webgl builds are not',re.I)
for d in out:
    b=beh.get(d['url'])
    v=d['verification']
    if b and (b.get('code') or 0)>=500:
        d['random_eligible']=False; v['down_on_recheck']=b['code']   # answered once, failed on a later check
    if not b or b.get('error') or b.get('code')!=200:
        continue
    v['mobile_checked']=True
    v['mobile_ok']=not (DESK.search(b.get('text') or '') or (b.get('sw',0)>b.get('cw',1)*1.25 and not b.get('canvas')))
    host=lambda h:h.lower().removeprefix('www.')
    main=host(urlparse(d['url']).hostname or '')
    v['ad_or_tracker_hosts']=len([h for h in b['hosts'] if h in bad_hosts])
    flags=[k for k in ('popups','dialogs','downloads') if b.get(k)]
    if main in bad_hosts: flags.append('blocklisted')
    v['behaviour_flags']=flags
    v['safety_reviewed']=not flags
    if flags: d['random_eligible']=False
json.dump(dict(version='0.1',generated=day,destinations=out),open('catalog/catalog.v1.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
json.dump(pending,open('catalog/pending.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),Counter(d['category'] for d in out)); print(len(pending),Counter(p['status'] for p in pending))
print(Counter(d['verification']['method'] for d in out))
ids=[d['id'] for d in out]; print('dupe ids',[k for k,v in Counter(ids).items() if v>1])
