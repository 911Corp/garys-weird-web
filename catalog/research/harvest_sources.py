"""Collect a 500+ candidate pool from public source pages on an internet-enabled computer.
Requires: pip install requests beautifulsoup4
Usage: python harvest_sources.py
Does NOT mark anything verified or publish anything. Respect sites' terms and robots.
"""
import json,re,time
from pathlib import Path
from urllib.parse import urlparse,urljoin,urldefrag
from collections import Counter
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).parent
SOURCES=[
 ('fuckyoutube-websites','https://www.fuckyoutube.lol/websites'),
 ('odd-sites','https://www.odd-sites.com/'),
 ('github-awesome-useless-websites','https://github.com/scriptex/awesome-useless-websites'),
]
BLOCK={'facebook.com','twitter.com','x.com','instagram.com','tiktok.com','youtube.com','linkedin.com','discord.com','github.com','reddit.com','google.com','apple.com','amazon.com','wikimedia.org','wikipedia.org','cloudflare.com'}
existing=json.loads((ROOT/'original_candidates.json').read_text())
def key(url):
 p=urlparse(url);return (p.hostname or '').lower().removeprefix('www.'),p.path.rstrip('/').lower()
seen={key(x['url']) for x in existing}
new=[];report=[]
sess=requests.Session();sess.headers['User-Agent']='GWWCatalogResearch/1.0 (manual review required)'
for source,url in SOURCES:
 try:
  res=sess.get(url,timeout=25);res.raise_for_status()
  soup=BeautifulSoup(res.text,'html.parser')
  # Prefer content regions to sitewide navigation; human editorial review still mandatory.
  region=soup.find('main') or soup.find('article') or soup
  added=0
  for a in region.find_all('a',href=True):
   target=urldefrag(urljoin(url,a['href']))[0]
   p=urlparse(target)
   if p.scheme not in ('http','https') or not p.hostname:continue
   host=p.hostname.lower().removeprefix('www.')
   if host in BLOCK or host.endswith('.github.com'):continue
   if host==(urlparse(url).hostname or '').lower().removeprefix('www.'):continue
   if key(target) in seen:continue
   label=' '.join(a.get_text(' ',strip=True).split())[:100]
   if len(label)<3:continue
   seen.add(key(target))
   slug=re.sub('[^a-z0-9]+','-',label.lower()).strip('-')[:45] or 'candidate'
   slug=f'{slug}-{len(existing)+len(new)+1}'
   new.append({'id':slug,'title':label,'url':target,'canonical_url':None,'category':'UNKNOWN','tags':[],'language':'unknown','summary':None,'gary_note':None,'classification':'UNKNOWN','source_ids':[source],'verification':{'status':'PENDING','checked_at':None,'http_status':None,'final_url':None,'mobile_checked':False,'content_reviewed':False,'safety_reviewed':False,'notes':'Unreviewed automated extraction. Check relevance, legality, redirects and content.'},'published':False,'random_eligible':False})
   added+=1
  report.append({'source':source,'http_status':res.status_code,'extracted':added})
 except Exception as exc:report.append({'source':source,'error':str(exc)[:250]})
 time.sleep(2)
# Do not mix automatic imports with approved editorial records.
(ROOT/'harvest_candidates_pending.json').write_text(json.dumps(new,ensure_ascii=False,indent=2))
(ROOT/'harvest_report.json').write_text(json.dumps({'existing':len(existing),'new':len(new),'total_pending_pool':len(existing)+len(new),'target':500,'sources':report},indent=2))
print(json.dumps({'existing':len(existing),'new':len(new),'total':len(existing)+len(new),'target':500,'sources':report},indent=2))
