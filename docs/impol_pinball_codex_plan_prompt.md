# Codex plan prompt: Impol / Alcad Pinball

## Goal

Generate a clear implementation plan for a browser-based pinball game called **Impol Pinball**.

The game should be a fun internal-style pinball game inspired by Impol, Alcad, ERP, MES, e-Odprema, quality/measurement protocols, production, aluminium, and digital transformation.

The first output should be a **plan only**, not full code yet.

---

## Technical constraints

Use a very simple static web setup that runs on GitHub Pages.

Preferred stack:

- HTML5
- CSS
- Vanilla JavaScript
- Canvas
- Matter.js for physics
- Optional: SVG/PNG assets
- Optional: Web Audio API for simple sounds

Avoid:

- npm
- React
- Angular
- Vue
- backend
- database
- login
- build steps
- TypeScript unless absolutely necessary
- complex bundlers

The project should run by opening `index.html` locally and should deploy to GitHub Pages by pushing static files.

GitHub Pages supports static HTML/CSS/JavaScript files directly from a repository, so keep the project static.

---

## Suggested project structure

```text
impol-pinball/
├── index.html
├── style.css
├── game.js
├── README.md
├── assets/
│   ├── images/
│   ├── sounds/
│   └── fonts/
└── lib/
    └── matter.min.js
```

Matter.js can also be loaded from a CDN in `index.html`, but prefer documenting both options.

---

## Game concept

Create a 2D browser pinball game with an industrial aluminium / digital transformation theme.

Working title:

**Impol Pinball: Digital Transformation Multiball**

Theme elements:

- Impol
- Alcad
- MES
- ERP
- e-Odprema
- Merilni protokol
- Aluminij
- Valjarna
- Livarna
- Skladišče
- Quality / measurement
- Green aluminium / CO₂
- HelpDesk tickets
- Excel monsters
- SAP/ERP errors

The player controls two flippers and tries to keep the ball in play while completing missions and scoring points.

---

## Core MVP features

Plan the game in phases.

### Phase 1: Basic playable pinball

- Static canvas
- Matter.js physics world
- One ball
- Left and right flipper
- Walls
- Sloped side lanes
- Drain area
- Launch/plunger mechanism or simple ball spawn
- Basic score
- Restart button
- Keyboard controls:
  - Left arrow / A = left flipper
  - Right arrow / D = right flipper
  - Space = launch / restart

### Phase 2: Impol-themed playfield

Add labelled zones:

- ALCAD lane
- MES bumper
- ERP core
- e-Odprema ramp
- Merilni protokol targets
- CO₂ / Green aluminium bonus
- Valjarna spinner
- Livarna bumper

Use simple SVG/Canvas shapes first. Do not block progress on perfect art.

### Phase 3: Missions and scoring

Suggested missions:

- **MERILNI PROTOKOL**
  - Hit 3 measurement targets
  - Reward: Quality Mode

- **MES ONLINE**
  - Hit MES bumpers multiple times
  - Reward: Real-Time Production bonus

- **ERP GO-LIVE**
  - Hit ERP core 5 times
  - Reward: 2x multiplier

- **E-ODPREMA**
  - Send 3 virtual trucks
  - Reward: multiball

- **GREEN ALUMINIUM**
  - Hit CO₂ reduction targets
  - Reward: eco bonus / score multiplier

### Phase 4: Cool features

Add these after MVP is stable:

- Multiball
- Jackpot
- Combo shots
- Ball save
- Skill shot
- Temporary 2x / 3x multiplier
- Mission lights
- Sound effects
- Small animations
- Local high score using `localStorage`
- Mobile touch controls

---

## Pinball mechanics

Use Matter.js bodies for:

- Ball
- Walls
- Bumpers
- Targets
- Flippers
- Slingshots
- Ramps if simple enough

Important notes:

- Keep physics simple and stable.
- Do not over-engineer realistic pinball physics.
- Fun gameplay is more important than perfect simulation.
- Use low-friction, high-bounce materials where appropriate.
- Flippers can be rotating bodies or manually controlled angled rectangles.
- If realistic flippers are hard, implement a simpler reliable version first.

---

## Visual style

Target style:

- 2D cartoon / semi-isometric industrial pinball table
- Dark metallic base
- Aluminium silver highlights
- Neon blue/green/orange UI accents
- Factory elements
- Clean readable labels
- Funny internal business references

Possible visual elements:

- Aluminium coils
- Ingots
- Factory pipes
- Conveyor belts
- Trucks
- ERP server core
- MES terminal
- Excel monster icon
- HelpDesk ticket icons
- CO₂ leaf icon
- Measurement sensor targets

Start with simple drawn shapes and labels. Add better assets later.

---

## Sound ideas

Use optional simple sounds:

- Metallic clang when bumper hit
- Soft click when target hit
- Big sound for mission complete
- Alarm sound for drain
- Celebration sound for multiball

Sounds are optional in MVP.

---

## UI

Show:

- Score
- Balls remaining
- Current mission
- Active multiplier
- Active company / zone bonuses
- High score
- Controls hint
- Restart button

Possible UI labels:

- `MES ONLINE`
- `ERP CORE`
- `E-ODPREMA READY`
- `QUALITY MODE`
- `GREEN ALUMINIUM BONUS`
- `INDUSTRY 4.0 MULTIBALL`

---

## Code quality requirements

The plan should recommend clean structure even in vanilla JS.

Suggested modules/classes inside `game.js`:

- `Game`
- `PhysicsWorld`
- `PinballTable`
- `BallManager`
- `FlipperController`
- `MissionManager`
- `ScoreManager`
- `AssetManager`
- `InputManager`
- `UIManager`

If keeping everything in one file, still organize code into sections and functions.

---

## Deliverable requested from Codex

First generate a practical implementation plan with:

1. Recommended stack
2. File structure
3. Game phases
4. MVP scope
5. Physics approach
6. Mission system design
7. Asset strategy
8. Deployment steps for GitHub Pages
9. Risks and simplifications
10. First coding task checklist

Do not write the full game yet. Only prepare the plan.

---

## Important priority

The first playable version should be simple, stable, and fun.

Prefer:

- playable MVP over perfect graphics
- simple physics over broken realism
- clear internal jokes over complex lore
- static GitHub Pages deployment over tooling complexity
