# Plan 01-02 Summary — GitHub Actions CI Workflow

**Completed:** 2026-03-30
**Status:** Done ✓

## What Was Built

- `.github/workflows/scrape-cards.yml` — cron workflow that re-scrapes Mobalytics weekly and commits updated `cards.json` only when card data changes

## CI Workflow Details

| Setting | Value |
|---------|-------|
| Schedule | Every Monday 06:00 UTC (`0 6 * * 1`) |
| Manual trigger | `workflow_dispatch` — for patch-day runs |
| Failure behavior | Non-zero scraper exit = job fails loudly, cards.json untouched |
| No-change behavior | `git diff` check; logs "up to date", no commit |
| Commit message | `data: update cards.json (N cards) [skip ci]` |

## Human Verification

Manual `workflow_dispatch` run approved — workflow runs correctly on GitHub Actions.

## Key Decisions

- `[skip ci]` tag prevents infinite trigger loop when the workflow commits
- `workflow_dispatch` allows patch-day manual runs without waiting for Monday cron
- `timeout-minutes: 15` prevents runaway Playwright sessions consuming CI minutes
- `npm ci` (not `npm install`) for reproducible CI installs
- Playwright browser install included (`--with-deps`) for Ubuntu runner compatibility even though GraphQL path doesn't use it — future-proofs the fallback

## Requirements Covered

- PIPE-02: ✓ GitHub Actions cron auto-refresh committed and verified
