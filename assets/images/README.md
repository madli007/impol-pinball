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

## Style Notes

- Semi-isometric industrial game assets.
- Dark metallic base with aluminium silver highlights.
- Blue, green, and orange accent lighting.
- Transparent PNG output for individual assets.
- Intended as visual layers over the current Canvas playfield; physics bodies should remain unchanged for first integration.

## Integration Status

Phase 7.3 integrates these images as Canvas visual layers with fallback drawing if an image has not loaded yet. Matter.js collision bodies remain unchanged.

Phase 8.3b prepares additional visual-only assets for later integration. The first integration pass uses the flipper and lamp sprites while keeping Matter.js physics bodies unchanged.
