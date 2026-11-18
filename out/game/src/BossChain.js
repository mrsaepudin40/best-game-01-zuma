// BossChain: boss-level behaviour — armored orbs sprinkled into the spawn
// stream, locked orbs that block matches, and periodic surge waves that
// briefly double the chain speed.
export class BossChain {
  constructor() { this.reset(false); }
  reset(isBoss) {
    this.isBoss = isBoss;
    this.surgeTimer = 0; this.surgeActive = 0;
    this.armoredLeft = 0; this.lockedLeft = 0;
  }
  arm(levelCfg) { this.armoredLeft = levelCfg.armored; this.lockedLeft = levelCfg.locked; this.surgeTimer = levelCfg.surgeEvery; }

  // Decorate a fresh spawn with armor/lock on boss levels.
  decorate(spawn) {
    if (!this.isBoss) return spawn;
    if (this.armoredLeft > 0 && spawn.spawned % 5 === 0) { spawn.armor = 2; this.armoredLeft--; }
    else if (this.lockedLeft > 0 && spawn.spawned % 7 === 0) { spawn.locked = true; this.lockedLeft--; }
    return spawn;
  }

  update(dt, chain) {
    if (!this.isBoss) return 1;
    if (this.surgeActive > 0) {
      this.surgeActive -= dt;
      return 2;
    }
    this.surgeTimer -= dt;
    if (this.surgeTimer <= 0) {
      this.surgeActive = 2.5;
      this.surgeTimer = 9;
      return 2;
    }
    return 1;
  }
}
