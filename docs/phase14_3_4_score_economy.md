# Phase 14.3.4 Score Economy

Status: completed

Ruleset version: `14.3.4-score-economy-1`

High score policy: live updates, separated by scoring ruleset.

## Target Bands

- Beginner three-ball: 75,000-200,000
- Competent three-ball: 200,000-500,000
- Strong mission/multiball game: 500,000-1,000,000

## Rule Changes

- Passive contacts were reduced: slingshots 140, rollovers 160, inlanes 220, outlanes 100.
- Ordinary intentional shots now sit above passive contacts: easy measurement targets 1,200, major targets 2,100-3,200.
- The upper orbit is 6,500, above every ordinary target.
- Mission completion bonuses now range from 18,000 to 40,000, making completion visibly more important than a single target hit.
- Jackpots are the largest repeatable awards: 35,000 normal, 90,000 super, multiplied during multiball.
- Combo awards remain bounded and route/target oriented: passive sensors do not build combos, medium/max combos require diversity, and max combo bonus is 14,000.
- Skill shot is now 8,000.
- BOM success is now 45,000.
- Meta rewards are 120,000 for all missions and 90,000 for all companies.

## High Scores

The previous unversioned key `impol-pinball.high-score` is treated as legacy data. On load, it is copied to `impol-pinball.high-score.legacy-pre-14.3.4` if that legacy copy does not already exist.

Current records are stored separately under:

`impol-pinball.high-score.14.3.4-score-economy-1`

This keeps inflated pre-rebalance scores inspectable without letting them invalidate new records.

## Diagnostic Samples

These samples are calculated from the active `SCORING_RULES` constants and exposed through `window.ImpolPinball.scoring.samples`.

| Sample | Total | Target | Passive Share | Result |
| --- | ---: | ---: | ---: | --- |
| Beginner three-ball | 84,640 | 75,000-200,000 | 4.1% | in-band |
| Competent three-ball | 335,630 | 200,000-500,000 | 1.8% | in-band |
| Strong mission/multiball game | 947,070 | 500,000-1,000,000 | 1.0% | in-band |

Additional diagnostics were added for:

- `score-economy-beginner-band`
- `score-economy-competent-band`
- `score-economy-strong-band`
- `score-economy-legacy-high-score`

## Acceptance Notes

- A routine first ball should no longer outrun the full-game targets through passive contacts.
- Passive contacts are below routes, mission completion, multiball, and jackpots.
- Orbit value is above ordinary target value.
- Jackpots remain the largest repeatable awards.
- Legacy high scores are separated from the new scoring ruleset.
