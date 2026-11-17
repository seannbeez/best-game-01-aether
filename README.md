# Aether Forge: Clockwork Defender

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/seannbeez/best-game-01-aether/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/seannbeez/best-game-01-aether/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Aether Forge: Clockwork Defender** is a high-craft tactical action-roguelite.
You are the keeper of a brass clockwork forge on a parchment workshop floor,
and the shadow-void is coming through the walls. Blast wisps, spitters,
splitters and brutes across 10 waves, parry their orbs back with a dash,
build HEAT toward a golden OVERDRIVE, and draft a relic every 25 seconds —
Twin Gears, Chain Coil, Piercing Runes, Frost Core and more — until the
Voidmaw itself rises on wave 10. Shatter it and the forge endures.

## How to play

| Control | Action |
|---|---|
| WASD / arrow keys | Move the defender |
| Mouse | Aim |
| Click / Space | Fire aether bolts |
| Shift / right-click | Dash — dashing through an enemy orb PARRIES it back |
| 1 / 2 / 3 or click | Pick a relic during the draft |
| P | Pause |
| M | Mute |
| Enter / Space | Start (title screen) |
| R | Instant restart (game-over / victory screens) |

Touch works too: left half of the screen is a move stick, right half aims
and fires, and the on-screen DASH pad dashes.

Near-misses, parries and multi-kills build HEAT. Fill the gauge for an
8-second OVERDRIVE: faster fire, harder bolts, triple score, golden trails
and a quicker beat. Your best score is saved in the browser.

## Run it locally

```sh
node serve.ts
```

Then open <http://localhost:8080/game/> in a desktop browser. No build step,
no install, no network: the game is plain static files under `game/`, with
procedural canvas art and a WebAudio synthesizer — no external assets.
Use `PORT=8081 node serve.ts` to serve on another port.

## How it is built

- `game/index.html` — the page and canvas
- `game/src/main.js` — bootstrap, animation loop, screenshot scenes
- `game/src/game.js` — state machine, fixed-step loop, combat, heat/combo
- `game/src/config.js` — every tuning number and the palette in one place
- `game/src/player.js` — the Forge Defender: move, aim, fire, dash & parry
- `game/src/enemies.js` — four void kinds and the Voidmaw boss
- `game/src/waves.js` — wave rosters, spawn director, boss waves
- `game/src/relics.js` — the 12-relic draft and its synergies
- `game/src/bullets.js` — bolt and orb pools
- `game/src/particles.js` — bursts, shockwave rings, floating score text
- `game/src/render.js` — parallax workshop, entities, HUD, all screens
- `game/src/audio.js` — procedural WebAudio music and effects
- `game/src/input.js` — keyboard, mouse and touch input
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=…`)
- `game/src/random.js` — seeded random helpers
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`

Screenshots in `screenshots/` show the real game: the title screen, a fight
in progress with the HUD, the relic draft, and the game-over screen with the
final score and restart.

<sub>Entered on [make.fun](https://make.fun/?ref=ebv85brk&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
