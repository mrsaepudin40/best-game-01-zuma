// SpiralTrack: the glowing spiral the orb chain rolls along. The curve is
// sampled once into a lookup table so any arc-length s maps to a position
// (and a tangent) with a cheap binary search — no per-frame curve math.
import * as THREE from 'three';

const SAMPLES = 900;

export class SpiralTrack {
  constructor() {
    this.points = [];
    this.lengths = [0];
    this.totalLength = 0;
    this.buildSamples();
  }

  // Inward spiral: 2.6 turns, radius 15 -> 4.5, flat on y = 0.55.
  curvePoint(t) {
    const turns = 2.6;
    const angle = t * turns * Math.PI * 2 + Math.PI * 0.5;
    const radius = 15 - t * 10.5;
    return new THREE.Vector3(Math.cos(angle) * radius, 0.55, Math.sin(angle) * radius);
  }

  buildSamples() {
    let prev = this.curvePoint(0);
    this.points.push(prev.clone());
    for (let i = 1; i <= SAMPLES; i++) {
      const p = this.curvePoint(i / SAMPLES);
      this.totalLength += p.distanceTo(prev);
      this.lengths.push(this.totalLength);
      this.points.push(p.clone());
      prev = p;
    }
  }

  posAt(s, out) {
    const clamped = Math.max(0, Math.min(this.totalLength, s));
    let lo = 0, hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lengths[mid] < clamped) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const seg = this.lengths[i] - this.lengths[i - 1] || 1;
    const f = (clamped - this.lengths[i - 1]) / seg;
    out.copy(this.points[i - 1]).lerp(this.points[i], f);
    return out;
  }

  tangentAt(s, out) {
    const a = this.posAt(Math.max(0, s - 0.4), new THREE.Vector3());
    const b = this.posAt(Math.min(this.totalLength, s + 0.4), new THREE.Vector3());
    out.copy(b).sub(a).normalize();
    return out;
  }

  // Nearest arc-length to a world point on the track plane (coarse scan +
  // local refine — called only on a shot, never per frame).
  nearestS(world) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= SAMPLES; i += 6) {
      const d = this.points[i].distanceToSquared(world);
      if (d < bestD) { bestD = d; best = this.lengths[i]; }
    }
    for (let step = 2; step > 0.05; step *= 0.5) {
      const cands = [best - step, best + step];
      for (const c of cands) {
        const p = this.posAt(c, new THREE.Vector3());
        const d = p.distanceToSquared(world);
        if (d < bestD) { bestD = d; best = c; }
      }
    }
    return best;
  }

  portalPosition(out) { return this.posAt(this.totalLength, out); }
}
