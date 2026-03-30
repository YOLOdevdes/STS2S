# Plan 01-01 Summary — Mobalytics Card Scraper

**Completed:** 2026-03-30
**Status:** Done ✓

## What Was Built

- `scripts/scraper/` — standalone Node.js TypeScript project with `npm run scrape` and `npm run probe`
- `scripts/scraper/src/types.ts` — Card and Keyword TypeScript interfaces
- `scripts/scraper/src/graphql-probe.ts` — endpoint validation probe
- `scripts/scraper/src/scraper.ts` — full scraper, GraphQL path
- `scripts/scraper/src/validate.ts` — output validation (count + field assertions)
- `public/cards.json` — 568 validated card objects

## Data Acquisition Decision

**Path used: Direct GraphQL POST** (no Playwright needed)

The probe confirmed that `POST https://mobalytics.gg/api/sts2/v1/graphql/query` accepts unauthenticated requests. No Cloudflare Turnstile challenge, no session cookies required. Query structure:

```graphql
game: sts2 { staticData { groups { cards(filter: {page: {all: true}, status: ACTIVE}) { data { ... } } } } }
```

Playwright fallback was not implemented — not needed. The scraper has error handling that exits non-zero if the endpoint becomes unavailable.

## Cards Output

| Stat | Value |
|------|-------|
| Total cards | 568 |
| Ironclad | 87 |
| Silent | 88 |
| Defect | 89 |
| Regent | 88 |
| Necrobinder | 88 |
| Colorless | 128 |

## Field Mapping Decisions

| API field | cards.json field | Notes |
|-----------|-----------------|-------|
| `energy` | `cost` | String → number, "X", or null |
| `type` (lowercase) | `type` | Uppercased, mapped to known union |
| `rarity` | `rarity` | Extended rarities (Ancient, Token, etc.) → "Special" |
| `tier` | `tier` | "S-Tier" → "S", null stays null |
| `character.id` | `characters[]` | Array for future multi-character support |
| `tags[]` | `keywords[]` | String array → `{id, label, category}` objects |
| `iconUrl` | `image_url` | Mobalytics CDN URL, fetched at runtime |
| `variant === "upgraded"` | `upgraded_description` | Paired by `{base_id}-plus` → base_id |

**Colorless cards:** `characters: ["colorless"]` sentinel — 128 cards. Pool filter: `c.characters.includes(char) || c.characters.includes("colorless")`.

**API structure note:** The API returns both base and upgraded variants as separate entries (1101 total including both). Upgraded cards have id `{base-id}-plus`. Scraper pairs them to produce a single card object with both `description` and `upgraded_description`. Cards with no upgrade variant fall back to `description` for both fields.

## Validation

Passed on first run. All 568 cards have the full 11-field schema.

## Requirements Covered

- PIPE-01: ✓ Validated cards.json with all required fields for all STS2 cards
