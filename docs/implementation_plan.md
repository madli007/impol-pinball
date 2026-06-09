# Impol Pinball Implementation Plan

## 1. Product Direction

Build a browser-based pinball game called **Impol Pinball** for a static GitHub Pages deployment.

The first milestone is a genuinely playable MVP, not a full visual recreation of `docs/mock.png`. The mockup is the art direction reference for later polish: industrial aluminium table, Impol group context, company panels, missions, coils, furnace, rolling, extrusion, and digital transformation themes.

MVP priority:

1. Stable, fun ball and flipper feel.
2. Clear pinball table skeleton.
3. Simple scoring, missions, and high score.
4. Clean structure that can be extended into the richer mockup later.

## 2. Recommended Stack

Use a simple static setup:

- `HTML5`
- `CSS`
- Vanilla `JavaScript`
- `Canvas`
- `Matter.js` from CDN for the first MVP
- `localStorage` for high score

Avoid for MVP:

- npm
- React, Vue, Angular
- backend
- database
- build steps
- TypeScript
- runtime AI asset generation

Matter.js can be vendored later into `lib/matter.min.js` if the project needs offline/self-contained deployment.

## 3. File Structure

Initial structure:

```text
impol-pinball/
|-- index.html
|-- style.css
|-- game.js
|-- README.md
|-- docs/
|   |-- implementation_plan.md
|   |-- impol_pinball_codex_plan_prompt.md
|   `-- mock.png
`-- assets/
    |-- images/
    |-- sounds/
    `-- fonts/
```

Do not create asset files until they are actually used. Empty folders are optional.

Potential later structure:

```text
lib/
`-- matter.min.js
```

## 4. MVP Scope

The first playable version should include:

- Static responsive page that can run by opening `index.html`.
- Center canvas/playfield.
- Minimal HUD inspired by the mockup.
- Matter.js physics world.
- One active ball.
- Two keyboard-controlled flippers.
- Classic pinball skeleton:
  - outer walls
  - drain
  - side lanes
  - top bumpers
  - mid-field targets
  - right-side launch lane
- Basic plunger:
  - hold `Space` to charge
  - release `Space` to launch
  - after drain, `Space` starts/launches the next ball
- Score.
- Balls remaining.
- Current mission/progress.
- Multiplier display.
- Local high score using `localStorage`.
- Restart button.

Keyboard controls:

- `A` or `ArrowLeft`: left flipper
- `D` or `ArrowRight`: right flipper
- `Space`: charge/release plunger or restart/launch next ball

Out of MVP:

- multiball
- sound
- mobile/touch controls
- generated or hand-polished asset pack
- full company progress system
- full Hall of Fame
- realistic rotating flipper simulation
- complex ramps

## 5. Layout Direction

Use a minimal layout that already leaves room for the mockup's structure:

- Main playfield in the center.
- Compact HUD for score, ball, balls left, multiplier, and high score.
- Small mission panel.
- Small company/status panel as visual context only.

Company names can appear in UI, but they should not become active gameplay systems in MVP:

- Impol
- Seval
- Alcad
- TLM
- Impol-PC
- Rondal
- Impol Final

Active gameplay zones should focus on process/system themes:

- `MES`
- `ERP CORE`
- `MERILNI PROTOKOL`
- `FURNACE`
- `COIL`
- `E-ODPREMA`
- `GREEN ALUMINIUM`

## 6. Physics Approach

Use Matter.js for:

- ball
- static walls
- bumpers
- targets
- drain sensor
- launch lane boundaries
- flipper collision bodies

Keep physics simple and stable.

Flippers:

- Implement as simple kinematic rectangular bodies.
- Manually interpolate their angle between rest and active positions.
- Prefer reliable feel over physically perfect constraints.

Bumpers:

- Static circular sensors or collision bodies.
- On collision, apply a small impulse to the ball.
- Emit a gameplay event such as `hit:MES`.

Targets:

- Static rectangles or polygons.
- Can be sensors or solid bodies depending on feel.
- Emit events such as `hit:MEASUREMENT`, `hit:ERP`, `hit:COIL`.

Drain:

- Sensor near bottom center.
- When ball enters drain:
  - remove/reset ball
  - decrement balls remaining
  - update high score if needed
  - wait for next launch or restart

## 7. Table Configuration

Start with one classic table skeleton, but represent it through a minimal config structure so the playfield can be upgraded later without rewriting scoring and missions.

Suggested shape:

```js
const TABLE_CONFIG = {
  bounds: { width: 900, height: 1400 },
  flippers: [
    { id: "left", x: 360, y: 1220, width: 180, height: 28, restAngle: 0.35, activeAngle: -0.55 },
    { id: "right", x: 540, y: 1220, width: 180, height: 28, restAngle: -0.35, activeAngle: 0.55 }
  ],
  bumpers: [
    { id: "mes", label: "MES", x: 360, y: 360, radius: 52, event: "hit:MES", points: 1000 },
    { id: "furnace", label: "FURNACE", x: 540, y: 360, radius: 52, event: "hit:FURNACE", points: 1000 }
  ],
  targets: [
    { id: "erp", label: "ERP CORE", x: 450, y: 610, width: 140, height: 42, event: "hit:ERP", points: 750 },
    { id: "measurement-a", label: "MERILNI", x: 300, y: 760, width: 100, height: 34, event: "hit:MEASUREMENT", points: 500 },
    { id: "coil", label: "COIL", x: 600, y: 760, width: 100, height: 34, event: "hit:COIL", points: 500 }
  ]
};
```

The exact coordinates should be tuned during implementation.

## 8. Code Structure

Keep everything in `game.js` for the first implementation, but organize it into clear classes or sections.

Recommended classes:

- `Game`
  - owns lifecycle, state, update loop
- `PhysicsWorld`
  - wraps Matter.js engine, world, runner/timestep, collision events
- `PinballTable`
  - creates walls, lanes, bumpers, targets, flippers from `TABLE_CONFIG`
- `BallManager`
  - creates ball, launches ball, handles drain/reset
- `FlipperController`
  - tracks input state and updates flipper angles
- `MissionManager`
  - listens to hit events and updates mission progress
- `ScoreManager`
  - score, multiplier, high score persistence
- `InputManager`
  - keyboard input and button clicks
- `UIManager`
  - updates DOM HUD
- `Renderer`
  - draws canvas table, bodies, labels, lights, ball

Do not split into multiple JS modules until the single file becomes difficult to navigate.

## 9. Mission System Design

Use simple event-driven missions.

MVP missions:

### MERILNI PROTOKOL

- Requirement: hit measurement targets 3 times.
- Event: `hit:MEASUREMENT`
- Reward: score bonus.

### MES ONLINE

- Requirement: hit MES bumper 5 times.
- Event: `hit:MES`
- Reward: score bonus.

### ERP GO-LIVE

- Requirement: hit ERP core 3 times.
- Event: `hit:ERP`
- Reward: temporary or simple persistent `2x` multiplier.

MVP reward model:

- Mission completion gives immediate bonus points.
- One mission can activate a simple multiplier.
- No multiball yet.
- No complex mission tree yet.

Suggested mission object:

```js
{
  id: "mes-online",
  label: "MES ONLINE",
  event: "hit:MES",
  required: 5,
  progress: 0,
  completed: false,
  reward: { type: "points", value: 10000 }
}
```

## 10. Asset Strategy

MVP:

- Draw everything with Canvas/CSS:
  - metallic table base
  - rails
  - bumpers
  - targets
  - labels
  - lights
  - simple company/status panels

After first playable prototype:

- Generate a small playfield asset pack.
- Focus on gameplay elements first, not UI chrome.

First asset pack candidates:

- furnace
- coil collector
- ERP core
- MES terminal
- e-Odprema truck
- green aluminium target
- measurement sensor/target
- aluminium coils

Do not generate assets during gameplay. Runtime AI generation would require services or backend logic and conflicts with the static GitHub Pages goal.

## 11. Visual Style

Use the mockup as style reference, but simplify heavily:

- dark metallic table
- aluminium/silver rails
- blue industrial UI
- green/orange accent lights
- readable labels
- Slovenian internal terminology
- arcade feedback text for hits and mission completion

Tone:

- Slovenian internal humor for domain labels.
- English arcade words where they feel natural:
  - `COMBO`
  - `JACKPOT`
  - `MULTIBALL`
  - `BONUS`

## 12. Deployment

Deployment target: GitHub Pages.

Steps:

1. Keep the app static.
2. Ensure `index.html` works directly in browser.
3. Commit `index.html`, `style.css`, `game.js`, and docs.
4. In GitHub repository settings, enable GitHub Pages.
5. Publish from the main branch/root or configured Pages branch.
6. Verify the deployed URL loads Matter.js from CDN and starts the game.

If CDN availability becomes a concern:

1. Add `lib/matter.min.js`.
2. Update `index.html` to load local Matter.js.
3. Document the local dependency in `README.md`.

## 13. Risks and Simplifications

### Risk: Flipper physics feel bad

Simplification:

- Use manually controlled kinematic flippers.
- Tune angles, speed, restitution, and ball impulse.

### Risk: Full mockup is too ambitious

Simplification:

- Treat mockup as art direction only.
- Build gameplay first.

### Risk: Too many domain concepts

Simplification:

- MVP missions use only MES, ERP, and Merilni protokol.
- Other concepts stay as labels or later backlog.

### Risk: Canvas layout does not scale well

Simplification:

- Use fixed internal table coordinates.
- Scale canvas to fit available viewport.
- Keep physics world in fixed dimensions.

### Risk: CDN breaks offline use

Simplification:

- Start with CDN.
- Vendor `matter.min.js` later if needed.

## 14. First Coding Task Checklist

Use small phases that produce visible progress as quickly as possible. Each phase should leave the project in a runnable state.

### Phase 1: Visible Static Shell

- [x] Phase 1.1 - Page shell - Status: complete
  - Create `index.html`, link `style.css` and `game.js`, add Matter.js CDN.
  - Visible result: opening `index.html` shows an Impol Pinball page, even before gameplay exists.

- [x] Phase 1.2 - Industrial HUD layout - Status: complete
  - Add score, balls left, multiplier, high score, mission panel, company/context panel, and restart button as static UI.
  - Visible result: page already resembles a simplified version of the mockup structure.

- [x] Phase 1.3 - Canvas playfield frame - Status: complete
  - Add a centered canvas with a dark metallic table background, rails, drain area, and launch lane drawn as static shapes.
  - Visible result: user can see the pinball table skeleton before physics is active.

### Phase 2: First Moving Ball

- [x] Phase 2.1 - Matter.js world - Status: complete
  - Initialize Matter.js engine, fixed table coordinates, canvas scaling, and static walls.
  - Visible result: physics world exists and renders simple bodies.

- [x] Phase 2.2 - Ball spawn - Status: complete
  - Add one ball with tuned restitution/friction and visible rendering.
  - Visible result: the ball appears and falls/bounces in the table.

- [x] Phase 2.3 - Drain and reset - Status: complete
  - Add drain sensor, ball removal/reset, balls remaining decrement, and game-over state.
  - Visible result: losing the ball changes the HUD and restart/next-ball flow.

### Phase 3: Basic Player Control

- [x] Phase 3.1 - Keyboard input - Status: complete
  - Add `A`/`ArrowLeft`, `D`/`ArrowRight`, and `Space` input handling.
  - Visible result: key presses are reflected in simple debug/HUD state or flipper movement.

- [x] Phase 3.2 - Kinematic flippers - Status: complete
  - Add manually angled left/right flippers with rest and active positions.
  - Visible result: player can flip both flippers and hit the ball.

- [x] Phase 3.3 - Simple plunger - Status: complete
  - Add hold/release `Space` charge for the right-side launch lane.
  - Visible result: player launches the ball instead of relying on automatic spawn.

### Phase 4: First Scoring Fun

- [x] Phase 4.1 - Table config - Status: complete
  - Introduce `TABLE_CONFIG` for bumpers, targets, labels, events, and points.
  - Visible result: table elements come from data instead of hardcoded one-offs.

- [x] Phase 4.2 - Bumpers and targets - Status: complete
  - Add MES bumper, Furnace bumper, ERP core target, measurement targets, and coil target.
  - Visible result: playfield has themed objects to aim at.

- [x] Phase 4.3 - Collision events - Status: complete
  - Route physics collisions into named gameplay events such as `hit:MES`, `hit:ERP`, and `hit:MEASUREMENT`.
  - Visible result: hitting objects can trigger UI feedback.

- [x] Phase 4.4 - Score manager - Status: complete
  - Add score updates, object point values, bonus text, and multiplier display.
  - Visible result: hitting objects increases score immediately.

### Phase 5: MVP Missions

- [x] Phase 5.1 - Mission model - Status: complete
  - Add event-driven mission definitions for `MERILNI PROTOKOL`, `MES ONLINE`, and `ERP GO-LIVE`.
  - Visible result: mission panel shows real progress counters.

- [x] Phase 5.2 - Mission completion - Status: complete
  - Add completion state, bonus points, and one simple multiplier reward.
  - Visible result: player can complete at least one mission during normal play.

- [x] Phase 5.3 - Mission feedback - Status: complete
  - Add simple lights, highlight states, or short text feedback for mission progress/completion.
  - Visible result: mission hits feel intentional instead of invisible.

### Phase 6: Persistence and Polish Pass

- [x] Phase 6.1 - Local high score - Status: complete
  - Store and load high score with `localStorage`.
  - Visible result: high score survives page refresh.

- [x] Phase 6.2 - Playability tuning - Status: complete
  - Tune gravity, ball speed, flipper angles, bumper impulse, drain fairness, and plunger power.
  - Visible result: the game feels playable for repeated attempts.

- [x] Phase 6.3 - Visual readability pass - Status: complete
  - Tighten labels, colors, table contrast, HUD spacing, and responsive fit.
  - Visible result: the game is readable on common desktop viewport sizes.

- [x] Phase 6.4 - README update - Status: complete
  - Document run instructions, controls, current MVP scope, and GitHub Pages deployment.
  - Visible result: another agent or developer can run the project without extra context.

### Phase 7: Post-MVP Asset Pack Preparation

- [x] Phase 7.1 - Asset needs audit - Status: complete
  - Play the MVP and identify which playfield elements most need generated art.
  - Visible result: asset generation is based on real gameplay needs.

- [x] Phase 7.2 - First playfield asset pack - Status: complete
  - Generate or create assets for furnace, coil collector, ERP core, MES terminal, e-Odprema truck, green aluminium target, and measurement target.
  - Visible result: the table starts moving closer to the mockup art direction.

- [x] Phase 7.3 - Asset integration pass - Status: complete
  - Add generated assets as visual layers without changing the core physics contracts.
  - Visible result: visual polish improves without breaking gameplay.

### Phase 8: Next-Day Demo Polish

Goal: make the already playable MVP feel more like a real pinball table for a light internal demo, without taking on risky systems before the game is shown to coworkers.

Priority order:

1. Make the launch experience read like standard pinball.
2. Improve visual depth and table polish using the existing assets.
3. Add small, visible, low-risk feedback features.
4. Defer complex systems that could destabilize physics or controls.

- [x] Phase 8.1 - Proper shooter channel - Status: complete
  - Add a clear right-side shooter channel that continues from the plunger pocket up to the top of the table.
  - Add a curved or angled top exit so the ball leaves the channel into the upper playfield instead of appearing to travel only vertically beside the table.
  - Keep the current plunger input contract: hold/release `Space`, with no new controls.
  - Use static Matter.js rail bodies for the channel walls and exit guide.
  - Draw the channel as an obvious lane: metal rails, inner shadow, plunger pocket, launch guide, and a visible top feed into the playfield.
  - Visible result: when the ball is launched, players immediately understand where it goes and why it enters the table from the upper right.

- [x] Phase 8.2 - Launch skill shot marker - Status: complete
  - Add one simple target or rollover near the shooter-channel exit.
  - Award a small `SKILL SHOT` bonus if the launched ball reaches or hits it shortly after launch.
  - Keep the timing generous for demo fun.
  - Visible result: launching is no longer only a start action; it has a small arcade reward.

- [x] Phase 8.3 - Playfield art depth pass - Status: complete
  - Tighten asset placement so the PNGs feel anchored to the table rather than floating over it.
  - Add simple shadows under major playfield assets.
  - Add small metal bases, bolts, glow rings, or status lights around bumpers and targets.
  - Keep labels where readability still benefits from them.
  - Avoid changing collision bodies unless an object visibly no longer matches its hit zone.
  - Visible result: the table looks more intentional and less like separate stickers on a canvas.

- [x] Phase 8.3b - Secondary visual asset pack - Status: complete
  - Add or generate visual-only assets for the playfield background, aluminium frame/rail trim, flippers, small lamps, pipe/ramp decorations, and low-profile industrial decals.
  - Use `docs/mock.png` as the style reference: physical aluminium machine, bolted rails, small lights, factory-floor texture, and industrial labels.
  - Keep all new pieces decorative unless a later phase explicitly adds gameplay.
  - Prioritize the highest screenshot impact: background/frame first, then flippers, then small lights/decals.
  - Completed through the Phase 8/9 asset packs: table frame, playfield floor, drain apron, lower plastics, plunger housing, flippers, lamps, and industrial decals now exist and are integrated.
  - Visible result: the table reads more like a finished physical pinball machine, while the current gameplay remains stable.

- [x] Phase 8.3c - Flipper and lamp sprite integration - Status: complete
  - Crop flipper and lamp sprites from the secondary visual asset sheet.
  - Render flippers from PNG sprites while keeping the existing Matter.js flipper bodies.
  - Add decorative lamp posts around the lower playfield as visual-only pieces.
  - Visible result: the bottom playfield looks closer to the mockup without changing controls or physics.

- [x] Phase 8.4 - Rail, lane, and drain polish - Status: complete
  - Strengthen the aluminium rail look around the outer table and bottom drain.
  - Make side lanes and outlanes clearer with guide lines, lane labels, and small indicator lights.
  - Improve the drain warning area visually, but do not make it busier than the flippers.
  - Visible result: players can read the table structure quickly from the screenshot or first play.

- [x] Phase 8.5 - Hit feedback and combo feel - Status: complete
  - Add short-lived visual pulses on hit targets and bumpers.
  - Add a compact floating score text near the hit location.
  - Add a simple combo counter if the player hits multiple scoring elements within a short window.
  - Keep combo scoring modest and easy to remove if it makes balancing weird.
  - Visible result: hits feel more satisfying even without sound.

- [x] Phase 8.6 - Demo stability and reset pass - Status: complete
  - Play several full games and watch for stuck balls, unfair drains, or weak launches.
  - Add a simple ball rescue only if the ball can reliably get stuck in a known area.
  - Confirm `Restart`, next-ball launch, high score, and mission progress still behave correctly.
  - Visible result: the game can be handed to coworkers without needing developer supervision.

- [x] Phase 8.7 - Screenshot-ready presentation pass - Status: complete
  - Tune the first viewport composition for the current desktop layout.
  - Make sure the Impol identity, score HUD, mission panel, company panel, and full table are all readable.
  - Update README current status from "Playable MVP in progress" to a demo-ready status when this phase is complete.
  - Visible result: the game looks good enough in a quick screen share or screenshot.

### Phase 9: Asset Expansion and Table Art Pass

Goal: move from a demo-polished table to a richer, more physical Impol-themed pinball machine by expanding the reusable asset set and replacing remaining canvas-only decorative pieces where PNG assets would improve screenshot quality.

Priority order:

1. Improve the table as a single physical object: playfield plate, frame, rails, screws, trim, and drain assembly.
2. Upgrade visible mechanical elements: flippers, plunger lane, shooter guide, side lanes, lane plastics, and small metal brackets.
3. Add decorative industrial storytelling assets that do not change gameplay contracts.
4. Keep asset integration incremental so physics tuning remains stable.

- [x] Phase 9.1 - Asset inventory and art direction lock - Status: complete
  - Review the current `assets/images/` set against `docs/mock.png` and recent gameplay screenshots.
  - Decide which current PNGs stay as final enough, which need replacement, and which new pieces are missing.
  - Define consistent visual rules for scale, perspective, shadows, glow strength, metal color, and transparent padding.
  - Document the result in `docs/phase9_asset_inventory.md`.
  - Visible result: a short asset checklist exists before generating or editing more files.

- [x] Phase 9.2 - Playfield and frame asset pack - Status: complete
  - Create or generate a dark industrial playfield plate with subtle brushed aluminium texture, rivets, panel seams, and low-contrast decals.
  - Add frame/rail overlay pieces or a single table-frame overlay that matches the existing canvas dimensions.
  - Include separate drain apron artwork so the bottom area feels like a real machine part rather than only drawn lines.
  - Keep collision bodies unchanged unless artwork visibly exposes a mismatch.
  - Visible result: the table reads as one physical cabinet instead of a canvas with independent objects.

- [x] Phase 9.3 - Mechanical detail asset pack - Status: complete
  - Upgrade or replace flipper sprites if needed, keeping separate left/right assets.
  - Add visual-only plastics, metal brackets, lane dividers, screw caps, rubber posts, and small guide rails around the lower playfield.
  - Add a cleaner plunger knob, shooter lane meter, and launch gate artwork if the current drawn pieces still look too flat.
  - Integrate the first pass as visual-only lower plastics, shooter housing, and post caps.
  - Visible result: the bottom third and shooter lane look finished in screenshots and during play.

- [x] Phase 9.4 - Industrial decoration asset pack - Status: complete
  - Add non-colliding aluminium/production-themed decorations: rollers, extrusion arrows, coil route decals, warning stripes, small status LEDs, and label plates.
  - Use the decorations to guide the eye toward active targets without making them look playable unless they score.
  - Keep text sparse and readable; do not cover the ball path or existing mission targets.
  - Integrate the first pass as low-contrast visual-only decals under gameplay objects.
  - Visible result: the Impol/aluminium theme is visible even when the ball is not hitting active targets.

- [x] Phase 9.5 - Asset integration pass - Status: complete
  - Add new assets to `ASSET_CONFIG` and render them in stable layers: background, rails, gameplay objects, decorative foreground, ball, UI feedback.
  - Make sure transparent PNG padding does not create alignment surprises.
  - Re-check z-order so the ball never disappears behind decorative art that should be under gameplay.
  - Keep decorative table art below gameplay objects and move mission lights below ball and feedback.
  - Visible result: new art improves the table without breaking ball readability.

- [x] Phase 9.6 - Visual QA and performance check - Status: complete
  - Test at the normal desktop viewport and at a smaller laptop viewport.
  - Check that image count and dimensions do not cause noticeable slowdowns on weaker machines.
  - Compress or resize oversized PNGs if they do not add visible detail at game scale.
  - Keep a before/after screenshot for comparison.
  - Use the June 5 gameplay screenshot as visual QA for z-order, readability, and decorative-asset balance.
  - Confirm source sheets are not loaded at runtime through `ASSET_CONFIG`.
  - Visible result: the upgraded table looks better while staying smooth enough for the demo use case.

### Phase 10: Sound And Arcade Feel

Goal: add lightweight, browser-safe sound feedback that makes the game feel more like a real pinball table without introducing asset loading complexity, autoplay problems, or annoying always-on audio.

Priority order:

1. Keep sound opt-in and easy to mute.
2. Add short, satisfying effects for the highest-frequency actions first.
3. Use procedural Web Audio API tones/noise before adding external audio files.
4. Keep sounds short and mixed quietly so they support gameplay instead of becoming tiring.

- [x] Phase 10.1 - Audio foundation and mute control - Status: complete
  - Add a small audio manager around the Web Audio API.
  - Unlock audio only after a player gesture such as `Space`, flipper key, canvas click, or mute toggle click.
  - Add a simple mute/unmute control in the UI.
  - Persist mute preference in `localStorage`.
  - Handle browsers where audio context creation fails without breaking gameplay.
  - Visible result: sound can be enabled/disabled predictably and never blocks the game.

- [x] Phase 10.2 - Core pinball sound effects - Status: complete
  - Add short procedural effects for launch, flipper press, bumper hit, target hit, drain, and next-ball reset.
  - Keep effects under roughly 250 ms except drain/game-over.
  - Use volume differences to make important hits feel stronger without making routine collisions harsh.
  - Avoid continuous background music in this phase.
  - Visible result: common gameplay actions have immediate audio feedback.

- [x] Phase 10.3 - Mission and combo audio feedback - Status: complete
  - Add distinct sounds for skill shot, combo increase, mission progress, mission complete, multiplier reward, and game over.
  - Keep mission-complete sounds celebratory but short.
  - Avoid overlapping sounds becoming muddy during rapid hits by throttling or ducking repeated events.
  - Visible result: scoring milestones are easier to feel even without watching the side HUD.

- [x] Phase 10.4 - Audio mix and comfort pass - Status: complete
  - Balance volumes while playing a full game.
  - Prevent repeated bumper or flipper sounds from stacking too loudly.
  - Make sure mute state applies immediately to any currently playing sound.
  - Confirm the game remains silent by default until the browser allows audio.
  - Track active sound gains so mute can quickly duck sounds already in progress.
  - Visible result: audio feels fun for a quick demo and not annoying after several balls.

- [x] Phase 10.5 - Optional generated audio asset evaluation - Status: complete
  - Decide whether procedural sound is good enough.
  - Only add audio files if a specific effect clearly needs more character than Web Audio can provide.
  - If files are added, keep them small, local, and documented under `assets/audio/`.
  - Decision: keep the current Web Audio effects for now and document future file-based candidates in `assets/audio/README.md`.
  - Visible result: the project has a clear decision on whether it needs real audio assets.

### Phase 11: Table Mechanics And Bonus Depth

Goal: move from a polished MVP table toward a more classic pinball ruleset with lanes, locks, kickouts, timed shields, and bonus modes while keeping the table reliable enough for casual demo play.

Priority order:

1. Add small physical features that improve existing ball flow before adding new routes.
2. Make every new visual element match a simple collision body or clearly mark it as decorative.
3. Avoid full ramp/orbit/lane rewrites until the lower table is stable.
4. Keep bonus modes short and optional so the base pinball game stays readable.
5. Prefer one well-tuned mechanic per phase over several half-working features.

Recommended simple-first order:

1. Left/right slingshot bumpers near the flippers.
2. Small lane lamps or rollover sensors that only score, not redirect.
3. Timed ball-save as an invisible drain recovery, not a visible physical wall.
4. A short internal-joke bonus mode such as BOM / Kosovnica Panic.
5. Only then revisit outlanes, ramps, orbit channels, lock holes, and mini-games.

- [x] Phase 11.1 - Left/right slingshot bumpers - Status: complete
  - Add one left and one right angled slingshot bumper above the flippers.
  - Use simple triangular or narrow rectangular Matter bodies that bounce the ball back into play.
  - Keep the visual footprint small and aligned with the existing lower plastic art.
  - Award a small score bonus and use the existing bumper sound.
  - Tune impulse carefully so the ball feels lively but does not rocket straight into the drain.
  - First pass uses sensor bodies plus controlled impulses to avoid hidden walls around the flippers.
  - Visible result: the lower table feels more like real pinball without adding a complex new route.

- [x] Phase 11.1a - Touch controls - Status: complete
  - Add mobile-friendly touch zones on the playfield canvas.
  - Let lower-left touches activate the left flipper and lower-right touches activate the right flipper.
  - Let the shooter area charge and launch the ball when the game is ready.
  - Preserve keyboard controls and the existing sidebar control buttons.
  - Prevent page scrolling or text selection while touching the canvas.
  - Release held controls on pointer cancel, lost pointer capture, tab blur, or page hide.
  - Visible result: the game is playable on a phone or tablet without needing a keyboard.

- [ ] Phase 11.2 - Simple rollover lane lamps - Status: planned
  - Add two or three small sensor-only rollover lanes or lamps in the lower/mid playfield.
  - Award small points and combo progress when the ball passes over them.
  - Keep them non-blocking so they cannot trap the ball.
  - Use this as a low-risk way to add more things to aim for before complex ramps.
  - Visible result: more activity and feedback without changing core physics much.

- [ ] Phase 11.3 - Lane and outlane system - Status: planned
  - Add clearer left/right inlanes and outlanes near the flippers.
  - Add a temporary ball-save or side shield at the start of each ball.
  - Let the shield open after a timer, first bumper hit, or first scoring sequence.
  - Add lane labels and small indicators so the player understands when protection is active.
  - Tune walls and rubber guides so the ball does not trap in lane corners.
  - Consider an invisible ball-save sensor instead of a large physical gate so the lane art does not become an obstacle.
  - Keep the previous lane/ball-save experiment in stash as a reference, but redesign the layout before implementing it again.
  - Visible result: side drains feel fair and intentional instead of accidental.

- [ ] Phase 11.4 - Upper orbit and return channel - Status: planned
  - Add a left or right orbit/channel that carries the ball up and returns it down another path.
  - Use guide rails and a simple sensor zone rather than a fully simulated ramp at first.
  - Award a route/combo bonus when the ball completes the channel cleanly.
  - Add industrial route art such as aluminium flow arrows, conveyor markings, or pipe rails.
  - Keep the previous ramp/orbit experiment in stash as a reference, but redesign the entry so it is easy to hit and does not create a hidden wall.
  - Visible result: the player can intentionally shoot a loop instead of only hitting central targets.

- [ ] Phase 11.5 - Lock house / kickout opening - Status: planned
  - Add a themed opening or "house" that can catch the ball.
  - Keep it closed until the player hits required targets or lane switches.
  - When open, let the ball enter, pause briefly, award a bonus, then kick it back into play.
  - Add sound and light feedback for closed, opening, locked, and kickout states.
  - Visible result: the table has a memorable feature that changes state during a ball.

- [x] Phase 11.6 - BOM Panic / Kosovnica mode - Status: complete
  - Add a "KOSOVNICA" target, terminal, or small indicator as an internal joke because nobody likes BOM cleanup.
  - On hit, trigger a short timed mode such as "BOM ERROR: missing revision" or "MANJKA POZICIJA 0042".
  - Reuse existing targets for the first pass: for example require `MES -> ERP -> COIL` within a short timer.
  - Award a clear success bonus such as "KOSOVNICA USKLAJENA" and a small failure message such as "REVIZIJA ZAVRNJENA".
  - Keep the mode funny but readable: no complex UI at first, just status text, flashing targets, score popups, and existing sounds.
  - First pass uses a sensor-only `KOSOVNICA` terminal and a timed `MES -> ERP -> COIL` sequence.
  - Possible variants for later: revision counter R12/R13, random missing part number, multiplier freeze on failure, or opening a lock/kickout after approval.
  - Visible result: the game gets a recognizable internal factory joke with a small rules payoff.

- [ ] Phase 11.7 - Bonus mini-game hook - Status: planned
  - Trigger a short top-screen bonus mode from the lock house or completed route sequence.
  - Start with a very small overlay interaction, such as timing a press or dodging simple obstacles.
  - Keep normal pinball paused or safely held while the mini-game runs.
  - Award bonus points, multiplier progress, or ball save extension.
  - Candidate theme: a tiny Flappy-style aluminium coil / delivery drone / factory route challenge.
  - Visible result: completing table objectives can unlock a funny bonus moment without derailing the main game.

- [ ] Phase 11.8 - Advanced feature backlog breakdown - Status: planned
  - Revisit multiball, jackpot, company progress, Hall of Fame, and extra missions after the first new table mechanics are stable.
  - Decide which features belong in Phase 12 versus the long-term backlog.
  - Visible result: the next roadmap stays grounded in tested gameplay instead of wish-list sprawl.

### Phase 12: Low-risk Gameplay Depth

Goal: add more pinball depth using rules, scoring, UI state, and existing targets before adding risky new physics routes.

Priority order:

1. Prefer logic-only or sensor-only features over new physical geometry.
2. Reuse existing target hit events, popups, sounds, and mission state.
3. Keep each feature independently testable in one short play session.
4. Add visible feedback for every new rule so players understand why they scored.
5. Save complex features such as multiball, jackpot, and real ramps until these rules feel solid.

- [x] Phase 12.1 - Combo shots - Status: complete
  - Add a short combo window after every scoring target hit.
  - Increase combo count when the player hits another valid object before the window expires.
  - Award escalating combo bonuses and show clear popups such as `3x COMBO +2500`.
  - Reuse existing score popup and audio feedback instead of adding new physics.
  - Reset combo cleanly on drain, next ball, or timeout.
  - Visible result: repeated accurate shots feel more rewarding without changing the table layout.
  - Implemented as a 1.8-second combo window with escalating 2x+ bonuses, clear `Nx COMBO +bonus` popups, and explicit timeout/drain/ball-save resets.

- [x] Phase 12.2 - Invisible ball save - Status: complete
  - Enable ball save for a short period after launch.
  - If the ball drains during that period, reset it to the shooter lane without reducing balls left.
  - Show a clear `BALL SAVE` message and play a short feedback sound.
  - Avoid physical gates or shields in the first pass so there is no new trapping risk.
  - Let future lane/outlane art display the ball-save state after the rule is stable.
  - Visible result: early unlucky drains feel fairer with very little physics risk.
  - Implemented first pass as one save per ball with a visible `BALL SAVE ACTIVE` timer and shooter-lane relaunch.

- [x] Phase 12.3 - More missions from existing targets - Status: complete
  - Add additional missions that reuse existing table objects and hit events.
  - Candidate missions: e-Odprema, Green aluminium, Valjarna, Livarna, and Kosovnica.
  - Keep mission requirements small and readable for demo play.
  - Use the current mission panel style before designing a larger mission UI.
  - Combine with combo rules where useful, but keep mission completion independent.
  - Visible result: the table has more reasons to keep playing without adding new objects.
  - Implemented as a config-driven mission list with new missions for Green aluminium, Coil collector, e-Odprema, ALCAD, Livarna, and Kosovnica.

- [ ] Phase 12.4 - Company progress system - Status: planned
  - Turn the right-side company list into a lightweight progress/status panel.
  - Update company states when related targets, missions, or combos are completed.
  - Start with simple labels such as `Ready`, `Online`, `Complete`, or `Bonus`.
  - Keep progress in-memory first; persistence can come later if it proves useful.
  - Use the system to make IMPOL, SEVAL, ALCAD, TLM, IMPOL-PC, and RONDAL feel connected to gameplay.
  - Visible result: the existing company panel becomes part of the ruleset instead of only decoration.

- [ ] Phase 12.5 - Hall of Fame UI - Status: planned
  - Add a small local Hall of Fame view for top scores.
  - Store a few entries in localStorage with score, date, optional initials, and the game/ruleset version.
  - Save Hall of Fame data as a small JSON structure, for example `{ version, rulesetVersion, entries }`, so old scores can be separated when scoring changes.
  - Keep the default flow simple: only ask for initials after a new high score.
  - Add a compact display that does not compete with the main playfield.
  - Preserve the current single high score as a fallback if localStorage is unavailable.
  - Visible result: quick demo games become more social and replayable.

- [ ] Phase 12.6 - Mission sequencing - Status: planned
  - Convert the expanded mission list into a staged sequence instead of making every mission available immediately.
  - Unlock only a small active set at a time, for example core startup missions first, then production missions, then internal-joke missions.
  - Avoid overlapping target ownership by assigning each stage a clear focus and letting inactive target hits score normally without advancing hidden missions.
  - Show only active and recently completed missions in the HUD so the left panel remains readable.
  - Consider a small `missionStage` / `unlockedMissionIds` state model so future modes can open doors, channels, or bonus objectives cleanly.
  - Visible result: the table feels more intentional, and players understand what to aim for next without every target competing at once.

### Phase 13: Mission Progression, Multiball, And Endgame

Goal: turn the expanded mission list into a more deliberate ruleset with a clear payoff when the player completes enough objectives.

Priority order:

1. Sequence missions before adding large rewards, so multiball has a readable unlock condition.
2. Implement multiball as a focused system with two balls first, not a full jackpot stack.
3. Make final-state feedback impossible to miss: the player should immediately understand mission completion, multiball, and game over.
4. Keep every rule visible in the HUD or canvas feedback so the table does not feel like hidden bookkeeping.

- [ ] Phase 13.1 - Mission order and unlock rules - Status: planned
  - Rework mission order according to the current design notes: core startup missions first, then production/green aluminium missions, then internal-joke or final missions.
  - Suggested sequence: `MERILNI PROTOKOL` -> `MES ONLINE` -> `ERP GO-LIVE` -> `GREEN ALUMINIUM` / `COIL COLLECTOR` -> `E-ODPREMA` / `ALCAD` -> `LIVARNA READY` -> `KOSOVNICA`.
  - Let inactive targets still score points and combos, but only active/unlocked missions advance.
  - Add small HUD state for current stage, next unlock, and recently completed mission.
  - Visible result: players know what to aim for next instead of seeing every mission compete at once.

- [ ] Phase 13.2 - Mission-complete meta reward - Status: planned
  - Add a global completion tracker for all required missions in the active ruleset.
  - When all required missions are completed, trigger a major reward instead of only points.
  - First candidate reward: start multiball.
  - Backup reward if multiball is not ready yet: `INDUSTRY 4.0 JACKPOT` plus temporary 3x multiplier and ball-save extension.
  - Visible result: finishing missions has a memorable table-level payoff.

- [ ] Phase 13.3 - Two-ball multiball foundation - Status: planned
  - Extend ball management from one active ball to a small collection of active balls.
  - Start with two balls, a shared drain handler, and a rule that multiball ends when only one ball remains.
  - Add a short grace period / ball save when multiball starts so both balls survive long enough to be fun.
  - Keep scoring simple at first: all scoring during multiball is 2x, with no extra jackpot rules yet.
  - Tune collision and rendering so the balls remain readable and do not stack into unstable physics.
  - Visible result: mission completion can launch a stable, understandable multiball mode.

- [ ] Phase 13.4 - Jackpot layer after multiball - Status: planned
  - Add one or two jackpot shots only after basic multiball is stable.
  - Candidate jackpot shots: `COIL COLLECTOR`, `FURNACE`, and `KOSOVNICA` after the mission sequence is complete.
  - Add clear `JACKPOT LIT` / `SUPER JACKPOT` canvas feedback and sound.
  - Keep jackpot values modest until longer playtesting shows the score curve.
  - Visible result: multiball has a goal beyond chaos.

- [ ] Phase 13.5 - Strong game-over presentation - Status: planned
  - Replace the current small game-over state with a larger visual effect: screen dim, table pulse, large `GAME OVER`, final score, and high-score/new-record callout.
  - Add a short delay before accepting restart input so the end state is visible.
  - Preserve quick restart after the effect finishes.
  - Visible result: it is obvious that the game ended, even if the player is focused on the table instead of the HUD.

### Phase 14: Visual Cleanup, Missing Assets, And Audio Upgrade

Goal: remove remaining visual artifacts, list the next useful assets, and upgrade the most noticeable sound effects without bloating the static app.

Priority order:

1. Fix visible artifacts before generating more art.
2. Add assets only where they replace a remaining canvas-only or confusing visual.
3. Improve the effects the player hears most often: plunge, bumpers, drain/game over, and mode rewards.
4. Keep the current Web Audio fallback so the game still runs without external files.

- [ ] Phase 14.1 - Purple line cleanup - Status: planned
  - Find and remove or recolor the remaining purple/violet guide lines that do not belong to the final table art.
  - Check whether they come from the playfield/frame asset source, low-opacity decals, or leftover canvas strokes.
  - Keep intentional blue/orange/green gameplay indicators, but remove lines that read like accidental crop/debug artifacts.
  - Visible result: the table art looks intentional and no longer has unexplained purple streaks.

- [ ] Phase 14.2 - Asset-first cleanup pass - Status: planned
  - Continue replacing procedural decorative strokes with existing PNG art when the asset is already available.
  - Keep procedural drawing only for gameplay feedback, labels, fallback rendering, and effects.
  - Re-check the shooter lane, side lanes, frame, drain, slingshots, and lower plastics after each change.
  - Visible result: the game trusts its visual assets instead of drawing extra outlines over them.

- [ ] Phase 14.3 - Missing visual assets backlog - Status: planned
  - Create or source a dedicated `KOSOVNICA` terminal/target asset so the current label plate can become a real table object.
  - Add mission-stage lamps or inserts for the active mission sequence.
  - Add multiball lock / ball-release visual, even if the first implementation uses virtual spawning.
  - Add jackpot inserts for `COIL`, `FURNACE`, and final mission shots.
  - Add richer inlane/outlane plastics or inserts once lane rules are implemented.
  - Add a proper game-over / final-score overlay asset or bitmap panel if canvas text feels too flat.
  - Add optional company badge assets for the right-side company progress system.
  - Add optional audio file assets for effects that procedural Web Audio cannot make satisfying enough.
  - Visible result: asset work is prioritized by future gameplay needs, not just screenshot decoration.

- [ ] Phase 14.4 - Better plunge, bumper, and game-over audio - Status: planned
  - Upgrade ball plunge from a simple tone into a stronger mechanical spring/rail launch effect.
  - Upgrade bumper hits so MES/ERP/CO2 can have slightly different characters while sharing a coherent mix.
  - Add a distinct game-over sound with more weight than an ordinary drain.
  - Add a stronger multiball start sound once multiball exists.
  - Keep sounds short and browser-safe; use local audio files only if procedural synthesis is not enough.
  - Visible result: important game moments sound materially different, not just louder.

- [ ] Phase 14.5 - Additional ideas to evaluate - Status: planned
  - Add mode callouts such as `QUALITY MODE`, `ERP FREEZE`, `GREEN BONUS`, and `KOSOVNICA PANIC` with small table lighting changes.
  - Add a temporary `ERP ERROR` hurry-up where the player must hit MES/ERP before a timer expires.
  - Add a `COIL FLOW` orbit/combo where sequential route hits increase a rolling bonus.
  - Add a `SHIFT REPORT` end-of-ball bonus summary for completed missions, combos, and company progress.
  - Add local Hall of Fame initials after game over once the larger game-over panel exists.
  - Add a rules/help overlay that can be opened outside active play, not as in-game explanatory text.
  - Visible result: future work has a ranked idea pool without distracting the current implementation.

## 15. Post-MVP Backlog

- Already completed and removed from the active backlog: touch/mobile controls, ball save, combo shots, slingshots, BOM/Kosovnica first pass, generated playfield assets, sound foundation, and first-pass table art.
- Combo shot follow-up tuning:
  - Revisit bonus values after longer playtesting.
  - Consider showing the active combo count in the side HUD if the canvas badge is not readable enough during fast play.
- Mission sequencing and all-mission completion reward.
- Multiball foundation.
- Jackpot layer after multiball.
- Larger game-over visual and audio effect.
- Purple/violet line cleanup.
- Better ball plunge, bumper, multiball, and game-over sound effects.
- Missing gameplay-driven visual assets:
  - Kosovnica terminal/target asset.
  - Mission-stage lamps/inserts.
  - Multiball lock / ball-release visual.
  - Jackpot inserts.
  - Lane/outlane inserts after lane rules are implemented.
  - Game-over/final-score overlay art.
  - Company badge/progress assets.
- Side outlane shields that open during play.
- Upper orbit and return channels.
- Lock house / kickout opening.
- Short bonus mini-games triggered by table objectives.
- More missions:
  - Valjarna
  - Excel posast
  - HelpDesk tickets
- Company progress system.
- Hall of Fame UI.
- Multiplayer / shared Hall of Fame:
  - Start after local Hall of Fame is stable and scores include `rulesetVersion`.
  - Prefer a tiny append-only score API first: initials, score, date, ruleset version, and optional build version.
  - Add lightweight anti-spam before making it public: per-browser cooldown, score sanity checks, and a simple admin/reset path.
  - Keep the local Hall of Fame as offline fallback when the shared score service is unavailable.
- Local vendored Matter.js.
- More mockup-like table art and lighting after artifact cleanup.
