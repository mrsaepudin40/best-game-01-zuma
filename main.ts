// Crimson Wyrm: Neon Spiral — best-game-01 entry program (Node 22, standard
// library only). The game is this directory's game/ folder: a Three.js
// marble-shooter — a procedural red scaled dragon guards a neon spiral,
// matching 3+ glowing orbs across 12 levels, 3 zones, boss chains, 6
// power-ups, a coin shop, missions and endless mode, with deterministic
// ?shot= scenes (title / play / boss / victory) listed in shots.json.
// TOP-DOWN camera fix: the camera looks straight down at the play field,
// the dragon coils at the spiral's centre and its head tracks the aim, and
// the HUD is a top bar (LEVEL left, score centre, progress + MENU right)
// with floating "+30 COMBO x2" score popups at the clear site.
// It hands the game in: copies game/ and screenshots/ from beside this file
// into the output directory and writes dossier.json there with the vendored
// make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ over 1000 bytes).
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, dossierOptions));
