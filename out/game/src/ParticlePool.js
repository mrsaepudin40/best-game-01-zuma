// ParticlePool: a single THREE.Points cloud with a fixed capacity. Bursts
// reuse dead slots — zero allocation in the hot loop, capped at 600 live.
import * as THREE from 'three';
import { makeGlowTexture } from './TextureForge.js';

const MAX = 600;

export class ParticlePool {
  constructor(scene) {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.cursor = 0;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size: 0.5, map: makeGlowTexture(), vertexColors: true, transparent: true,
      opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.alive = 0;
  }

  burst(p, colorHex, count, speed = 5, up = 2) {
    const c = new THREE.Color(colorHex);
    for (let k = 0; k < count; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % MAX;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * Math.cos(e) * s;
      this.vel[i * 3 + 1] = Math.sin(e) * s + up;
      this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.life[i] = this.maxLife[i] = 0.5 + Math.random() * 0.5;
    }
  }

  update(dt) {
    let alive = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3 + 1] -= 6 * dt;
      alive++;
    }
    this.alive = alive;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, MAX);
  }
}
