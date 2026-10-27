# Forced Labor — family edition

Static HTML/JavaScript on GitHub Pages; Google Sheets A–D supplies dated chore assignments. Add future dates to the existing Sheet at any time. Footer content does not depend on assignment coverage.

## Sourced family footer

`family/content.json` installs 70 short sourced messages and 52 weekly official Getty photo embeds, plus eight separately credited public-domain alternatives. Quotes, paraphrases and reported moments are distinguished. Content is for this family edition; remove/replace `family/`, its script and footer integration before App Store distribution. No raw Getty preview downloads are published.

Daily selection is deterministic in America/Los_Angeles and works even without a dated JSON record. The hourly Daily Quote Generator writes the same sourced selection to `daily/YYYY-MM-DD.json`; regeneration advances within the approved library without AI calls or API keys. Old AI jokes do not override the new library. G retains the GitHub-authenticated workflow form and waits for a changed published same-date record. Thursdays cannot be regenerated.

Thursday trash text remains visible independently of game/photo content. Recycling alternates from February 19, 2026. Both trash/recycle spans stay on one centered line, shrinking equally only when necessary. Getty's official viewer retains its provider credit/caption and has a public-domain alternate control if it cannot load.

`family/football.json` caches Alabama games and team logo references. `.github/scripts/update-football.mjs` refreshes regular and postseason entries for the current and next season using ESPN public schedule/summary feeds on the existing hourly workflow. Actual Alabama fixtures, including weekday bowls/playoffs, activate game cards; playoff calendar dates alone do not. Exact unconfirmed times remain TBA. A Thursday game replaces only the photo, keeping the garbage header above it. Odds are best-effort, labeled with provider/time and hidden when older than two hours or after kickoff; absent lines display unavailable. No paid service/account is configured. Failed updates retain the last good cache and log a workflow warning. Schedule-only updates also trigger explicit Pages publication.

## Development and deployment

Node 20+: `node --test tests/*.test.mjs`. Serve locally with `python3 -m http.server 8767 --bind 127.0.0.1`. No dependencies/build step. `pages.yml` stages public HTML/manifest/PNGs plus icons, daily and family directories. Research notes, raw source pages, recipients and secrets are never staged.

Pages uses GitHub Actions. Hourly updates run in GitHub, not on an iMac. Manual workflow date/regenerate inputs retain the existing controls; GitHub can suspend inactive scheduled workflows after 60 days. Do not interpret one manual success as proof of future unattended execution.

## Home Screen icon

The v3 180/192/512px icons are resized directly from Jason's supplied `FL logo.png`; new filenames prevent reusing the v2 asset URLs. Existing iPhone Home Screen shortcuts may need to be re-added from Safari. Actual iPhone cache/update behavior must be checked on-device.

## Assignments and boundaries

Sheet gid 0: A Date, B Kid, C Daily Chore, D Weekly Chore. Only A–D is queried; assignments retain Emmitt/Turner/Miles/Stewart order and flag duplicates or missing data. Sheet permissions are not changed. The footer remains independent when a date has no chores. No outbound family-message automation, Apple account change or iMac configuration is included.
