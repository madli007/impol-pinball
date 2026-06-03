# Phase 7.1 Asset Needs Audit

## Current Read

The MVP is playable enough to guide asset work. The table already communicates the core layout, but the center playfield still relies on simple labelled shapes. The next visual improvement should focus on assets that make gameplay targets easier to recognize while moving closer to the industrial aluminium mockup direction.

## Asset Priorities

### Priority 1: Gameplay-Critical Playfield Assets

These should be generated or drawn first because players aim at them during play.

1. **Furnace target**
   - Current state: labelled rectangle.
   - Needed asset: compact glowing furnace or industrial heat chamber.
   - Why: central target, strong Impol/production theme, easy visual win.

2. **Coil collector**
   - Current state: labelled green rectangle.
   - Needed asset: aluminium coil collector or stacked coil icon.
   - Why: already near the lower middle of the table and visually important.

3. **MES bumper**
   - Current state: blue circular bumper.
   - Needed asset: MES terminal/screen motif integrated into bumper top.
   - Why: mission-critical object, repeated hits should feel intentional.

4. **ERP core bumper**
   - Current state: orange circular bumper.
   - Needed asset: server/core module with ERP label or digital core glow.
   - Why: mission-critical and multiplier-related.

5. **Measurement targets**
   - Current state: two labelled rectangles, `MERILNI` and `PROTOKOL`.
   - Needed asset: sensor/caliper/measurement protocol target pair.
   - Why: mission-critical and currently visually generic.

### Priority 2: Theme and Readability Assets

These improve identity but should not block gameplay work.

1. **E-Odprema truck marker**
   - Current state: labelled target over a simple polygon.
   - Needed asset: small dispatch truck or loading bay sign.
   - Why: strong internal concept, good future mission candidate.

2. **Alcad target marker**
   - Current state: labelled target over a simple polygon.
   - Needed asset: recycling/aluminium/Alcad badge-like marker.
   - Why: company identity is visible in the side panel, but playfield branding is still abstract.

3. **Green aluminium / CO2 bumper detail**
   - Current state: green circular bumper with `CO2`.
   - Needed asset: leaf/CO2 reduction badge integrated into bumper.
   - Why: good theme read, but less urgent than active MVP missions.

### Priority 3: Decorative Polish

These should wait until gameplay targets have assets.

1. Aluminium rail details.
2. Small bolts/lights around the table.
3. Factory floor texture.
4. Subtle conveyor/pipe motifs.
5. Company badges for the side panel.

## Recommended First Asset Pack

Generate or create these first:

- `furnace-target.png`
- `coil-collector.png`
- `mes-bumper.png`
- `erp-core-bumper.png`
- `measurement-target.png`
- `e-odprema-truck.png`
- `alcad-marker.png`
- `green-aluminium-bumper.png`

Preferred style:

- transparent PNG
- semi-isometric/cartoony industrial style
- dark metallic base
- aluminium silver highlights
- blue, green, and orange accent lighting
- readable at small in-game size

## Recommended Second Visual Pack

After the gameplay targets are readable, the next visual pack should make the whole table feel closer to the mockup without changing gameplay contracts.

1. **Industrial playfield background texture**
   - Needed asset: dark blue factory-floor / brushed-aluminium playfield plate with subtle panel seams, rivets, scratches, and faint arrow/decal markings.
   - Use: drawn under all objects as a low-opacity playfield layer.
   - Why: the current playfield is clean and readable, but still flat compared with the mockup.

2. **Pinball frame and rail trim**
   - Needed asset: modular aluminium rail pieces or a single table-frame overlay.
   - Use: outer frame, inner border, shooter lane trim, and lower drain surround.
   - Why: the mockup reads as a physical machine because the rails have thickness, bolts, and highlights.

3. **Flipper pair**
   - Needed asset: left/right white aluminium flipper sprites with orange pivots, blue underside glow, and subtle bevels.
   - Use: replace or enhance the current canvas-drawn flippers while keeping current physics bodies unchanged.
   - Why: the flippers are very visible during play and currently look flatter than the target assets.

4. **Light posts and small status lamps**
   - Needed asset: small red/orange/blue/green lamp posts, bolt caps, and warning lights.
   - Use: around bumpers, lanes, drain, and lower playfield.
   - Why: small lights are a cheap way to create the arcade/industrial mood from the mock.

5. **Pipe, wire, and ramp decorative pieces**
   - Needed asset: non-colliding curved pipe/wire overlays and short ramp-like aluminium guides.
   - Use: upper playfield and side areas as visual decoration only.
   - Why: the mock has lots of industrial tubing and ramp structure; a light decorative pass can suggest that without adding risky ramp physics.

6. **Named industrial decals**
   - Needed asset: small plate labels such as `ROLLING`, `EXTRUSION`, `COIL COLLECTOR`, `INNOVATION`, and arrow decals.
   - Use: low-profile playfield labels, not mission-critical targets.
   - Why: adds domain flavor and fills empty table space while keeping the active targets clear.

Recommended files:

- `playfield-floor-texture.png`
- `table-frame-trim.png`
- `flipper-left.png`
- `flipper-right.png`
- `lamp-posts-sheet.png`
- `pipe-rail-decor-sheet.png`
- `industrial-decals-sheet.png`

Integration notes:

- Keep these as visual layers only at first.
- Prefer one or two sprite sheets over many tiny files if generation produces consistent results.
- Keep contrast lower than active targets so decorative pieces do not compete with gameplay.
- Start with flippers and background/frame; those are the highest screenshot impact.

## Integration Notes

- Assets should be visual layers only at first.
- Keep current Matter.js collision bodies unchanged.
- Place PNGs on top of existing Canvas shapes.
- Do not replace labels until the asset is readable without them.
- Add assets one group at a time and re-check that the ball, labels, and UI remain readable.

## Acceptance Criteria For Phase 7.2

- Asset pack exists under `assets/images/`.
- At least the furnace, coil collector, MES, ERP, and measurement targets have image assets.
- Assets can be rendered on the Canvas without changing physics contracts.
- The table remains readable on the current desktop layout.
