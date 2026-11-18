// OrbChain: the rolling chain itself — one array of orb records in track
// order (head first). Movement is a spring follow: the head advances at the
// level speed, each orb chases the spot one spacing behind its predecessor,
// so gaps open and close naturally after clears and pushes.
import * as THREE from 'three';

// Orbs are 2x the original size: radius 1.16 (diameter 2.32), spaced one
// diameter apart so neighbours touch, exactly as before at half the size.
export const ORB_SPACING = 2.36;
export const ORB_RADIUS = 1.16;

export class OrbChain {
  constructor(track) {
    this.track = track;
    this.orbs = [];          // { color, s, armor, locked, power, mesh, dead }
    this.headS = 0;
    this.speed = 1.6;
    this.paused = false;
  }

  get length() { return this.orbs.length; }
  get head() { return this.orbs[0]; }

  addOrb(orb) { this.orbs.push(orb); }

  clearAll() { this.orbs.length = 0; this.headS = 0; }

  // Advance the head; followers spring toward their slot. Returns true if
  // the head reached the portal.
  update(dt, slowFactor) {
    if (this.paused || this.orbs.length === 0) return false;
    const v = this.speed * slowFactor;
    this.headS += v * dt;
    let target = this.headS;
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      if (i === 0) {
        o.s += (target - o.s) * Math.min(1, dt * 18);
      } else {
        const want = this.orbs[i - 1].s - ORB_SPACING;
        // Only pull forward, never drag backwards through a gap.
        if (o.s < want) o.s += (want - o.s) * Math.min(1, dt * 14);
      }
      target = o.s - ORB_SPACING;
    }
    return this.orbs[0].s >= this.track.totalLength - 0.4;
  }

  insertAt(index, orb) {
    const before = this.orbs[index - 1];
    const after = this.orbs[index];
    orb.s = after ? after.s + 0.05 : (before ? before.s - ORB_SPACING : this.headS);
    this.orbs.splice(index, 0, orb);
    if (index === 0) this.headS = orb.s;
  }

  // Index of the orb nearest to arc-length s.
  nearestIndex(s) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.orbs.length; i++) {
      const d = Math.abs(this.orbs[i].s - s);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // Run of equal colour around index (locked orbs break a run).
  runAround(index) {
    const color = this.orbs[index].color;
    let lo = index, hi = index;
    while (lo > 0 && this.orbs[lo - 1].color === color && !this.orbs[lo - 1].locked && !this.orbs[lo].locked) lo--;
    while (hi < this.orbs.length - 1 && this.orbs[hi + 1].color === color && !this.orbs[hi + 1].locked && !this.orbs[hi].locked) hi++;
    return { lo, hi, size: hi - lo + 1 };
  }

  removeRange(lo, hi) {
    const removed = this.orbs.slice(lo, hi + 1);
    this.orbs.splice(lo, hi - lo + 1);
    if (this.orbs.length) this.headS = this.orbs[0].s;
    return removed;
  }

  pushBack(dist) {
    for (const o of this.orbs) o.s = Math.max(0.6, o.s - dist);
    this.headS = this.orbs.length ? this.orbs[0].s : 0;
  }

  // Colours present in the chain (for fair spawns: favour colours on track).
  coloursPresent() {
    const set = new Set();
    for (const o of this.orbs) set.add(o.color);
    return [...set];
  }

  syncMeshes(posBuf, tmp) {
    for (let i = 0; i < this.orbs.length; i++) {
      const o = this.orbs[i];
      this.track.posAt(o.s, tmp);
      o.mesh.position.copy(tmp);
      o.mesh.visible = true;
    }
  }
}
