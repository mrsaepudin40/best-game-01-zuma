// DragonShooter: the crimson wyrm, built entirely from primitives with a
// canvas scale texture. Segmented body, folded wings, horns, glowing eyes.
// The head tracks the aim point; shooting triggers a fire-breath flash and
// a recoil dip; big combos trigger a roar (scale pulse + wing flare).
import * as THREE from 'three';
import { makeScaleTexture } from './TextureForge.js';

export class DragonShooter {
  constructor(scene) {
    const tex = makeScaleTexture();
    this.scaleMat = new THREE.MeshStandardMaterial({
      map: tex.map, bumpMap: tex.bump, bumpScale: 0.6,
      color: 0xff5040, roughness: 0.42, metalness: 0.25,
    });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x5b0f0f, roughness: 0.55, metalness: 0.2 });
    this.bellyMat = new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.5, metalness: 0.1 });
    this.hornMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.3, metalness: 0.55 });
    this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd166, emissiveIntensity: 3.2 });
    this.wingMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });

    this.group = new THREE.Group();
    this.bodyParts = [];
    this.buildBody();
    this.buildHead();
    this.buildWings();
    this.group.position.set(-7, 1.1, 16);
    this.group.rotation.y = -0.42; // angled toward the spiral heart, head in profile
    // No yaw: the head (local -z) already faces the spiral at the origin.
    scene.add(this.group);

    this.breathLight = new THREE.PointLight(0xff7722, 0, 14, 1.6);
    this.breathLight.position.set(-6.5, 2.2, 14.5);
    scene.add(this.breathLight);
    this.breath = 0;
    this.roarT = 0;
    this.aimAngle = 0;
    this.time = 0;
  }

  sphere(r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true;
    return m;
  }

  buildBody() {
    // Segmented spine: five overlapping scaled spheres, tail tapering back.
    const seg = [[0, 1.5, 0, 1.5], [0, 1.35, 1.7, 1.25], [0, 1.15, 3.2, 1.0], [0, 0.95, 4.5, 0.78], [0, 0.7, 5.6, 0.55]];
    for (const [x, y, z, r] of seg) {
      const m = this.sphere(r, this.scaleMat, x, y, z, 1, 0.92, 1.25);
      this.group.add(m); this.bodyParts.push(m);
    }
    // Belly plates.
    for (let i = 0; i < 4; i++) {
      const m = this.sphere(0.85 - i * 0.12, this.bellyMat, 0, 1.05 - i * 0.08, 0.6 + i * 1.5, 0.9, 0.55, 1.1);
      this.group.add(m);
    }
    // Tail spikes.
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), this.hornMat);
      spike.position.set(0, 1.9 - i * 0.25, 4.6 + i * 0.7);
      spike.rotation.x = -0.5;
      this.group.add(spike);
    }
    // Legs (front pair, folded).
    for (const side of [-1, 1]) {
      const leg = this.sphere(0.5, this.darkMat, side * 1.1, 0.55, 0.4, 0.8, 1, 1.4);
      this.group.add(leg);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 6), this.hornMat);
      claw.position.set(side * 1.1, 0.25, -0.5); claw.rotation.x = Math.PI / 2;
      this.group.add(claw);
    }
  }

  buildHead() {
    this.head = new THREE.Group();
    this.head.position.set(0, 2.1, -1.6);
    const skull = this.sphere(0.95, this.scaleMat, 0, 0, 0, 1, 0.9, 1.15);
    this.head.add(skull);
    const snout = this.sphere(0.55, this.scaleMat, 0, -0.18, -0.95, 0.9, 0.7, 1.3);
    this.head.add(snout);
    const jaw = this.sphere(0.42, this.bellyMat, 0, -0.5, -0.85, 0.85, 0.45, 1.2);
    this.head.add(jaw);
    for (const side of [-1, 1]) {
      const eye = this.sphere(0.16, this.eyeMat, side * 0.42, 0.28, -0.72);
      this.head.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 8), this.hornMat);
      horn.position.set(side * 0.5, 0.75, 0.35);
      horn.rotation.x = 0.7; horn.rotation.z = -side * 0.35;
      this.head.add(horn);
      const frill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 6), this.darkMat);
      frill.position.set(side * 0.85, 0.1, 0.3); frill.rotation.z = -side * 1.2;
      this.head.add(frill);
    }
    // Nostril glow.
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.eyeMat);
    nostril.position.set(0, -0.05, -1.55);
    this.head.add(nostril);
    this.group.add(this.head);
    // Neck segments between body and head.
    for (let i = 0; i < 2; i++) {
      const n = this.sphere(0.8 - i * 0.12, this.scaleMat, 0, 1.85 + i * 0.15, -0.6 - i * 0.55, 1, 0.9, 1);
      this.group.add(n);
    }
  }

  buildWings() {
    this.wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(side * 3.4, 1.6); shape.lineTo(side * 2.6, 0.2);
      shape.lineTo(side * 3.8, -0.6); shape.lineTo(side * 1.8, -1.0); shape.lineTo(0, -0.6);
      const geo = new THREE.ShapeGeometry(shape);
      const membrane = new THREE.Mesh(geo, this.wingMat);
      membrane.castShadow = true;
      wing.add(membrane);
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 6), this.darkMat);
      spar.rotation.z = Math.PI / 2 - side * 0.35;
      spar.position.set(side * 1.7, 0.7, 0);
      wing.add(spar);
      wing.position.set(side * 0.9, 2.4, 1.2);
      wing.rotation.y = side * 0.25;
      this.group.add(wing);
      this.wings.push(wing);
    }
  }

  // aimAngle: yaw of the head toward the target, in radians.
  setAim(angle) { this.aimAngle = angle; }

  fire() {
    this.breath = 1;
    this.head.position.z -= 0.15;
  }

  roar() { this.roarT = 1; }

  mouthWorld(out) {
    out.set(0, 2.0, -3.1);
    return this.group.localToWorld(out);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    // Idle breathing: body swells, wings flap slowly, tail sways.
    const breathe = Math.sin(t * 1.8) * 0.05;
    for (let i = 0; i < this.bodyParts.length; i++) {
      const m = this.bodyParts[i];
      m.scale.y = 0.92 + breathe * (1 - i * 0.12);
      m.position.y += Math.sin(t * 1.8 + i * 0.7) * 0.012;
    }
    const flap = Math.sin(t * 1.4) * 0.16 + (this.roarT > 0 ? this.roarT * 0.5 : 0);
    this.wings[0].rotation.z = flap;
    this.wings[1].rotation.z = -flap;
    this.head.rotation.y += ((this.aimAngle * 0.55) - this.head.rotation.y) * Math.min(1, dt * 8);
    this.head.rotation.x = Math.sin(t * 1.1) * 0.04;
    this.head.position.z += ( -1.6 - this.head.position.z) * Math.min(1, dt * 6);
    if (this.breath > 0) {
      this.breath = Math.max(0, this.breath - dt * 4);
      this.breathLight.intensity = this.breath * 60;
    } else this.breathLight.intensity = 0;
    if (this.roarT > 0) {
      this.roarT = Math.max(0, this.roarT - dt * 1.2);
      const s = 1 + this.roarT * 0.08;
      this.group.scale.set(s, s, s);
    } else this.group.scale.set(1, 1, 1);
  }
}
