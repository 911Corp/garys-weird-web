# G:// Gary's Weird Web, V0.1

Open index.html directly, or serve this folder with `python3 -m http.server 8000` and open http://localhost:8000. No installation or build step is needed to run it. `dist/` is the copy to host.

- What the app does: README.md.
- What changed: CHANGELOG.md.
- Catalogue statuses: docs/CATALOG.md. Editorial scope and limits: docs/EDITORIAL_REVIEW.md. Gary's voice: docs/GARY_VOICE.md.
- catalog/editorial-audit.json accounts for all 779 published entries: 738 descriptions checked against their site or a source, 41 taken on trust by the owner's decision (sites behind anti-bot checks, or pages that need a graphics card to show anything), 0 pending. Do not describe this as a completely fact-checked catalogue: the 41 are labelled as taken on trust.

Rebuild the runtime data after editing the catalogue: `python3 scripts/build-catalog.py`, `python3 scripts/export-data.py`, `sh scripts/sync-dist.sh`. Then regenerate SHA256SUMS. The passport storage key and file numbers are stable across versions.

`python3 scripts/release-gate.py` is the public launch gate. It blocks while descriptions are pending, and counts apart those validated on trust. The site is live on GitHub Pages: https://911corp.github.io/garys-weird-web/ (main branch, repository root). Pushing to main updates it.
