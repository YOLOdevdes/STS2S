# Pitfalls Research

**Domain:** PWA card browser with scraped game data and rule-based synergy engine
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH (data acquisition risks HIGH confidence; synergy engine quality MEDIUM; PWA cache behavior HIGH)

---

## Critical Pitfalls

### Pitfall 1: Mobalytics ToS Explicitly Prohibits Scraping

**What goes wrong:**
The scraper is built, works, and the pipeline runs — then Mobalytics detects it, blocks the IP, or sends a cease-and-desist. Worse: if the project ever becomes visible (productized, monetized, or mentioned publicly), Mobalytics has legal standing to demand takedown because their ToS explicitly prohibits automated data collection AND commercial use of their content.

**Why it happens:**
Developers treat ToS as theoretical friction. The Mobalytics ToS has two relevant clauses: (1) "Attempt to access or search the Services or Content through the use of any engine, software, tool, agent, device or mechanism (including spiders, robots, crawlers, data mining tools or the like)" — explicitly prohibited; and (2) "Use the Services or Content, or any portion thereof, for any commercial purpose or for the benefit of any third party" — also prohibited. The `/slay-the-spire-2/wiki/` path is not blocked in `robots.txt` (only API endpoints and reward pages are blocked), which means indexing is technically allowed but automated extraction via bots is still ToS-violating. The distinction matters legally: robots.txt disallows search engine indexing; ToS governs everything else.

**How to avoid:**
Build the scraper as a developer-only tool, not a production pipeline, until the legal exposure is assessed. Two mitigation strategies:
1. **Build the scraper but run it manually** — commit `cards.json` to the repo like a fixture file, updated by a human on a patch-day schedule. No automated cron = no continuous ToS violation.
2. **Reach out to Mobalytics** — they may grant permission for a non-commercial fan tool. Mobalytics has historically been community-friendly; an email asking for explicit permission costs nothing and eliminates risk.
If the project becomes commercial, switch to the official STS2 game data directly (Mega Crit has released data files for STS1 mod tools; similar may come for STS2).

**Warning signs:**
- HTTP 403 or 429 responses from Mobalytics during scraper runs
- Mobalytics changing their Turnstile configuration to block headless browsers
- Cease-and-desist contact or takedown request
- The scraper outputs `null` or incomplete card arrays (silent ToS-based filtering)

**Phase to address:**
Data acquisition phase — before building any automated CI pipeline. Validate scraping approach AND legal posture before committing to the architecture.

---

### Pitfall 2: Cloudflare Turnstile Silently Blocks the Scraper

**What goes wrong:**
The Playwright scraper runs in CI, appears to succeed (exits 0), but returns incomplete or empty card data because Cloudflare Turnstile challenged the headless browser and the scraper failed silently — no error thrown, just a captcha page or empty state stored as the output.

**Why it happens:**
Cloudflare Turnstile detects headless browser fingerprints. As of early 2025, Cloudflare rolled out improved detection that flags standard Playwright in its default configuration. The challenge appears as a rendered page — Playwright doesn't throw an exception; it receives a valid HTTP 200 with challenge HTML. A scraper that doesn't validate its output will commit a `cards.json` containing 0 cards or a captcha page fragment, and the PWA will silently serve empty state to users.

**How to avoid:**
Two defenses at the data acquisition layer:
1. **Try the GraphQL endpoint first** (`https://mobalytics.gg/api/sts2/v1/graphql/query` via HTTP POST). If it accepts unauthenticated queries, Turnstile is irrelevant — there's no browser involved. This is the highest-priority validation task.
2. **If Playwright is needed:** extract Apollo preloaded state from the raw HTML (`window.__APOLLO_STATE__` or equivalent serialized state in the SSR HTML). This is available without triggering Turnstile because it's in the initial HTML payload and does not require full JS execution. Test with `curl` before resorting to headless browsers.
3. **Mandatory output validation:** the scraper must assert `cards.length > 400` before writing `cards.json`. Any output below that threshold should fail the CI job loudly, not silently commit bad data.

**Warning signs:**
- `cards.json` in CI output has fewer cards than a manual check shows
- Scraper run completes in under 3 seconds (suspicious — real page load + data extraction takes longer)
- CI output contains HTML fragments or `{"cf_chl_prog": ...}` patterns in the JSON
- Turnstile widget renders in Playwright screenshots (enable screenshot on failure)

**Phase to address:**
Data acquisition phase. The very first task should be: manually test the GraphQL endpoint. This determines the entire scraper architecture.

---

### Pitfall 3: Scraped Schema Breaks Silently on Patch Day

**What goes wrong:**
Mobalytics updates their wiki after a game patch (card renamed, new keyword added, field restructured). The scraper runs, produces output, passes the count assertion (>400 cards), and commits. The PWA silently shows incorrect card data — wrong values, missing keywords, broken synergy detection — because the schema changed and the parsing code has no validation.

**Why it happens:**
STS2 is in active Early Access with frequent, significant patches. Evidence: March 2026 saw a 0.101.0 patch that reverted major card changes from 0.100.0, including renaming and reworking cards. The scraper's extraction logic targets specific field names and CSS selectors that are coupled to the Mobalytics page structure. When either the game data or the page layout changes, parsing silently degrades.

**How to avoid:**
Treat the scraper output as a typed contract. Implement JSON Schema validation as the final step of the scraper:
- Required fields: `id`, `name`, `character`, `cost`, `type`, `keywords[]`, `description`
- Validate all required fields are present on every card
- Assert known-stable cards have expected values (e.g., "Strike" has `cost: 1`)
- Alert on any new keywords that aren't in the known keyword registry (new mechanics need rule engine updates)
Fail the CI job loudly when validation fails instead of committing degraded data. Keep the previous `cards.json` as a fallback.

**Warning signs:**
- Patch day coincides with reduced synergy suggestion count (keyword parsing failed)
- Cards appear with `null` cost or empty `keywords[]`
- New keyword appears in Mobalytics descriptions but produces no synergies
- Community reports "card X is missing" or "card X shows wrong data"

**Phase to address:**
Data acquisition phase (add validation to scraper), and synergy engine phase (register new keywords before they go live in CI pipeline).

---

### Pitfall 4: Synergy Engine Produces Meaningless Noise at High Recall

**What goes wrong:**
The keyword-matching algorithm fires on every card that shares a keyword with the target card. For a card with `Strength` scaling, this returns 30+ cards. The synergy list is technically correct but useless for mid-run decision-making — every Strength card is "synergistic" with every other. Users see a wall of results and stop trusting the tool.

**Why it happens:**
Rule-based synergy detection without weighting produces flat, undifferentiated output. Keyword co-occurrence is necessary but not sufficient for a meaningful synergy — the cards also need to interact mechanically in a way that produces compounding value beyond just "both scale with Strength." The SpireGenius competitor explicitly addresses this: "does this archetype have enough support to feel real?" — meaning even in a more sophisticated tool, the challenge is filtering signal from noise.

**How to avoid:**
Implement a two-level classification system from the start:
- **Direct synergy (high signal):** Card A explicitly triggers Card B's mechanic, or Card A's output is Card B's input (e.g., "Exhaust a card" + "gain block when you exhaust").
- **Archetype support (low signal):** Both cards benefit from the same scaling resource but don't directly interact (e.g., both scale with Strength).
Show direct synergies first with a distinct visual treatment. Show archetype support as secondary, collapsed by default or clearly labeled "shares archetype." Do NOT present both as equal "synergies."
Define the rule schema to carry a `type` field: `"direct" | "archetype"`. This is a schema decision that cannot be retrofitted cheaply once the engine is built with 50+ rules.

**Warning signs:**
- Any card returns more than 10-12 synergy results on its first pass
- Searching "Strike" returns most of the Ironclad deck as "synergistic"
- No result has a higher confidence/priority than any other result
- User feedback: "the synergies aren't useful" or "too many results"

**Phase to address:**
Synergy engine design phase — establish the `direct` vs `archetype` distinction in the rule schema BEFORE writing individual rules. Retrofitting this distinction after 50 rules are written is painful.

---

### Pitfall 5: Stale Card Data Served from Cache After Patch

**What goes wrong:**
A significant game patch drops. The CI scraper runs and commits a new `cards.json`. The CDN serves the new file. But users who launched the PWA before the patch still see old card data — sometimes for days — because the service worker cached the previous `cards.json` aggressively and isn't fetching the update.

**Why it happens:**
`StaleWhileRevalidate` serves from cache immediately and fetches the update in the background. The update is available for the NEXT session, not the current one. If a user launches the PWA during a run, plays for 2 hours (common for STS2), then asks about a card that was patched — they get wrong data. Additionally, Safari on iOS caches aggressively and may not respect `Cache-Control: no-cache` on the cards endpoint, compounding the problem.

**How to avoid:**
Two complementary strategies:
1. **Version the cards URL:** Serve `cards.json?v={hash}` instead of `cards.json`. When the file changes, the URL changes, the cache misses, and fresh data is fetched. `vite-plugin-pwa` can inject this hash at build time. This guarantees freshness at the cost of always fetching on version bump.
2. **Add a lightweight freshness signal:** Store a `last_fetched` timestamp in IndexedDB alongside the cached cards. On app focus (Page Visibility API), check if `last_fetched` is more than 24 hours old — if so, refetch in the background and notify the user with a non-blocking "Data updated" toast. Do not force a reload mid-session.
Never use `CacheFirst` for `cards.json` — use `NetworkFirst` with a cache fallback, or `StaleWhileRevalidate` with aggressive TTL (max 24 hours).

**Warning signs:**
- Users report incorrect card costs or missing keywords after a patch
- `cards.json` Last-Modified header in browser DevTools Network tab is older than the most recent CI run
- Workbox logs show cache hit but no background revalidation queued

**Phase to address:**
PWA service worker phase — the caching strategy for `cards.json` must be defined explicitly, not left to Workbox defaults.

---

### Pitfall 6: Service Worker Update Loop Breaks the Installed PWA

**What goes wrong:**
A new version of the app is deployed. The installed PWA detects a service worker update but users don't see the prompt or the app auto-reloads at an unexpected time, losing their current search state. On first install, the "prompt for update" dialog may not appear at all due to a known vite-plugin-pwa timing issue where the initial SW registration fires within the same 1-minute window as the update detection, causing the update event to be misclassified.

**Why it happens:**
Workbox-window uses a time-based heuristic: if a new SW is detected within 60 seconds of the initial registration, it treats the update as an "external" event rather than an "app update" event. This causes vite-plugin-pwa's `onNeedRefresh` callback to either not fire or fire with wrong data. Issue #789 in the vite-pwa/vite-plugin-pwa repo documents this for first-update scenarios. Separately, auto-update mode (`registerType: 'autoUpdate'`) will force-reload any open tab when an update activates — destroying any in-progress search state.

**How to avoid:**
Use `registerType: 'prompt'` (not `autoUpdate`) so the user controls when to refresh. This is essential for a mid-run tool where interrupting state is a real UX failure. Implement the update notification as a non-blocking banner: "New card data available — tap to refresh." Do not force-reload. Test the update flow explicitly using `vite-plugin-pwa` devtools with `devOptions: { enabled: true }` before shipping.

**Warning signs:**
- Installed PWA shows stale UI after deployment without user action
- Users report the app "reloaded itself" unexpectedly during a session
- `onNeedRefresh` callback never fires after the first install
- Update prompt appears but clicking it doesn't reload the page (issue #789)

**Phase to address:**
PWA service worker phase — test the full install → update → prompt flow in a staging environment before launch.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding keyword list in synergy rules | Fast to build, no abstraction needed | Every new STS2 keyword requires touching rule files AND adding the keyword to parsing — two places to update, guaranteed to drift | Never — use a keyword registry that rules reference by key |
| Single flat `synergies` array per card | Simple data structure | Cannot distinguish direct synergies from archetype support; adding tiers later requires rewriting all rule outputs | MVP only, with explicit plan to add `type` field before user feedback rolls in |
| Running scraper on every CI push | Always-fresh data in dev | Mobalytics rate limiting, ToS risk, CI minutes consumed, fragile if Mobalytics is down during push | Never — use scheduled cron (weekly) or manual trigger only |
| Storing full card descriptions in the search index (MiniSearch) | Finds cards by description text | Index size balloons; description text changes frequently on patches causing full re-index | Acceptable for MVP — but field-weight the index so name/keywords rank higher than description |
| No schema validation on scraper output | Simpler scraper code | Silent data corruption on patch day; app serves wrong data with no alert | Never — always validate card count and required fields before committing |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Mobalytics GraphQL endpoint | Assuming GET requests work | GraphQL requires POST with `Content-Type: application/json` and a valid query body; a 400 on GET is expected, not a signal that the endpoint requires auth |
| Mobalytics GraphQL endpoint | Assuming no auth = always no auth | The endpoint may work without auth today but require auth after Mobalytics detects scraping traffic; build the scraper to handle 401/403 gracefully and fall back to Playwright extraction |
| GitHub Actions cron | Using the default GitHub Actions runner IP | GitHub runner IPs are publicly listed and known to scraping-detection systems; Cloudflare may block them proactively even before Turnstile fires |
| CDN-served `cards.json` | No `Cache-Control` headers set | Netlify/Cloudflare Pages serve static assets with long-lived cache by default; without explicit `Cache-Control: no-cache, must-revalidate` on `cards.json`, CDN edge nodes serve stale data even after redeployment |
| vite-plugin-pwa periodic updates | Calling `r.update()` without checking online status | If the user is offline, the update check throws a network error; wrap update calls in `if (navigator.onLine)` guards |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recomputing all synergies on every card selection | Imperceptible at 50 cards; noticeable at 600 | Precompute the synergy graph at data load time; memoize by card ID | When card corpus exceeds ~300 cards on low-end mobile |
| Rebuilding MiniSearch index on every app load | Fast when `cards.json` is small | Persist the serialized index in IndexedDB; only rebuild when `cards.json` version changes | When `cards.json` grows beyond ~200KB — rebuild time becomes perceptible on mobile |
| Fetching `cards.json` on every app mount | Acceptable with service worker cache | Always check IndexedDB first; fetch only when TTL expired or version changed | Immediately on slow connections — adds 200-800ms to every cold start |
| Rendering all synergy results in a single list | Fast at 5 results | Virtualize or paginate if direct+archetype synergies together exceed 20 items | When synergy rules mature and a popular card has 20+ archetype associations |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing the scraper output (`cards.json`) with sensitive Mobalytics session tokens baked in | Token exposure in public git history; Mobalytics account ban | Scraper should never require or store session tokens; use only public endpoints or Playwright without authentication |
| Exposing Playwright execution in a public CI workflow without protecting credentials | If proxy/residential IP service credentials are added later, they'd be visible in public repo logs | Store credentials as GitHub Actions secrets, never inline in workflow YAML |
| Serving unvalidated scraper output directly to users | A malformed card (injected HTML in card description from a compromised Mobalytics entry) could render in the UI | Sanitize card descriptions before rendering; treat all scraped text as untrusted input |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Search requires exact card name | Mid-run, players misremember card names ("Bash" vs "Bashing") | Enable prefix + fuzzy matching via MiniSearch from the start; never require exact match |
| No character filter default | Player searches for Ironclad cards, sees Necrobinder cards in results, loses trust in the tool | Default to a selected character on first launch; persist selection in localStorage; make it the first visible control |
| Synergy results load with visible delay | In a tense mid-run moment, a 300ms spinner feels broken | Precompute synergy graph at startup; card selection should return results in <16ms (single frame) |
| Installed PWA requires manual "add to home screen" instruction | iOS users don't know to do this; they just use the browser tab and lose the speed benefit | Add an in-app banner with step-by-step iOS install instructions when `display-mode: browser` is detected and `standalone` is not |
| Data staleness is invisible | User makes deck decisions based on pre-patch card values without knowing the data is old | Show `last updated: [date]` prominently; add visual indicator when data is older than 14 days |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Scraper:** Outputs 500+ cards — verify schema validation is also passing (count alone is insufficient)
- [ ] **Synergy engine:** Shows synergies for a test card — verify `direct` vs `archetype` distinction exists in the output schema, not just in the display layer
- [ ] **PWA install:** App installs on Chrome desktop — verify the install flow works on Safari iOS with manual "add to home screen," and that the service worker registers correctly after install (not just on web)
- [ ] **Cache refresh:** App shows new `cards.json` after a simulated update — verify Safari iOS also picks up the update (Safari caches more aggressively than Chrome)
- [ ] **Character filter:** Filter shows correct cards — verify the filter also scopes synergy results, not just the card browse list
- [ ] **MiniSearch index:** Search returns results — verify the index is persisted in IndexedDB and not rebuilt from scratch on every page load
- [ ] **CI pipeline:** Scraper runs successfully in GitHub Actions — verify it runs on a realistic Cloudflare-challenged environment, not just a fast CI network that happens to be clean

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mobalytics blocks scraper or sends ToS notice | MEDIUM | Switch to manual scraper runs; reach out to Mobalytics for permission; explore alternative data sources (community-maintained JSON, official STS2 data files if released) |
| Scraped schema breaks silently | LOW (if validation exists) / HIGH (if not) | Revert to previous `cards.json`; fix parser against new schema; add schema version assertion to CI |
| Synergy engine has wrong tier classification | MEDIUM | Data migration: update rule schema to add `type` field, re-run rules against all cards, redeploy |
| Users report stale data after patch | LOW | Force-invalidate CDN cache (Netlify/Cloudflare Pages have one-click cache purge); add cache-busting hash to `cards.json` URL going forward |
| Service worker update loop breaks installed PWA | MEDIUM | Issue a new deployment with `skipWaiting: true` to forcibly replace the broken SW; add explicit SW version check in next release |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Mobalytics ToS violation | Data acquisition — first task | Review ToS; reach out if needed; document decision before building pipeline |
| Cloudflare Turnstile blocking scraper | Data acquisition — first task | Test GraphQL endpoint manually; test Playwright extraction; assert output count > 400 |
| Schema breakage on patch day | Data acquisition pipeline | JSON Schema validation in CI; known-card assertion tests; alert on new unknown keywords |
| Synergy engine noise / no tier distinction | Synergy engine design — before writing rules | Rule schema includes `type: "direct" | "archetype"` field; first card has both tier types represented |
| Stale cache after patch | PWA service worker phase | Test with simulated patch: update `cards.json`, verify PWA fetches new version within 24 hours on Chrome + Safari iOS |
| Service worker update loop | PWA service worker phase | Test install → deploy new version → verify prompt appears and reload works correctly on both Chrome and Safari iOS |
| Mid-run search latency | Search + data loading phase | Measure: card tap → synergy results displayed must be < 100ms on mid-range Android device |
| iOS install friction | PWA polish phase | Test full install flow on iOS Safari; in-app install instructions banner present and functional |

---

## Sources

- [Mobalytics Terms of Service](https://mobalytics.gg/terms/) — explicit scraping prohibition and commercial use restriction (HIGH confidence; official ToS)
- [Mobalytics robots.txt](https://mobalytics.gg/robots.txt) — `/slay-the-spire-2/wiki/` is not disallowed; API endpoints are blocked (HIGH confidence; direct fetch)
- [Cloudflare Turnstile detection — ZenRows](https://www.zenrows.com/blog/playwright-cloudflare-bypass) — standard Playwright detected by Cloudflare as of early 2025 (MEDIUM confidence; WebSearch verified by multiple scraping sources)
- [Bypass Cloudflare with Playwright — Kameleo](https://kameleo.io/blog/how-to-bypass-cloudflare-with-playwright) — Camoufox / stealth techniques (MEDIUM confidence; WebSearch)
- [vite-plugin-pwa Periodic SW Updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates) — online status guard, timing edge cases (HIGH confidence; official docs)
- [vite-plugin-pwa Issue #789](https://github.com/vite-pwa/vite-plugin-pwa/issues/789) — prompt-for-update doesn't reload on first update (HIGH confidence; official repo issue tracker)
- [Taming PWA Cache Behavior — Infinity Interactive](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior) — Safari aggressive caching of API responses (MEDIUM confidence; WebSearch, corroborated by multiple PWA sources)
- [PWA on iOS — BrainHub](https://brainhub.eu/library/pwa-on-ios) — 50MB storage cap, 7-day script-writable storage limit, no install prompt (HIGH confidence; multiple sources agree)
- [STS2 Patch Notes — GameRant, March 2026](https://gamerant.com/slay-the-spire-2-march-beta-update-patch-notes/) — evidence of high patch velocity, card name/value reversions in Early Access (HIGH confidence; news source, cross-referenced)
- [STS2 Synergies — SpireGenius](https://spiregenius.com/synergies/) — competitor approach: archetype-level synergy detection, explicit about "real support vs thin support" distinction (MEDIUM confidence; direct observation)
- [JSON Schema validation for pipelines — DataHen](https://www.datahen.com/blog/ensuring-data-quality-with-json-schema-validation-in-data-processing-pipelines/) — make pipeline fail loudly on schema mismatch (MEDIUM confidence; WebSearch)
- [GitHub Actions IP ranges discussion](https://github.com/orgs/community/discussions/26442) — GitHub runner IPs are publicly listed (HIGH confidence; official GitHub community)
- [STS2 keywords — Mobalytics guide](https://mobalytics.gg/slay-the-spire-2/guides/keywords) — keyword list reference for rule engine (MEDIUM confidence; may change with patches)

---

*Pitfalls research for: STS 2 Strategizer — PWA card browser with scraped data and rule-based synergy engine*
*Researched: 2026-03-30*
