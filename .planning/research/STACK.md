# Stack Research

**Domain:** PWA card browser with data scraping and rule-based synergy engine
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH (core stack HIGH; data acquisition layer MEDIUM due to scraping uncertainty)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | UI framework | Dominant PWA ecosystem, excellent Vite integration, stable concurrency model. No reason to pick anything else for a greenfield card browser. |
| Vite | 8.0.3 | Build tool & dev server | 10-100x faster HMR than webpack. `vite-plugin-pwa` provides zero-config service worker + manifest generation. The de facto 2025 standard for non-Next.js React apps. |
| TypeScript | 6.0.2 | Type safety | Card data schema is complex (keywords, mechanics, character ownership); types prevent runtime bugs in synergy rules. Non-negotiable for maintainability. |
| Tailwind CSS | 4.2.2 | Styling | v4 ships CSS-first config (no `tailwind.config.js` needed), 100x faster incremental builds, built-in container queries. Use v4 on greenfield — no migration cost. Browser targets (Safari 16.4+, Chrome 111+, Firefox 128+) are compatible with a 2025 PWA audience. |
| vite-plugin-pwa | 1.2.0 | PWA tooling (service worker + manifest) | Wraps Workbox; generates service worker automatically in `generateSW` mode. Only Vite-native solution with active maintenance. Requires Vite 5+ (we're on 8). |
| Workbox | 7.4.0 | Service worker strategies | Bundled via vite-plugin-pwa. Handles pre-caching static assets and runtime caching of card data JSON. Use `StaleWhileRevalidate` for card data to balance freshness and speed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MiniSearch | 7.2.0 | Client-side full-text search | Use for the card search feature. Supports fuzzy match, prefix search, field boosting, and ranking. Tiny bundle (~14KB min+gzip). Better DX than FlexSearch for this dataset size (~500-600 cards). Works entirely in-browser with no server round-trip — critical for mid-run speed. |
| Zustand | 5.0.12 | Global state management | ~3KB bundle. Manages: selected character, current card search query, synergy results. Not Redux (too heavy), not Jotai (atomic model overkill for this simple cross-cutting state). One store, minimal boilerplate. |
| idb | 8.0.3 | IndexedDB wrapper | Stores fetched card JSON locally with timestamps for freshness checks. Jake Archibald's Promise wrapper — the standard recommendation from web.dev. Use for persisting card data between sessions so the app loads instantly on revisit. |
| @tanstack/react-query | 5.95.2 | Async data fetching & caching | Handles loading/error/stale states for card data fetched from CDN JSON. `staleTime` config maps naturally to the patch-refresh use case. Removes manual fetch boilerplate. |
| date-fns | 4.1.0 | Date utilities | Calculating staleness of cached card data (last-fetched timestamp vs. current date). Lighter than `dayjs` for this single use case. |

### Data Acquisition Layer (Scraper — runs separately from PWA)

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| Playwright | 1.58.2 | Headless browser scraping | Mobalytics is a JavaScript-rendered SPA (React + Apollo). The page preloads card state into `window.__APOLLO_STATE__` or equivalent on load. Playwright can intercept GraphQL responses or extract preloaded state from the DOM. Required because Cheerio/HTTP-only approaches fail on JS-rendered pages. |
| Node.js (built-in fetch / undici) | — | HTTP requests for GraphQL endpoint | Mobalytics exposes a GraphQL endpoint at `https://mobalytics.gg/api/sts2/v1/graphql/query`. Attempt direct GraphQL queries first (authenticated sessions may or may not be required — needs validation). If the endpoint is accessible, this eliminates the need for Playwright entirely. |

> **Critical note on data acquisition:** Mobalytics has Cloudflare Turnstile bot protection (`TURNSTILE_WIDGET_SITE_KEY` present). Direct HTTP scraping will be blocked. Two strategies to validate in priority order:
> 1. **GraphQL endpoint directly** — A 400 on a GET is expected; POST with a proper query body may work without auth. Test first.
> 2. **Playwright + `page.evaluate()` to extract preloaded state** — The page loads ~568 cards in an Apollo cache object in the HTML. Playwright can extract this without full bot-bypass logic, because it runs a real browser.
> The scraper is a Node.js CLI script, not part of the PWA bundle.

### Infrastructure

| Technology | Purpose | Why |
|------------|---------|-----|
| GitHub Actions (`schedule: cron`) | Runs scraper on a schedule (e.g. weekly), commits updated `cards.json` to repo | Free for public repos. Unlimited minutes. Proven pattern for static data pipelines. The scraper output becomes a static JSON file served by the CDN — no backend required. |
| Netlify (or Cloudflare Pages) | Hosts the PWA | Netlify allows commercial use on free tier. Cloudflare Pages has faster global edge and also free. Both work identically for a static Vite build. Do NOT use Vercel — free tier prohibits commercial use. |
| CDN-served `cards.json` | Card data delivery | The scraper outputs `public/cards.json`. Vite serves it as a static asset. Service worker caches it. This is the entire "backend" — no API server needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit testing | Co-located with Vite; tests the synergy rule engine without a browser. Critical path: synergy algorithm is pure logic and must be testable in isolation. |
| ESLint + `@typescript-eslint` | Linting | Standard 2025 setup. Catches type coercions in synergy rules before runtime. |
| Prettier | Formatting | Zero-config. |
| `vite-plugin-pwa` devtools | PWA manifest + SW debugging | Enable `devOptions: { enabled: true }` in dev mode to test service worker behavior locally. |

---

## Installation

```bash
# Core PWA app
npm install react react-dom
npm install zustand @tanstack/react-query minisearch idb date-fns

# Dev dependencies
npm install -D vite @vitejs/plugin-react vite-plugin-pwa
npm install -D typescript @types/react @types/react-dom
npm install -D tailwindcss @tailwindcss/vite
npm install -D vitest @vitest/ui
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier

# Scraper script (separate package.json or workspace)
npm install -D playwright
npx playwright install chromium
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| MiniSearch | FlexSearch | If card corpus grows to >10K entries and sub-millisecond raw speed matters more than DX. FlexSearch is faster but has a more complex API and ~2x larger bundle. At ~600 cards, MiniSearch is the right fit. |
| MiniSearch | Fuse.js | Never for this use case. Fuse.js has no index — it does linear scan. Fine for tiny datasets (<200 items), too slow for 600 cards with prefix-as-you-type. |
| Zustand | Jotai | If state becomes highly granular with dozens of interdependent atoms. Jotai's atomic model would complicate a simple "character + search query + results" state shape. |
| Zustand | Redux Toolkit | Only if the project grows to enterprise scale with multiple developers and complex middleware needs. 3x the boilerplate for no benefit here. |
| Playwright (scraper) | Cheerio | Cheerio cannot execute JavaScript. Mobalytics is a full SPA — Cheerio will return the empty HTML shell, not card data. |
| Playwright (scraper) | Puppeteer | Playwright supersedes Puppeteer in 2025. Better multi-browser support, auto-wait, and TypeScript-first API. No reason to use Puppeteer on a greenfield project. |
| GitHub Actions cron | Dedicated backend / cron service | Unnecessary complexity. A static JSON pipeline via CI is free, auditable (git history), and requires zero infrastructure. |
| Netlify / Cloudflare Pages | Vercel | Vercel free tier prohibits commercial use. For a tool you might monetize later, start on Netlify or Cloudflare Pages. |
| Tailwind CSS v4 | Tailwind CSS v3 | Only if you need IE11 or very old browser support (pre-Safari 16.4). This app's PWA audience is modern-browser-only. |
| idb (IndexedDB) | localStorage | localStorage is synchronous and limited to ~5MB strings. Card data + synergy cache will exceed this. IndexedDB is async and supports structured data. `idb` is the standard thin wrapper. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js | Overkill — SSR/SSG infra for a purely client-side tool. Adds build complexity and deployment requirements (serverless functions) with zero benefit. | Vite + React |
| Fuse.js | Linear scan at 600 cards is perceptibly slow on low-end mobile. No indexing means every keystroke searches all cards from scratch. | MiniSearch |
| Redux Toolkit | 3x boilerplate, 5x the concepts (slices, reducers, selectors, thunks, middleware) for state that fits in ~3 Zustand fields. | Zustand |
| Axios | Unnecessary peer dependency when TanStack Query + native `fetch` covers all data fetching. Axios was needed pre-2020 for older browser support — no longer relevant. | Native `fetch` via TanStack Query |
| CRA (Create React App) | Unmaintained since 2023. Webpack-based, slow, no PWA ergonomics. | Vite |
| Dexie.js | Fuller-featured IndexedDB ORM — useful for complex querying, but card data is simple JSON. `idb` is lighter and sufficient. | idb |
| Web Workers for search | Premature optimization. MiniSearch on 600 cards returns in <1ms on a modern device. Worker adds setup complexity with no user-visible benefit at this scale. | MiniSearch on main thread |

---

## Stack Patterns by Variant

**If the Mobalytics GraphQL endpoint works without authentication:**
- Use `@tanstack/react-query` to query it directly from the PWA at startup (or on a timed refresh).
- Skip the GitHub Actions scraper entirely — no need to bake data into the static build.
- Cache GraphQL responses in idb with a TTL of 7 days.

**If the GraphQL endpoint requires auth / is blocked:**
- Run the Playwright scraper in GitHub Actions on a weekly cron.
- Output: `public/cards.json` committed to the repo.
- PWA fetches `/cards.json` at startup; service worker caches it with `StaleWhileRevalidate`.

**If Mobalytics blocks Playwright (Turnstile CAPTCHA flow):**
- Fall back to extracting the preloaded Apollo state from `window.__NUXT__` or equivalent serialized state in the SSR HTML, which does not require CAPTCHA solving.
- This is available without JS execution in some cases — worth testing with `curl` + `grep`.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vite-plugin-pwa@1.2.0 | Vite 5+ (tested on 8.0.3) | Requires Vite 5 minimum per changelog |
| Workbox@7.4.0 | Node 16+ | Bundled via vite-plugin-pwa, no direct install needed |
| @tanstack/react-query@5.95.2 | React 18+ | v5 API (no `useQuery` destructuring change from v4 noted for v5 — verify during integration) |
| Tailwind CSS@4.2.2 | Safari 16.4+, Chrome 111+, Firefox 128+ | Do not use v4 if you need older browser support |
| MiniSearch@7.2.0 | No peer dependencies | Fully standalone, ESM-first |

---

## Sources

- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — versioning, Vite 5+ requirement (MEDIUM confidence; version verified via npm)
- [Vite PWA docs](https://vite-pwa-org.netlify.app/guide/) — generateSW vs injectManifest strategies (HIGH confidence; official docs)
- [MiniSearch npm](https://www.npmjs.com/package/minisearch) — version 7.2.0, 556K weekly downloads (HIGH confidence; npm registry)
- [MiniSearch GitHub](https://github.com/lucaong/minisearch) — fuzzy/prefix capabilities, design rationale (HIGH confidence; official repo)
- [npm-compare: fuse vs flexsearch vs minisearch](https://npm-compare.com/elasticlunr,flexsearch,fuse.js,minisearch) — download counts, feature comparison (MEDIUM confidence; aggregated npm data)
- [Mobalytics cards page](https://mobalytics.gg/slay-the-spire-2/wiki/cards) — GraphQL endpoint discovered at `https://mobalytics.gg/api/sts2/v1/graphql/query`, Turnstile present, ~568 cards in preloaded state (HIGH confidence; direct page inspection)
- [web.dev offline data](https://web.dev/learn/pwa/offline-data) — idb recommendation for PWA structured storage (HIGH confidence; Google official)
- [Tailwind v4 migration guide](https://tailwindcss.com/docs/upgrade-guide) — CSS-first config, browser targets (HIGH confidence; official docs)
- [State management in 2025 — DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) — Zustand vs Jotai vs Redux (MEDIUM confidence; community article, cross-referenced with multiple sources)
- [Netlify vs Vercel 2025](https://www.digitalapplied.com/blog/vercel-vs-netlify-vs-cloudflare-pages-comparison) — commercial use restrictions on Vercel free tier (MEDIUM confidence; multiple sources agree)
- [GitHub Actions cron scraping](https://www.marcveens.nl/posts/scheduled-web-scraping-made-easy-using-playwright-with-github-actions) — Playwright + GitHub Actions pattern (MEDIUM confidence; community article, pattern is well-established)
- npm registry (direct queries) — all version numbers verified as of 2026-03-30

---

*Stack research for: STS 2 Strategizer PWA card browser*
*Researched: 2026-03-30*
