# Phase 14.3 Stabilization Program

## Purpose

Stabilize and rebalance the existing table before Phase 14.4 adds another major mechanism.

This document is the shared audit and execution specification for Phases 14.3.1 through 14.3.8. Each numbered phase is intentionally small enough to be assigned independently with a command such as:

```text
Start Phase 14.3.3.
```

An agent working on one phase should implement only that phase, preserve unrelated work, run the listed verification, update the phase status in this document and `docs/implementation_plan.md`, and record important implementation notes below that phase.

## Shared Audit Evidence

Observed during the June 25, 2026 playtest:

- The `ALU FLOW` orbit works when the ball is placed into its entry, but it was not reached during roughly 40 seconds of aggressive normal play that produced more than 170 combo steps and advanced two mission stages.
- The orbit entrance is squeezed between the left wall/rail and the ALCAD area. Its useful shooting mouth is too narrow and the intended flipper angle is unclear.
- A single first ball exceeded 2,000,000 points.
- The combo counter reached at least `172x COMBO`; the per-hit bonus was capped, but the chain and repeated capped awards were not.
- Incidental movement can rapidly move most companies to `Online`, while the active mission still shows little progress.
- Combo, side-shield, BOM, mission-light, ball-save, meta, and jackpot feedback share overlapping fixed canvas coordinates.
- `addHitFeedback` callers provide labels and colours, but the renderer currently ignores that text payload.
- At 800 px the page had approximately 90 px of horizontal overflow. At 761 px it had approximately 129 px.
- At 390 px the score feed covers part of the playfield and the visible controls are far below the table.
- The desktop center column can display the table larger than the current 560 px maximum without changing the internal 900x1400 physics space.

## Shared Constraints

- Do not begin Phase 14.4 until Phase 14.3.8 is complete.
- Keep the internal playfield at 900x1400 during this program unless a phase explicitly changes that decision.
- Do not add new missions, modes, major mechanisms, or decorative asset packs.
- Preserve keyboard, pointer, touch, audio, high-score, mission, company, multiball, jackpot, ball-save, and game-over flows.
- Prefer measurable diagnostics over tuning from one successful manual attempt.
- Each phase depends on the preceding phase unless its section explicitly says otherwise.

## Phase 14.3.1 - Deterministic Physics Test Harness

Status: completed

Depends on: Phase 14.3

Goal: provide repeatable evidence for physics and route tuning.

Scope:

- Add a development-only diagnostic mode enabled by an explicit query parameter.
- Add named scenarios for:
  - upper-orbit entry and completion
  - left/right flipper target attempts
  - shooter-lane exit at multiple launch powers
  - left/right inlane and outlane approaches
  - bumper-cluster entry
  - lower and upper trap rescue
  - multiball drain and grace save
- Record scenario name, start/end position, events, duration, maximum speed, repeated hits, combo count, drain reason, and rescue activation.
- Expose concise results through a stable inspectable object or diagnostic panel.
- Ensure diagnostic state cannot activate during ordinary play without the query parameter.

Out of scope:

- Retuning the orbit or general table geometry.
- Changing scoring, combo, mission, or company rules.
- Responsive layout changes.

Acceptance criteria:

- Every named scenario starts from deterministic initial conditions.
- Scenarios can be run repeatedly without manually editing source.
- Failures report a reason instead of silently timing out.
- Ordinary gameplay is unchanged when diagnostic mode is absent.
- Syntax and browser smoke checks pass.

Deliverable:

- A reusable harness that later phases use for before/after measurements.

Implementation notes:

- Added the `?pinballDiagnostics=1` query gate and the `window.impolPinballDiagnostics` inspectable object.
- Added `?pinballDiagnostics=all` for a queued full scenario run, or `?pinballDiagnostics=<scenario-id>` for one scenario.
- Added named deterministic scenarios for orbit completion, flipper target attempts, shooter-lane launch powers, inlane/outlane approaches, bumper entry, trap rescues, and multiball grace save.
- Diagnostic results record scenario metadata, start/end position, events, duration, maximum speed, repeated hits, combo count, drain reason, rescue activation, and explicit failure reasons.
- Diagnostic hooks are no-ops during ordinary play, and the panel/object are created only when the query parameter is present.
- Browser smoke was attempted through the local server; the environment served the updated source and loaded the page, but the in-app browser control session timed out during the automated diagnostic-page reload. Syntax and HTTP smoke checks passed.

## Phase 14.3.2 - Upper Orbit And Shot-Map Retune

Status: completed

Depends on: Phase 14.3.1

Goal: make the orbit and every mission-required target intentionally hittable.

Scope:

- Use the diagnostic harness to classify major shots as easy, medium, hard, accidental-only, or unreachable.
- Cover:
  - left flipper to orbit, MES/left measurement, center, and cross-table targets
  - right flipper to right measurement/CO2, center, and ALCAD
  - shooter-lane entry and skill shot
  - inlane returns and outlane approaches
- Widen and clarify the upper-orbit shooting mouth.
- Move or resize the ALCAD sensor/art footprint if it blocks the orbit.
- Add a short visible funnel or guides that accept a reasonable angle range.
- Avoid hidden velocity assistance before the ball has visibly committed to the route.
- Make failed orbit entries return safely to play.
- Improve orbit entrance lighting, arrow placement, completion feedback, and sound distinction.
- Retune nearby walls or target sensors only where the shot map proves it necessary.

Out of scope:

- Combo and score economy changes.
- Mission/company progression changes.
- General responsive layout work.

Acceptance criteria:

- A scripted committed orbit completes at least 18 out of 20 times.
- A player who knows the shot can complete at least 3 of 10 intentional orbit attempts.
- Every mission-required target has at least one repeatable intentional shot.
- Each flipper has at least two clearly useful shots.
- The ball cannot wedge around the orbit, ALCAD, shooter exit, or upper target cluster.
- Visual openings match collision openings.

Deliverable:

- A documented shot map and corrected table geometry.

Completed notes:

- Corrected geometry and shot map are documented in `docs/phase14_3_2_shot_map.md`.
- Final diagnostic run passed `43/43` scenarios, including `20/20` committed orbit attempts and `9/9` shot-map scenarios.

## Phase 14.3.3 - Sensor Cooldowns And Combo Rules

Status: completed

Depends on: Phase 14.3.2

Goal: eliminate score farming and runaway combo chains.

Scope:

- Add per-ball/per-object cooldowns or require sensor exit before a repeated score.
- Distinguish meaningful shot events from passive lane, rollover, and repeated local contacts.
- Prevent one local cluster from extending a combo indefinitely.
- Cap the visible combo tier and scoring contribution.
- Use a bounded combo structure such as:
  - hits 2-3: small tier
  - hits 4-6: medium tier
  - hits 7-10: maximum tier
  - later hits maintain or expire the tier without increasing an unbounded count
- Require route or object diversity for high combo tiers.
- Verify multiball does not multiply an already runaway loop.

Out of scope:

- Final point values and high-score migration.
- Mission/company progression tuning.
- Feedback layout changes except those required to display the bounded combo.

Acceptance criteria:

- Ordinary play cannot produce a 100+ combo.
- Repeated oscillation through one sensor cannot farm points.
- Passive or no-input play cannot produce a competitive score.
- Combos reward movement between meaningful objects or zones.
- Existing missions still receive valid hit events.

Deliverable:

- Bounded, inspectable combo and sensor-rehit rules.

Implementation notes:

- Added shared per-object and per-ball/object scoring cooldown rules for bumpers, targets, slingshots, rollovers, lanes, and route awards.
- Added bounded combo state with a maximum visible count of 10, passive lane/rollover/slingshot filtering, same-zone chain breaks, and small/medium/max tiers that require object and zone diversity.
- Exposed cooldown, suppression, combo tier, and diversity state through `window.ImpolPinball`.
- Added diagnostics for sensor re-hit suppression, passive sensors not building combos, and bounded diverse combo growth.
- Verified with `?pinballDiagnostics=all`: 46/46 diagnostics passed, including 20/20 committed orbit attempts, 9/9 shot-map scenarios, and the new Phase 14.3.3 cooldown/combo scenarios.

## Phase 14.3.4 - Score Economy Rebalance

Status: completed

Depends on: Phase 14.3.3

Goal: make difficult objectives valuable and normal game scores understandable.

Target three-ball ranges before exceptional multiplier play:

- beginner: approximately 75,000-200,000
- competent player: approximately 200,000-500,000
- strong mission/multiball game: approximately 500,000-1,000,000

Scope:

- Rebalance bumpers, targets, lanes, rollovers, slingshots, orbit, missions, multiball, and jackpots.
- Reduce incidental scoring relative to intentional shots.
- Keep the orbit above ordinary target value.
- Keep jackpots as the largest repeatable awards.
- Ensure mission completion creates a noticeable score jump.
- Decide whether high score updates live or at game over.
- Add a scoring/ruleset version and migrate or separate inflated legacy high scores.
- Use diagnostic and playtest data, not only arithmetic estimates.

Out of scope:

- Changing mission requirements or company state rules.
- Canvas feedback layout.
- Responsive/mobile layout.

Acceptance criteria:

- A first ball does not routinely exceed the intended full-game range.
- The measured sample broadly fits the target score bands.
- Passive contacts contribute less than routes, missions, multiball, and jackpots.
- Legacy inflated scores do not permanently invalidate future records.
- Scoring remains understandable from visible feedback.

Deliverable:

- Versioned and documented score rules with measured sample results.

Result:

- Added scoring ruleset `14.3.4-score-economy-1` with centralized values for passive contacts, intentional targets, orbit, combos, skill shot, missions, BOM, jackpots, and meta rewards.
- Separated legacy high scores under `impol-pinball.high-score.legacy-pre-14.3.4`; current records use `impol-pinball.high-score.14.3.4-score-economy-1`.
- Added inspectable score economy diagnostics and sample-band scenarios.
- Documented measured samples in `docs/phase14_3_4_score_economy.md`: beginner 84,640, competent 335,630, strong 947,070.

## Phase 14.3.5 - Mission And Company Progression Retune

Status: planned

Depends on: Phase 14.3.4

Goal: align progression with intentional play and make the current objective clear.

Scope:

- Verify each active mission requirement against the Phase 14.3.2 shot map.
- Retune mission requirements or stage order where progression relies mainly on random movement.
- Prevent incidental opening-minute hits from making most companies `Online`.
- Tie stronger company states to deliberate progress such as mission advancement, mission completion, route completion, or controlled high-tier combos.
- Decide how much locked targets should score and communicate.
- Improve current-objective copy and target lighting.
- Keep mission and company progress paused correctly during multiball.

Out of scope:

- Adding new missions or companies.
- General badge-layout and responsive work.
- New reward systems.

Acceptance criteria:

- Company progression does not outrun mission progression.
- Every mission can be completed through repeatable shots.
- A player can identify the current objective without reading a long status paragraph.
- A visible hit has an understandable progression result.
- Full staged progression remains reachable in a strong game.

Deliverable:

- Retuned requirements, state transitions, and objective communication.

## Phase 14.3.6 - Feedback Layout And Text Clarity

Status: planned

Depends on: Phase 14.3.5

Goal: stop messages from covering each other or the playfield.

Scope:

- Replace independently positioned badges with named feedback zones and explicit priorities.
- Reserve zones for:
  - ball/table status
  - multiball and jackpot state
  - temporary combo/BOM/ball-save/side-shield state
  - latest award text in the DOM score feed
- Define stacking, replacement, and timeout rules.
- Remove duplicate information where the DOM and canvas show the same message.
- Render the label/colour payload passed to `addHitFeedback`, or remove the unused API fields.
- Prevent feedback from covering rollovers, mission lamps, orbit entrance, flippers, or drain.
- Verify long jackpot, mission, and company labels.
- Review sound priority during dense scoring.

Out of scope:

- Score-value changes.
- Table geometry changes.
- Full responsive redesign.

Acceptance criteria:

- Combo, shield, ball save, BOM, jackpot, and multiball can coexist without overlap.
- No persistent feedback hides an active insert or shot entrance.
- Long messages fit or shorten gracefully.
- Latest awards remain readable during fast play.
- Audio remains distinct enough to identify major events.

Deliverable:

- One centralized feedback layout and message-priority model.

## Phase 14.3.7 - Table Scale, Responsive Layout, And Touch UX

Status: planned

Depends on: Phase 14.3.6

Goal: use desktop space better and make narrow screens genuinely playable.

Scope:

- Increase the desktop canvas maximum toward approximately 600-640 px where height permits.
- Reduce unused center-column padding.
- Keep the internal 900x1400 physics coordinates.
- Move the multi-column breakpoint to a width that can contain both HUDs and the table, likely around 920-980 px.
- Guarantee no horizontal page overflow at 390, 768, 800, 1024, and 1440 px.
- On mobile:
  - keep compact score, balls, and current mission near the playfield
  - stop the score feed covering the table
  - expose or teach touch control zones
  - keep flipper and launch controls usable while viewing the table
  - move lower-priority company detail below controls
  - preserve readable essential labels
- Reduce decorative contrast behind important paths if necessary.
- Check art bounds against physics bounds at each tested size.

Out of scope:

- Widening the internal physical playfield.
- Adding new table mechanisms.
- Rebalancing scoring or progression.

Acceptance criteria:

- `scrollWidth <= clientWidth` at all required viewport widths.
- Desktop uses the center column more confidently.
- Score, balls, and current objective remain visible near the table.
- Touch launch and both flippers are usable without scrolling away from play.
- The score feed does not obscure the top playfield.
- Visual entrances still match physics at every tested size.

Deliverable:

- Responsive desktop, tablet, and mobile presentation without changing physics coordinates.

## Phase 14.3.8 - Full Regression And Final Tuning

Status: planned

Depends on: Phases 14.3.1 through 14.3.7

Goal: prove the stabilized table is ready for Phase 14.4.

Scope:

- Run at least:
  - 10 normal three-ball games
  - 20 deterministic orbit attempts
  - 10 shooter launches across charge levels
  - 10 left and 10 right outlane approaches
  - 5 multiball starts and endings
  - all mission-stage transitions
  - game-over and restart flows
  - audio preference persistence
  - high-score/ruleset persistence
  - responsive checks at 390, 768, 800, 1024, and 1440 px
- Record:
  - average and maximum score
  - average ball duration
  - maximum combo
  - mission completion rate
  - orbit attempt/completion rate
  - center/left/right drain counts
  - rescue activations
  - unexpected repeated hits
  - visual overlaps
- Apply only small final tuning supported by the regression data.
- Document remaining known limitations separately instead of silently expanding scope.

Out of scope:

- New features or mechanisms.
- Large architecture rewrites.
- Unmeasured redesigns.

Acceptance criteria:

- Ten complete games finish without a stuck ball, broken drain, or progression blocker.
- The orbit and required target success rates meet Phase 14.3.2 criteria.
- No passive farming or runaway combo remains.
- Scores broadly fit Phase 14.3.4 bands.
- All simultaneous feedback is readable.
- No required viewport overflows horizontally.
- Mobile controls remain usable while viewing the table.
- The final report explicitly recommends either proceeding to Phase 14.4 or lists blocking defects.

Deliverable:

- A regression report and a clear go/no-go decision for Phase 14.4.

## Program Completion

The Phase 14.3 stabilization program is complete only when all eight phases are marked completed in `docs/implementation_plan.md`.
