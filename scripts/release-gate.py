#!/usr/bin/env python3
"""Hard gate for the public V1 launch. Exit status 1 blocks the release. The prototype does not need to pass it."""
import json
from collections import Counter
from urllib.parse import urlparse
data=json.load(open('catalog/catalog.v1.json',encoding='utf8'))['destinations']
p=json.load(open('catalog/release_policy.json',encoding='utf8'))
review=lambda x:all(x['verification'].get(k) for k in p['required_reviews'])
live=[x for x in data if x['published'] and x['random_eligible'] and x['status']=='verified']
approved=[x for x in live if review(x)]
host=lambda x:(urlparse(x['url']).hostname or '').lower().removeprefix('www.')
domains=Counter(host(x) for x in live)
issues=[]
if len(approved)<p['minimum_published_destinations']: issues.append(f"Only {len(approved)}/{p['minimum_published_destinations']} fully reviewed")
if len(domains)<p['minimum_distinct_domains']: issues.append(f"Only {len(domains)}/{p['minimum_distinct_domains']} distinct domains")
if live and max(domains.values())/len(live)>p['maximum_domain_share']: issues.append('Domain concentration above 5%')
audit=json.load(open('catalog/editorial-audit.json',encoding='utf8'))
pending_facts=[r['id'] for r in audit['records'] if r['factual_status'] not in ('primary_source_checked','source_trusted')]
trusted=[r['id'] for r in audit['records'] if r['factual_status']=='source_trusted']   # accepted by the owner on source reliability, reported, not hidden
if pending_facts: issues.append(f'{len(pending_facts)} published descriptions still need independent factual verification')
pending={k:len(live)-sum(bool(x['verification'].get(k)) for x in live) for k in p['required_reviews']}
print(json.dumps({'published':len(live),'fully_reviewed':len(approved),'distinct_domains':len(domains),'top_domain':domains.most_common(1),'not_yet_reviewed':pending,'descriptions_accepted_on_trust':len(trusted),'launch_ready':not issues,'issues':issues},indent=2))
raise SystemExit(1 if issues else 0)
