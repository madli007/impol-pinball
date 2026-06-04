# Phase 9.1 Asset Inventory And Art Direction Lock

Date: 2026-06-04

## Goal

Phase 9 should upgrade the table from a demo-polished canvas game into a more physical Impol-themed pinball machine. The next assets should improve screenshot quality and playfield readability without changing the current Matter.js gameplay contracts.

## Current Asset Inventory

| Asset | Dimensions | Role | Decision |
| --- | ---: | --- | --- |
| `mes-bumper.png` | 366 x 349 | MES bumper target | Keep. Strong enough as a gameplay object. |
| `erp-core-bumper.png` | 367 x 367 | ERP bumper target | Keep. Good visual identity and clear color. |
| `green-aluminium-bumper.png` | 347 x 308 | CO2/green aluminium bumper | Keep. Good color contrast. |
| `furnace-target.png` | 373 x 367 | Central furnace target | Keep. Reads well and anchors the center. |
| `coil-collector.png` | 364 x 322 | Coil collector target | Keep. Strong industrial theme. |
| `measurement-target.png` | 293 x 300 | Measurement protocol target | Keep for now. Could later split into left/right variants. |
| `alcad-marker.png` | 348 x 327 | ALCAD marker | Keep. Decorative/target role is readable. |
| `e-odprema-truck.png` | 374 x 344 | Dispatch/truck target | Keep. Good theme detail. |
| `flipper-left.png` | 403 x 187 | Left flipper sprite | Keep. Alignment now works. |
| `flipper-right.png` | 377 x 187 | Right flipper sprite | Keep. Alignment now works. |
| `lamp-post-*.png` | about 72 x 142 | Decorative lower lamps | Keep. Useful small detail. |
| `secondary-visual-asset-sheet-transparent.png` | 1536 x 1024 | Source sheet for secondary details | Keep as source only. Do not render directly. |
| `secondary-visual-asset-sheet.png` | 1536 x 1024 | Chroma/source sheet | Keep as source only. |
| `asset-sheet-source.png` | 1774 x 887 | Source sheet for gameplay assets | Keep as source only. |
| `asset-pack-preview.png` | 880 x 416 | Preview/contact sheet | Keep as documentation asset. |

## Art Direction Rules

- Keep the existing semi-isometric industrial style.
- Use dark blue/black playfield materials with aluminium silver highlights.
- Use blue, orange, and green lighting as accents, not as full-screen color wash.
- Gameplay targets should have the strongest contrast.
- Decorative assets should be lower contrast than active targets.
- PNGs should have transparent backgrounds and minimal transparent padding.
- Assets should be readable at in-game scale, not only at source resolution.
- Keep the ball visually above most decorative art.
- Avoid adding decorative pieces that look like active targets unless they score.

## Missing Or Weak Asset Groups

### Highest Impact

1. **Playfield floor texture**
   - Dark brushed-metal plate, subtle panel seams, rivets, low-contrast industrial decals.
   - Should sit under all gameplay objects.
   - Must not reduce ball readability.

2. **Table frame and rail trim**
   - Inner/outer aluminium border, screws, corner highlights, shooter-lane trim.
   - Can be one large overlay or several modular rail pieces.
   - Should make the table feel like one physical cabinet.

3. **Drain apron**
   - Bottom metal apron around the drain label and outlane returns.
   - Should reinforce the danger zone without covering flippers.

### Medium Impact

4. **Shooter lane detail**
   - Cleaner plunger knob, launch meter housing, vertical lane rail caps, top exit gate.
   - Current drawn version works, but still reads flatter than the rest of the table.

5. **Lower playfield plastics and rubber posts**
   - Small guide plastics, rubber post caps, screw heads, metal brackets.
   - Should frame the flippers and outlanes.

6. **Industrial decal sheet**
   - Labels/arrows such as `ROLLING`, `EXTRUSION`, `COIL ROUTE`, `INNOVATION`.
   - Use sparingly; text must not compete with mission labels.

### Lower Impact / Later

7. **Target variants**
   - Separate left/right measurement assets if symmetry starts feeling repetitive.
   - Alternative ALCAD/e-Odprema decorative states if future missions need them.

8. **Lighting states**
   - Lit/unlit variants for mission-complete targets.
   - Useful later, but not required before the table art pass.

## Recommended Phase 9.2 Scope

Start with a compact background/frame pack:

- `playfield-floor-texture.png`
- `table-frame-trim.png`
- `drain-apron.png`
- optional `shooter-lane-trim.png`

This is the best next slice because it improves the whole screenshot without touching physics.

## Integration Constraints

- Keep all Phase 9.2 assets visual-only at first.
- Do not change collision bodies during the asset integration pass unless visual mismatch becomes obvious.
- Add assets through `ASSET_CONFIG`.
- Render in stable layers:
  1. playfield floor
  2. frame/rail underlays
  3. decorative decals
  4. gameplay targets
  5. flippers
  6. ball
  7. foreground rails/apron
  8. hit feedback
- Re-check performance after adding large PNGs.

## Phase 9.1 Acceptance Check

- Existing asset set reviewed.
- Keep/upgrade decisions documented.
- Missing high-impact asset groups identified.
- Next implementation slice selected: Phase 9.2 background/frame pack.
