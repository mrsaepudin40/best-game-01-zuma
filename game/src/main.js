// Crimson Wyrm: Neon Spiral — entry point. Boots the game and, when the
// page carries ?shot=<scene>, renders that deterministic scene for the
// screenshot pass instead of waiting for a player.
import { Game } from './GameLoop.js';
import { applyShotScene } from './ShotScenes.js';

const game = new Game();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShotScene(game, shot);
} else {
  window.__shotReady = true;
}
