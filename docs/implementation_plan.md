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

- [ ] Phase 8.3b - Secondary visual asset pack - Status: planned
  - Add or generate visual-only assets for the playfield background, aluminium frame/rail trim, flippers, small lamps, pipe/ramp decorations, and low-profile industrial decals.
  - Use `docs/mock.png` as the style reference: physical aluminium machine, bolted rails, small lights, factory-floor texture, and industrial labels.
  - Keep all new pieces decorative unless a later phase explicitly adds gameplay.
  - Prioritize the highest screenshot impact: background/frame first, then flippers, then small lights/decals.
  - Visible result: the table reads more like a finished physical pinball machine, while the current gameplay remains stable.

- [ ] Phase 8.4 - Rail, lane, and drain polish - Status: planned
  - Strengthen the aluminium rail look around the outer table and bottom drain.
  - Make side lanes and outlanes clearer with guide lines, lane labels, and small indicator lights.
  - Improve the drain warning area visually, but do not make it busier than the flippers.
  - Visible result: players can read the table structure quickly from the screenshot or first play.

- [ ] Phase 8.5 - Hit feedback and combo feel - Status: planned
  - Add short-lived visual pulses on hit targets and bumpers.
  - Add a compact floating score text near the hit location.
  - Add a simple combo counter if the player hits multiple scoring elements within a short window.
  - Keep combo scoring modest and easy to remove if it makes balancing weird.
  - Visible result: hits feel more satisfying even without sound.

- [ ] Phase 8.6 - Demo stability and reset pass - Status: planned
  - Play several full games and watch for stuck balls, unfair drains, or weak launches.
  - Add a simple ball rescue only if the ball can reliably get stuck in a known area.
  - Confirm `Restart`, next-ball launch, high score, and mission progress still behave correctly.
  - Visible result: the game can be handed to coworkers without needing developer supervision.

- [ ] Phase 8.7 - Screenshot-ready presentation pass - Status: planned
  - Tune the first viewport composition for the current desktop layout.
  - Make sure the Impol identity, score HUD, mission panel, company panel, and full table are all readable.
  - Update README current status from "Playable MVP in progress" to a demo-ready status when this phase is complete.
  - Visible result: the game looks good enough in a quick screen share or screenshot.

## 15. Post-MVP Backlog

- Touch/mobile controls.
- Sound effects via Web Audio API.
- Ball save.
- Combo shots.
- Multiball.
- Jackpot.
- More missions:
  - e-Odprema
  - Green aluminium
  - Valjarna
  - Livarna
  - Excel posast
  - HelpDesk tickets
- Company progress system.
- Hall of Fame UI.
- Generated playfield asset pack.
- Local vendored Matter.js.
- More mockup-like table art and lighting.
