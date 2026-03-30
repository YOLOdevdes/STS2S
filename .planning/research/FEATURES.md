# Feature Research

**Domain:** Game card browser / synergy explorer PWA (mid-run reference tool)
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Search cards by name | Core lookup action; without it the tool is unusable mid-run | LOW | Instant/typeahead preferred; keyboard shortcut (e.g. ⌘K) is a strong UX signal from comparable tools like slaythespire.gg |
| Character-scoped card list | STS2 has 5 characters with distinct pools (Ironclad, Silent, Defect, Regent, Necrobinder) plus Colorless; showing the wrong pool is useless mid-run | LOW | Default to selected character; persist selection; Colorless always visible |
| Card detail view | Players expect name, cost, type, rarity, full description, and upgraded text | LOW | Mobalytics provides all these fields; upgraded text is expected by every comparable tool (sts2tools.com, slaythespire.gg) |
| Filter by card type | Attack / Skill / Power / Quest — players scan by type constantly | LOW | Mobalytics already exposes this; multi-select preferred |
| Filter by rarity | Common / Uncommon / Rare / Basic — players use rarity to estimate draft picks | LOW | Single-dimension filter; trivial to add |
| Filter by energy cost | Cost 0-X — core deckbuilding decision; every comparable tool has this | LOW | Mobalytics exposes cost; include X-cost as a filter option |
| Visual card grid | Players expect cards presented visually, not as a plain list | LOW | Grid layout with card name + cost + rarity at minimum; image if available |
| PWA installability | "Quick access" is a stated requirement; users need Add to Home Screen | MEDIUM | Requires manifest.json + service worker; standard setup with Vite/Next.js PWA plugins |
| Fast shell / no loading jank | Mid-run = time pressure; any slow load breaks trust | MEDIUM | Pre-cache app shell; serve card data from local cache on repeat visits |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Synergy suggestions per card | No competitor does this well for STS2 specifically; SpireSpy has synergy data but it is curated manually and not generated algorithmically per card | HIGH | Core differentiator; rule-based keyword/mechanic analysis (e.g. "this card scales Strength → shows all other Strength scalers") |
| Full combo breakdown per synergy | Explains *how* the interaction works + when to prioritize it + value rating — not just a list of synergistic cards | HIGH | SpireGenius and SpireSpy list synergies without breakdowns; this is the unique value proposition |
| Synergy scoped to current character | Synergy suggestions filtered to cards you can actually draft (character pool); competitors show cross-character noise | MEDIUM | Depends on character selection being established first; adds signal-to-noise ratio significantly |
| Keyword/mechanic grouping in card detail | Show which mechanics a card participates in (e.g. "Exhaust synergy", "Strength scaling", "Sly activator") — scannable at a glance | MEDIUM | Tags derived from description parsing; makes the synergy engine transparent to the user |
| Tier ratings displayed on cards | Mobalytics provides S/A/B/C/D tier per card; displaying this adds draft-pick context beyond raw card data | LOW | Data already scraped; just surface it in UI; competitive tools like SpireSpy and Mobalytics show tiers |
| Auto-refresh on patch | Game is in Early Access (launched March 5, 2026); patches are frequent; stale data is a trust-killer | MEDIUM | Periodic scrape + cache invalidation; competitors rely on manual wiki updates |
| Upgrade comparison in card detail | Show base vs. upgraded text side-by-side; players frequently check "is this worth upgrading?" | LOW | sts2tools.com and slaythespire.gg both do this; table stakes at this point but differentiated from raw Mobalytics |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full offline support | Players want to use it without internet | Requires full card data bundle cached locally; Mobalytics data changes with patches; stale offline data is worse than no data | Cache app shell + last-known card data with visible "last updated" timestamp; display banner if data is stale |
| Community synergy submissions | Players want to share discoveries | Requires auth, moderation, storage backend, spam prevention — far exceeds v1 scope; user-generated content quality is unpredictable | Rule-based algorithm v1; defer community layer until algorithm is validated |
| Deck builder | Seems like a natural companion feature | Significantly different UX mode (stateful, persistent, complex CRUD) that competes for attention with the reference lookup flow; sts2tools.com, SpireSpy, slaythespire.gg all have this — no advantage | Focus purely on lookup + discovery; link out to existing deck builders if users want that workflow |
| Run tracking / stat logging | Players want to record run outcomes | Native app territory; requires persistent storage, session tracking, game state — out of scope for a PWA reference tool | Out of scope v1; SpireScope handles this niche well |
| Enemy database / map reference | Players also want monster HP, intent patterns, event details | Expands scope beyond card focus; sts2tools.com and slaythespire.gg already cover this | Defer; not the core value proposition |
| Advanced search syntax (Scryfall-style) | Power users want keyword:exhaust cost:0 queries | Implementation complexity high; mid-run users need speed, not query syntax mastery | Faceted filters (type, rarity, cost, keyword tag checkboxes) achieve 90% of this without the learning curve |
| Push notifications for patch alerts | "The game was just patched, data updated" | PWA push requires backend notification service and user permission grants; disproportionate infrastructure for marginal utility | Show "data last refreshed: X" timestamp in UI; stale indicator banner is sufficient |

---

## Feature Dependencies

```
[Character Selection]
    └──requires──> [Card List / Search]
                       └──requires──> [Card Data (scraped from Mobalytics)]
                                          └──requires──> [Scraper / Data Pipeline]

[Card Detail View]
    └──requires──> [Card Data (scraped from Mobalytics)]

[Synergy Suggestions]
    └──requires──> [Card Data (scraped from Mobalytics)]
    └──requires──> [Synergy Engine (keyword/mechanic rules)]
    └──enhances──> [Card Detail View]  (synergies shown on the detail page)

[Character-Scoped Synergies]
    └──requires──> [Character Selection]
    └──requires──> [Synergy Suggestions]

[Tier Rating Display]
    └──requires──> [Card Data (Mobalytics tier field)]

[PWA Installability]
    └──requires──> [Service Worker + Manifest]
    └──enhances──> [Fast Shell / Cache]

[Auto-Refresh]
    └──requires──> [Scraper / Data Pipeline]
    └──enhances──> [Card Data freshness]

[Upgrade Comparison]
    └──requires──> [Card Data (upgraded text field from Mobalytics)]
```

### Dependency Notes

- **Character Selection requires Card Data:** The pool scoping logic depends on each card having a `character` field — Mobalytics provides this (Ironclad, Silent, Defect, Regent, Necrobinder, Colorless).
- **Synergy Engine requires Card Data:** The rule-based engine reads keyword/mechanic fields from card descriptions; data must be parsed and normalized before rules can run.
- **Synergy Suggestions requires Synergy Engine:** The engine must be written before the UI can display suggestions; this is the highest-effort dependency chain.
- **Character-Scoped Synergies requires both:** Filtering synergy output to a character pool requires both the character selection state and the synergy engine output.
- **Auto-Refresh requires a pipeline:** Keeping data fresh requires a scrape/fetch job (cron or on-demand); this is infrastructure work that must precede any data-dependent feature.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Data pipeline** — Scrape and normalize Mobalytics card data (name, cost, type, rarity, description, upgraded text, keywords/tags, character, tier rating, image URL); without this nothing else works
- [ ] **Character selector** — Persistent selection of one of five characters; scopes card list to that character's pool + Colorless
- [ ] **Card grid with search** — Instant name search (typeahead); filter by type, rarity, and cost; visual grid layout
- [ ] **Card detail view** — Full card details including base + upgraded text, cost, type, rarity, tier rating, and keyword tags
- [ ] **Synergy suggestions** — Rule-based engine producing synergy pairs for a given card; scoped to selected character's pool; each synergy includes combo explanation, when-to-prioritize, and value rating
- [ ] **PWA installability** — Web App Manifest + service worker (cache app shell); Add to Home Screen prompt

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Auto-refresh pipeline** — Automated periodic re-scrape from Mobalytics with stale-data indicator in UI; trigger: STS2 patch cadence is high during Early Access
- [ ] **Keyword/mechanic tag filtering** — Filter card list by mechanic tag (e.g. show all "Exhaust" cards); trigger: user feedback requesting this after using search
- [ ] **"Last refreshed" data timestamp** — Surfaced in footer or settings; builds trust that data is current
- [ ] **Offline-last-known-data banner** — If network unavailable, show cached data with stale warning; trigger: user reports on mobile connectivity

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Relic reference** — Relics have their own synergy implications; out of scope until card synergies are validated
- [ ] **Cross-character synergy explorer** — "What if I see this colorless card — what does it synergize with across characters?"; deferred because mid-run use case is single-character
- [ ] **Community synergy ratings / upvotes** — Requires auth and moderation infrastructure; defer until rule-based engine has been validated by users
- [ ] **Enemy / event reference** — Expands scope significantly; defer

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Data pipeline (Mobalytics scrape) | HIGH | MEDIUM | P1 |
| Character selector + pool scoping | HIGH | LOW | P1 |
| Card grid + instant name search | HIGH | LOW | P1 |
| Card detail view (base + upgraded text) | HIGH | LOW | P1 |
| Filter by type / rarity / cost | HIGH | LOW | P1 |
| Synergy suggestions (rule-based engine) | HIGH | HIGH | P1 |
| Combo breakdown per synergy | HIGH | MEDIUM | P1 |
| PWA installability (manifest + SW) | MEDIUM | MEDIUM | P1 |
| Tier rating display on cards | MEDIUM | LOW | P2 |
| Keyword/mechanic tag display on cards | MEDIUM | LOW | P2 |
| Auto-refresh pipeline | MEDIUM | MEDIUM | P2 |
| Keyword/mechanic tag filtering | MEDIUM | LOW | P2 |
| Offline stale-data banner | LOW | LOW | P2 |
| Relic reference | MEDIUM | MEDIUM | P3 |
| Enemy database | LOW | HIGH | P3 |
| Deck builder | LOW | HIGH | P3 |
| Community synergy submissions | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | SpireSpy (STS1+2) | sts2tools.com | slaythespire.gg | Our Approach |
|---------|--------------|--------------|--------------|--------------|
| Card search | Yes (by character tier list) | Yes (filter-based) | Yes (⌘K instant search) | Instant typeahead search |
| Character scoping | Yes (tabs per character) | Yes (filter) | Yes (breadcrumb nav) | Persistent selector, default on first load |
| Card detail | Basic (name, cost, desc) | Detailed (base + upgraded + context) | Basic grid | Full detail: base + upgraded + tier + keywords |
| Synergy display | Yes — curated synergy + anti-synergy lists | Contextual text per card | None | Algorithmic per card, scoped to character pool |
| Combo breakdown | None — list only | Partial (text context) | None | Full: how it works + when to prioritize + value rating |
| Tier ratings | Yes | No | No | Yes (from Mobalytics data) |
| Filter by type/rarity/cost | Partial | Yes | No | Yes, all three |
| PWA / installable | No | No | No | Yes |
| Mobile-optimized | Partial | Unknown | Partial | Yes (primary use case) |
| Auto-refresh on patch | No (manual) | Unknown | Unknown | Yes (v1.x) |
| Deck builder | Yes | Yes | No | No (anti-feature for v1) |
| Run tracker | Via SpireScope separately | No | No | No (anti-feature for v1) |

---

## Sources

- [Mobalytics STS2 Cards Wiki](https://mobalytics.gg/slay-the-spire-2/wiki/cards) — card data fields, filter options, tier ratings, 568 total cards confirmed; MEDIUM confidence (accessed 2026-03-30, some data inferred from page structure)
- [SpireSpy STS2](https://maybelatergames.co.uk/spirespy/) — synergy/anti-synergy/supersynergy display, tier lists, deck builder; MEDIUM confidence (fetched 2026-03-30)
- [sts2tools.com](https://sts2tools.com/) — card browsing by character/cost/type/rarity, base+upgraded text, practical context; MEDIUM confidence (fetched 2026-03-30)
- [slaythespire.gg/cards](https://www.slaythespire.gg/cards) — character-scoped browsing, instant search (⌘K), breadcrumb navigation; MEDIUM confidence (fetched 2026-03-30)
- [SpireSpy STS1 tool](https://maybelatergames.co.uk/tools/slaythespire/) — STS1 reference for established patterns; LOW confidence on STS2 specifics (page did not reveal detailed feature info)
- [SpireGenius synergies](https://spiregenius.com/synergies/) — STS2 synergy tool; LOW confidence (403 on direct fetch, inferred from search results)
- [WebSearch: STS2 community tools and features](https://github.com/topics/slay-the-spire-2) — player-wanted features including card/relic browser, live run tracker, overlay mode; MEDIUM confidence (multiple corroborating results)
- [WebSearch: PWA best practices 2025](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices) — installability requirements, service worker caching strategies, offline UX patterns; HIGH confidence (MDN official docs)
- [WebSearch: STS2 characters](https://en.wikipedia.org/wiki/Slay_the_Spire_II) — 5 characters confirmed: Ironclad, Silent, Defect, Regent, Necrobinder; launched Early Access March 5, 2026; HIGH confidence (multiple corroborating sources)

---
*Feature research for: game card browser / synergy explorer PWA (STS2 Strategizer)*
*Researched: 2026-03-30*
