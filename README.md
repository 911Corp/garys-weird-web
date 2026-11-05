# G:// Gary's Weird Web: Terminal Edition

Version 0.1, 2026-11-05. First validated public release. See CHANGELOG.md.

Start with START_HERE.md. Editorial scope and limits are in docs/EDITORIAL_REVIEW.md; Gary's voice is defined in docs/GARY_VOICE.md. Descriptions are checked against each site's own text, not fully fact-checked: see catalog/editorial-audit.json.

## Design direction
- One job: discovery. The home screen holds the [REDACTED] button, today's signal and the frequency chips.
- Dark interface, acid lime as the only accent, Geist and Geist Mono.
- Product signature: `G://`, `go /unknown`, the blind router.
- Gary is never drawn. Only his name appears.
- No long dashes in any file.

## Run
Serve this directory with `python3 -m http.server 8000` and open `http://localhost:8000`.
Opening `index.html` directly also works. No backend or build step. `dist/` is the static copy to host.

## Features
- RANDOM: blind router. Each draw uses the browser's secure random source, prefers unseen files, avoids the last category and any site family met in the last 14 draws, and weighs categories by the square root of their size. Frequency chips lock a category; high chaos and preview first live in the terminal.
- [REDACTED]: the main button. It opens a random destination in a protected tab; DECLASSIFY then decrypts the site's name.
- DISCOVERY REPORT: after DECLASSIFY, each site gets factual contents, Gary's take (commentary), an editorial weirdness score, its address, the historical link-check date and the independent description-check status. Source links are shown for checked descriptions. Specific Gary notes react to documented features; generic notes express opinions without inventing visits or tests.
- SHARE: after DECLASSIFY, Share opens the phone's share sheet, or links to X, Bluesky, Reddit, WhatsApp and Copy link. The link carries only the file number (`#s=GWW-0096`): the friend gets an incoming signal and opens it blind with [REDACTED]. No social scripts are loaded. Set `SITE_URL` in app.js once the site has a public address; opened from disk, sharing explains that it needs the site online. Per-file social previews (image cards) will need one static page per file at hosting time.
- REPORT A SITE THAT IS DOWN: "Site down? Report it" under the discovery report, or `report` in the terminal. Without a server the report stays on the device: the site is no longer drawn there, and the report is part of the passport export. Set `REPORT_TO` in app.js to an email address to also open a prefilled message to the catalog maintainer.
- FREQUENCIES: the category chips under the buttons lock a category; tap again to release it.
- TODAY'S SIGNAL: one file a day, derived from the date and the catalog size.
- RABBIT HOLE: terminal only. `rabbit` jumps to a file that shares tags with the last one.
- FAVORITES: ☆ Favorite on a revealed site, or the star on any archive row, adds the site to your favorites (Archive > Favorites, with a direct link). Terminal: `fav`, `favs`.
- ARCHIVE: the last tab. It shows what you discovered and your favorites. The full archive is locked behind a joke password: the most used password in France in 2025 (NordPass), `admin`. Lowercase only. The app gives no hint up front; Gary only reacts to failed tries. Unlock in the Archive or with `login admin` in the terminal. This is a game lock, not security: the catalog has to be in the page for RANDOM to work.
- TERMINAL: type `help`. Advanced modes live here: `blackbox` (sealed discoveries, unlocks after 3), `preview`, `chaos on|off`. Press `/` anywhere to open it, `Esc` to return to RANDOM.
- PASSPORT: progress, achievements and export. Everything stays on this device.
- Phones are not offered files marked as unsuitable for mobile, and today's signal never is one.
- Today's signal follows the UTC day, so everyone gets the same file at the same moment. Each file scores the day and the highest wins: adding files elsewhere does not move it.
- Site families: the *.toys sites count as one maker; on shared hosts such as github.io or pages.dev, and on suffixes such as co.uk, each maker counts separately.

## Design
Dark interface set in Geist and Geist Mono, served from `fonts/` (SIL Open Font License, see `fonts/OFL-Geist.txt`). Animations only move position and opacity, play once on arrival except the rotation dot, and stop entirely when the device asks for reduced motion. No full-screen overlay effects.

## Catalog
Statuses are in `docs/CATALOG.md`. To change the catalog, edit `catalog/source/entries.tsv`, then run
`python3 scripts/build-catalog.py`, `python3 scripts/export-data.py` and `sh scripts/sync-dist.sh`.
New entries go at the end of the file, because file numbers follow line order.
The quarantine lives in `catalog/pending.json` and is not shipped to visitors.

`python3 scripts/release-gate.py` is the public launch gate. Exit status 1 blocks a release.

## Limitations
- A browser cannot verify that an external website was actually visited.
- Unless `preview` is on in the terminal, RANDOM opens a site before showing its name.
- No server: favorites, discards, reports and the archive unlock stay on the device, in localStorage. G:// keeps nothing about visitors. Opening a site, or sharing through X, Bluesky, Reddit or WhatsApp, sends the usual requests to that service, at the visitor's choice.
- `safe()` in app.js only accepts http(s) addresses without embedded credentials. It is a format check, not a safety verdict: safety rests on the editorial review and the weekly link check.
- The Full archive password is part of the game, not a protection: the whole catalogue is already in the page.
- Hosting: GitHub Pages, https://911corp.github.io/garys-weird-web/, from the main branch. GitHub Pages ignores `_headers` (kept for a future host that reads it), so the CSP comes from index.html only and `frame-ancestors` cannot apply: the site can be framed elsewhere. The Netlify project garys-weird-web is reserved and unused.
- Links are checked weekly by `.github/workflows/link-check.yml` (`scripts/monitor-links.py`). It only reports, in the run summary: an editor decides what to pause or withdraw. Last report: `catalog/link-report.md`.
- 41 descriptions were validated on the reliability of their source, by the owner's decision, without being read against the site (`trusted` in catalog/editorial-overrides.json). The app shows the same "Description validated" line for every file.
- Raw check records (`catalog/evidence/`, 22 files, excerpts of third-party pages) are not published: they stay in the owner's private backups. `scripts/build-catalog.py` needs them to rebuild the catalogue; the site, the tests and the link check do not.
- Licence: all rights reserved (LICENSE). The Geist fonts keep their OFL licence.

## Tests
`node tests/e2e.mjs` needs `playwright` and `@axe-core/playwright`. Set `PW_ROOT` to a folder where they are installed.
