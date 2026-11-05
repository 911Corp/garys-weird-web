Editorial log of the checks made before an earlier check

# Descriptions taken on trust, 2026-11-05

The owner asked to validate the remaining descriptions when their sources are reliable. Of the 43 still pending, only 2 had recorded page text that supports the description: National Cipher Challenge (render round 4, reworded to match) and Demozoo (fetch round 3). They are now checked.

The 41 others were never read against the site itself: 38 sit behind anti-bot protection (the neal.fun projects, TV Tropes, owner-selected sites) and 5 need a graphics card. They are marked `source_trusted` in `catalog/editorial-overrides.json` (key `trusted`), with their basis: owner-selected or curated list. The app shows them as taken on trust, never as checked. A later check from a real browser can move any of them to `primary_source_checked` by adding a source in `changes` and removing it from `trusted`.

Totals: 779 published, 686 in RANDOM, 738 checked, 41 taken on trust, 0 pending.

# Visual check, 2026-11-05

The pages pending after the text check were rendered and looked at, after a click, a hover or a longer wait where needed. 12 descriptions confirmed, 13 rewritten to match the page, Sampulator withdrawn (its page now shows only "hello daawg"). 43 remain pending: 38 sites block automated browsers, and 5 pages show nothing without a graphics card. Evidence: catalog/evidence/visual-check-2026-11-05.json.

# Final check, 2026-11-05

Every published address was fetched again before release. 728 answered 200, 50 refused automated reading (403 or 429, as before), and two needed action: Heavens-Above now answers only without www (address fixed), and line-mode.cern.ch answers HTTP 503 everywhere (paused: kept in the Archive, out of RANDOM). See catalog/editorial-overrides.json, keys url_fixes and paused.

# New sites, 2026-11-05

113 sites added (GWW-0688 to GWW-0800) from new sources: well-rated Show HN projects since 2018, JustOneMoreTab, awesome-useless-websites, UnknownIndex, IamBored.site, Odd Sites, and 31 reachable sites from the quarantine. Duplicates of anything already in the catalog, the quarantine or the too-known list were removed by address and by domain. Commercial pages, developer tools, AI products, parked domains and pages too thin to describe were left out.

Each new description was written from the site's own text (fetch-round-9.json, render-round-6.json) and is recorded as checked against that site. Phone behaviour: behaviour-pass-4.json. SineRider opens a dialog on load, so it stays in the Archive but out of RANDOM; two sites timed out in the phone pass and have no mobile verdict.

# Self-check, 2026-11-05

Every description still pending after an earlier check was compared with the text of its own site: pages fetched with curl, and JavaScript pages rendered in Chromium. The site itself is the primary source, recorded as the entry's source.

- 543 descriptions confirmed as written.
- 44 descriptions rewritten because the page text did not support a detail (an author, a date, a mechanic, a "Useless Web project" label, and so on). Unsupported claims were removed, never replaced by guesses.
- 69 left pending: 41 sites behind anti-bot checks (neal.fun, TV Tropes and several owner-selected archives), and 28 pages whose text is too thin to confirm the description (visual or canvas-only pages). Listed in catalog/editorial-overrides.json under self_check.pending.
- 2 sites withdrawn as offline: perpetual.pizza (deployment disabled, HTTP 402) and stumblingon.com (no connection). Listed under offline; their file numbers are kept so later numbers do not shift.
- 1 address fixed: Line Mode Browser 2013 now points to a page that still answers; the site root returns HTTP 503.
- 1 name fixed: GWW-0501 is titled HOOOOOOOOOOOOOO! on its own page.

Limits: a match with the site's own text confirms what the site says about itself, not independent facts about it. Link-check dates are not advanced by this operation.

# Editorial review: 2026-11-05

## Scope and limits

669 published descriptions screened editorially, including the 33 owner-selected destinations. 85 descriptions rewritten. 11 descriptions checked against primary web sources in this pass; the other 658 explicitly remain pending independent factual verification. The inventory is catalog/editorial-audit.json. It records the current and previous descriptions, source URLs, inherited evidence paths and verification scope for every entry. Prior fetches and page renders are evidence of the previous checks, not a new claim-level fact check.

No claim is made that all destination content is accurate, safe, currently available, or independently verified. The old status 'verified' remains a legacy link/content-check status; the new editorial status tracks independent description checks separately. The public release gate now blocks a fully verified launch while description checks are pending. Prototype discovery selection is preserved.

## Material corrections

- HotBits: radioactive generator retired at the end of 2022. The older body text still describes the former service; the retirement notice controls the current description.
- Voyager: interstellar space beyond the heliosphere is not beyond the Oort Cloud. No promise about current spacecraft communications is needed in the description.
- Library of Babel: finite page length and alphabet, algorithmic access, not every conceivable text in every script.
- Download More RAM, Make Everything OK, Space Elevator, Earth Reviews and Cube Rule: parody, fictional framing or a simulation is made explicit.
- Infinite Conversation: generated imitations, not a real recording or the real speakers' views.
- Spurious Correlations: statistical association does not establish causation.
- Faded Page: Canadian public-domain status is not a worldwide copyright guarantee.
- Data maps and counters: estimates, dataset coverage and simulations do not become exhaustive real-time observations.
- Food, faces, bodies and employment: descriptions identify the type of tool without promising individual outcomes or scientific precision.
- Generic Gary copy: removed invented visits/tests and claims of free access, no registration or safety.
- Verdict becomes Weirdness. The classification no longer uses UNSTABLE/CRITICAL as if it measured danger.
- Discard promise: fixed the exhausted-pool fallback which previously recycled discarded entries. Empty eligible pools now return no signal.
- URL validation: an allowed http(s) address format is no longer called a safety check.

## Primary-source checks

| Entry | Source | What the source supports |
| --- | --- | --- |
| HotBits | https://www.fourmilab.ch/hotbits/ | Retirement notice and original radioactive generator |
| Voyager | https://science.nasa.gov/mission/voyager/ and https://science.nasa.gov/solar-system/oort-cloud/facts/ | Heliosphere crossing and distant Oort Cloud |
| Library of Babel | https://libraryofbabel.info/about.html | 3,200-character pages and restricted alphabet |
| Download More RAM | https://downloadmoreram.com/ | Explicit parody and physical RAM |
| Space Elevator | https://neal.fun/space-elevator/ | Illustrated interactive ascent |
| Spurious Correlations | https://www.tylervigen.com/spurious-correlations | Correlation versus causation |
| Infinite Conversation | https://www.infiniteconversation.com/ | Machine-generated dialogue and non-attribution |
| StillTasty | https://www.stilltasty.com/ | Food storage and shelf-life reference |
| Faded Page | https://www.fadedpage.com/ | Volunteer ebooks and Canadian public-domain scope |
| Dimensions | https://www.dimensions.com/ | Reference dimensioned drawings |
| Spend Bill Gates' Money | https://neal.fun/spend/ | Game budget and preset catalogue |

Other attempted web checks with JavaScript-only or insufficient text were not promoted to independently verified descriptions.

## Maintenance

The versioned catalog/editorial-overrides.json is authoritative for the revised descriptions and sourced Gary notes. scripts/export-data.py reapplies it after a catalogue rebuild and regenerates the audit. Source TSVs are historical editorial inputs; an override deliberately supersedes their text. Link-check dates are never advanced by this editorial operation. Source links and independent-check status appear in the discovery report and terminal file output.
