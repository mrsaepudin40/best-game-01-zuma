// OrbSpawner: feeds orbs into the tail of the chain on a timer. Spawned
// colours favour colours already on the track (fairer matches) and every
// 11th orb is a power orb. Boss levels interleave armored orbs.
export class OrbSpawner {
  constructor() {
    this.reset(30, 4);
  }

  reset(total, colourCount) {
    this.total = total;
    this.colourCount = colourCount;
    this.spawned = 0;
    this.timer = 0;
    this.interval = 1.15;
    this.done = false;
  }

  // Returns a spawn request { color, power, armor, locked } or null.
  update(dt, chain) {
    if (this.done) return null;
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.interval;
    if (this.spawned >= this.total) { this.done = true; return null; }
    this.spawned++;
    const present = chain.coloursPresent();
    let color;
    if (present.length && Math.random() < 0.7) {
      color = present[Math.floor(Math.random() * present.length)] % this.colourCount;
    } else {
      color = Math.floor(Math.random() * this.colourCount);
    }
    const power = this.spawned % 11 === 0;
    return { color, power, armor: 0, locked: false };
  }
}
