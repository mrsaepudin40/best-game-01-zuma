// ShotScenes: deterministic ?shot= scenes for screenshots. Seeded, fixed
// simulated time, no wall clock — the same URL always renders the same
// frame, and window.__shotReady flips once it is drawn.
export function applyShotScene(game, shot) {
  const seed = Number(new URLSearchParams(location.search).get('seed') || 1);
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  game.rng = rnd;
  if (shot === 'title') {
    game.showScreen('title');
    game.fillDemoChain(30, rnd);
  } else if (shot === 'play') {
    // Level 6 = Volt Reef (teal zone), so the four shots show all three zones.
    game.startLevel(6, true);
    game.fillDemoChain(56, rnd);
    game.score = 2450; game.coins = 120;
    game.screen = 'playing'; game.showScreen(null); game.updateHud();
    aimAtChain(game, 6);
  } else if (shot === 'boss') {
    game.startLevel(4, true);
    game.fillDemoChain(60, rnd, true);
    game.score = 9800; game.combo.multiplier = 5;
    game.screen = 'playing'; game.showScreen(null); game.updateHud();
    aimAtChain(game, 8);
    game.hud.showCombo('COMBO x5!');
    game.hud.showToast('BOSS CHAIN — ARMORED ORBS!');
  } else if (shot === 'victory') {
    // Campaign-complete results: heading reads CAMPAIGN COMPLETE!
    game.startLevel(12, true);
    game.score = 15400; game.coins = 340; game.updateHud();
    game.showResults(true, { score: 15400, cleared: 96, bestCombo: 6, level: 12, coins: 340 });
  }
  game.renderOnce();
  setTimeout(() => { window.__shotReady = true; }, 700);
}

// Point the spider's fangs at a mid-chain orb so the aim reads in the shot.
function aimAtChain(game, index) {
  const orb = game.chain.orbs[index] || game.chain.orbs[0];
  if (!orb) return;
  game.track.posAt(orb.s, game.tmpV);
  game.aimPoint.copy(game.tmpV);
  game.spider.setAim(Math.atan2(-game.tmpV.x, -game.tmpV.z));
}
