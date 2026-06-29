# Refactor Instructions For Future Agents

This document is a standalone handoff for improving code quality in the Impol Pinball repository. Assume the future agent has only this file and the repository. Do not rely on conversation context.

## Current Project Shape

- Static browser game for GitHub Pages: `index.html`, `style.css`, `game.js`, Canvas, vanilla JavaScript, Matter.js.
- No npm, bundler, backend, database, or build step is currently used.
- `game.js` is the main risk: about 9,400 lines and 265 top-level functions inside one IIFE.
- `game.js` currently owns configuration, DOM wiring, state creation, persistence, procedural audio, asset loading, Canvas rendering, Matter.js world creation, game rules, input handling, dev mode, diagnostics, and the animation loop.
- Matter.js is loaded from CDN in `index.html`; the README notes that internet access is currently required for physics.
- The project has no formal test runner, but it has a large browser diagnostic harness enabled with `?pinballDiagnostics=...`.
- `node --check game.js` currently passes and should remain a minimum check after every refactor step.

## Refactor Goal

Improve readability, maintainability, and testability without changing gameplay behavior.

Preserve the following unless an explicit future gameplay task says otherwise:

- Physics feel, geometry, scoring values, mission progression, company progression, multiball, lock house, jackpot, persistence, input behavior, audio cues, visual layout, responsive behavior, and diagnostic results.
- Static GitHub Pages deployment.
- Ability to run from a local static server without a build step.
- Existing public diagnostic surfaces: `window.ImpolPinball` and `window.impolPinballDiagnostics`.

## Main Findings

### 1. `game.js` mixes too many responsibilities

Important line clusters in the current file:

- `game.js:5` to about `game.js:474`: table, scoring, feedback, sensor, lock-house, asset, mission, company, mode, and reward configuration.
- `game.js:475` onward: DOM element lookup and initial mutable game state.
- `game.js:1357` onward: asset loading.
- `game.js:1373` onward: localStorage high-score and audio preference helpers.
- `game.js:1427`: `createAudioManager`, about 338 lines.
- `game.js:1802` onward: Canvas drawing helpers.
- `game.js:3561`: `syncInspectableState`, about 233 lines.
- `game.js:3802`: `createDiagnosticHarness`, about 2,036 lines.
- `game.js:5953`: `createMatterWorld`, about 260 lines.
- `game.js:6213` onward: ball, multiball, lock house, scoring, missions, drain/restart, trap rescue, input, and loop logic.

The first refactor should separate data and pure helpers before touching stateful gameplay code.

### 2. Configuration should move first

The top of `game.js` contains mostly data objects and constants. Moving these out is low-risk if script order is preserved.

Recommended first extraction:

```text
js/config/scoring.js
js/config/table.js
js/config/assets.js
js/config/missions.js
js/config/companies.js
js/config/modes.js
```

Because the project has no build step, the safest initial pattern is plain scripts that attach a single namespace:

```js
window.ImpolPinballConfig = {
  TABLE,
  SCORING_RULES,
  TABLE_CONFIG,
  MISSION_CONFIG,
  MISSION_STAGES,
  COMPANY_STATUS,
  COMPANY_CONFIG,
  // ...
};
```

Then `game.js` can destructure from `window.ImpolPinballConfig`. This avoids introducing module/CORS surprises for static local preview. A later phase can convert to ES modules if the repo formally adopts local-server-only development.

Important: keep dependency order explicit. For example, `TABLE_CONFIG` depends on `SCORING_RULES`, `UPPER_ORBIT`, and `LOCK_HOUSE`; `MISSION_CONFIG` also depends on `SCORING_RULES` and `UPPER_ORBIT`.

### 3. Runtime helpers can be split after config

After config is externalized and verified, extract helpers in this order:

1. `js/runtime/storage.js`
   - Move high-score and audio preference localStorage helpers.
   - Keep try/catch behavior exactly the same.
   - Export or namespace: `loadHighScore`, `saveHighScore`, `separateLegacyHighScore`, `loadLegacyHighScore`, `loadAudioMutedPreference`, `saveAudioMutedPreference`.

2. `js/runtime/assets.js`
   - Move `loadAssets`, `isAssetReady`, and shared asset draw readiness helpers if needed.
   - Keep fallback rendering behavior.

3. `js/runtime/audio.js`
   - Move `createAudioManager`, `unlockAudio`, `toggleAudioMute`, and `updateAudioUi`.
   - Procedural audio is intentionally local; do not add audio files unless a separate task asks.

4. `js/runtime/ui.js`
   - Move DOM lookup, mission/company list rendering, HUD updates, score feed updates, restart UI, controls UI.
   - Reduce duplicate HUD/table status formatting by introducing tiny formatter helpers, but keep displayed copy unchanged.

### 4. Canvas rendering is a natural module boundary

Rendering code is large but mostly side-effect limited to `context`. Extract after runtime helpers:

```text
js/render/canvas-primitives.js
js/render/playfield.js
js/render/hud-badges.js
js/render/assets.js
```

Candidate functions:

- `roundedRect`, `fillRoundedRect`, `strokeRoundedRect`, `drawLabel`, `fitCanvasText`, `drawFeedbackText`.
- `drawPlayfieldFrame`, `drawTableArtAssets`, `drawFrameFringeMask`, `drawMechanicalDetailAssets`, `drawIndustrialDecorationAssets`.
- `drawConfiguredBumpers`, `drawConfiguredTargets`, `drawConfiguredSlingshots`, `drawConfiguredRollovers`, `drawUpperOrbit`, `drawLockHouse`.
- Badge and effect drawing: combo, BOM mode, ball save, side shield, meta reward, multiball, jackpot, hit effects, game over.

Pass dependencies explicitly where practical:

```js
createRenderer({
  canvas,
  context,
  config,
  getState,
  getActiveBalls,
  isAssetReady,
  drawAsset
});
```

Do not change coordinates or visual math during extraction.

### 5. Physics extraction should be conservative

`createMatterWorld` and ball/body helpers are stateful and tightly coupled to game rules. Extract only after config, runtime, and rendering are stable.

Recommended boundary:

```text
js/physics/world.js
js/physics/balls.js
js/physics/flippers.js
js/physics/sensors.js
```

Initial goal:

- Move Matter.js construction and generic body helpers.
- Keep collision event routing behavior identical.
- Keep rule handlers (`handleTableHit`, `handleLockHouseContact`, `drainBall`) in the main gameplay module until a later rules extraction.

Matter.js access should be injected:

```js
createMatterWorld({
  MatterLib: window.Matter,
  config,
  handlers
});
```

### 6. Diagnostics should eventually become a separate harness

`createDiagnosticHarness` is the single largest function. It should not be the first extraction because it depends on many internals, but it should not remain in the main gameplay file forever.

Recommended target:

```text
js/diagnostics/harness.js
js/diagnostics/scenarios.js
js/diagnostics/reports.js
```

Split in this order:

1. Scenario data arrays and scenario builders.
2. Report/summary builders.
3. Panel creation and public API wiring.
4. Runtime scenario execution.

Preserve:

- Query parameter: `pinballDiagnostics`.
- `window.impolPinballDiagnostics.runAll()`.
- Auto-run behavior for `?pinballDiagnostics=all`.
- Existing scenario IDs, result shape, and summary names.

### 7. Tests and verification

Before formal tests, use existing checks after every small step:

```powershell
node --check game.js
git diff --check
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=<label>
```

Expected diagnostic baseline from the current docs is `116/116` passing.

Recommended test additions without changing runtime architecture:

- Add `tests/manual-smoke.md` with the exact preview and diagnostic steps.
- Add `tests/diagnostic-baseline.md` documenting expected scenario count, required public objects, and responsive widths from README.
- Optional later: add `package.json` only for convenience scripts if the project accepts npm as a dev convenience while keeping deployment build-free.
- Optional later: add a browser automation smoke test if Playwright is available locally, but do not make it required unless dependencies are vendored or documented.

Good low-level pure-test candidates after extraction:

- score part summing and score band classification
- mission state creation
- company state creation and status rank comparisons
- combo tier/bonus calculation
- lock-house progress label formatting
- storage fallback behavior with mocked storage

### 8. Local Matter.js is worth doing

Vendoring Matter.js would remove the current CDN/network dependency and make diagnostics more reliable offline.

Recommended phase:

1. Add `lib/matter.min.js` using the same version currently loaded from CDN: `0.20.0`.
2. Update `index.html` to load `lib/matter.min.js` before game scripts.
3. Update README: physics no longer requires internet.
4. Verify `window.Matter` exists through the local server.
5. Run `node --check game.js`, `git diff --check`, and browser diagnostics.

Do not upgrade Matter.js version during this refactor. Vendoring and upgrading are separate changes.

### 9. Asset cleanup

Current asset check:

- `ASSET_CONFIG` references 44 PNG files.
- `assets/images` contains 53 PNG files.
- No missing configured asset files were found.
- The unreferenced PNG files are source sheets/previews, not necessarily dead runtime assets:
  - `asset-pack-preview.png`
  - `asset-sheet-source.png`
  - `phase12-asset-preview.png`
  - `phase12-missing-visual-assets-sheet-transparent.png`
  - `phase12-missing-visual-assets-sheet.png`
  - `phase9-industrial-decal-sheet.png`
  - `phase9-mechanical-detail-sheet.png`
  - `phase9-table-art-sheet.png`
  - `secondary-visual-asset-sheet-transparent.png`
  - `secondary-visual-asset-sheet.png`

Do not delete these blindly. If cleaning, move source/contact-sheet assets into `assets/images/source/` or document them more clearly in `assets/images/README.md`.

### 10. Duplication and readability targets

Look for these patterns during refactor:

- Repeated ball reset/body restore logic around launch, drain, ball save, lock house, and restart.
- Repeated timeout state resets for BOM mode, upper orbit, ball save, and lock house recovery.
- Repeated `setFeedback` plus `addHitFeedback` plus `audio.play` clusters.
- Repeated HUD formatting between side HUD and table quick status.
- Repeated `localStorage` try/catch patterns.
- Direct object membership checks like `TABLE_CONFIG.lanes.some(...)`; after config extraction, consider precomputed lookup maps by object ID/type.

Only deduplicate when the new helper has a clear name and does not hide gameplay-specific timing/physics details.

## Recommended Execution Plan

### Phase 1 - Prepare Safety Net - Completed 2026-06-29

- Run `node --check game.js`.
- Run `git diff --check`.
- Start local server and verify the page loads.
- If browser tooling is available, run `?pinballDiagnostics=all` and record pass count.
- Do not edit game logic in this phase.

Completion notes:

- `node --check game.js` passed.
- `git diff --check` passed.
- Local static preview loaded from `http://127.0.0.1:4173/index.html` with HTTP `200`.
- Browser diagnostics loaded from `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase1-safety-net` and passed `117/117`.
- Phase 14.3.8 diagnostic summary remained GO for Phase 14.4; Phase 14.4.4 diagnostic summary remained GO for Phase 14.5.
- No game logic was edited in this phase.

### Phase 2 - Vendor Matter.js - Completed 2026-06-29

- Add `lib/matter.min.js` at version `0.20.0`.
- Replace the CDN script in `index.html`.
- Update README local run notes.
- Verify Matter loads from local file and diagnostics still pass.

Completion notes:

- Added `lib/matter.min.js` from Matter.js `0.20.0`.
- Updated `index.html` to load `lib/matter.min.js?v=0.20.0` before `game.js`.
- Updated README local run notes: physics no longer requires internet access.
- Local server log confirmed `GET /lib/matter.min.js?v=0.20.0` returned HTTP `200`.
- `node --check game.js` passed.
- `node --check lib/matter.min.js` passed.
- `git diff --check` passed with only normal Windows LF-to-CRLF warnings for edited text files.
- Browser diagnostics loaded from `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase2-vendor-matter` and passed `117/117`.

### Phase 3 - Extract Configuration - Completed 2026-06-29

- Create config scripts under `js/config/`.
- Move constants and data only.
- Add script tags before `game.js`.
- In `game.js`, destructure from `window.ImpolPinballConfig`.
- No behavior changes, no renaming of IDs/events/labels.

Completion notes:

- Added config scripts under `js/config/`: `scoring.js`, `table.js`, `assets.js`, `missions.js`, `companies.js`, and `modes.js`.
- Updated `index.html` to load config scripts after Matter.js and before `game.js`.
- `game.js` now destructures constants and data from `window.ImpolPinballConfig` before runtime setup.
- `node --check game.js` passed.
- `node --check` passed for all config scripts.
- `git diff --check` passed with only normal Windows LF-to-CRLF warnings for edited text files.
- Browser diagnostics loaded from `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase3-config-rerun` and passed `117/117`.

### Phase 4 - Extract Storage, Assets, Audio - Completed 2026-06-29

- Move small runtime services into `js/runtime/`.
- Keep public behavior and localStorage keys unchanged.
- Keep procedural audio sounds and mute persistence unchanged.

Completion notes:

- Added runtime scripts under `js/runtime/`: `storage.js`, `assets.js`, and `audio.js`.
- Moved high-score, legacy high-score, audio mute persistence, asset loading/readiness, procedural audio manager, and audio UI controls out of `game.js`.
- Updated `index.html` to load runtime scripts after config scripts and before `game.js`.
- `game.js` now imports runtime helpers from `window.ImpolPinballRuntime` and remains responsible for gameplay orchestration.
- `node --check game.js` passed.
- `node --check` passed for all runtime scripts.
- `git diff --check` passed with only normal Windows LF-to-CRLF warnings for edited text files.
- Local static preview returned HTTP `200`.
- Browser diagnostics loaded from `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase4-runtime-final` and passed `117/117`.

### Phase 5 - Extract Rendering - Completed 2026-06-29

- Move Canvas primitives and draw functions into `js/render/`.
- Inject dependencies instead of reading broad globals where possible.
- Keep all coordinates, colors, font sizes, timing, and fallback art unchanged.

Completion notes:

- Added `js/render/canvas.js` with `window.ImpolPinballRender.createRenderer`.
- Moved Canvas primitives, table art drawing, badges, physics overlay drawing, flippers, ball rendering, and playfield frame rendering out of `game.js`.
- `game.js` now creates a renderer with explicit config/state/helper dependencies and remains responsible for gameplay orchestration.
- Updated `index.html` to load `js/render/canvas.js` before `game.js`.
- `node --check game.js` and `node --check js/render/canvas.js` passed.
- Browser diagnostics at `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase5-render-5` passed `117/117`.
- Visual screenshot check confirmed the playfield and diagnostics overlay render after extraction.

### Phase 6 - Extract Diagnostics - Completed 2026-06-29

- Move diagnostic scenarios/reports first, then harness wiring.
- Preserve all scenario IDs and public diagnostic object shapes.
- Run full diagnostics after each split.

Completion notes:

- Added `js/runtime/diagnostics.js` with `window.ImpolPinballRuntime.diagnostics.createDiagnosticHarness`.
- Moved diagnostic scenarios, reports, panel rendering, queueing, event capture, and run/stop/clear wiring out of `game.js`.
- `game.js` now creates the diagnostic harness through an explicit dependency adapter and keeps gameplay rules/state orchestration local.
- Updated `index.html` to load diagnostics runtime before render/game scripts.
- `node --check game.js` and `node --check js/runtime/diagnostics.js` passed.
- Browser diagnostics at `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase6-all-2` passed `117/117`.

### Phase 7 - Extract Physics Shell

- Move Matter world creation and generic body helpers.
- Keep collision routing to existing rule handlers.
- Do not retune geometry, restitution, friction, gravity, velocity, or timing.

Completion notes:

- Added `js/runtime/physics.js` with `window.ImpolPinballRuntime.physics.createMatterWorld`, `createBallBody`, and `positionFlipper`.
- Moved Matter engine/world creation, static body construction, table object body construction, flipper body positioning, ball body creation, and collision event subscription out of `game.js`.
- `game.js` now creates the physics shell through an explicit dependency adapter and keeps collision routing in existing gameplay rule handlers.
- Updated `index.html` to load `js/runtime/physics.js` before diagnostics/render/game scripts.
- `node --check game.js`, `node --check js/runtime/physics.js`, and `node --check js/runtime/diagnostics.js` passed.
- Local HTTP preview checks through a Node static server returned `200` for `/`, `game.js`, `js/runtime/physics.js`, and the diagnostics URL.
- Browser diagnostics at `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=phase7-node-check` passed `117/117`.

### Phase 8 - Add Focused Tests

- Add pure unit-style tests only after helpers are extracted.
- Prefer tests that do not require Matter.js or browser layout.
- Keep browser diagnostics as the end-to-end regression suite.

## Acceptance Criteria For The Refactor Program

- `game.js` is meaningfully smaller and acts as orchestration instead of owning every subsystem.
- Config data is readable without scanning gameplay code.
- Matter.js can load locally without internet.
- Existing ordinary gameplay still starts from the same page.
- Existing diagnostics still expose the same public objects and pass at the documented baseline.
- README tells future agents how to run syntax checks, local preview, and diagnostics.
- No gameplay tuning is mixed into structural refactor commits.

## Hard Rules For Future Agents

- Do not change gameplay values while moving code.
- Do not upgrade Matter.js while vendoring it.
- Do not delete source/preview assets unless a separate cleanup task explicitly approves it.
- Do not introduce a build step unless a separate architecture decision approves it.
- Keep each refactor commit small enough that a failed diagnostic run points to one subsystem.
- When in doubt, move data first, pure helpers second, stateful runtime last.
