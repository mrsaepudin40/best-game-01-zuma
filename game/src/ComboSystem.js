// ComboSystem: tracks the current chain-reaction multiplier. A clear of
// 3 orbs scores base points; each consecutive clear within the same shot
// (cascade) raises the multiplier, and 4+ orb clears add a bonus.
export class ComboSystem {
  constructor() { this.reset(); }
  reset() { this.multiplier = 1; this.chain = 0; this.bestCombo = 0; this.totalCleared = 0; }
  startShot() { this.chain = 0; }
  // Returns the points for clearing `count` orbs.
  scoreClear(count) {
    this.chain++;
    this.multiplier = Math.min(8, 1 + (this.chain - 1));
    if (count >= 5) this.multiplier = Math.min(8, this.multiplier + 1);
    this.bestCombo = Math.max(this.bestCombo, this.multiplier);
    this.totalCleared += count;
    return count * 100 * this.multiplier + (count >= 4 ? (count - 3) * 150 : 0);
  }
}
