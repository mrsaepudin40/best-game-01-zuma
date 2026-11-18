// PowerUpSystem: six stored power-ups, earned from power orbs and fired
// with keys 1-6. Each effect is applied to the chain and reports how many
// orbs it removed, so the game can score and animate it.
export const POWER_TYPES = ['bomb', 'lightning', 'slow', 'rainbow', 'laser', 'reverse'];
export const POWER_LABELS = {
  bomb: 'BOMB', lightning: 'LIGHTNING', slow: 'SLOW', rainbow: 'RAINBOW', laser: 'LASER', reverse: 'REVERSE',
};
export const POWER_COSTS = { bomb: 40, lightning: 60, slow: 30, rainbow: 50, laser: 70, reverse: 35 };

export class PowerUpSystem {
  constructor() { this.stored = { bomb: 1, lightning: 0, slow: 0, rainbow: 0, laser: 0, reverse: 0 }; this.slowTimer = 0; this.rainbowNext = false; }
  reset() { this.stored = { bomb: 1, lightning: 0, slow: 0, rainbow: 0, laser: 0, reverse: 0 }; this.slowTimer = 0; this.rainbowNext = false; }
  grant(type) { this.stored[type] = (this.stored[type] || 0) + 1; }
  has(type) { return (this.stored[type] || 0) > 0; }
  slowFactor() { return this.slowTimer > 0 ? 0.35 : 1; }
  update(dt) { if (this.slowTimer > 0) this.slowTimer -= dt; }

  // Fire a stored power-up at chain index `at`. Returns removed orb indices.
  fire(type, chain, at) {
    if (!this.has(type)) return [];
    this.stored[type]--;
    const n = chain.length;
    if (n === 0) return [];
    const idx = Math.max(0, Math.min(n - 1, at));
    if (type === 'bomb') {
      const lo = Math.max(0, idx - 3), hi = Math.min(n - 1, idx + 3);
      return range(lo, hi);
    }
    if (type === 'lightning') {
      const out = [];
      for (let i = 0; i < n && out.length < 8; i += Math.max(1, Math.floor(n / 8))) out.push(i);
      return out;
    }
    if (type === 'slow') { this.slowTimer = 8; return []; }
    if (type === 'rainbow') { this.rainbowNext = true; return []; }
    if (type === 'laser') {
      // Cut a line: every 3rd orb along the chain.
      const out = [];
      for (let i = 0; i < n; i += 3) out.push(i);
      return out;
    }
    if (type === 'reverse') { chain.pushBack(9); return []; }
    return [];
  }
}
function range(lo, hi) { const out = []; for (let i = lo; i <= hi; i++) out.push(i); return out; }
