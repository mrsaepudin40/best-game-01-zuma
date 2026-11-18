// SpiderShooter: the crimson widow, seen from ABOVE — a big striking
// spider crouched at the heart of the spiral, eight legs spread radially,
// fangs forward, a cluster of glowing eyes on top of its head so the
// overhead camera sees them. Built entirely from primitives with a
// canvas-painted abdomen (crimson hide, black marbling, neon hourglass).
// Head forward is local -Z; setAim takes a world yaw.
import * as THREE from 'three';

// Deterministic little RNG so the abdomen pattern is identical every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Painted abdomen hide: crimson gradient, black marbled blotches, a neon
// magenta hourglass on top, cyan dot ring, thin gold arcs. Returns map+bump.
function makeWidowTexture() {
  const S = 512;
  const rnd = mulberry32(1337);
  const map = document.createElement('canvas'); map.width = S; map.height = S;
  const bump = document.createElement('canvas'); bump.width = S; bump.height = S;
  const c = map.getContext('2d');
  const b = bump.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#ef4444'); g.addColorStop(0.55, '#b91c1c'); g.addColorStop(1, '#450a0a');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  // Black marbling: wandering blotches.
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S, y = rnd() * S, r = 14 + rnd() * 42;
    c.fillStyle = `rgba(10,2,6,${0.25 + rnd() * 0.4})`;
    c.beginPath(); c.ellipse(x, y, r, r * (0.4 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2); c.fill();
    b.fillStyle = `rgba(40,40,40,${0.3 + rnd() * 0.3})`;
    b.beginPath(); b.ellipse(x, y, r, r * 0.5, rnd() * Math.PI, 0, Math.PI * 2); b.fill();
  }
  // Neon hourglass (the widow's mark), glowing magenta. It sits at the
  // TOP band of the canvas: a sphere's north pole samples the canvas top,
  // so this is the part of the dome the overhead camera actually sees.
  // (An hourglass at the canvas centre would land on the abdomen's side.)
  const HY = 78;
  const hourglass = (ctx, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(S / 2 - 46, HY - 52); ctx.lineTo(S / 2 + 46, HY - 52); ctx.lineTo(S / 2, HY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(S / 2 - 46, HY + 52); ctx.lineTo(S / 2 + 46, HY + 52); ctx.lineTo(S / 2, HY); ctx.closePath(); ctx.fill();
  };
  c.shadowColor = '#ec4899'; c.shadowBlur = 22;
  hourglass(c, '#f472b6');
  c.shadowBlur = 0;
  hourglass(b, '#e8e8e8');
  // Cyan dot ring around the mark.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = S / 2 + Math.cos(a) * 100, y = HY + Math.sin(a) * 100;
    c.fillStyle = '#22d3ee'; c.shadowColor = '#22d3ee'; c.shadowBlur = 14;
    c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
  }
  // Thin gold arcs for a jewelled look.
  c.strokeStyle = 'rgba(253,230,138,0.75)'; c.lineWidth = 4;
  for (const r of [140, 165]) { c.beginPath(); c.arc(S / 2, HY, r, 0.3, Math.PI * 1.5); c.stroke(); }
  const mapTex = new THREE.CanvasTexture(map);
  const bumpTex = new THREE.CanvasTexture(bump);
  mapTex.colorSpace = THREE.SRGBColorSpace;
  return { map: mapTex, bump: bumpTex };
}

export class SpiderShooter {
  constructor(scene) {
    const tex = makeWidowTexture();
    this.hideMat = new THREE.MeshStandardMaterial({
      map: tex.map, bumpMap: tex.bump, bumpScale: 0.7,
      color: 0xffffff, roughness: 0.32, metalness: 0.2,
    });
    this.chitinMat = new THREE.MeshStandardMaterial({ color: 0x160608, roughness: 0.35, metalness: 0.35 });
    this.redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
    this.fangMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.22, metalness: 0.1 });
    this.eyeBigMat = new THREE.MeshStandardMaterial({ color: 0x061014, emissive: 0x22d3ee, emissiveIntensity: 4 });
    this.eyeSmallMat = new THREE.MeshStandardMaterial({ color: 0x14060f, emissive: 0xf472b6, emissiveIntensity: 3.5 });
    this.rimMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 1.6, roughness: 0.35 });

    this.group = new THREE.Group();
    this.legs = [];
    this.legPhase = [];
    this.buildAbdomen();
    this.buildHead();
    this.buildLegs();
    this.group.position.set(0, 0, 0);
    scene.add(this.group);

    // Venom spit flash at the fangs when firing.
    this.venomLight = new THREE.PointLight(0x4ade80, 0, 16, 1.6);
    this.venomLight.position.set(0, 2, -3);
    scene.add(this.venomLight);
    this.tmpMouth = new THREE.Vector3();
    this.venom = 0;
    this.shriekT = 0;
    this.twitch = 0;
    this.aimAngle = 0;
    this.time = 0;
  }

  sphere(r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = true;
    return m;
  }

  // Cylinder between two local points, for leg segments.
  tube(a, b, r, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 8), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    return m;
  }

  buildAbdomen() {
    // Big patterned abdomen, flattened, trailing behind the head (+Z).
    // Its neon hourglass faces straight up at the overhead camera.
    this.abdomen = this.sphere(2.6, this.hideMat, 0, 1.15, 1.7, 1.05, 0.5, 1.25);
    this.group.add(this.abdomen);
    // Bright red rim ring around the abdomen's top edge — bold outline.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.14, 8, 48), this.rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 1.35, 1.7);
    rim.scale.set(1.05, 1.25, 1);
    this.group.add(rim);
    // Spinnerets at the rear tip.
    for (const side of [-1, 1]) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8), this.chitinMat);
      sp.position.set(side * 0.35, 0.75, 4.75);
      sp.rotation.x = Math.PI / 2 + 0.5;
      this.group.add(sp);
    }
  }

  buildHead() {
    // The head (cephalothorax + fangs + eyes) yaws to aim; the abdomen
    // stays put, so the spider reads as aiming while staying crouched.
    this.head = new THREE.Group();
    this.head.position.set(0, 1.35, -0.9);
    const skull = this.sphere(1.5, this.chitinMat, 0, 0, 0, 1.1, 0.55, 1.2);
    this.head.add(skull);
    // Red rim around the cephalothorax edge.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.11, 8, 40), this.rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.1, 0);
    rim.scale.set(1.1, 1.2, 1);
    this.head.add(rim);
    // Two big glowing eyes on TOP, then smaller ones in an arc behind.
    for (const side of [-1, 1]) {
      const big = this.sphere(0.34, this.eyeBigMat, side * 0.55, 0.78, -0.55);
      this.head.add(big);
      const mid = this.sphere(0.2, this.eyeSmallMat, side * 0.95, 0.62, 0.1);
      this.head.add(mid);
      const small = this.sphere(0.15, this.eyeSmallMat, side * 0.7, 0.55, 0.75);
      this.head.add(small);
      const rear = this.sphere(0.13, this.eyeSmallMat, side * 0.3, 0.5, 1.0);
      this.head.add(rear);
      // Fangs: ivory cones jutting forward and down from the front,
      // splayed wide so their tips clear the loaded orb's silhouette.
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 8), this.fangMat);
      fang.position.set(side * 0.95, 0.35, -2.0);
      fang.rotation.x = -2.0;
      fang.castShadow = true;
      this.head.add(fang);
      // Pedipalps: short two-segment feelers beside the fangs.
      const palp = this.sphere(0.28, this.redMat, side * 1.05, 0.15, -1.35, 1, 0.7, 1.4);
      this.head.add(palp);
    }
    this.group.add(this.head);
  }

  buildLegs() {
    // Eight long articulated legs, four per side, spread radially so the
    // silhouette reads as a spider at a glance from above. Each leg is a
    // group pivoted at the hip: femur rises to a knee, tibia drops to a
    // foot on the floor. Leg angles sweep from forward to backward.
    const angles = [0.6, 1.05, 1.75, 2.35]; // radians from forward (-Z)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = angles[i] * side;
        const leg = new THREE.Group();
        // Hip on the body edge; all leg geometry is local to the hip pivot.
        const hip = new THREE.Vector3(Math.sin(a) * 1.7, 1.05, -Math.cos(a) * 1.7);
        leg.position.copy(hip);
        const dirOut = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
        const knee = dirOut.clone().multiplyScalar(1.9).add(new THREE.Vector3(0, 0.55, 0));
        const foot = dirOut.clone().multiplyScalar(3.8).add(new THREE.Vector3(0, -0.95, 0));
        leg.add(this.tube(new THREE.Vector3(0, 0, 0), knee, 0.24, this.chitinMat));
        leg.add(this.tube(knee, foot, 0.16, this.chitinMat));
        // Red joints: bright knuckles at hip and knee.
        const hipJoint = this.sphere(0.3, this.redMat, 0, 0, 0);
        leg.add(hipJoint);
        const kneeJoint = this.sphere(0.26, this.redMat, knee.x, knee.y, knee.z);
        leg.add(kneeJoint);
        // Claw tip at the foot.
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), this.fangMat);
        claw.position.copy(foot).add(new THREE.Vector3(0, 0.1, 0));
        claw.rotation.x = Math.PI;
        leg.add(claw);
        this.group.add(leg);
        this.legs.push(leg);
        this.legPhase.push(i * 0.9 + (side < 0 ? 2.1 : 0));
      }
    }
  }

  // aimAngle: world yaw (0 = facing -Z, i.e. up-screen).
  setAim(angle) { this.aimAngle = angle; }

  fire() {
    this.venom = 1;
    this.twitch = 1;
    this.head.position.y -= 0.1;
  }

  roar() { this.shriekT = 1; }

  mouthWorld(out) {
    // Fang-tip position, in head-local space (front, low, centre).
    out.set(0, 0.55, -2.2);
    return this.head.localToWorld(out);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    // Abdomen breathing pulse, stronger on a shriek.
    const pulse = 1 + Math.sin(t * 2.2) * 0.025 + this.shriekT * 0.07;
    this.abdomen.scale.set(1.05 * pulse, 0.5 * pulse, 1.25);
    // Legs shift with a slow wave; a firing twitch kicks them all briefly.
    const twitchKick = this.twitch > 0 ? this.twitch * 0.22 : 0;
    for (let i = 0; i < this.legs.length; i++) {
      const sway = Math.sin(t * 1.3 + this.legPhase[i]) * 0.05;
      this.legs[i].rotation.y = sway + twitchKick * (i % 2 === 0 ? 1 : -1);
    }
    if (this.twitch > 0) this.twitch = Math.max(0, this.twitch - dt * 5);
    // Eyes glow-pulsing, flaring bright on a shriek.
    const glow = 3 + Math.sin(t * 3) * 0.8 + this.shriekT * 4;
    this.eyeBigMat.emissiveIntensity = glow + 1;
    this.eyeSmallMat.emissiveIntensity = glow;
    // Head yaws toward the aim with wrap-aware smoothing.
    let diff = this.aimAngle - this.head.rotation.y;
    diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.head.rotation.y += diff * Math.min(1, dt * 8);
    this.head.rotation.x = Math.sin(t * 1.1) * 0.02;
    this.head.position.y += (1.35 - this.head.position.y) * Math.min(1, dt * 6);
    if (this.venom > 0) {
      this.venom = Math.max(0, this.venom - dt * 4);
      this.mouthWorld(this.tmpMouth);
      this.venomLight.position.copy(this.tmpMouth);
      this.venomLight.intensity = this.venom * 70;
    } else this.venomLight.intensity = 0;
    if (this.shriekT > 0) {
      this.shriekT = Math.max(0, this.shriekT - dt * 1.2);
      const s = 1 + this.shriekT * 0.04;
      this.group.scale.set(s, s, s);
    } else this.group.scale.set(1, 1, 1);
  }
}
