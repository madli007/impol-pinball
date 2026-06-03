# PRD: Impol Pinball Playable MVP

## Problem Statement

The project needs a clear, agent-ready product definition for the first playable version of Impol Pinball. The existing concept and mockup establish a strong industrial aluminium direction, but the first implementation must avoid becoming a visual-only prototype or an overbuilt simulation.

The user needs a static browser game that can become fun quickly, run on GitHub Pages, and provide a clean foundation for later upgrades such as generated playfield assets, richer company progress, sound, multiball, and a more mockup-like table.

## Solution

Build the first playable MVP of Impol Pinball as a static HTML/CSS/vanilla JavaScript canvas game using Matter.js physics from a CDN.

The MVP will use a classic pinball skeleton with Impol-themed labels and missions. It will prioritize stable gameplay: ball launch, flipper control, drain/restart flow, scoring, mission progress, and local high score. The visual mockup remains the art direction reference, while the first version uses Canvas/CSS shapes instead of final asset art.

The table should be represented through a minimal configuration structure so the playfield can later be upgraded without rewriting scoring, missions, or input handling.

## User Stories

1. As a player, I want to open the game in a browser, so that I can play without installing anything.
2. As a player, I want the game to run from static files, so that it can be shared through GitHub Pages.
3. As a player, I want a visible pinball table, so that I immediately understand where the ball, flippers, targets, and drain are.
4. As a player, I want to launch the ball with the keyboard, so that the game feels like pinball from the first interaction.
5. As a player, I want to hold and release the launch key, so that the plunger has a simple sense of timing and power.
6. As a player, I want to control the left flipper with either `A` or the left arrow, so that I can use my preferred keyboard layout.
7. As a player, I want to control the right flipper with either `D` or the right arrow, so that the controls feel natural.
8. As a player, I want the flippers to respond quickly and reliably, so that misses feel fair.
9. As a player, I want the ball to bounce off walls, bumpers, targets, and flippers, so that the game feels alive.
10. As a player, I want the ball to drain when I miss it, so that the game has stakes.
11. As a player, I want balls remaining to be displayed, so that I know how many chances I have left.
12. As a player, I want to restart after losing, so that I can immediately try again.
13. As a player, I want to see my score update when I hit objects, so that each shot feels rewarding.
14. As a player, I want to see a multiplier, so that mission rewards feel meaningful.
15. As a player, I want the game to save my high score locally, so that repeated plays have a goal.
16. As a returning player, I want my high score to persist after a page reload, so that the game remembers my best run.
17. As a player, I want Impol-themed labels on the table, so that the game has internal character.
18. As a player, I want MES, ERP, and Merilni protokol to be active gameplay concepts, so that the theme is tied to scoring.
19. As a player, I want a MES ONLINE mission, so that hitting MES bumpers has purpose.
20. As a player, I want an ERP GO-LIVE mission, so that the ERP core becomes a repeatable target.
21. As a player, I want a MERILNI PROTOKOL mission, so that measurement targets become meaningful shots.
22. As a player, I want mission progress to be visible, so that I know what to aim for.
23. As a player, I want mission completion to award bonus points, so that completing objectives feels satisfying.
24. As a player, I want one mission to activate a simple multiplier, so that the MVP has a light strategic layer.
25. As a player, I want the table to use industrial colours and readable labels, so that it connects to the mockup without requiring final art.
26. As a player, I want company names to appear as context, so that the broader Impol group identity is visible.
27. As a player, I do not want company progress to block core gameplay, so that the MVP remains focused and easy to understand.
28. As a developer, I want the game to be implemented without npm or a build step, so that the project remains simple to run and deploy.
29. As a developer, I want Matter.js loaded from a CDN for the first MVP, so that implementation can start without vendoring dependencies.
30. As a developer, I want the table geometry described through configuration, so that future table layouts can be introduced with minimal rewrites.
31. As a developer, I want scoring to respond to gameplay events, so that physics, scoring, and missions stay loosely coupled.
32. As a developer, I want missions to respond to named hit events, so that table objects can change without rewriting mission logic.
33. As a developer, I want the renderer to draw simple Canvas/CSS shapes first, so that art production does not block gameplay.
34. As a developer, I want generated playfield assets to be a post-MVP step, so that asset work is guided by actual gameplay needs.
35. As a developer, I want local high score logic isolated from physics, so that persistence remains simple and testable.
36. As a developer, I want keyboard input isolated from game state changes, so that future touch controls can be added cleanly.
37. As a developer, I want drain handling to be explicit, so that ball count, score persistence, and restart flow are reliable.
38. As a developer, I want the first version to avoid multiball, so that ball management remains small and stable.
39. As a developer, I want the first version to avoid sound, so that sound effects can later hook into existing gameplay events.
40. As a developer, I want the first version to avoid runtime AI generation, so that the game stays static and GitHub Pages-compatible.
41. As a stakeholder, I want the game to communicate Impol, aluminium production, ERP, MES, e-Odprema, and quality themes, so that it feels specific rather than generic.
42. As a stakeholder, I want the MVP to be fun before it is visually complete, so that future polish builds on a real game.

## Implementation Decisions

- Build the MVP as a static browser game using HTML, CSS, vanilla JavaScript, Canvas, and Matter.js.
- Load Matter.js from a CDN for the first MVP.
- Keep the app runnable by opening the main HTML file directly in a browser.
- Target GitHub Pages deployment with no build step.
- Use one JavaScript file for the first implementation, organized into clear classes or sections.
- Represent the playfield through a minimal table configuration structure.
- Start with one classic pinball table skeleton: outer walls, drain, side lanes, top bumpers, mid-field targets, right-side launch lane, and two flippers.
- Treat the visual mockup as art direction only, not as a first implementation target.
- Use Canvas/CSS-drawn shapes for MVP visuals.
- Generate a small playfield asset pack only after the first playable prototype is stable.
- Focus the first asset pack on playfield elements such as furnace, coil collector, ERP core, MES terminal, e-Odprema truck, green aluminium target, measurement target, and aluminium coils.
- Do not generate assets during gameplay.
- Use manually controlled kinematic flippers instead of realistic rotating constraint-based flippers.
- Implement a simple plunger where the player holds and releases the launch key.
- Use desktop keyboard controls only in the MVP.
- Keep touch/mobile controls out of scope for the first version, while leaving the input structure open for later addition.
- Use named gameplay events for table hits, such as MES, ERP, measurement, furnace, and coil hits.
- Keep scoring and mission progress driven by gameplay events rather than direct physics internals.
- Include score, balls remaining, current mission progress, multiplier, high score, controls hint, and restart control in the HUD.
- Include company names as visual/contextual UI only in the MVP.
- Keep active gameplay zones focused on systems and processes rather than company-specific progression.
- Implement three MVP missions: MERILNI PROTOKOL, MES ONLINE, and ERP GO-LIVE.
- Mission completion should award bonus points.
- One mission may activate a simple multiplier.
- Store high score in localStorage.
- Exclude multiball, sound, complex ramps, full Hall of Fame, full company progress, and final artwork from the MVP.

## Testing Decisions

- Tests should focus on externally observable behavior: the game loads, input changes gameplay, scoring updates, mission progress advances, drains consume balls, restart works, and high score persists.
- Avoid tests that assert internal Matter.js implementation details or exact private class structure.
- Use a playable page seam as the highest-level smoke test: open the static page and verify that the canvas and HUD load without a build step.
- Use a browser behavior seam to verify launch, flippers, drain, restart, score, and balls remaining.
- Use a mission/scoring seam with controlled gameplay events to verify MES, ERP, and Merilni protokol progress, scoring, completion, and multiplier behavior.
- Use a persistence seam to verify that local high score is saved in localStorage and survives reload.
- Use a visual smoke seam to verify that the canvas is not blank, the HUD does not incoherently overlap the playfield, and the core table elements are readable.
- If browser automation is available, prefer automated browser checks over manual-only verification.
- Manual playtesting remains necessary for feel tuning, especially flipper response, ball speed, bumper impulse, drain fairness, and plunger power.

## Out of Scope

- Full recreation of the provided visual mockup.
- Runtime AI asset generation.
- Generated asset pack before the playable prototype.
- npm, bundlers, TypeScript, framework migration, backend, database, login, or build pipeline.
- Mobile/touch controls.
- Sound effects.
- Multiball.
- Jackpot.
- Ball save.
- Skill shot.
- Combo system.
- Full Hall of Fame.
- Full company progress system.
- Complex ramps.
- Vendored local Matter.js dependency unless CDN use becomes a deployment problem.

## Further Notes

- The guiding principle is playable MVP before visual polish.
- The first implementation should feel like a real pinball game even if the art is simple.
- The table configuration is important because the classic skeleton should be upgradeable into a richer industrial layout later.
- The mockup remains valuable as a visual north star for later playfield art, lighting, company UI, and leaderboard polish.
- The intended issue label is `ready-for-agent`.
