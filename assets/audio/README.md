# Impol Pinball Audio Asset Notes

Phase 10.5 decision: do not add generated audio files yet.

The current procedural Web Audio effects cover the demo-critical actions:

- launch
- flippers
- bumpers
- targets
- drain and next-ball reset
- skill shot, combo, mission, multiplier, and game-over feedback

Keeping these effects procedural avoids extra loading, browser autoplay edge cases, and larger repository assets. It also keeps the mix easy to tune directly in `game.js`.

Add files here only when a specific sound needs more character than short Web Audio tones/noise can provide. Good candidates would be a mechanical plunger release, a distinct drain clank, or a short mission-complete flourish.

If audio files are added later:

- prefer short local `.ogg` or `.mp3` clips under 250 ms for repeated actions
- keep one-shot milestone clips under 800 ms
- document source/generation notes and intended trigger here
- keep procedural fallbacks for browsers that fail to load audio files
