#!/usr/bin/env python3
"""Reproducible editorial coverage inventory. Never promotes inherited link evidence to fact verification."""
import json, re
from pathlib import Path
from urllib.parse import urlsplit

root=Path(__file__).resolve().parents[1]
settings=json.loads((root/'catalog/editorial-overrides.json').read_text())
changes=settings['changes']
norm=lambda u: re.sub(r'^www\.', '', urlsplit(u).netloc.lower())+urlsplit(u).path.rstrip('/')
evidence={}
for path in sorted((root/'catalog/evidence').glob('*.json')):
    data=json.loads(path.read_text())
    if not isinstance(data,dict): continue
    for result in data.get('results',[]):
        if result.get('url') and (result.get('text') or result.get('title')):
            evidence.setdefault(norm(result['url']),[]).append(str(path.relative_to(root)))

data=json.loads((root/'catalog/catalog.v1.json').read_text())
rows=[]
for d in data['destinations']:
    change=changes.get(d['id'])
    old=d.get('original_description',d['description'])
    if change:
        d['original_description']=old
        d['description']=change[0]
    rows.append({'id':d['id'],'file':d['file'],'url':d['url'],'description':d['description'],
                 'previous_description':old,'owner':False})
(root/'catalog/catalog.v1.json').write_text(json.dumps(data,indent=1,ensure_ascii=False)+'\n')
for i,line in enumerate((root/'catalog/source/owner-approved.psv').read_text().splitlines()):
    if not line.strip(): continue
    url,name,*fields=line.split('|')
    id='owner-'+re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
    old=fields[-1]; change=changes.get(id)
    rows.append({'id':id,'file':f'GWW-A{i+1:03d}','url':url,'description':change[0] if change else old,
                 'previous_description':old,'owner':True})
assert set(changes)<=set(x['id'] for x in rows), 'Unknown editorial override'
rows=[x for x in rows if x['id'] not in settings.get('offline',{})]
for row in rows:
    change=changes.get(row['id'])
    sources=change[1] if change and len(change)>1 else []
    row.update(copy_screened=True,description_changed=bool(change) and change[0]!=row['previous_description'],
               factual_status='primary_source_checked' if sources else ('source_trusted' if row['id'] in settings.get('trusted',{}).get('ids',{}) else 'independent_review_pending'),
               fact_checked_at=settings['review_date'] if sources else None,
               sources=sources,inherited_evidence_files=evidence.get(norm(row['url']),[]))
summary={'files_screened':len(rows),'descriptions_rewritten':sum(x['description_changed'] for x in rows),
         'primary_source_checked':sum(x['factual_status']=='primary_source_checked' for x in rows),
         'source_trusted':sum(x['factual_status']=='source_trusted' for x in rows),
         'independent_review_pending':sum(x['factual_status']=='independent_review_pending' for x in rows)}
out={'version':settings['version'],'review_date':settings['review_date'],
     'scope':'Editorial screening of all published descriptions; targeted independent fact checking. Prior link checks are not fact checks.',
     'summary':summary,'records':rows}
(root/'catalog/editorial-audit.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(summary))
