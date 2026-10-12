# Forced Labor

Existing family chore web app: static HTML/JavaScript, Google Sheets assignments, and shared `daily/YYYY-MM-DD.json` content. Production repository: HunterRockwell/chores; Pages path: `/chores/`.

## Local development

Serve this directory with `python3 -m http.server 8765 --bind 127.0.0.1`.
Run fixture tests with `node --test tests/*.test.mjs` (Node 20+). No npm dependencies or build step.

## Shared content

GitHub Actions owns generation. Hourly scheduled runs use the current America/Los_Angeles calendar date and skip existing files, allowing catch-up after a delayed midnight run. This retains the current civil Pacific timezone behavior, including DST; fixed UTC-8 was historically ambiguous and has not been selected anew.

Manual workflow inputs: `date` (YYYY-MM-DD, optional) and `regenerate` (boolean). Manual runs may generate outside midnight and replace only the selected non-Thursday date. Thursday generation includes recycling every fourteen days from 2026-02-19; Thursday regeneration fails. Non-Thursday content rotates dad joke, inspiration and fun fact categories. API output is read from Responses `output[].content[]` text items. Failed/missing API credentials fail the run without replacing existing content. Credentials belong only in the Actions secret `OPENAI_API_KEY`.

The Make webhook integration is not recovered. Before enabling phone regeneration, configure its authenticated server-side action to dispatch this workflow with `date=ymd` and `regenerate=true`; keep write tokens server-side. An HTTP OK means accepted, not published. The browser polls up to two minutes for changed same-date JSON, with request timeouts; it reports an unverified result if publication is slow or fails. Polling cannot identify a particular run if multiple people regenerate at once. A run-ID/version endpoint remains a future improvement. No credential or webhook setup was performed locally.

## Sheet contract and privacy

Keep existing gid 0 dated rows: A Date, B Kid, C Daily Chore, D Weekly Chore. The app requests A-D only, preserves Emmitt/Turner/Miles/Stewart order, and flags duplicate/unexpected or missing assignments. Restricting the query reduces browser data retrieval; it does not protect other columns in a publicly readable Sheet. Sharing settings and a separate contact-free public feed still need review before distribution changes. Never commit phone numbers, recipients, webhook URLs or API keys.

## Update behavior

No service worker exists. Refresh checks on return to the foreground and every minute reload the page when the local calendar date changes. This refreshes assignments for the new day; it does not prove a stale Home Screen installation receives new HTML. Preserve local preferences during real-device testing. Old `dark` maps to `noir`; unsupported themes fall back to Classic.

## Remaining integration checks

1. Review and approve the local diff before publishing to main/Pages.
2. Verify Actions secret, generation, committed daily file, Pages publication and phone regeneration end to end. No live API call was made during development.
3. Test installation/update on an actual iPhone.
4. Recover the chosen home M1 iMac/BlueBubbles configuration with Jason. Build/test a dry-run sender using the existing A-D rows and published daily JSON, then add per-recipient idempotence before a separately authorized delivery test and 6 AM activation. Do not assume this Mac is that server.

No deployment, external message, Make mutation, Sheet edit or reminder activation was performed in this continuation.
