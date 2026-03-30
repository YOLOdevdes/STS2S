# Phase 2: App Shell - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the React PWA — Vite + TailwindCSS + vite-plugin-pwa. The app boots with a splash screen while `cards.json` loads from the network, caches it in IndexedDB for instant repeat loads, and exposes a persistent character selector in the header. This phase delivers the shell that all future phases (card browser, detail, synergy) will live inside. No card browsing or synergy features are in scope here.

</domain>

<decisions>
## Implementation Decisions

### Character Selector
- Always accessible in the header — no dedicated full-screen first-run picker
- Each character shown as: portrait/icon + name + class color accent
- Active character displayed in header as: portrait thumbnail + name
- Character selection persists across sessions (localStorage or IndexedDB)
- Behavior during search: Claude's Discretion — keep interaction smooth on mobile (e.g. selector stays accessible but compact)

### Splash Screen / Loading (First Visit)
- Full splash screen while `cards.json` fetches from network
- Background: user-provided graphic file (to be dropped into `public/` — filename TBD when provided)
- Loader style: ornate/fantasy-styled progress bar over the background image
- No app name or title text on the splash — background image + progress bar only
- The progress bar should feel styled (decorative borders/framing) not generic

### Return Visit Loading
- Brief skeleton shimmer (50–100ms) while IndexedDB hydrates, then content
- Consistent feel without meaningful delay

### App Layout
- **Shell:** Fixed header + scrollable content area
- **Header contents:** App name/logo + search bar placeholder (slot for Phase 3) + character selector
- **Responsive:** Mobile and desktop equal priority — responsive breakpoints for both
  - Mobile portrait: single column, header + full-width content
  - Desktop: wider layout with space for card grid / side panel in future phases

### Visual Style
- **Theme:** Dark, atmospheric — dark backgrounds, the splash background sets the tone
- **Typography:** Single modern sans-serif throughout — no decorative/display fonts; readability first for dense card text
- **Character colors:** Accent only — each character has a color used for: header border/underline, character selector highlight state. No full theme shift when switching characters.
- **Color palette:** Claude's Discretion — derive from the splash background graphic once provided; dark base with gold/muted accent tones expected

### Claude's Discretion
- Character selector behavior when search is active (keep it accessible and smooth)
- Exact CSS color palette (derive from splash background graphic)
- Skeleton design for return-visit loading state
- Desktop layout column widths / breakpoints
- Exact character color values per character (Ironclad, Silent, Defect, Regent, Necrobinder)

</decisions>

<specifics>
## Specific Ideas

- User has a background graphic for the splash screen — will drop it into `public/`. Planner should include a task slot for integrating this asset (filename placeholder until asset is provided).
- The splash progress bar should feel *ornate* — decorative fantasy framing, not a plain `<progress>` element
- App is primarily a mid-run reference tool → dark theme reduces eye strain in low-light conditions (dungeons)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/cards.json` — 568 card objects, flat array; this is the data the shell loads and caches at startup

### Established Patterns
- None yet — this phase establishes the first patterns for the app
- Scraper uses Node.js ESM (`type: "module"`) — PWA should use standard Vite React conventions

### Integration Points
- `public/cards.json` → fetched at app startup → cached in IndexedDB → consumed by all subsequent feature phases
- Character selector state → Zustand store (per research) → consumed by card browser (Phase 3) and synergy engine (Phase 5)
- Header search slot → wired up in Phase 3 with MiniSearch integration

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-app-shell*
*Context gathered: 2026-03-30*
