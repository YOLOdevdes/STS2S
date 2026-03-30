# Architecture Research

**Domain:** Static PWA card browser with rule-based synergy engine
**Researched:** 2026-03-30
**Confidence:** HIGH (patterns are well-established for static PWAs; synergy engine structure is domain-specific reasoning from first principles, flagged below)

---

## Standard Architecture

### System Overview

Two distinct systems: a **data pipeline** (CI, runs on schedule) and a **PWA app** (browser, runs on user's device). They connect through a single file: `cards.json`.

```
┌──────────────────────────────────────────────────────────────────┐
│                     DATA PIPELINE (GitHub Actions)                │
│                                                                    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐  │
│  │ cron trigger │────▶│  Playwright  │────▶│  cards.json      │  │
│  │ (weekly)     │     │  scraper     │     │  committed to    │  │
│  └──────────────┘     └──────────────┘     │  public/         │  │
│                                            └────────┬─────────┘  │
│                                                     │ git push   │
│                                                     ▼            │
│                                          Deploy trigger fires    │
└─────────────────────────────────────────────────────────────────-┘
                                                     │
                                              CDN serves
                                              cards.json
                                                     │
┌────────────────────────────────────────────────────▼─────────────┐
│                     PWA APP (Browser)                             │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                       App Shell                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Character   │  │  Card        │  │  Synergy         │  │  │
│  │  │  Selector    │  │  Browser     │  │  Detail Panel    │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │  │
│  │         │                 │                   │             │  │
│  ├─────────┴─────────────────┴───────────────────┴─────────────┤  │
│  │                    Zustand Store                              │  │
│  │   selectedCharacter │ searchQuery │ activeCard │ synergies   │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │   Data Layer: TanStack Query + idb                           │  │
│  │   ┌─────────────────┐   ┌────────────────────────────────┐  │  │
│  │   │  cards.json     │   │  IndexedDB (idb)               │  │  │
│  │   │  fetch + cache  │──▶│  cards blob + fetched_at ts    │  │  │
│  │   └─────────────────┘   └────────────────────────────────┘  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │   Search Layer: MiniSearch                                   │  │
│  │   ┌─────────────────────────────────────────────────────┐   │  │
│  │   │  in-memory index (built from cards[] at startup)    │   │  │
│  │   └─────────────────────────────────────────────────────┘   │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │   Synergy Layer: SynergyEngine (pure TS module)             │  │
│  │   ┌─────────────────────────────────────────────────────┐   │  │
│  │   │  rules[] → evaluate(card, pool) → SynergyResult[]   │   │  │
│  │   └─────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Service Worker (Workbox)                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  precache: app shell (HTML/CSS/JS)                           │  │
│  │  runtime: StaleWhileRevalidate for /cards.json               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────-┘
```

---

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Playwright scraper** (CI) | Fetches card data from Mobalytics, outputs `cards.json` | GitHub Actions runner, filesystem |
| **GitHub Actions workflow** | Triggers scraper on schedule, commits result, triggers deploy | Scraper, git, Netlify/CF Pages |
| **`cards.json`** | Single source of truth for all card data; static asset served by CDN | PWA fetch layer |
| **Service Worker (Workbox)** | Precaches app shell; serves `cards.json` with StaleWhileRevalidate | Browser, CDN |
| **Data Layer (TanStack Query + idb)** | Fetches `cards.json` on startup; persists to IndexedDB with timestamp for TTL checks | Service Worker, Zustand store |
| **MiniSearch index** | In-memory full-text index over cards[]; answers search queries in <1ms | Data Layer (receives cards[]), Card Browser component |
| **Zustand store** | Holds `selectedCharacter`, `searchQuery`, `activeCard`, `synergyResults`; drives all UI reactivity | All UI components, Synergy Engine |
| **Character Selector** | UI to select active character; writes to store | Zustand store |
| **Card Browser** | Filtered list of cards for current character; calls MiniSearch; handles card selection | Zustand store, MiniSearch |
| **Card Detail Panel** | Displays full card data for `activeCard`; triggers synergy computation | Zustand store, Synergy Engine |
| **Synergy Engine** | Pure TypeScript module; accepts a card + character pool, applies rules[], returns `SynergyResult[]` | Card Detail Panel (via direct import), no external dependencies |

---

## Recommended Project Structure

```
/
├── public/
│   └── cards.json             # Output of scraper; static asset served as-is
├── scraper/
│   ├── index.ts               # Playwright scraper entry point
│   ├── extract.ts             # Mobalytics-specific extraction logic
│   └── schema.ts              # Card type definition (shared with app via symlink or copy)
├── src/
│   ├── main.tsx               # React entry point; mounts App
│   ├── App.tsx                # App shell; wraps QueryClientProvider + layout
│   ├── types/
│   │   └── card.ts            # Card, Character, SynergyResult type definitions
│   ├── data/
│   │   ├── useCards.ts        # TanStack Query hook: fetches /cards.json, checks idb TTL
│   │   ├── storage.ts         # idb wrapper: get/set cards blob with fetched_at timestamp
│   │   └── characters.ts      # Static character list (derived from card data or hardcoded)
│   ├── search/
│   │   ├── useCardSearch.ts   # react-minisearch useMiniSearch hook + config
│   │   └── index.ts           # MiniSearch instance config (fields, boost, fuzzy settings)
│   ├── synergy/
│   │   ├── engine.ts          # SynergyEngine: evaluate(card, pool) → SynergyResult[]
│   │   ├── rules/
│   │   │   ├── index.ts       # Exports all rules as Rule[]
│   │   │   ├── strength.ts    # Rules: cards that both scale with Strength
│   │   │   ├── exhaust.ts     # Rules: Exhaust-related synergies
│   │   │   ├── block.ts       # Rules: Block generation combos
│   │   │   └── ...            # One file per mechanic keyword
│   │   └── types.ts           # Rule, SynergyResult, ValueRating types
│   ├── store/
│   │   └── useAppStore.ts     # Zustand store: selectedCharacter, searchQuery, activeCard
│   ├── components/
│   │   ├── CharacterSelector/ # Character picker UI
│   │   ├── CardBrowser/       # Filtered card list + search input
│   │   │   ├── CardBrowser.tsx
│   │   │   ├── CardList.tsx
│   │   │   └── CardListItem.tsx
│   │   ├── CardDetail/        # Full card detail + synergy panel
│   │   │   ├── CardDetail.tsx
│   │   │   ├── CardStats.tsx
│   │   │   └── SynergyList.tsx
│   │   └── ui/                # Shared primitives (Button, Badge, Spinner, etc.)
│   └── sw/
│       └── sw-config.ts       # vite-plugin-pwa Workbox config (runtimeCaching rules)
├── .github/
│   └── workflows/
│       └── scrape-cards.yml   # Cron: run scraper → commit cards.json → push
├── vite.config.ts
├── tailwind.config.ts         # (v4: this is optional — prefer CSS-first config)
└── vitest.config.ts
```

### Structure Rationale

- **`scraper/` at root, not in `src/`:** The scraper is a Node.js CLI tool, not part of the browser bundle. Keeping it separate prevents accidental bundling and clarifies the system boundary.
- **`src/synergy/rules/` split by mechanic:** Each mechanic keyword (Strength, Exhaust, Poison, Block, etc.) gets its own file. This makes adding new rules for a patch a one-file change, and makes unit testing trivial — each rule file exports a pure array of `Rule` objects.
- **`src/data/` separate from components:** Data fetching logic (TanStack Query hook, idb persistence) is isolated from UI. Components consume `useCards()` and never touch fetch or idb directly.
- **`src/search/` isolated:** MiniSearch configuration and the `useMiniSearch` integration are co-located so search behavior (fuzzy threshold, field boosts) can be tuned without touching components.
- **`src/store/` single file for Zustand:** The store is intentionally flat and small. If it grows beyond ~5 fields, split into feature slices (`useCharacterStore`, `useSearchStore`).

---

## Architectural Patterns

### Pattern 1: Data Bootstrap — Fetch-then-Index

**What:** On app startup, fetch `cards.json` (or load from IndexedDB if fresh), then build the MiniSearch index in one synchronous pass, then render.

**When to use:** Always. The app has no useful state until cards are loaded. Attempting to render before data is ready produces an empty shell that misleads users.

**Trade-offs:** Adds ~50-100ms startup latency on first load. Acceptable given the mid-run reference use case — users initiate a lookup intentionally. On revisit, idb serves data instantly.

```typescript
// src/data/useCards.ts
export function useCards(): { cards: Card[]; isLoading: boolean } {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const cached = await storage.get<{ cards: Card[]; fetchedAt: number }>('cards');
      const isStale = !cached || Date.now() - cached.fetchedAt > TTL_MS;
      if (!isStale) return cached.cards;

      const res = await fetch('/cards.json');
      const cards: Card[] = await res.json();
      await storage.set('cards', { cards, fetchedAt: Date.now() });
      return cards;
    },
    staleTime: TTL_MS,
  });
}
```

### Pattern 2: Pure Synergy Engine — Rules as Data

**What:** The synergy engine is a pure function that accepts `(card: Card, pool: Card[])` and returns `SynergyResult[]`. Rules are defined as a typed array of `Rule` objects, each with a `matches(a: Card, b: Card): boolean` predicate and a `describe(): string` generator.

**When to use:** Always. Keeping the engine pure (no imports from React, no side effects, no I/O) means it can be unit-tested with Vitest in milliseconds, and the rule list can be extended without touching the engine core.

**Trade-offs:** Rule definitions require domain knowledge of STS2 mechanics. The initial rule set is a manual investment. Returns are bounded by rule coverage — undocumented mechanics won't surface synergies.

```typescript
// src/synergy/types.ts
export interface Rule {
  id: string;
  name: string;
  matches(a: Card, b: Card): boolean;
  describe(a: Card, b: Card): string;
  value: 'high' | 'medium' | 'low';
}

// src/synergy/engine.ts
export function evaluate(card: Card, pool: Card[], rules: Rule[]): SynergyResult[] {
  return pool
    .filter(other => other.id !== card.id)
    .flatMap(other =>
      rules
        .filter(rule => rule.matches(card, other) || rule.matches(other, card))
        .map(rule => ({
          cardA: card,
          cardB: other,
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.describe(card, other),
          value: rule.value,
        }))
    )
    .sort(bySynergyValue);
}
```

### Pattern 3: Character-Scoped Pool Derivation

**What:** The selected character is stored in Zustand. The filtered card pool for that character is a derived selector, not stored state. Components that need the scoped pool call the selector; MiniSearch is re-initialized if the character changes.

**When to use:** Always. Storing derived state (filtered pool) in the store creates a sync bug — the filter and the store can drift. Derive on read.

**Trade-offs:** The MiniSearch index must be rebuilt when the character changes (~600 cards, negligible cost). Accept this trade-off.

```typescript
// src/store/useAppStore.ts
const useFilteredPool = () =>
  useAppStore(state =>
    state.allCards.filter(card => card.characterId === state.selectedCharacter)
  );
```

### Pattern 4: Service Worker Caching Strategy — StaleWhileRevalidate for cards.json

**What:** Configure Workbox to serve `cards.json` from cache immediately (stale) while fetching an update in the background (revalidate). The app shell (HTML/JS/CSS) is precached and served from cache-first.

**When to use:** Always. Cards.json is large relative to the app shell. Users should not wait for a network round-trip on every open. Background refresh is acceptable — the card data changes only on game patches.

```typescript
// src/sw/sw-config.ts (consumed by vite-plugin-pwa)
export const runtimeCaching = [
  {
    urlPattern: /\/cards\.json$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'card-data',
      expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
    },
  },
];
```

---

## Data Flow

### Full Data Flow: Scraper to UI

```
Mobalytics wiki (SPA)
    │
    ▼  (Playwright, weekly cron)
scraper/index.ts
    │  extracts card objects
    ▼
public/cards.json  ──git commit──▶  Netlify/CF Pages redeploy
    │
    ▼  (fetch on app startup, or StaleWhileRevalidate from SW)
useCards() TanStack Query hook
    │  on success
    ├──▶  idb.set('cards', { cards, fetchedAt })   [persists for next session]
    │
    ▼
cards: Card[]  (in React Query cache, available to all hooks)
    │
    ├──▶  MiniSearch.addAll(cards)               [search index built once]
    │
    └──▶  Zustand: allCards = cards              [synergy engine pool source]
```

### User Interaction Flow: Card Lookup

```
User opens app
    │
    ▼
CharacterSelector visible → user picks character
    │  Zustand: selectedCharacter = 'ironclad'
    ▼
CardBrowser renders filtered pool (selector: allCards where characterId === 'ironclad')
    │
User types in search input
    │  useMiniSearch.search(query)
    ▼
CardList renders matching cards (prefix + fuzzy match from MiniSearch)
    │
User taps a card
    │  Zustand: activeCard = card
    ▼
CardDetail renders full card stats
    │  calls evaluate(card, filteredPool, rules)
    ▼
SynergyList renders SynergyResult[] sorted by value rating
```

### State Management

```
Zustand store
├── selectedCharacter: CharacterId        (persisted to localStorage)
├── allCards: Card[]                      (set after data bootstrap)
├── activeCard: Card | null               (set on card tap)
└── searchQuery: string                   (controlled by search input)

Derived (not stored):
└── filteredPool = allCards.filter(c => c.characterId === selectedCharacter)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Mobalytics wiki | Playwright headless scrape (CI only) | Cloudflare Turnstile present; attempt Apollo state extraction from serialized HTML before full browser flow. The scraper is the only component that talks to Mobalytics — the PWA never does. |
| Netlify / Cloudflare Pages | Git push to main triggers CDN redeploy | Zero config. Commit of `cards.json` auto-deploys. No API keys needed. |
| GitHub Actions | `schedule: cron` + `workflow_dispatch` for manual trigger | Requires "Workflow Read and write permissions" enabled in repo settings. Use `actions/checkout@v4` + git push with GITHUB_TOKEN. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Scraper → PWA | `public/cards.json` file (static asset) | The only coupling between the two systems. Card schema must be shared or duplicated — use a `shared/schema.ts` or accept duplication with a note to keep in sync. |
| Data layer → Search layer | `cards: Card[]` passed to `MiniSearch.addAll()` | MiniSearch index is rebuilt when cards change (character switch or data refresh). Keep index initialization in a `useEffect` that depends on `[cards, selectedCharacter]`. |
| Data layer → Synergy Engine | `cards: Card[]` passed as `pool` argument | Engine is stateless — no initialization step. Called synchronously on card selection. At 600 cards × N rules, this is sub-millisecond; no async needed. |
| Synergy Engine → UI | `SynergyResult[]` return value | Engine never imports from React. Components import the engine function directly. No abstraction layer needed at this scale. |
| Zustand → Components | Selector-based subscriptions | Components subscribe to only the slice they need. `useFilteredPool()` is the key derived selector — centralizing this prevents scattered filter logic across components. |

---

## Suggested Build Order

This order respects hard dependencies — each phase can be built and tested independently before the next begins.

```
Phase 1: Data pipeline
    Scraper → cards.json schema defined → GitHub Actions workflow
    (Nothing else can be built without knowing the card schema)
    │
    ▼
Phase 2: Data bootstrap + storage
    useCards() hook → idb persistence → TanStack Query setup
    (Components need cards[] before they can render anything real)
    │
    ▼
Phase 3: App shell + character selection
    Vite + React + Tailwind + PWA manifest → CharacterSelector → Zustand store
    (Layout and navigation can be built with mock data, but real character list needs schema)
    │
    ▼
Phase 4: Card browser + search
    MiniSearch integration → CardBrowser → CardList → CardDetail (stats only)
    (Search requires the index; index requires cards[])
    │
    ▼
Phase 5: Synergy engine
    Rule type definitions → rule files → engine.ts → SynergyList UI
    (Can be built in parallel with Phase 4 — engine is pure TS, no UI dependency)
    │
    ▼
Phase 6: PWA hardening
    Service worker config → Workbox caching rules → installability → offline shell test
    (Last because it wraps the working app, not because it's optional)
```

**Why schema first:** The card schema (`Card` type) is the single most load-bearing artifact. Every other component — scraper, search index config, synergy rules, UI rendering — derives from it. If the schema shifts (e.g., Mobalytics changes field names), everything must update. Define it once, enforce it with TypeScript, commit it early.

**Why synergy engine can parallelize with Phase 4:** The engine is a pure TypeScript module that takes `Card[]` input. It can be built and fully unit-tested (with Vitest + fixture data) while the card browser UI is being assembled. They converge in Phase 5 when the UI calls `evaluate()`.

---

## Anti-Patterns

### Anti-Pattern 1: Fetching cards.json from the PWA at runtime on every search

**What people do:** Call `fetch('/cards.json')` inside a search handler or on every component mount.
**Why it's wrong:** Network round-trip on every search kills the mid-run use case. On slow 4G this is 200-800ms latency per query. It also bypasses IndexedDB caching entirely.
**Do this instead:** Fetch once at app startup via TanStack Query with a long `staleTime`. Serve repeat reads from React Query's in-memory cache. Persist to idb for cross-session reuse. Service Worker handles the actual network fetch via StaleWhileRevalidate.

### Anti-Pattern 2: Storing synergy results in Zustand

**What people do:** Dispatch an action to the store when a card is selected, run the engine in a thunk/middleware, store `synergyResults: SynergyResult[]` in global state.
**Why it's wrong:** Synergy results are derived from `activeCard` + `filteredPool` + `rules`. They have no independent lifecycle. Storing them adds an update path that can get out of sync (e.g., character changes but results aren't cleared).
**Do this instead:** Compute synergies synchronously in the `CardDetail` component using `useMemo(() => evaluate(activeCard, filteredPool, rules), [activeCard, filteredPool])`. At 600 cards × ~20 rules, this is <1ms. No store involvement needed.

### Anti-Pattern 3: Putting rules inline in the engine

**What people do:** Write a large `switch` statement or if/else chain directly in `engine.ts` covering every mechanic.
**Why it's wrong:** STS2 is actively patched. New mechanics require editing the engine core. A 500-line `engine.ts` becomes unmaintainable, and testing individual rules requires testing the whole engine.
**Do this instead:** Each rule is an object implementing the `Rule` interface, exported from a file named after its mechanic (`exhaust.ts`, `strength.ts`). The engine is a pure evaluator that knows nothing about specific mechanics — it just applies whichever rules are passed in.

### Anti-Pattern 4: Rebuilding the MiniSearch index on every render

**What people do:** Call `new MiniSearch(config)` and `addAll(cards)` directly inside a component body or in an `onChange` handler.
**Why it's wrong:** Index construction is the expensive part (~5ms for 600 cards). Rebuilding it on every keystroke turns a <1ms search into a >5ms stutter.
**Do this instead:** Use `react-minisearch`'s `useMiniSearch` hook. It builds the index once when `cards` is first provided and only rebuilds when the document collection changes (e.g., character switch). The `search()` function returned by the hook queries the stable index.

### Anti-Pattern 5: One God Component that owns all state

**What people do:** Build a single `App.tsx` that holds `cards`, `searchQuery`, `activeCard`, `selectedCharacter`, and `synergyResults` in `useState`, passing everything down as props.
**Why it's wrong:** Any state update (typing a character in the search box) re-renders the entire tree including the synergy panel. Breaks the mid-run performance requirement.
**Do this instead:** Zustand with selector subscriptions. Each component subscribes only to the slice it needs. `CharacterSelector` subscribes to `selectedCharacter`. `SearchInput` subscribes to `searchQuery`. They don't share a render cycle.

---

## Scaling Considerations

This app's scale concern is not user count — it's **data size** (card count grows as STS2 adds content) and **rule count** (synergy rules grow as the mechanic space expands).

| Scale | Architecture Adjustments |
|-------|--------------------------|
| ~600 cards, ~20 rules | Current design — all in-memory, synchronous, no special handling needed |
| ~2000 cards, ~100 rules | MiniSearch still fine; synergy evaluation stays <5ms; consider Web Worker for index build if startup latency becomes noticeable |
| ~5000 cards, ~500 rules | Move MiniSearch to a Web Worker; evaluate() may need batching; consider splitting `cards.json` by character to reduce initial payload |

### Scaling Priorities

1. **First bottleneck — index build time:** MiniSearch `addAll()` for 600 cards is ~5ms. If card count grows to 2000+, move index construction to a Web Worker using `addAllAsync()`. Do not optimize this prematurely.
2. **Second bottleneck — synergy evaluation breadth:** `evaluate(card, pool)` is O(pool × rules). At 600 × 20 = 12,000 comparisons it is imperceptible. If rules grow to 100+, profile and memoize — but this is a future problem.

---

## Sources

- [react-minisearch GitHub](https://github.com/lucaong/react-minisearch) — `useMiniSearch` hook API, index initialization pattern (HIGH confidence; official repo)
- [MiniSearch docs](https://lucaong.github.io/minisearch/) — search-as-you-type use case, `addAll()` / `addAllAsync()` (HIGH confidence; official docs)
- [vite-plugin-pwa docs](https://vite-pwa-org.netlify.app/guide/) — `generateSW` mode, Workbox `StaleWhileRevalidate` runtime caching (HIGH confidence; official docs)
- [Playwright + GitHub Actions scraping pattern](https://www.marcveens.nl/posts/scheduled-web-scraping-made-easy-using-playwright-with-github-actions) — cron trigger, commit JSON, push pattern (MEDIUM confidence; community article, pattern verified against GitHub Actions docs)
- [web.dev offline data](https://web.dev/learn/pwa/offline-data) — IndexedDB recommendation for PWA structured storage (HIGH confidence; Google official)
- [Zustand GitHub](https://github.com/pmndrs/zustand) — selector-based subscription pattern, per-feature store guidance (HIGH confidence; official repo)
- Rule engine architecture (building-a-rule-engine-with-typescript) — Rule-as-data pattern, predicate + describe structure (MEDIUM confidence; community article, pattern cross-referenced with tcg-engines GitHub)
- [tcg-engines GitHub](https://github.com/TheCardGoat/tcg-engines) — TCG rule engine reference for TypeScript (MEDIUM confidence; official repo, reviewed for structural patterns)

---

*Architecture research for: STS 2 Strategizer — static PWA card browser with rule-based synergy engine*
*Researched: 2026-03-30*
