# Project Research Summary

**Project:** STS 2 Strategizer
**Domain:** PWA card browser with rule-based synergy engine and scraped game data
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH

## Executive Summary

STS 2 Strategizer is a mobile-first Progressive Web App built as a mid-run reference tool for Slay the Spire 2. The product requires two distinct systems: a Node.js data pipeline (Playwright scraper running in GitHub Actions) that produces a static `cards.json` file, and a client-side React PWA that consumes it. The PWA is entirely client-side — no backend required. Card data is served from a CDN as a static asset, cached locally via IndexedDB and a Workbox service worker, and searched in-memory using MiniSearch. The defining differentiator over all existing tools (SpireSpy, sts2tools.com, slaythespire.gg) is an algorithmic synergy engine that produces per-card synergy results scoped to the player's active character pool — with combo breakdowns and value ratings, not just lists.

The recommended stack is mature and well-documented: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 for the app shell; TanStack Query + idb for data loading; MiniSearch for search; Zustand for global state. The synergy engine is a pure TypeScript module with rules defined as typed data objects, each scoped to a mechanic keyword, tested independently with Vitest. This architecture supports the performance requirement (card tap to synergy results in under one frame on mid-range Android) and makes the engine easily extendable as STS2 receives patches during Early Access.

The most serious risk is legal, not technical: Mobalytics ToS explicitly prohibits automated data extraction. This must be resolved before building any CI pipeline — either by contacting Mobalytics for permission or by treating the scraper as a developer-only manual tool. The second critical risk is the Cloudflare Turnstile bot protection that guards the Mobalytics SPA, which can silently produce empty output if the scraper is not validated correctly. Both risks concentrate in Phase 1 and must be addressed before any downstream work begins, because every feature depends on card data being available, correct, and legally obtained.

---

## Key Findings

### Recommended Stack

The stack is standard for a 2025 greenfield client-side PWA. Vite 8 replaces webpack entirely; `vite-plugin-pwa` wraps Workbox and handles service worker generation with zero custom configuration. TypeScript is non-negotiable given the complexity of the card schema and synergy rule types. Tailwind CSS v4's CSS-first config is appropriate for a greenfield project with no migration cost.

For data, the pipeline is deliberately simple: the scraper writes a single `public/cards.json`, GitHub Actions commits it on a cron schedule, and Netlify/Cloudflare Pages redeploys automatically. There is no API server. The "backend" is a static JSON file on a CDN.

**Core technologies:**
- React 19 + Vite 8: UI framework and build tool — dominant PWA ecosystem, best-in-class HMR, native PWA plugin support
- TypeScript 6: Type safety across card schema, rule types, and synergy results — required for maintainability as rules and schema evolve with patches
- Tailwind CSS v4: CSS-first styling — 100x faster incremental builds vs v3; compatible with the PWA's modern-browser-only audience (Safari 16.4+)
- vite-plugin-pwa + Workbox 7: Service worker and manifest generation — zero-config `generateSW` mode; `StaleWhileRevalidate` for `cards.json`
- MiniSearch 7: In-memory full-text search — fuzzy + prefix match; 14KB bundle; <1ms on 600 cards; no server round-trip
- Zustand 5: Global state management — selectedCharacter, searchQuery, activeCard; ~3KB bundle; selector-based subscriptions prevent unnecessary re-renders
- TanStack Query 5 + idb 8: Data fetching and IndexedDB persistence — TTL-based cache invalidation; serves cached data instantly on repeat visits
- Playwright 1.58: Headless browser scraper for Mobalytics (CI only, not bundled in PWA)

**Critical data acquisition note:** The Mobalytics GraphQL endpoint (`https://mobalytics.gg/api/sts2/v1/graphql/query`) should be tested first via direct HTTP POST. If it returns card data without authentication, Playwright is unnecessary. If blocked, extract Apollo preloaded state from the HTML (`window.__APOLLO_STATE__`) — available without triggering Turnstile. Full headless browser automation is the last resort.

**Hosting:** Netlify or Cloudflare Pages (free tiers allow commercial use). Do NOT use Vercel — free tier prohibits commercial use.

### Expected Features

No existing tool delivers algorithmic per-card synergy breakdowns scoped to the active character. This is the entire value proposition. All browsing/search/filter features are table stakes that users expect from day one; the synergy engine is what makes the product worth installing.

**Must have (table stakes):**
- Instant card search by name (prefix + fuzzy, no exact match required) — players use this under time pressure; exact-match search is a trust-killer
- Character selection with persistent state (5 characters: Ironclad, Silent, Defect, Regent, Necrobinder) — scopes card pool and synergy results
- Card grid with type/rarity/cost filters — standard across all competitors; absence makes the tool feel broken
- Card detail view with base and upgraded text side-by-side — every comparable tool does this; mid-run upgrade decisions depend on it
- Synergy suggestions scoped to active character pool — the core differentiator; includes combo explanation, when-to-prioritize, and value rating
- PWA installability (manifest + service worker + Add to Home Screen) — the stated requirement; without this it is just a website

**Should have (competitive differentiators):**
- Tier ratings from Mobalytics data displayed on cards — adds draft-pick context; data is already in the scraped payload
- Keyword/mechanic tags on card detail — makes synergy engine transparent and scannable
- Auto-refresh pipeline (CI cron) with "last updated" timestamp — STS2 is in Early Access with high patch velocity; stale data is a trust-killer
- Offline stale-data banner — show cached data with stale warning when network is unavailable

**Defer (v2+):**
- Relic reference and relic synergies — expands scope significantly; validate card synergies first
- Community synergy ratings/upvotes — requires auth, moderation, backend infrastructure; defer until rule-based engine is validated
- Deck builder — different UX mode; three competitors already have this; not the differentiating feature
- Enemy/event database — out of scope for a card-focused tool
- Cross-character synergy explorer — mid-run use case is single-character; defer

### Architecture Approach

The system is two independent parts connected by a single file. The data pipeline (GitHub Actions + Playwright scraper) runs weekly on a cron schedule, fetches card data from Mobalytics, validates the output schema, and commits `public/cards.json` to the repository, triggering a CDN redeploy. The PWA (React, runs in the browser) bootstraps by fetching `cards.json` once, persisting it to IndexedDB, building a MiniSearch index, and then serving all interactions from in-memory state with no further network dependency. The synergy engine is a pure TypeScript module — no imports from React, no side effects — that accepts `(card: Card, pool: Card[], rules: Rule[])` and returns `SynergyResult[]`. Rules are defined as typed data objects in per-mechanic files (`exhaust.ts`, `strength.ts`, etc.), making each mechanic independently testable and patchable.

**Major components:**
1. Playwright scraper (CI only) — fetches Mobalytics card data, validates schema, outputs `public/cards.json`
2. GitHub Actions workflow — weekly cron trigger, runs scraper, commits and pushes updated data
3. Data layer (TanStack Query + idb) — fetches `cards.json` on startup, persists to IndexedDB with TTL timestamp, serves cached data on repeat visits
4. MiniSearch index — built once from `cards[]` at startup; rebuilt only on character switch
5. Zustand store — holds `selectedCharacter`, `allCards`, `activeCard`, `searchQuery`; `filteredPool` is derived, not stored
6. Synergy engine — pure function: `evaluate(card, pool, rules) → SynergyResult[]`; called synchronously via `useMemo` in CardDetail; sub-millisecond at 600 cards × 20 rules
7. Service worker (Workbox via vite-plugin-pwa) — precaches app shell; `StaleWhileRevalidate` for `cards.json`; `registerType: 'prompt'` to avoid auto-reload mid-session

### Critical Pitfalls

1. **Mobalytics ToS explicitly prohibits automated scraping** — Address before building any automated pipeline. Either run the scraper manually (developer-only tool, not a CI cron) or contact Mobalytics for explicit permission. If the project becomes commercial, switch to official STS2 data files. This is a legal risk, not just a technical one.

2. **Cloudflare Turnstile silently blocks the scraper** — Standard Playwright is detected by Cloudflare as of early 2025. The scraper must validate its output with a hard assertion (`cards.length > 400`); silent failure commits empty or corrupt data. Priority validation: test the GraphQL endpoint first (POST, no auth); fall back to Apollo state extraction from HTML before using full headless browsing.

3. **Schema breaks silently on patch day** — STS2 is in active Early Access with high patch velocity (evidence: March 2026 patch reverted major card changes). Implement JSON Schema validation as the final scraper step; fail the CI job loudly if required fields are missing or if new unknown keywords appear. Keep previous `cards.json` as fallback.

4. **Synergy engine produces undifferentiated noise** — Without a `direct` vs `archetype` type distinction in the rule schema, every card with a shared keyword is presented as equally synergistic. Define `type: "direct" | "archetype"` in the Rule schema BEFORE writing individual rules — retrofitting this after 50+ rules are written is expensive.

5. **Stale card data served after patch** — `StaleWhileRevalidate` serves cached data immediately; updates arrive next session. Version the `cards.json` URL with a hash (`cards.json?v={hash}`) to force cache invalidation on patch day. Also: use `registerType: 'prompt'` not `autoUpdate` to prevent the service worker from force-reloading the app during a mid-run session.

---

## Implications for Roadmap

Based on combined research, a 6-phase structure is recommended. The build order is dependency-driven: the card schema is the single most load-bearing artifact — every other component derives from it. The synergy engine is the differentiating feature and should be built as soon as card data is available, in parallel with the card browser UI.

### Phase 1: Data Pipeline and Card Schema

**Rationale:** Nothing else can be built without knowing the card schema. The scraper, data loading hook, search index configuration, synergy rule types, and all UI rendering derive from the `Card` type. This phase also forces resolution of the highest-risk issue: Mobalytics ToS and Cloudflare Turnstile. Addressing this before writing application code prevents building on a legally or technically invalid foundation.
**Delivers:** `cards.json` with validated schema committed to repo; TypeScript `Card` type definition; scraper with output validation (`cards.length > 400`, required fields, known-keyword assertion)
**Addresses:** Data pipeline (P1), character scoping prerequisite
**Avoids:** Pitfalls 1 (ToS), 2 (Turnstile), 3 (schema breakage)
**Research flag:** Needs validation — test GraphQL endpoint manually before committing to Playwright approach; ToS posture decision is a judgment call, not a code decision

### Phase 2: App Shell and Data Bootstrap

**Rationale:** The application shell and data loading layer are prerequisites for all UI work. This phase establishes the Vite + React + Tailwind project, the TanStack Query + idb data loading hook, and the Zustand store shape. Building this before any feature UI ensures components have a stable data contract to code against.
**Delivers:** Vite project scaffold with PWA manifest; `useCards()` hook with idb TTL caching; Zustand store with character selection; app boots and displays card data
**Uses:** React 19, Vite 8, Tailwind v4, TanStack Query 5, idb 8, Zustand 5
**Implements:** App shell, data layer, character selector
**Avoids:** Anti-pattern of fetching `cards.json` per component mount; anti-pattern of god component with all state in useState
**Research flag:** Standard patterns — skip research-phase

### Phase 3: Card Browser and Search

**Rationale:** The card browser is the core browsing experience. MiniSearch index initialization depends on `cards[]` from Phase 2. Character pool scoping (derived selector) can be built cleanly once the Zustand store exists. Filters (type, rarity, cost) are low-complexity additions on top of the already-filtered pool.
**Delivers:** Character-scoped card grid with instant search (prefix + fuzzy); filters by type, rarity, cost; card selection writes `activeCard` to store
**Uses:** MiniSearch 7, react-minisearch `useMiniSearch` hook
**Implements:** CardBrowser, CardList, MiniSearch integration
**Avoids:** Pitfall of rebuilding MiniSearch index on every render; UX pitfall of requiring exact card name match; UX pitfall of no default character selection
**Research flag:** Standard patterns — skip research-phase

### Phase 4: Card Detail View

**Rationale:** Card detail is dependency-free once card data and navigation (activeCard in store) exist. This phase delivers the base + upgraded text comparison, tier ratings, and keyword tags — building the visual foundation that the synergy panel will extend in Phase 5.
**Delivers:** Full card detail panel with base and upgraded text side-by-side, cost, type, rarity, tier rating (from Mobalytics data), and keyword tags
**Addresses:** Card detail view (P1), tier rating display (P2), keyword tags (P2)
**Research flag:** Standard patterns — skip research-phase

### Phase 5: Synergy Engine

**Rationale:** The synergy engine is pure TypeScript with no UI dependencies — it can be built and unit-tested against fixture card data from the moment the `Card` schema exists (Phase 1). Integration into the UI is the final step in this phase. The `direct` vs `archetype` distinction in the rule schema must be established BEFORE writing individual rules, making schema design the first task of this phase.
**Delivers:** `evaluate(card, pool, rules) → SynergyResult[]` engine; per-mechanic rule files for STS2 keywords (Exhaust, Strength, Block, Poison, etc.); SynergyList UI in CardDetail showing results sorted by value with `direct` synergies prominent; synergy results scoped to active character pool
**Uses:** Vitest for unit testing rules in isolation
**Implements:** Synergy engine, rule files, SynergyList component
**Avoids:** Pitfall 4 (undifferentiated noise — requires `type: "direct" | "archetype"` in Rule schema); anti-pattern of storing synergy results in Zustand; anti-pattern of inline rules in engine.ts
**Research flag:** Needs domain knowledge — rule definitions require deep STS2 mechanic knowledge; initial rule set is a manual investment. Suggest a research sub-task: catalog STS2 keywords and direct interaction patterns before writing rules.

### Phase 6: PWA Hardening and Service Worker

**Rationale:** Service worker configuration wraps the working application. This phase is last not because it is optional but because it requires the full app to exist before it can be tested meaningfully. The update prompt flow, iOS install instructions, and cache invalidation strategy cannot be validated without a deployable application.
**Delivers:** Workbox `StaleWhileRevalidate` config for `cards.json` with URL versioning (`?v={hash}`) for cache busting; `registerType: 'prompt'` update flow (non-blocking banner); iOS Add to Home Screen instructions banner; "last updated" timestamp in UI; offline stale-data indicator; full install → deploy → update flow tested on Chrome and Safari iOS
**Addresses:** PWA installability (P1), auto-refresh (P2), offline banner (P2)
**Avoids:** Pitfall 5 (stale cache after patch), Pitfall 6 (service worker update loop breaking installed PWA), UX pitfall of invisible data staleness
**Research flag:** Needs testing — vite-plugin-pwa Issue #789 (first-update prompt timing bug) and Safari iOS aggressive caching require explicit verification in staging before launch

### Phase Ordering Rationale

- **Schema first, everything else second:** The `Card` TypeScript type is the single artifact that all other components depend on. Defining it early and locking it to the scraper output prevents costly refactors downstream.
- **Data pipeline before UI:** No component renders correctly without real card data. Building UI first against mock data creates false confidence and schema mismatches.
- **Synergy engine parallelizes with UI phases:** Once the card schema exists, the engine can be built and tested in isolation by Vitest while the browser UI is being assembled. They converge in Phase 5 when the UI calls `evaluate()`.
- **PWA hardening last:** Service worker caching behavior can only be tested against a real deployed application. Testing it before the app is feature-complete produces false results.
- **Legal/technical risk frontloaded:** Pitfalls 1 and 2 (ToS and Turnstile) are addressed in Phase 1, before any application code is written. If either proves unresolvable, the project direction changes before significant investment is made.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (Data Pipeline):** Mobalytics ToS legal posture requires a conscious decision before building. GraphQL endpoint accessibility needs manual validation — this determines whether Playwright is needed at all. High uncertainty.
- **Phase 5 (Synergy Engine):** STS2 keyword catalog and direct interaction patterns are domain knowledge that must be assembled before rule files can be written. The rule schema (`direct` vs `archetype` distinction) is a design decision with significant downstream consequences. Recommend a research sub-task dedicated to STS2 mechanics.
- **Phase 6 (PWA Hardening):** vite-plugin-pwa Issue #789 and Safari iOS caching behavior require explicit testing in a staging environment. Known edge cases need verification against the real app.

Phases with standard patterns (skip research-phase):
- **Phase 2 (App Shell):** Vite + React + TanStack Query + idb setup is thoroughly documented with no novel integrations.
- **Phase 3 (Card Browser):** MiniSearch + react-minisearch integration is well-documented; character-scoped filtering is straightforward Zustand selector pattern.
- **Phase 4 (Card Detail):** Purely presentational; no novel patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry 2026-03-30; all integrations corroborated by official docs |
| Features | MEDIUM-HIGH | Competitor analysis based on live tool inspection; STS2 feature set verified against multiple sources; synergy engine complexity is domain-specific estimation |
| Architecture | HIGH | Patterns are established for static PWAs; data flow is well-documented; synergy engine structure is first-principles reasoning but low-risk given pure function design |
| Pitfalls | MEDIUM-HIGH | Mobalytics ToS verified against official document; Cloudflare Turnstile detection corroborated by multiple scraping sources; vite-plugin-pwa issue #789 verified in official repo tracker |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Mobalytics GraphQL endpoint accessibility:** Unknown whether the endpoint accepts unauthenticated POST queries. This is the first task in Phase 1 and determines the entire scraper architecture. Cannot be resolved by research alone — requires manual testing.
- **Mobalytics ToS legal posture:** The ToS is clear (scraping prohibited), but the practical risk depends on the project's commercial intent and visibility. Needs a conscious decision before building the CI pipeline.
- **STS2 keyword completeness:** The keyword list as of 2026-03-30 is available from Mobalytics guides, but STS2 is in active Early Access and keywords change with patches. The rule engine must be designed to register new keywords explicitly, with CI alerting on unknown keywords appearing in scraped data.
- **Safari iOS PWA behavior:** Safari's 7-day script-writable storage limit and aggressive caching are documented but the exact impact on this app's idb TTL strategy needs verification in a real iOS environment during Phase 6.
- **STS2 mechanic interaction depth:** The quality of synergy suggestions depends entirely on how well the rule files model actual STS2 card interactions. This is a domain knowledge gap, not a technical one. A dedicated mechanic research step before Phase 5 is strongly recommended.

---

## Sources

### Primary (HIGH confidence)
- [Mobalytics Terms of Service](https://mobalytics.gg/terms/) — scraping prohibition, commercial use restriction
- [Mobalytics robots.txt](https://mobalytics.gg/robots.txt) — wiki path not disallowed; API endpoints blocked
- [Mobalytics STS2 Cards Wiki](https://mobalytics.gg/slay-the-spire-2/wiki/cards) — GraphQL endpoint URL, Turnstile presence, ~568 cards
- [vite-plugin-pwa docs](https://vite-pwa-org.netlify.app/guide/) — generateSW mode, Workbox strategies
- [vite-plugin-pwa Issue #789](https://github.com/vite-pwa/vite-plugin-pwa/issues/789) — first-update prompt timing bug
- [MiniSearch docs](https://lucaong.github.io/minisearch/) — search-as-you-type, addAll/addAllAsync
- [react-minisearch GitHub](https://github.com/lucaong/react-minisearch) — useMiniSearch hook API
- [web.dev offline data](https://web.dev/learn/pwa/offline-data) — idb recommendation for PWA structured storage
- [Zustand GitHub](https://github.com/pmndrs/zustand) — selector subscription pattern
- [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) — CSS-first config, browser targets
- npm registry (direct queries) — all version numbers verified 2026-03-30

### Secondary (MEDIUM confidence)
- [SpireSpy STS2](https://maybelatergames.co.uk/spirespy/) — competitor feature analysis
- [sts2tools.com](https://sts2tools.com/) — competitor feature analysis
- [slaythespire.gg/cards](https://www.slaythespire.gg/cards) — competitor feature analysis, instant search pattern
- [Cloudflare Turnstile detection — ZenRows](https://www.zenrows.com/blog/playwright-cloudflare-bypass) — standard Playwright flagged by Cloudflare
- [GitHub Actions cron scraping pattern](https://www.marcveens.nl/posts/scheduled-web-scraping-made-easy-using-playwright-with-github-actions) — Playwright + Actions workflow
- [State management in 2025 — DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — Zustand vs alternatives
- [Netlify vs Vercel commercial use comparison](https://www.digitalapplied.com/blog/vercel-vs-netlify-vs-cloudflare-pages-comparison) — Vercel free tier restriction

### Tertiary (LOW confidence — needs validation)
- [SpireGenius synergies](https://spiregenius.com/synergies/) — competitor synergy approach; 403 on direct fetch, inferred from search results
- STS2 keyword list from Mobalytics guides — current as of 2026-03-30 but will change with patches

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
