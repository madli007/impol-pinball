# Phase 14.3.8 Regression Report

Status: completed

Date: 2026-06-26

Build: `14.3.8-regression-2`

## Regression Matrix

Ran `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=1438-regression-2`.

Result:

- `102/102` diagnostics passed.
- `20/20` committed ALU FLOW orbit attempts passed.
- `9/9` shot-map scenarios passed.
- `10/10` deterministic three-ball regression games finished.
- `10/10` shooter launches passed across charge levels.
- `20/20` outlane approaches passed, split evenly across left and right.
- `5/5` multiball start/end cycles passed.
- Mission-stage transitions, game-over/restart flow, audio preference persistence, high-score/ruleset persistence, and simultaneous feedback-zone readability all passed.
- Failed IDs: none.

## Measured Game Samples

The Phase 14.3.8 regression games produced:

| Metric | Result |
| --- | ---: |
| Average score | 386,637 |
| Maximum score | 947,070 |
| Average ball duration | 82 seconds |
| Maximum combo | 10 |
| Mission completion rate | 48% |
| Orbit completion rate | 44/54, 81% |
| Drains, center / left / right | 16 / 7 / 7 |
| Rescue activations | 18 |
| Unexpected repeated hits | 0 |

Scores remain inside the Phase 14.3.4 target envelope from beginner through strong mission/multiball games. The maximum combo stayed at the configured `10` cap.

## Responsive Checks

Ran browser DOM layout checks at the required widths with the normal, non-diagnostic page.

| Viewport | Horizontal overflow | Canvas | Controls |
| --- | ---: | --- | --- |
| 390 x 844 | 0 px | 341 x 531 | fixed, visible, 46 px buttons, clear of canvas |
| 768 x 900 | 0 px | 433 x 674 | fixed, visible, 46 px buttons, clear of canvas |
| 800 x 900 | 0 px | 433 x 674 | fixed, visible, 46 px buttons, clear of canvas |
| 1024 x 960 | 0 px | 552 x 858 | static desktop controls below table section |
| 1440 x 960 | 0 px | 552 x 858 | static desktop controls visible in right panel |

## Final Tuning

Applied one measured tablet-only layout tune after the first viewport pass showed the fixed controls covering the bottom `12 px` of the canvas at 768/800 px:

- Reduced the 640-919 px canvas height budget from `100svh - 186px` to `100svh - 226px`.

The rerun confirmed the fixed controls now clear the canvas at 768 and 800 px while preserving zero horizontal overflow.

No gameplay physics, scoring, mission, company, multiball, jackpot, audio, persistence, or input tuning was required.

## Known Limitations

- The three-ball game samples are deterministic regression samples, not a substitute for future human playtesting.
- At 1024 px the layout is in the desktop breakpoint, so the on-screen controls are static in the company/control panel rather than fixed to the viewport. Keyboard controls remain available.

## Decision

GO for Phase 14.4.

Phase 14.3 stabilization is complete. The table has no blocking regression defects in the measured matrix, score bands remain within the documented economy, and required responsive widths have no horizontal overflow.
