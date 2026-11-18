# Crimson Wyrm: Neon Spiral

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/mrsaepudin40/best-game-01-zuma/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/mrsaepudin40/best-game-01-zuma/reward.svg)](https://make.fun/c/best-game-01)

A 3D marble-shooter for the [best-game-01](https://make.fun/c/best-game-01) competition on make.fun.

A crimson dragon guards the Neon Spiral. A chain of glowing orbs rolls along a neon spiral track toward a portal at its heart. Aim with the mouse, click to shoot, and match 3 or more orbs of the same colour to shatter the chain before it reaches the portal.

## Features

- **Procedural 3D dragon** — segmented scaled body, wings, horns and glowing eyes, built from Three.js primitives with canvas-generated scale textures. Its head tracks your aim, it breathes fire when you shoot, and it roars on big combos.
- **10 realistic orb colours** — MeshPhysicalMaterial with clearcoat and canvas-generated marble swirl + bump textures per colour.
- **12 levels across 3 neon zones** (Ember Ring, Volt Reef, Void Crown) with growing speed, more colours and new hazards.
- **Boss chains** on levels 4, 8 and 12 — armored orbs (hit twice), locked orbs and fast surge waves.
- **6 power-ups** — Bomb, Lightning, Slow, Rainbow, Laser, Reverse — earned from power orbs or bought in the shop.
- **Coins + between-level shop**, missions, endless mode after the campaign, combo multiplier, localStorage high score and progress.
- **WebAudio synth SFX + music** with mute (M), pause (P), FPS meter toggle (F), Space to swap your loaded orb.
- **Deterministic screenshot scenes** via `?shot=title|play|boss|victory&seed=N`.

## Play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

No network requests at runtime — Three.js is vendored under `game/vendor/`.

## Structure

- `game/src/DragonShooter.js` — the procedural dragon
- `game/src/OrbChain.js` — chain movement, insertion and matching
- `game/src/OrbSpawner.js` — spawn schedule
- `game/src/SpiralTrack.js` — spiral curve + arc-length lookup
- `game/src/ComboSystem.js` — combo multiplier and scoring
- `game/src/PowerUpSystem.js` — the six power-ups
- `game/src/LevelDirector.js` — 12 levels / 3 zones
- `game/src/BossChain.js` — armored / locked orbs, surge waves
- `game/src/NeonHud.js` — DOM HUD
- `game/src/ParticlePool.js` — pooled particles
- `game/src/TextureForge.js` — canvas-generated textures
- `game/src/AudioSynth.js` — WebAudio SFX + music
- `game/src/GameLoop.js` — scene, state machine, fixed-step loop
- `game/src/SaveData.js` — localStorage persistence
- `game/src/ShotScenes.js` — deterministic screenshot scenes
- `game/src/main.js` — entry point

## License

MIT — see `LICENSE`.
