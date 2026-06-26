# Phase 14.3.5 Mission And Company Progression

Status: completed

Date: 2026-06-26

## Rules Changes

- ERP GO-LIVE now advances from the repeatable `ALU FLOW ORBIT` route (`hit:UPPER_ORBIT`) instead of the random upper ERP bumper.
- GREEN ALUMINIUM now requires 3 CO2/GREEN hits instead of 4 to reduce upper-bumper drift dependency.
- Ordinary mapped contacts still score and focus the related company, but they do not upgrade company state.
- Company `Online` requires staged mission progress.
- Company `Complete` requires all missions assigned to that company to be complete.
- Company `Bonus` requires company completion plus a controlled combo of 4+ hits on that company's mapped event, except RONDAL can also be awarded through the BOM route.
- Mission and company progression remain paused during multiball through the existing `gameState.multiball.active` gates.

## Objective Communication

- The HUD `Objective` field now shows compact current-objective copy such as `HIT MERILNI / PROTOKOL 0/3`.
- The `Current focus` panel begins with the current objective before company and mode context.
- Active mission targets, bumpers, and the ALU FLOW route stay lit while they are the staged objective.
- Future mission hits show a short locked-stage cue instead of silently implying progress.

## Diagnostics

Added diagnostics:

- `progression-incidental-contacts-gated`
- `progression-full-staged-reachable`

These prove that incidental opening contacts do not upgrade companies and that all staged missions plus all company bonus states remain reachable.

## Verification

- `node --check game.js` passed.
- Full in-browser diagnostics were attempted at `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=1435-2`, but the local environment hung before `game.js` because the external Matter.js CDN script could not complete loading. This matches the existing browser-smoke limitation noted in the README.
