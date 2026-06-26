# Phase 14.3.2 Shot Map

Status: completed

Date: 2026-06-26

## Geometry Changes

- Widened the ALU FLOW upper-orbit mouth with a larger entry sensor and clearer visible glow/arrow path.
- Moved the ALCAD target from `x=254,y=784` to `x=318,y=808` and reduced its sensor/art footprint so it no longer crowds the orbit entrance.
- Moved the main orbit rail outward and added a short lower funnel guide so visual openings match the collision opening.
- Added an explicit committed-entry gate at `x <= 206` and `y <= 832`; orbit velocity guidance starts only after the ball is visibly in the route mouth.
- Added orbit fail-safe state and diagnostics for roll-outs/timeouts.
- Added return-zone overlap completion so a clean route is not missed if the return sensor was first touched while the ball was still ascending.

## Shot Classification

| Source | Intentional shot | Classification | Diagnostic scenario |
| --- | --- | --- | --- |
| Left flipper | ALU FLOW orbit | Medium | `shot-left-flipper-to-orbit` |
| Left flipper | MERILNI / left measurement | Easy | `shot-left-flipper-to-measurement-left` |
| Left flipper | FURNACE center shot | Medium | `shot-left-flipper-to-furnace` |
| Left flipper | E-ODPREMA cross-table | Hard | `shot-left-flipper-to-eodprema` |
| Right flipper | PROTOKOL / right measurement | Easy | `shot-right-flipper-to-measurement-right` |
| Right flipper | CO2 / GREEN | Medium | `shot-right-flipper-to-co2` |
| Right flipper | COIL COLLECTOR | Medium | `shot-right-flipper-to-coil` |
| Right flipper | ALCAD | Medium | `shot-right-flipper-to-alcad` |
| Either flipper | KOSOVNICA center shot | Hard | `shot-center-to-kosovnica` |
| Shooter lane | Shooter exit / skill-shot lane | Easy | `shooter-lane-low-power`, `shooter-lane-medium-power`, `shooter-lane-high-power` |
| Lower lanes | Inlane/outlane approaches | Easy | `left-inlane-approach`, `right-inlane-approach`, `left-outlane-approach`, `right-outlane-approach` |

## Diagnostic Result

Ran `http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=1432-8`.

Result:

- `43/43` diagnostics passed.
- `20/20` committed orbit attempts passed.
- `9/9` shot-map scenarios passed.
- Failed IDs: none.

This satisfies the scripted committed-orbit target of at least `18/20` and documents at least one repeatable shot for every mission-required event.
