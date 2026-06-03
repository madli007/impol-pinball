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
