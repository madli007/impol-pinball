# Phase 14.4-14.7 Agent Execution Plan

## Purpose

Define the remaining Phase 14 work as small, independently assignable agent phases.

An agent should be able to receive a command such as:

```text
Start Phase 14.5.2.
```

For that command, the agent should:

- implement only the named phase
- respect its dependency and out-of-scope boundaries
- keep the game runnable
- run the listed verification
- update status in this document and `docs/implementation_plan.md`
- record implementation notes under the completed phase

## Shared Rules

- Phase 14.4 is unblocked after Phase 14.3.8 completed with a GO decision.
- Do not combine adjacent phases merely because they touch the same feature.
- Preserve existing physics, scoring, mission, company, multiball, jackpot, persistence, input, audio, and responsive contracts unless the phase explicitly changes one.
- Every new mechanism must expose inspectable state for browser verification.
- Every physical feature must have matching visual and collision openings.
- Do not add backend services during Phase 14.

## Phase 14.4 - Lock House Program

### Phase 14.4.1 - Lock House State Model And Closed Target

Status: completed

Depends on: Phase 14.3.8

Goal: establish the lock house as a visible, inspectable table feature without capturing the ball yet.

Scope:

- Choose and document the final placement.
- Add lock-house state such as `closed`, `qualified`, `open`, `holding`, and `kicking`.
- Define the qualification rule using existing targets, lanes, missions, or route events.
- Add a visible closed house/opening, indicator lamps, and a safe closed-state collision or sensor.
- Show qualification progress in concise HUD or playfield feedback.
- Expose configuration and runtime state through `window.ImpolPinball`.

Out of scope:

- Ball capture, hold, or kickout.
- Lock-house scoring rewards.
- Mini-game triggering.

Acceptance criteria:

- The feature is visible and its collision opening matches the art.
- Qualification progresses only from documented events.
- Closed and qualified states are distinguishable.
- The closed feature cannot trap or unexpectedly reject the ball.
- Existing routes remain usable.

Deliverable:

- A stable lock-house state model and qualified opening.

Implementation notes:

- Final placement: right-mid playfield beside the CO2 bumper, above the E-ODPREMA lane, and clear of the shooter lane. The Phase 14.4.1 entrance is sensor-only at the house mouth, so the closed feature reports contact without trapping or rejecting the ball.
- Runtime states are defined as `closed`, `qualified`, `open`, `holding`, and `kicking`; Phase 14.4.1 actively uses `closed` and `qualified`, with capture disabled for the later hold/kickout phases.
- Qualification rule: complete one `ALU FLOW ORBIT` route event and hit `COIL COLLECTOR` once, in either order. Lock-house contact and unrelated targets do not advance qualification.
- Added playfield art, shutter/open-mouth states, two requirement lamps, concise status-copy progress, and `window.ImpolPinball.lockHouse` config/runtime exposure.
- Added diagnostic scenario `phase14-4-1-lock-house-qualification`.

### Phase 14.4.2 - Ball Capture And Safe Hold

Status: completed

Depends on: Phase 14.4.1

Goal: capture one eligible ball reliably, store it as a persistent lock, and keep physics/life counters valid.

Scope:

- Open the entrance only when qualified.
- Detect a valid bottom-to-top ball entry.
- Transition the captured ball into controlled persistent lock storage.
- Remove the locked ball from active physics safely.
- Handle multiball explicitly: document whether capture is disabled, captures one ball, or ends the feature.
- Auto-launch a replacement ball without spending a normal ball.
- Expose locked ball IDs, locked count, and blocked-capture reasons.

Out of scope:

- Kickout trajectory.
- Final reward values.
- Mini-game UI.

Acceptance criteria:

- 20 deterministic eligible entries produce 20 safe captures.
- Closed or unqualified entries do not capture.
- Locking cannot duplicate, lose, or permanently freeze a ball.
- Restart and game over clear locked state safely; ordinary drains preserve locked balls.

Deliverable:

- Reliable single-ball capture and persistent lock behavior.

Implementation notes:

- Enabled lock-house capture after qualification only; closed or unqualified contacts now record a blocked capture reason and leave the active ball untouched.
- Implemented the Phase 14.4.2 multiball policy as `capture-disabled-during-multiball`, so a qualified house remains readable but does not capture while multiball is active or while more than one ball is in play.
- Lock-house capture now requires a qualified open house, exactly one active ball, and a bottom-to-top hit into the mouth; wrong-direction contacts are rejected with a blocked reason.
- A captured ball is removed from Matter active play and stored persistently by original ball ID; `window.ImpolPinball.lockHouse` exposes `lockedBallIds`, `lockedCount`, and blocked-capture state.
- Non-final locks auto-launch a replacement ball from the shooter lane without advancing `ballNumber` or decrementing `ballsLeft`; locked balls persist across later drains until game over or restart.
- Added diagnostic scenario `phase14-4-2-lock-house-capture-hold`, including 20 deterministic persistent captures, replacement launches, preserved life counters, closed-entry rejection, and multiball-disabled rejection.

### Phase 14.4.3 - Persistent Locks And Three-Ball Multiball

Status: completed

Depends on: Phase 14.4.2

Goal: turn three persistent lock-house captures into a readable three-ball multiball.

Scope:

- Require three qualified bottom-to-top lock-house captures.
- Auto-launch a replacement ball after the first and second locks without consuming a normal ball.
- Release the three locked balls from the house mouth one by one with a tuned delay.
- Keep ball save active for the lock-house multiball start.
- Reset lock count after the multiball begins.
- Prevent qualification and capture during multiball.

Out of scope:

- Bonus mini-game.
- Large score-economy redesign.

Acceptance criteria:

- Wrong-direction house contacts do not lock.
- Locked balls persist across drains and do not alter normal life counters.
- Three locks start a 3-ball lock-house multiball with staged releases.
- Qualification and capture are blocked during multiball.
- Restart and game-over clear locked and queued balls safely.

Deliverable:

- A complete qualify-capture-lock-counter-to-multiball loop.

Implementation notes:

- The former temporary hold/reward/kickout loop has been replaced by persistent stored locks.
- The first and second locks close the house, clear ALU FLOW/COIL qualification progress, increment the inspectable lock counter, and auto-launch a replacement ball with ball save.
- The third lock starts lock-house multiball, resets `lockedCount`, and releases the three stored balls from the house mouth with `multiballReleaseDelayMs`.
- Exposed `maxLockedBalls`, `lockedBallIds`, `lockedCount`, `lockMultiballStartedAt`, `releaseCount`, queued release count, next release timing, and release delay through `window.ImpolPinball.lockHouse`.
- Added deterministic coverage in `phase14-4-3-lock-house-kickout-reward` for wrong-direction blocking, lock persistence across drain, staged three-ball release, lock-count reset, and multiball capture/progress blocking.
- Verification: `node --check game.js` passed; browser `?pinballDiagnostics=all` passed `116/116`.

### Phase 14.4.4 - Lock House Regression And Presentation

Status: completed

Depends on: Phases 14.4.1 through 14.4.3

Goal: prove the mechanism is fair, readable, and ready to trigger later content.

Scope:

- Run deterministic and normal-play qualification, bottom-to-top capture, persistent lock, replacement launch, and three-ball release tests.
- Verify all state transitions and interruption paths.
- Tune only measured geometry, timing, feedback, and reward issues.
- Check desktop, tablet, and mobile readability.
- Document remaining limitations and a go/no-go decision for Phase 14.5.

Out of scope:

- Implementing the mini-game.
- Adding another table mechanism.

Acceptance criteria:

- Ten normal games complete without a lock-house blocker.
- No stuck, duplicated, or lost ball occurs.
- Players can identify closed, qualified, open, holding/locked, and kickout/release states.
- The final report recommends proceeding to Phase 14.5 or identifies blockers.

Deliverable:

- Lock-house regression report and go/no-go decision.

Implementation notes:

- Added Phase 14.4.4 diagnostics for ten deterministic normal-game samples, 14 total lock-house qualify/capture/lock loops, and readable presentation coverage for `closed`, `qualified`, `open`, `holding`, and `kicking`.
- Tuned lock-house presentation copy so `qualified` reads as `READY`, explicit `open` reads as `OPEN`, and held/kickout states remain compact inside the physical house art.
- Exposed `window.ImpolPinball.lockHouse.presentation` with current state label, color, entrance-open status, progress label, and requirement label.
- Ran browser diagnostics with `?pinballDiagnostics=all`: `116/116` passed, including `10/10` Phase 14.4.4 normal games, `14/14` lock-house loops, `5/5` readable lock-house states, and the three deterministic Phase 14.4 mechanism checks.
- Checked responsive readability/no horizontal overflow at `390x844`, `768x1024`, `800x1024`, `1024x900`, `1440x900`, and `1440x1080`; all passed.
- Documented remaining limitations and GO decision in `docs/phase14_4_4_lock_house_regression_report.md`.
- Decision: GO for Phase 14.5.

## Phase 14.5 - Bonus Mini-Game Program

### Phase 14.5.1 - Mini-Game Trigger And Pinball Suspension Contract

Status: planned

Depends on: Phase 14.4.4

Goal: define a safe transition between pinball and a bonus interaction.

Scope:

- Choose one trigger from the completed lock-house loop.
- Define mini-game states: inactive, entering, active, resolving, and returning.
- Safely hold or suspend active pinballs.
- Disable normal pinball scoring and controls while the mini-game owns input.
- Define cancellation and recovery for restart, page blur, and unexpected state changes.
- Add a minimal placeholder overlay proving entry and exit.

Out of scope:

- Actual mini-game mechanics and art.
- Final rewards.

Acceptance criteria:

- Triggering cannot drain, duplicate, or lose a pinball.
- Pinball controls and scoring are paused only while required.
- Exit restores every held ball and game state safely.
- Restart and blur cannot leave the game suspended.

Deliverable:

- A tested suspension and resume contract.

### Phase 14.5.2 - Single Bonus Mini-Game

Status: planned

Depends on: Phase 14.5.1

Goal: implement one short, understandable bonus game.

Scope:

- Choose one concept only:
  - timing press
  - simple obstacle dodge
  - Flappy-style aluminium coil/delivery object
- Keep a complete run approximately 8-15 seconds.
- Use existing keyboard and touch-capable input abstractions.
- Add start instructions, success/failure condition, timer, score, and concise themed visuals.
- Keep the mini-game isolated from ordinary pinball scoring internals.

Out of scope:

- Multiple mini-games.
- Difficulty selection, upgrades, or persistence.
- Complex animation or generated asset production.

Acceptance criteria:

- A first-time player can understand the input from the overlay.
- Success and failure always resolve.
- Keyboard and touch input both work.
- No run exceeds the documented maximum duration because of a stuck state.

Deliverable:

- One complete bonus interaction.

### Phase 14.5.3 - Reward Integration And Regression

Status: planned

Depends on: Phase 14.5.2

Goal: connect the bonus result back to pinball without destabilizing the main game.

Scope:

- Choose and balance one reward family: points, multiplier progress, or ball-save extension.
- Display the result before returning to the table.
- Resume held ball state and normal controls.
- Add audio and feedback priority integration.
- Test repeated triggers, game-over boundaries, mobile layout, and persistence boundaries.

Out of scope:

- New reward currencies.
- Additional mini-games.
- Hall of Fame changes.

Acceptance criteria:

- Reward is applied exactly once.
- Return to pinball is reliable across 20 deterministic runs.
- Repeated triggers do not compound stale overlay or input state.
- Mini-game results do not bypass scoring-version rules.

Deliverable:

- Fully integrated and regression-tested bonus mode.

## Phase 14.6 - Local Hall Of Fame Program

### Phase 14.6.1 - Versioned Score Storage Model

Status: planned

Depends on: Phase 14.3.4

Goal: establish safe local score persistence before building leaderboard UI.

Scope:

- Define `{ version, rulesetVersion, entries }`.
- Define entry fields: initials, score, date, and optional build version.
- Sort, limit, validate, and sanitize entries.
- Migrate or isolate the existing single high score.
- Keep a fallback when `localStorage` is unavailable or invalid.
- Expose storage status for verification.

Out of scope:

- Initials-entry UI.
- Leaderboard presentation.
- Shared/online scores.

Acceptance criteria:

- Valid entries survive reload.
- Corrupt or old data cannot break startup.
- Scores from incompatible rulesets are separated or clearly marked.
- Fallback high score still works without storage access.

Deliverable:

- Tested local Hall of Fame data service.

### Phase 14.6.2 - Hall Of Fame View

Status: planned

Depends on: Phase 14.6.1

Goal: show local records without interrupting active play.

Scope:

- Add a compact Hall of Fame view available outside active play.
- Show rank, initials, score, date, and ruleset context.
- Support empty, populated, unavailable-storage, and migrated-data states.
- Keep the current high-score HUD value consistent with stored entries.
- Add keyboard and touch-accessible open/close behavior.

Out of scope:

- Asking for initials.
- Online sharing.
- Editing or deleting individual entries.

Acceptance criteria:

- The view never blocks or steals input during active play.
- Long scores and dates fit supported layouts.
- Empty and unavailable states are understandable.
- Desktop and mobile presentation pass visual checks.

Deliverable:

- Read-only local leaderboard UI.

### Phase 14.6.3 - Qualifying Score And Initials Flow

Status: planned

Depends on: Phase 14.6.2

Goal: capture initials only when a completed game earns a leaderboard entry.

Scope:

- Determine qualification at game over.
- Add a short initials entry flow with a documented character limit.
- Support keyboard and touch input.
- Validate, normalize, save, and immediately display the entry.
- Handle cancel, duplicate submission, restart, and unavailable storage.
- Keep the existing game-over presentation coherent.

Out of scope:

- Profiles, login, or online identity.
- Shared Hall of Fame.

Acceptance criteria:

- Non-qualifying games do not prompt.
- A qualifying score can be submitted exactly once.
- Cancel and storage failure do not block restart.
- Saved initials and score survive reload.

Deliverable:

- Complete local Hall of Fame entry flow.

## Phase 14.7 - Optional Depth Backlog

Phase 14.7 is not itself an executable phase. It is a collection of optional features. Start one of the numbered subphases only after Phase 14.6.3, unless its dependency says otherwise.

Recommended order:

1. Phase 14.7.1 - Rules and help overlay
2. Phase 14.7.2 - Shift report
3. Phase 14.7.3 - ERP error hurry-up
4. Phase 14.7.4 - Mode callouts and lighting
5. Phase 14.7.5 - Coil Flow route mode

### Phase 14.7.1 - Rules And Help Overlay

Status: planned

Depends on: Phase 14.3.8

Goal: explain controls, current rules, routes, and scoring outside active play.

Scope:

- Add a concise rules/help view available before launch, between balls, or after game over.
- Cover controls, missions, multiball, jackpots, orbit, shields, lock house, and mini-game only when implemented.
- Keep content derived from the current ruleset.
- Support keyboard, pointer, and touch.

Out of scope:

- Interactive tutorial gameplay.
- New rules.

Acceptance criteria:

- Help cannot open over an active ball unless the game is safely paused.
- Content matches implemented rules and current scoring version.
- Desktop and mobile layouts remain readable.

Deliverable:

- Current-rules help overlay.

### Phase 14.7.2 - End-Of-Ball Shift Report

Status: planned

Depends on: Phases 14.3.8 and 14.3.6

Goal: summarize one ball without delaying the next-ball flow excessively.

Scope:

- Track per-ball missions, routes, combos, jackpots, company progress, and bonus total.
- Show a compact report between balls and a fuller summary at game over.
- Allow quick dismissal and automatic timeout.

Out of scope:

- Changing the underlying score economy.
- Persistent player statistics.

Acceptance criteria:

- Report totals reconcile with awarded points.
- Next-ball and game-over controls remain responsive.
- Long reports shorten or scroll cleanly.

Deliverable:

- Per-ball and end-game summary.

### Phase 14.7.3 - ERP Error Hurry-Up

Status: planned

Depends on: Phases 14.3.8 and 14.3.6

Goal: add one short timed target mode.

Scope:

- Define one documented trigger.
- Light MES/ERP as the required hurry-up target.
- Add timer, success, failure, reward, audio, and feedback.
- Prevent overlapping instances and define multiball behavior.

Out of scope:

- Multiple hurry-up types.
- New target geometry.

Acceptance criteria:

- Trigger, success, timeout, and reset are deterministic.
- Feedback does not conflict with other modes.
- Reward follows the current score economy.

Deliverable:

- One complete ERP-themed hurry-up.

### Phase 14.7.4 - Mode Callouts And Lighting

Status: planned

Depends on: Phases 14.7.3 and 14.3.6

Goal: improve identity of existing states without adding new rule complexity.

Scope:

- Add callouts such as `QUALITY MODE`, `ERP FREEZE`, `GREEN BONUS`, and `KOSOVNICA PANIC` only for real implemented states.
- Add restrained playfield lighting changes and audio callouts.
- Use centralized feedback priority rules.

Out of scope:

- New scoring modes hidden behind the callout names.
- Large lighting engine or new asset pack.

Acceptance criteria:

- Every callout corresponds to a real state.
- Lighting preserves ball and target readability.
- Callouts cannot overlap or spam.

Deliverable:

- Themed presentation layer for existing modes.

### Phase 14.7.5 - Coil Flow Route Mode

Status: planned

Depends on: Phases 14.3.8, 14.3.3, and 14.3.4

Goal: add one route-based rolling bonus using stabilized combo and scoring rules.

Scope:

- Define a short sequence involving the orbit and coil-related targets.
- Add progression, timeout, completion, reset, scoring, audio, and feedback.
- Define behavior during multiball and lock-house hold.
- Expose inspectable state.

Out of scope:

- New physical ramp.
- Additional route modes.

Acceptance criteria:

- Sequence events cannot be farmed from one sensor.
- Progress and timeout are readable.
- Reward remains within the current score economy.
- Mode resets safely on drain, restart, and game over.

Deliverable:

- One complete route-combo mode.

## Program Completion

Phase 14 is complete when:

- Phases 14.3.1-14.3.8 are completed
- Phases 14.4.1-14.4.4 are completed
- Phases 14.5.1-14.5.3 are completed
- Phases 14.6.1-14.6.3 are completed

Phase 14.7 subphases are optional and do not block completion unless explicitly promoted to release requirements.
