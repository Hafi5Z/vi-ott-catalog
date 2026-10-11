# English OTT Picks — StreamRadar + GQ India

## Current version (2.0)

Vi has been replaced. The existing cloud URL and legacy catalog IDs remain unchanged so installed AIOMetadata/Nuvio links continue to work.

- Sources: [StreamRadar Just In](https://streamradar.bricksgenius.com/) and [GQ India's weekly release articles](https://www.gqindia.com/binge-watch).
- Daily GitHub Actions refresh at approximately 09:07 India time; no laptop server, API keys or new dependencies.
- Rolling **two calendar months** of public title facts, deduplicated by IMDb ID. This is not a claim of complete historical coverage.
- GQ explicit OTT dates are used when available. Where absent, recommendation publication dates are labelled as such. StreamRadar's mixed `releaseInfo` dates are **not** treated as OTT arrival dates; its entries carry a stable first-observed date instead.
- Dated GQ arrivals come first, newest first, followed by undated recommendation/StreamRadar picks. StreamRadar movie back-catalog additions from before the prior year are excluded; returning series are not filtered by first-season year.
- English-production filtering is conservative, based on metadata production countries, not the availability of English dubbed audio. It may omit international English productions. Ambiguous IDs are excluded and listed in `status.json`.
- Source identity, dates, source URLs and IDs only are archived. No GQ article prose, images, credentials, TV settings or video links are copied.
- **GQ currently blocks direct automated HTTP requests from the local build environment (403).** Today's browser-verified public release facts are seeded, but automatic GQ updates are not guaranteed. The deployed `status.json` reports cloud source health. No proxy or access-control workaround is used.
- Fetch failures preserve cached facts and expose source failure status; an empty movie/series result fails deployment instead of replacing the working feed.

Build: `npm test`, then `npm run build` (Node 22+). `scripts/refresh.mjs` is the current entrypoint. The older Vi parser/tests below are retained as historical code and are not the build entrypoint.

Cloud manifest: `https://hafi5z.github.io/vi-ott-catalog/manifest.json`. Import only its two catalogs into AIOMetadata. The existing add-on supplies metadata/catalogs only; your existing playback providers remain unchanged.

## Historical version (1.0, superseded)

A small personal, catalog-only feed for AIOMetadata and Stremio-compatible clients such as Nuvio. No playback streams, debrid keys, TV configuration or account credentials are stored here. Only public title identifiers and release facts are published.

## How it works

- GitHub Actions reads [Vi's weekly release page](https://www.myvi.in/blog/ott-releases-this-week) once daily, at approximately 09:07 India time (scheduled runs may be delayed).
- Exact English-language entries are matched to Cinemeta/IMDb IDs. Ambiguous titles without a cast match are reported rather than guessed.
- Two rows contain movies and series, sorted by **Vi-reported OTT arrival date**, not original movie release or first-season date. Upcoming entries wait until their reported date in India.
- Public facts are archived for 90 days so last week's entries do not disappear when Vi replaces its page. There is no fabricated historical backfill. Returning seasons appear only if Vi lists them.
- Vi's list is curated, not exhaustive, and may have reporting errors. Metadata identifies a title; it does not independently confirm its availability. This feed does not supply or guarantee playable sources.
- Fetch/parser failure fails the deployment and leaves the last working cloud feed online. Check `status.json` for freshness and unresolved titles.

## Import

AIOMetadata configuration → Catalogs → Custom Manifest Integration → paste `https://hafi5z.github.io/vi-ott-catalog/manifest.json` → Load Manifest → select both catalogs → Import Selected → save the AIO configuration. Refresh existing AIOMetadata catalogs in Nuvio and select the new rows in your Browse collections. No new Nuvio app, laptop server or playback add-on is needed.

## Maintenance and rollback

Run `npm test` and `npm run build` with Node 22+. No third-party package installation is required. The daily job runs entirely on GitHub; your laptop can be off. Actions schedules are best-effort and can be disabled by GitHub after inactivity; use the workflow's Run workflow control if needed.

To stop using the feed, remove its two imported catalogs from AIO and save. Other catalogs and playback providers are independent. To stop cloud updates, disable the workflow in GitHub. `data/releases.json` holds the small public archive, not any private configuration. Repository history keeps prior public versions.
