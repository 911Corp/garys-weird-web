#!/usr/bin/env python3
"""Records what each candidate URL actually serves. Evidence, not a safety verdict:
a 200 proves a page answered, nothing more (brief, section 7)."""
import html, json, re, subprocess, sys, datetime
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlparse

PARK = r"domain (is )?for sale|buy this domain|parked free|hugedomains|sedo|domain has expired|account suspended"
UA = "GarysWeirdWeb-LinkCheck/0.1"

class Text(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.skip=0; s.title=''; s.inT=False; s.meta=''
    def handle_starttag(s,t,a):
        a=dict(a)
        if t in('script','style','noscript'): s.skip+=1
        if t=='title': s.inT=True
        if t=='meta' and (a.get('name') or a.get('property') or '').lower() in('description','og:description') and not s.meta: s.meta=a.get('content') or ''
    def handle_endtag(s,t):
        if t in('script','style','noscript'): s.skip=max(0,s.skip-1)
        if t=='title': s.inT=False
    def handle_data(s,d):
        if s.inT: s.title+=d
        elif not s.skip and d.strip(): s.out.append(d.strip())

def host(u): return re.sub(r'^www\.','',urlparse(u).netloc.lower())

def check(row):
    cat,url=row
    p=subprocess.run(['curl','-sSL','-m','25','--max-redirs','6','-A',UA,'-o','-','-w','\n@@%{http_code}|%{url_effective}|%{content_type}|%{num_redirects}',url],capture_output=True)
    raw=p.stdout; tail=raw.rsplit(b'\n@@',1)
    if len(tail)!=2: return dict(cat=cat,url=url,code=0,error=p.stderr.decode('utf8','replace')[:160])
    body=tail[0][:600000].decode('utf8','replace'); m=tail[1].decode('utf8','replace').split('|')
    t=Text()
    try: t.feed(body)
    except Exception: pass
    text=re.sub(r'\s+',' ',' '.join(t.out))
    r=dict(cat=cat,url=url,code=int(m[0] or 0),final=m[1],ctype=m[2],redirects=int(m[3] or 0),
      title=html.unescape(t.title.strip())[:140],meta=html.unescape(t.meta)[:220],text=text[:260],bytes=len(body),
      offsite=host(url)!=host(m[1]),parked=bool(re.search(PARK,(t.title+' '+text[:3000]),re.I)))
    if p.returncode: r['error']=p.stderr.decode('utf8','replace')[:160]
    return r

rows=[l.split() for l in open(sys.argv[1]) if l.strip()]
with ThreadPoolExecutor(12) as ex: res=list(ex.map(check,rows))
json.dump(dict(checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),user_agent=UA,results=res),open(sys.argv[2],'w'),indent=1,ensure_ascii=False)
from collections import Counter
print(Counter(r['code'] for r in res))
