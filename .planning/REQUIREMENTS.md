# Requirements: STS 2 Strategizer

**Defined:** 2026-03-30
**Core Value:** Fast card lookup + synergy discovery during an active run, scoped to your character's pool.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Pipeline

- [ ] **PIPE-01**: System scrapes Mobalytics card data (name, cost, type, rarity, description, upgraded text, character, tier, keywords, image URL) and stores as static cards.json
- [ ] **PIPE-02**: Auto-refresh pipeline re-scrapes Mobalytics on a schedule via GitHub Actions cron, committing updated cards.json on change

### Card Browser

- [ ] **BROWSE-01**: User can search for cards by name with instant typeahead results
- [ ] **BROWSE-02**: User can browse cards in a visual grid (name, cost, rarity visible at a glance)

### Card Detail

- [ ] **DETAIL-01**: User can view full card details (name, cost, type, rarity, full description text)
- [ ] **DETAIL-02**: User can compare base vs upgraded card text on the card detail view
- [ ] **DETAIL-03**: User can see the S/A/B/C/D tier rating on each card
- [ ] **DETAIL-04**: User can see keyword/mechanic tags on each card (e.g. Exhaust, Strength scaling, Sly activator)

### Synergy Engine

- [ ] **SYN-01**: User can select their current character (Ironclad, Silent, Defect, Regent, Necrobinder), persisted across sessions
- [ ] **SYN-02**: System detects synergies between cards via a rule-based keyword/mechanic analysis engine
- [ ] **SYN-03**: User sees synergy suggestions for a card scoped to their selected character's card pool
- [ ] **SYN-04**: Each synergy pair includes a full combo breakdown: how the interaction works, when to prioritize it, and a value rating

### PWA

- [ ] **PWA-01**: App is installable as a PWA (Web App Manifest + service worker, Add to Home Screen prompt)
- [ ] **PWA-02**: App shell is cached so repeat loads are instant on slow or unreliable connections
- [ ] **PWA-03**: When offline or data is stale, user sees cached card data with a visible "last updated" warning banner

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Data Reliability

- **PIPE-03**: Schema validation in CI pipeline catches silent data corruption when Mobalytics changes card structure after a patch

### Card Browser Enhancements

- **BROWSE-03**: User can filter cards by type (Attack / Skill / Power / Quest)
- **BROWSE-04**: User can filter cards by rarity (Common / Uncommon / Rare / Basic)
- **BROWSE-05**: User can filter cards by energy cost (0–X)
- **BROWSE-06**: User can scope card grid to their selected character's pool (character-scoped browsing)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Deck builder | Different UX mode (stateful CRUD), out-of-scope complexity; sts2tools.com and SpireSpy already do this |
| Run tracker / stat logging | Native app territory; out of scope for a PWA reference tool; SpireScope covers this niche |
| Community synergy submissions | Requires auth, moderation, backend; defer until rule-based engine is validated |
| Enemy / event reference | Expands scope beyond card focus; separate concern |
| Full offline support | Stale data is worse than no data for a mid-run reference; stale banner covers the edge case |
| Push notifications for patch alerts | Requires backend notification service; disproportionate for marginal utility |
| Advanced search syntax (Scryfall-style) | Faceted filters cover 90% of the need without the learning curve |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | TBD | Pending |
| PIPE-02 | TBD | Pending |
| BROWSE-01 | TBD | Pending |
| BROWSE-02 | TBD | Pending |
| DETAIL-01 | TBD | Pending |
| DETAIL-02 | TBD | Pending |
| DETAIL-03 | TBD | Pending |
| DETAIL-04 | TBD | Pending |
| SYN-01 | TBD | Pending |
| SYN-02 | TBD | Pending |
| SYN-03 | TBD | Pending |
| SYN-04 | TBD | Pending |
| PWA-01 | TBD | Pending |
| PWA-02 | TBD | Pending |
| PWA-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0 (TBD — roadmapper assigns phases)
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after initial definition*
