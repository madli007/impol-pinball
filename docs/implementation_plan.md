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

1. Create `index.html`.
2. Add Matter.js CDN script.
3. Create `style.css` with full-page game layout.
4. Create `game.js`.
5. Initialize Matter.js engine and canvas renderer.
6. Create fixed-size table coordinate system.
7. Add outer walls and drain sensor.
8. Add launch lane.
9. Add one ball and basic launch.
10. Add two kinematic flippers.
11. Add keyboard input.
12. Add bumpers and targets from `TABLE_CONFIG`.
13. Add collision event routing.
14. Add score updates.
15. Add balls remaining and restart behavior.
16. Add localStorage high score.
17. Add mission progress for MES, ERP, and Merilni protokol.
18. Add basic HUD updates.
19. Tune physics until the game is playable.
20. Update `README.md` with run/deploy instructions.

## 15. Post-MVP Backlog

- Touch/mobile controls.
- Sound effects via Web Audio API.
- Ball save.
- Skill shot.
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
