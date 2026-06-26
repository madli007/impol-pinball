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

Preferred local preview:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/
```

If `python` is not on `PATH`, use any local Python 3 executable:

```powershell
& '<path-to-python.exe>' -m http.server 4173 --bind 127.0.0.1
```

For Codex desktop sessions, ask the workspace dependency helper for the bundled Python path instead of hardcoding a user-specific path.

To keep the server running in the background from PowerShell, run it from the repository root:

```powershell
Start-Process -WindowStyle Hidden -WorkingDirectory (Get-Location) -FilePath '<path-to-python.exe>' -ArgumentList @('-m','http.server','4173','--bind','127.0.0.1')
```

If the sandbox stops a background server, rerun the same `Start-Process` command with escalated permission. Verify it with:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/ | Select-Object -ExpandProperty StatusCode
```

Opening `index.html` directly can still work for quick checks, but the local server path is the reliable preview path.

Matter.js is loaded from CDN, so internet access is currently required for physics.

### Cache Busting During Local Tuning

Browsers can keep an old `game.js` or even an old `index.html` while tuning physics. When a local change does not appear, use an explicit `index.html` URL with a throwaway query value:

```text
http://127.0.0.1:4173/index.html?bust=<short-label>
```

When changing gameplay physics, also bump the query string on the local script tag in `index.html`, for example:

```html
<script src="game.js?v=14.3.8-regression-2"></script>
```

Diagnostics can be combined with the cache-bust URL:

```text
http://127.0.0.1:4173/index.html?pinballDiagnostics=all&bust=<short-label>
```

## Verification Notes

In the current Codex desktop environment, browser smoke testing is limited:

- the in-app Browser can fail to start with a Windows sandbox `CreateProcessAsUserW failed: 5` error
- the bundled Node runtime may expose `playwright` without `playwright-core`, so local Playwright smoke checks can fail before loading the app

When that happens, avoid retrying the same browser path. Use `node --check game.js`, `git diff --check`, and the local server HTTP status check above, then verify visual/gameplay changes manually in a normal browser.

## Documentation

- Implementation plan: `docs/implementation_plan.md`
- Original planning prompt: `docs/impol_pinball_codex_plan_prompt.md`
- Visual direction mockup: `docs/mock.png`

## Deployment

Target deployment is GitHub Pages from static files in the repository.

Push static files to the repository and enable GitHub Pages from the repository settings.
