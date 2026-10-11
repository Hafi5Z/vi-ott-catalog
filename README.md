# Vi English OTT Arrivals

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
