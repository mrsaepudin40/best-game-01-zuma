// DragonShooter: the crimson wyrm, seen from ABOVE — coiled at the heart
// of the spiral, head on top tracking the aim. Built entirely from
// primitives with a canvas scale texture. The body is a tapering ring of
// scaled segments, the wings lie flat and spread, the horns and glowing
// eyes sit on top of the skull so they read from the overhead camera.
// Head forward is local -Z; setAim takes a world yaw.
import * as THREE from 'three';
import { makeScaleTexture } from './TextureForge.js';

const COIL_RADIUS = 2.0;
const HEAD_Y = 2.5;

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
    this.coilBase = [];
    this.buildCoil();
    this.buildHead();
    this.buildWings();
    this.buildLegs();
    // Coiled at the spiral's heart, seen from above.
    this.group.position.set(0, 1.0, 0);
    scene.add(this.group);

    this.breathLight = new THREE.PointLight(0xff7722, 0, 14, 1.6);
    this.breathLight.position.set(0, 3, -2);
    scene.add(this.breathLight);
    this.tmpMouth = new THREE.Vector3();
    this.breath = 0;
    this.roarT = 0;
    this.aimAngle = 0;
    this.time = 0;
  }

  sphere(r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.userData.baseSy = sy;
    return m;
  }

  buildCoil() {
    // Tapering ring: six overlapping scaled spheres on a circle, head end
    // thick, tail end thin. Angles run 300 degrees so the ring stays open
    // where the neck rises to the head.
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / (count - 1)) * Math.PI * 1.66 + Math.PI * 0.17;
      const r = 1.3 - i * 0.15;
      const x = Math.cos(a) * COIL_RADIUS;
      const z = Math.sin(a) * COIL_RADIUS;
      const y = 1.0 + Math.sin(i * 0.9) * 0.08;
      const m = this.sphere(r, this.scaleMat, x, y, z, 1, 0.92, 1);
      this.group.add(m); this.bodyParts.push(m);
      this.coilBase.push({ x, y, z, angle: a });
      // Belly plate under each segment.
      const belly = this.sphere(r * 0.62, this.bellyMat, x * 0.96, y - r * 0.42, z * 0.96, 0.95, 0.5, 0.95);
      this.group.add(belly);
    }
    // Tail spikes along the thin end of the coil, pointing up and out.
    for (let i = 0; i < 3; i++) {
      const b = this.coilBase[3 + i];
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 8), this.hornMat);
      spike.position.set(b.x * 1.15, b.y + 0.95, b.z * 1.15);
      spike.rotation.x = Math.sin(b.angle) * 0.35;
      spike.rotation.z = -Math.cos(b.angle) * 0.35;
      this.group.add(spike);
    }
    // Neck: two segments rising from the coil's centre to the head.
    for (let i = 0; i < 2; i++) {
      const n = this.sphere(0.78 - i * 0.1, this.scaleMat, 0, 1.65 + i * 0.42, 0.15 - i * 0.1, 1, 0.9, 1);
      this.group.add(n);
    }
  }

  buildHead() {
    this.head = new THREE.Group();
    this.head.position.set(0, HEAD_Y, 0);
    const skull = this.sphere(0.95, this.scaleMat, 0, 0, 0, 1, 0.9, 1.15);
    this.head.add(skull);
    const snout = this.sphere(0.55, this.scaleMat, 0, -0.15, -0.95, 0.9, 0.7, 1.3);
    this.head.add(snout);
    const jaw = this.sphere(0.42, this.bellyMat, 0, -0.5, -0.85, 0.85, 0.45, 1.2);
    this.head.add(jaw);
    for (const side of [-1, 1]) {
      // Eyes ride on TOP of the skull so the overhead camera sees them glow.
      const eye = this.sphere(0.22, this.eyeMat, side * 0.38, 0.72, -0.45);
      this.head.add(eye);
      // Horns point up and back — long golden spikes against the red scales.
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 8), this.hornMat);
      horn.position.set(side * 0.5, 0.9, 0.35);
      horn.rotation.x = -0.55; horn.rotation.z = -side * 0.3;
      this.head.add(horn);
      // Frill spikes jut sideways, visible at the skull's edge from above.
      const frill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 6), this.darkMat);
      frill.position.set(side * 0.88, 0.12, 0.3); frill.rotation.z = -side * 1.25;
      this.head.add(frill);
    }
    // Nostril glow at the snout tip.
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.eyeMat);
    nostril.position.set(0, -0.05, -1.55);
    this.head.add(nostril);
    this.group.add(this.head);
  }

  buildWings() {
    this.wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(side * 2.9, 1.2); shape.lineTo(side * 2.2, 0.1);
      shape.lineTo(side * 3.1, -0.5); shape.lineTo(side * 1.5, -0.9); shape.lineTo(0, -0.5);
      const geo = new THREE.ShapeGeometry(shape);
      const membrane = new THREE.Mesh(geo, this.wingMat);
      // Lay the membrane flat in the XZ plane so it spreads from above.
      membrane.rotation.x = -Math.PI / 2;
      membrane.castShadow = true;
      wing.add(membrane);
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.0, 6), this.darkMat);
      spar.rotation.z = Math.PI / 2 - side * 0.3;
      spar.position.set(side * 1.4, 0.15, 0);
      wing.add(spar);
      wing.position.set(side * 1.6, 1.9, 0.4);
      // Sweep the wingtips back toward the tail for a flying silhouette.
      wing.rotation.y = -side * 0.3;
      this.group.add(wing);
      this.wings.push(wing);
    }
  }

  buildLegs() {
    // Front legs splay sideways from the coil, claws pointing out.
    for (const side of [-1, 1]) {
      const leg = this.sphere(0.45, this.darkMat, side * 2.1, 0.55, 0.9, 1.2, 0.7, 0.8);
      this.group.add(leg);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6), this.hornMat);
      claw.position.set(side * 2.8, 0.35, 0.9); claw.rotation.z = -side * Math.PI / 2;
      this.group.add(claw);
    }
  }

  // aimAngle: world yaw of the head (0 = facing -Z, i.e. up-screen).
  setAim(angle) { this.aimAngle = angle; }

  fire() {
    this.breath = 1;
    this.head.position.y -= 0.12;
  }

  roar() { this.roarT = 1; }

  mouthWorld(out) {
    out.set(0, -0.05, -1.9);
    return this.head.localToWorld(out);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    // Idle breathing: coil swells, tail tip sways, wings beat slowly.
    const breathe = Math.sin(t * 1.8) * 0.05;
    for (let i = 0; i < this.bodyParts.length; i++) {
      const m = this.bodyParts[i];
      m.scale.y = m.userData.baseSy * (1 + breathe * (1 - i * 0.1));
    }
    const tail = this.bodyParts[this.bodyParts.length - 1];
    const tb = this.coilBase[this.coilBase.length - 1];
    const sway = Math.sin(t * 0.9) * 0.07;
    tail.position.x = tb.x + Math.cos(tb.angle + Math.PI / 2) * sway;
    tail.position.z = tb.z + Math.sin(tb.angle + Math.PI / 2) * sway;
    const flap = Math.sin(t * 1.4) * 0.14 + (this.roarT > 0 ? this.roarT * 0.45 : 0);
    this.wings[0].rotation.z = flap;
    this.wings[1].rotation.z = -flap;
    // Head yaws toward the aim with wrap-aware smoothing.
    let diff = this.aimAngle - this.head.rotation.y;
    diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.head.rotation.y += diff * Math.min(1, dt * 8);
    this.head.rotation.x = Math.sin(t * 1.1) * 0.03;
    this.head.position.y += (HEAD_Y - this.head.position.y) * Math.min(1, dt * 6);
    if (this.breath > 0) {
      this.breath = Math.max(0, this.breath - dt * 4);
      this.mouthWorld(this.tmpMouth);
      this.breathLight.position.copy(this.tmpMouth);
      this.breathLight.intensity = this.breath * 60;
    } else this.breathLight.intensity = 0;
    if (this.roarT > 0) {
      this.roarT = Math.max(0, this.roarT - dt * 1.2);
      const s = 1 + this.roarT * 0.06;
      this.group.scale.set(s, s, s);
    } else this.group.scale.set(1, 1, 1);
  }
}
