# Impol Pinball

Browser-based pinball game concept inspired by Impol, Alcad, ERP, MES, e-Odprema, quality protocols, aluminium production, and digital transformation.

The project is planned as a simple static web game for GitHub Pages:

- HTML
- CSS
- Vanilla JavaScript
- Canvas
- Matter.js for physics

No npm, backend, database, login, or build step is planned for the first playable version.

## Current Status

Demo-ready playable MVP.

The current version includes:

- classic pinball table skeleton
- one ball
- two flippers
- basic plunger
- score and balls remaining
- scoring bumpers and targets
- simple missions
- skill shot and combo feedback
- industrial playfield asset polish
- local high score
- keyboard and on-screen controls

The visual mockup in `docs/mock.png` is used as art direction, not as the first implementation target.

## Controls

Controls:

- `A` or `ArrowLeft`: left flipper
- `D` or `ArrowRight`: right flipper
- hold/release `Space`: charge and launch the ball
- `Restart`: start a new game

The right-side control buttons can also be clicked or held with a pointer.

## Local Run

The game runs by opening:

```text
index.html
```

No install step should be required.

Matter.js is loaded from CDN, so internet access is currently required for physics.

## Documentation

- Implementation plan: `docs/implementation_plan.md`
- Original planning prompt: `docs/impol_pinball_codex_plan_prompt.md`
- Visual direction mockup: `docs/mock.png`

## Deployment

Target deployment is GitHub Pages from static files in the repository.

Push static files to the repository and enable GitHub Pages from the repository settings.
