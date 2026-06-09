# Impol Pinball Asset Pack

Generated for Phase 7.2 from the asset audit and the mock playfield direction.

## Files

- `furnace-target.png` - central furnace target.
- `coil-collector.png` - aluminium coil collector target.
- `mes-bumper.png` - MES bumper top/terminal.
- `erp-core-bumper.png` - ERP core bumper.
- `measurement-target.png` - measurement protocol target.
- `e-odprema-truck.png` - e-Odprema dispatch marker.
- `alcad-marker.png` - Alcad marker.
- `green-aluminium-bumper.png` - green aluminium / CO2 bumper.

Supporting files:

- `asset-sheet-source.png` - generated 4x2 source sheet.
- `asset-pack-preview.png` - dark-background preview contact sheet.
- `secondary-visual-asset-sheet.png` - generated chroma-key source sheet for Phase 8.3b decorative assets.
- `secondary-visual-asset-sheet-transparent.png` - transparent working sheet with flippers, rail trim, lamps, pipe/rail decor, bolts, and label plates.
- `flipper-left.png` - cropped left flipper sprite from the secondary visual sheet.
- `flipper-right.png` - cropped right flipper sprite from the secondary visual sheet.
- `lamp-post-red.png`, `lamp-post-orange.png`, `lamp-post-blue.png`, `lamp-post-green.png` - cropped decorative lamp sprites.
- `phase9-table-art-sheet.png` - generated Phase 9.2 source sheet for playfield, frame, and drain art.
- `playfield-floor-texture.png` - cropped transparent playfield floor texture.
- `table-frame-trim.png` - cropped transparent aluminium table frame trim.
- `drain-apron.png` - cropped transparent lower drain apron.
- `phase9-mechanical-detail-sheet.png` - generated Phase 9.3 source sheet for mechanical detail assets.
- `lower-plastic-left.png`, `lower-plastic-right.png` - cropped lower playfield plastic guide plates.
- `shooter-plunger-housing.png` - cropped shooter lane / plunger housing detail.
- `mechanical-post-blue.png`, `mechanical-post-orange.png` - cropped decorative rubber/metal post caps.
- `phase9-industrial-decal-sheet.png` - generated Phase 9.4 source sheet for visual-only industrial decals.
- `decal-arrow-blue.png`, `decal-arrow-orange.png` - cropped direction arrow decals.
- `decal-coil-route-blue.png` - cropped curved coil-route decal.
- `decal-warning-stripe.png` - cropped hazard stripe plate.
- `decal-led-strip.png` - cropped blue LED strip plate.
- `decal-circuit-plate.png` - cropped circuit/production route plate.
- `decal-roller-symbol.png` - cropped roller/extrusion symbol decal.
- `phase12-missing-visual-assets-sheet.png` - generated chroma-key source sheet for Phase 12.5 future gameplay assets.
- `phase12-missing-visual-assets-sheet-transparent.png` - transparent working sheet after chroma-key removal.
- `phase12-asset-preview.png` - local contact-sheet preview of the cropped Phase 12.5 assets.
- `kosovnica-terminal-target.png` - dedicated KOSOVNICA terminal target asset.
- `mission-stage-lamps.png` - mission-stage insert row for the active mission sequence.
- `multiball-lock-release.png` - multiball lock / ball-release visual.
- `jackpot-coil-insert.png`, `jackpot-furnace-insert.png`, `jackpot-final-insert.png` - jackpot insert candidates for future shot rules.
- `innovation-label-plate.png` - cropped label plate from the secondary visual sheet, used on the lower playfield.

## Style Notes

- Semi-isometric industrial game assets.
- Dark metallic base with aluminium silver highlights.
- Blue, green, and orange accent lighting.
- Transparent PNG output for individual assets.
- Intended as visual layers over the current Canvas playfield; physics bodies should remain unchanged for first integration.

## Integration Status

Phase 7.3 integrates these images as Canvas visual layers with fallback drawing if an image has not loaded yet. Matter.js collision bodies remain unchanged.

Phase 8.3b prepares additional visual-only assets for later integration. The first integration pass uses the flipper and lamp sprites while keeping Matter.js physics bodies unchanged.

Phase 9.2 adds a background/frame asset pass with a playfield floor texture, table frame trim, and drain apron. These remain visual-only layers and do not change Matter.js collision bodies.

Phase 9.3 adds lower playfield mechanical details, shooter lane housing art, and small decorative post caps. These also remain visual-only layers.

Phase 9.4 adds low-contrast industrial decals such as route curves, warning stripe plates, LED strips, circuit plates, and roller symbols. These remain decorative and should not read as scoring targets.

Phase 12.5 adds a missing-visual-assets pack for upcoming rules work. `kosovnica-terminal-target.png` is integrated as a real target sprite; the mission-stage, multiball, and jackpot assets are integrated as low-alpha visual-only hints until Phase 13 gives them gameplay contracts.

Phase 12.6 crops the useful `INNOVATION` label plate from `secondary-visual-asset-sheet-transparent.png`. The remaining rails, pipes, LEDs, and label plates stay in the source sheet until a rule or layout pass gives them a clear purpose.
