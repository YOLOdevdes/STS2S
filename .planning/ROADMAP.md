# Roadmap: STS 2 Strategizer

## Overview

Six phases that build from the ground up: secure the data source first (cards.json is the single dependency everything else requires), scaffold the app shell and data layer, deliver the card browsing experience, add full card detail, build the synergy engine (the core differentiator), and finish with PWA hardening that wraps the complete working application. Phases are dependency-driven — no phase can start until the one before it delivers its required foundation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Pipeline** - Scrape Mobalytics card data into a validated cards.json and set up auto-refresh
- [ ] **Phase 2: App Shell** - Scaffold the React PWA with data loading, caching, and character selection
- [ ] **Phase 3: Card Browser** - Instant search and character-scoped card grid
- [ ] **Phase 4: Card Detail** - Full card detail view with upgrade comparison, tier ratings, and keyword tags
- [ ] **Phase 5: Synergy Engine** - Rule-based synergy detection with scoped results and combo breakdowns
- [ ] **Phase 6: PWA Hardening** - Service worker, installability, offline banner, and cache invalidation

## Phase Details

### Phase 1: Data Pipeline
**Goal**: Valid, legally-obtained card data exists in cards.json and stays current with game patches
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02
**Success Criteria** (what must be TRUE):
  1. cards.json exists in the repo with all required fields (name, cost, type, rarity, description, upgraded text, character, tier, keywords, image URL) for all available STS2 cards
  2. The scraper validates its own output — it fails loudly if the card count falls below 400 or required fields are missing
  3. A GitHub Actions cron job re-scrapes Mobalytics on a schedule and commits updated cards.json when card data changes
  4. The GraphQL endpoint access strategy (direct POST vs Apollo state extraction vs Playwright) is decided and implemented based on validated testing
**Plans**: TBD

### Phase 2: App Shell
**Goal**: The React PWA boots, loads card data from cards.json, caches it, and persists character selection
**Depends on**: Phase 1
**Requirements**: SYN-01
**Success Criteria** (what must be TRUE):
  1. The app loads in a browser, fetches cards.json, and displays a loading state while doing so
  2. On repeat visits, card data is served instantly from IndexedDB without a network round-trip
  3. User can select their active character (Ironclad, Silent, Defect, Regent, Necrobinder) and that selection persists across page reloads
**Plans**: TBD

### Phase 3: Card Browser
**Goal**: Users can instantly find any card by name and browse the full card grid scoped to their character
**Depends on**: Phase 2
**Requirements**: BROWSE-01, BROWSE-02
**Success Criteria** (what must be TRUE):
  1. Typing a card name returns matching results as each character is typed, with no perceptible delay
  2. The card grid shows all cards for the selected character with name, cost, and rarity visible at a glance
  3. Selecting a card from the grid or search results navigates to that card's detail view
**Plans**: TBD

### Phase 4: Card Detail
**Goal**: Users can see everything they need to know about a card during a run, including upgrade comparison and tier
**Depends on**: Phase 3
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04
**Success Criteria** (what must be TRUE):
  1. Tapping a card shows its full details: name, cost, type, rarity, and complete description text
  2. User can see base and upgraded card text side-by-side on the same screen without toggling
  3. The card's S/A/B/C/D tier rating from Mobalytics is visible on the detail view
  4. Keyword and mechanic tags (e.g., Exhaust, Strength scaling) are displayed on each card detail page
**Plans**: TBD

### Phase 5: Synergy Engine
**Goal**: Users see algorithmically-generated synergy suggestions for any card, scoped to their character's pool, with full combo breakdowns
**Depends on**: Phase 4
**Requirements**: SYN-02, SYN-03, SYN-04
**Success Criteria** (what must be TRUE):
  1. The card detail view shows a list of synergy suggestions for the active card, filtered to the selected character's pool
  2. Each synergy entry shows the partner card name, how the interaction works, when to prioritize it, and a value rating
  3. Direct synergies (card A directly enables card B) appear more prominently than archetype synergies (both cards share a mechanic)
  4. Synergy results are computed fast enough that there is no visible delay when opening a card detail view
**Plans**: TBD

### Phase 6: PWA Hardening
**Goal**: The app is installable, loads instantly on repeat visits, and handles stale or missing data gracefully
**Depends on**: Phase 5
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. On Chrome (Android) and Safari (iOS), the browser offers an "Add to Home Screen" prompt and the installed app launches without a browser chrome
  2. A returning user who already has the app installed sees card data immediately — no waiting for cards.json to load
  3. When the user is offline or the cached data is older than expected, a visible banner informs them that card data may be stale, with a "last updated" timestamp
  4. A new version of cards.json deployed after a patch is picked up on the user's next session without requiring a manual cache clear
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 0/TBD | Not started | - |
| 2. App Shell | 0/TBD | Not started | - |
| 3. Card Browser | 0/TBD | Not started | - |
| 4. Card Detail | 0/TBD | Not started | - |
| 5. Synergy Engine | 0/TBD | Not started | - |
| 6. PWA Hardening | 0/TBD | Not started | - |
