# Forced Labor

Existing family chore web app: static HTML/JavaScript, Google Sheets assignments, and shared `daily/YYYY-MM-DD.json` content. Production repository: HunterRockwell/chores; Pages path: `/chores/`.

## Local development

Serve this directory with `python3 -m http.server 8765 --bind 127.0.0.1`.
Run fixture tests with `node --test tests/*.test.mjs` (Node 20+). No npm dependencies or build step.

## Shared content

GitHub Actions owns generation. Hourly scheduled runs use the current America/Los_Angeles calendar date and skip existing files, allowing catch-up after a delayed midnight run. This retains the current civil Pacific timezone behavior, including DST; fixed UTC-8 was historically ambiguous and has not been selected anew.

Manual workflow inputs: `date` (YYYY-MM-DD, optional) and `regenerate` (boolean). Manual runs may generate outside midnight and replace only the selected non-Thursday date. Thursday generation includes recycling every fourteen days from 2026-02-19; Thursday regeneration fails. Non-Thursday content rotates dad joke, inspiration and fun fact categories. API output is read from Responses `output[].content[]` text items and validated as structured title/message JSON. Failed/missing API credentials fail the run without replacing existing content. Credentials belong only in the Actions secret `OPENAI_API_KEY`.

The G button opens GitHub's authenticated workflow controls when no Make webhook is saved. Choose Run workflow, enter the date shown by the app, check replacement, and run. Return to the app; it polls for up to five minutes and reports success only after changed same-date JSON is published. This requires signing into GitHub as a repository writer. It is a working route through GitHub, with an extra confirmation form; a direct one-tap backend is not configured.

Optional existing Make webhook support remains. Its server-side action must dispatch this workflow with `date=ymd` and `regenerate=true`; keep write tokens server-side. HTTP OK means accepted, not published. Polling cannot identify a particular run if multiple people regenerate at once. A run-ID/version endpoint remains a future improvement. The historical Make configuration has not been recovered.

## Sheet contract and privacy

Keep existing gid 0 dated rows: A Date, B Kid, C Daily Chore, D Weekly Chore. The app requests A-D only, preserves Emmitt/Turner/Miles/Stewart order, and flags duplicate/unexpected or missing assignments. Restricting the query reduces browser data retrieval; it does not protect other columns in a publicly readable Sheet. Sharing settings and a separate contact-free public feed still need review before distribution changes. Never commit phone numbers, recipients, webhook URLs or API keys.

## Update behavior

No service worker exists. Refresh checks on return to the foreground and every minute reload the page when the local calendar date changes. This refreshes assignments for the new day; it does not prove a stale Home Screen installation receives new HTML. Preserve local preferences during real-device testing. Old `dark` maps to `noir`; unsupported themes fall back to Classic.

## Publication and icon

Pages uses GitHub Actions as its source. `pages.yml` verifies the app and stages only public HTML, manifest, PNGs, icons and dated content. Daily generation explicitly calls the same publishing workflow after a content commit; bot commits alone do not trigger a branch-based Pages build. The inactivity-disabled daily workflow was re-enabled on October 11, 2026. GitHub can disable inactive scheduled workflows again after 60 days; do not assume schedules continue indefinitely without verification.

The dynamic black/gold v2 icon is available in 180, 192, 512 and 1024 sizes. HTML and manifest use the new filenames to avoid reusing cached asset URLs. Existing iPhone Home Screen icons may still need re-adding from Safari; real-device icon refresh remains untested. Preserve saved theme/admin preferences when troubleshooting.

## Remaining integration checks

1. Jason authorized deployment and live generation/regeneration verification on October 11, 2026.
2. Keep actual scheduled and real-phone outcomes distinct from manually verified generation/publication.
3. Test installation/update on an actual iPhone.
4. Recover the chosen home M1 iMac/BlueBubbles configuration with Jason. Build/test a dry-run sender using the existing A-D rows and published daily JSON, then add per-recipient idempotence before a separately authorized delivery test and 6 AM activation. Do not assume this Mac is that server.

The authorized release deploys app/content/icon fixes. No reminder messages, Make mutation, Sheet edit or iMac schedule activation were performed.
