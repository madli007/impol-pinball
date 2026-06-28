# Phase 14.4.4 Lock House Regression Report

## Scope

Phase 14.4.4 verified the completed lock-house mechanism from qualification through bottom-to-top capture, persistent locked-ball storage, replacement launch, three-ball multiball release, interruption cleanup, and presentation readability.

No Phase 14.5 mini-game or additional table mechanism was implemented.

## Deterministic Diagnostics

Browser diagnostics were run at:

```text
http://127.0.0.1:4173/index.html?bust=phase14-4-4&pinballDiagnostics=all
```

Result:

```text
116/116 diagnostics passed
failed ids: -
```

Lock-house-specific results:

```text
Phase 14.4.1 qualification: passed
Phase 14.4.2 persistent capture and replacement launch: passed
Phase 14.4.3 persistent lock and three-ball multiball: passed
Phase 14.4.4 lock states: 5/5 readable
Phase 14.4.4 normal games: 10/10
Phase 14.4.4 lock loops: 14/14
Phase 14.4.4 decision: GO for Phase 14.5
```

The full diagnostic suite also retained the prior Phase 14.3.8 support results:

```text
Committed orbit: 20/20
Shot map: 9/9
Phase 14.3.8 games: 10/10
Shooter launches: 10/10
Outlane approaches: 20/20
Multiball cycles: 5/5
Persistence, flow, and visual checks: 5/5
```

## Normal Game Samples

Ten deterministic normal-game samples completed without a lock-house blocker. The samples covered both qualification orders:

- `COIL` then `ALU FLOW`
- `ALU FLOW` then `COIL`

Across those games, the lock house completed 14 qualify/capture/lock loops. No sample recorded a stuck held ball, duplicated ball, lost ball, uncleared lock-house state, or failed game-over completion.

The deterministic lock-house multiball check also verified that wrong-direction contacts do not lock, locked balls persist across a later drain, the third lock starts a 3-ball lock-house multiball, the stored balls release from the house with a delay, and qualification/capture remain blocked while multiball is active.

## Presentation Readability

The state presentation contract now distinguishes all five configured lock-house states:

```text
closed -> CLOSED
qualified -> READY
open -> OPEN
holding -> HELD
kicking -> KICK
```

`window.ImpolPinball.lockHouse.presentation` exposes the current presentation label, color, entrance-open status, progress label, requirement label, locked count, and maximum locked-ball count for browser inspection. The broader `window.ImpolPinball.lockHouse` state also exposes locked ball IDs, release queue timing, release count, and lock-house multiball start timing.

## Responsive Checks

Browser viewport checks passed with no horizontal overflow:

```text
390x844: pass, canvas 341x531
768x1024: pass, canvas 513x798
800x1024: pass, canvas 513x798
1024x900: pass, canvas 513x798
1440x900: pass, canvas 513x798
1440x1080: pass, canvas 629x978
```

The lock-house state text remains compact inside the playfield mechanism, and the diagnostic/status copy remains contained at the checked widths.

## Verification

```text
node --check game.js
Browser ?pinballDiagnostics=all: 116/116 passed
Responsive overflow checks: passed at 390, 768, 800, 1024, 1440, and 1440x1080
```

## Limitations

- The lock-house `open` state is presentation-ready and inspectable, but the current gameplay loop still uses `qualified` as the normal pre-capture open entrance state.
- Normal-game samples are deterministic harness samples, not human playtest telemetry.
- The Phase 14.5 bonus mini-game trigger is intentionally not implemented in this phase.

## Decision

GO for Phase 14.5.

The lock-house loop is fair, readable, and stable enough to become a later content trigger. No stuck, duplicated, lost-ball, or persistent-lock blocker was found.
