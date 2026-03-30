# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Fast card lookup + synergy discovery during an active run, scoped to your character's pool.
**Current focus:** Phase 1 — Data Pipeline

## Current Position

Phase: 1 of 6 (Data Pipeline)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-30 — Roadmap created, all 15 v1 requirements mapped to 6 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Rule-based synergy algorithm chosen — deterministic, maintainable, no official synergy data exists
- [Pre-Phase 1]: Character-scoped default view — mid-run users only care about their current pool
- [Pre-Phase 1]: Auto-refresh via GitHub Actions cron — STS2 is actively patched, stale data is a trust-killer

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Mobalytics ToS prohibits automated scraping — must decide legal posture (manual-only vs permission request) before building CI pipeline
- [Phase 1]: GraphQL endpoint accessibility unknown — must validate via direct POST before committing to Playwright approach; this determines the entire scraper architecture
- [Phase 5]: STS2 keyword catalog is domain knowledge gap — a dedicated mechanic research step is recommended before writing synergy rules

## Session Continuity

Last session: 2026-03-30
Stopped at: Roadmap created, STATE.md initialized — ready to plan Phase 1
Resume file: None
