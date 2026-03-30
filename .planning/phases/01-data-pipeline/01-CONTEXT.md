# Phase 1: Data Pipeline - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Scrape Mobalytics card data into a validated static `cards.json` and set up a GitHub Actions cron job to keep it current with STS2 patches. The output of this phase is a single file — `cards.json` — that every subsequent phase depends on. Card browser UI, synergy engine, and PWA features are all out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Data Acquisition Strategy
- **Primary:** Attempt direct GraphQL POST to the Mobalytics endpoint (`/api/sts2/v1/graphql/query`) first — if it responds unauthenticated, use that path
- **Fallback:** Playwright headless browser extraction if the GraphQL endpoint requires auth or is blocked
- **Legal posture:** Non-commercial fan tool — proceed without seeking explicit Mobalytics permission
- **On failure:** CI job fails loudly; existing `cards.json` is never overwritten with bad data. Last known good state is preserved.

### Playwright Extraction (if needed)
- Claude's Discretion: choose between Apollo state extraction (`window.__APOLLO_STATE__`) or DOM scraping, whichever is more reliable and maintainable

### cards.json Schema
- **Structure:** Single flat array of card objects — one file, one fetch, filtered client-side
- **Keywords/mechanics:** Structured array of tag objects: `{ "id": "exhaust", "label": "Exhaust", "category": "mechanic" }` — typed and queryable, not flat strings
- **Images:** Store Mobalytics CDN URLs directly in `image_url` field; no self-hosting in v1
- **Colorless cards:** Claude's Discretion — represent whichever way is cleanest for the synergy engine to query (e.g. `characters: ["colorless"]` as a distinct sentinel, or `is_colorless: true` flag)

### Validation
- Scraper validates its own output before committing: card count must meet a minimum threshold (≥400), required fields must be present
- Schema validation catches silent corruption when Mobalytics changes structure after a patch

### Auto-Refresh
- GitHub Actions cron job re-scrapes on a schedule and commits updated `cards.json` when card data changes

### Claude's Discretion
- Playwright extraction method (Apollo state vs DOM) — pick whichever is more reliable
- Colorless card representation in schema — pick whichever is cleaner for character pool queries
- Exact refresh schedule for the cron (daily, weekly, etc.)
- GraphQL query shape and fields requested

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the first patterns

### Integration Points
- Output: `public/cards.json` (or equivalent static asset path) — consumed by Phase 2 app shell at startup
- Output schema must include: `id`, `name`, `cost`, `type`, `rarity`, `description`, `upgraded_description`, `character` (or `characters`), `tier`, `keywords` (structured tag objects), `image_url`

</code_context>

<specifics>
## Specific Ideas

- The STACK.md research identified `https://mobalytics.gg/api/sts2/v1/graphql/query` as a candidate GraphQL endpoint — this should be the first thing tested in the spike
- Research found ~568 cards in Mobalytics as of 2026-03-30
- Cloudflare Turnstile is present on the site but Apollo state extraction from the page sidesteps it entirely (no challenge required)
- STS2 launched Early Access March 5, 2026 — patch velocity is high; auto-refresh is not optional

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-pipeline*
*Context gathered: 2026-03-30*
