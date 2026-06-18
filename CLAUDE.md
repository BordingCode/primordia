# Primordia — project guide for Claude

A vanilla **ES-module** PWA: a premium **chemistry-of-life discovery game** (Forge fusion →
valence Bench → Synthesis Lab → protocell survival → living-world finale), with WebGL
nebula/bloom. Educational — **the chemistry must be correct**. No build step. Repo:
`BordingCode/primordia` (branch **main**), GitHub Pages (`bordingcode.github.io/primordia`).

## Before working
Read the shared game-dev knowledge base: **`~/cc/gamedev-kb/INDEX.md`** (lowercase `cc`).
Especially `patterns/canvas-engine-games.md`, `patterns/mobile-ios-safari.md`, and
`checklists/ship-checklist.md`.

## Architecture
- `js/main.js` — boot; exposes `window.__primordia` (the live game) for tests.
- `js/` — engine + chemistry data and the staged campaign screens.
- `assets/` — art/textures; WebGL effects (nebula, bloom).

## Deploy convention — every change MUST
- **Bump the SW `CACHE` string** in `sw.js` (e.g. `primordia-v29`→`v30`) and add any new file
  to the `ASSETS` array, **and** bump the `?v=` query on changed `<link>`/`<script>` tags in
  `index.html`. Both are required (it uses `?v=` busting) or stale code is served.
- Be **committed and pushed** to `main`.

## Tests / verify
- Test hook `window.__primordia` (the game object). Verify in a real browser (local
  `python3 -m http.server` + Playwright): play through stages, 0 console errors.
- **Accuracy is load-bearing** — real chemistry only (e.g. adenine = 5×HCN). Don't invent
  reactions; fact-check new content.

## Notes
- Phone-first; audio unlocked on first gesture.
