#!/usr/bin/env python3
"""Periodic link check of the published catalogue. Runs outside the site, so visitors load nothing extra.
It only reports: a failing site is never removed automatically, an editor decides (offline or paused in
catalog/editorial-overrides.json). A 200 proves a page answered, nothing about its safety or content.
Usage: python3 scripts/monitor-links.py [--out catalog/link-report.json]"""
import json, re, ssl, sys, datetime, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'   # some hosts drop unknown agents
PARK = re.compile(r'domain (is )?for sale|buy this domain|parked free|hugedomains|sedo\.com|domain has expired|account suspended', re.I)
out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'catalog/link-report.json'
src = open('data/catalog.js', encoding='utf8').read()
rows = json.loads(src[src.index('=') + 1:].rstrip().rstrip(';'))
host = lambda u: (urlparse(u).hostname or '').lower().removeprefix('www.')

def check(x):
    req = urllib.request.Request(x['url'], headers={'User-Agent': UA, 'Accept': 'text/html,*/*'})
    r = {'id': x['id'], 'file': x['file'], 'url': x['url']}
    try:
        with urllib.request.urlopen(req, timeout=25, context=ssl.create_default_context()) as res:
            body = res.read(200000).decode('utf8', 'replace')
            r.update(code=res.status, final=res.geturl())
            if PARK.search(body): r['flag'] = 'parked'
    except urllib.error.HTTPError as e:
        r.update(code=e.code, final=e.geturl() or x['url'])
    except Exception as e:
        r.update(code=0, error=type(e).__name__)
    if r.get('final') and host(r['final']) != host(x['url']) and 'flag' not in r: r['flag'] = 'moved to ' + host(r['final'])
    # Bot walls answer 401/403/429/503 to scripts while working in a browser: a hint, not a verdict.
    r['status'] = 'ok' if r['code'] == 200 and 'flag' not in r else ('blocked' if r['code'] in (401, 403, 429, 503) else 'check')
    return r

with ThreadPoolExecutor(16) as ex: res = list(ex.map(check, rows))
summary = {s: sum(r['status'] == s for r in res) for s in ('ok', 'blocked', 'check')}
json.dump({'checked': datetime.date.today().isoformat(), 'summary': summary, 'results': res}, open(out, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print(json.dumps(summary))
md = ['## Link check', '', f"ok {summary['ok']}, blocked {summary['blocked']} (bot walls, check in a browser), to check {summary['check']}", '']
md += [f"- {r['file']} {r['url']}: {r.get('code')} {r.get('flag') or r.get('error') or ''}".rstrip() for r in res if r['status'] == 'check']
open(out.replace('.json', '.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
