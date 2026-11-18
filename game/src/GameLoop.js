// GameLoop: owns the Three.js scene and the whole game state machine —
// title, playing, paused, level-clear, game-over, shop. Fixed 1/60 s
// simulation step, capped devicePixelRatio, shared orb geometry/materials,
// pooled particles and orb meshes, no per-frame allocation in the hot loop.
import * as THREE from 'three';
import { SpiralTrack } from './SpiralTrack.js';
import { OrbChain, ORB_SPACING } from './OrbChain.js';
import { OrbSpawner } from './OrbSpawner.js';
import { DragonShooter } from './DragonShooter.js';
import { ComboSystem } from './ComboSystem.js';
import { PowerUpSystem, POWER_TYPES, POWER_LABELS, POWER_COSTS } from './PowerUpSystem.js';
import { levelConfig, TOTAL_LEVELS } from './LevelDirector.js';
import { BossChain } from './BossChain.js';
import { ParticlePool } from './ParticlePool.js';
import { NeonHud } from './NeonHud.js';
import { AudioSynth } from './AudioSynth.js';
import { loadSave, storeSave } from './SaveData.js';
import { ORB_COLORS, makeOrbTexture, makeGlowTexture, makeTrackTexture, makeArenaTexture } from './TextureForge.js';

const SHOP_ITEMS = [
  { id: 'life', name: 'Extra Life', desc: 'Start each level with +1 life.', cost: 150 },
  { id: 'slow', name: 'Slow Charm', desc: 'Start each level with a Slow power-up.', cost: 80 },
  { id: 'rainbow', name: 'Rainbow Charm', desc: 'Start each level with a Rainbow power-up.', cost: 100 },
  { id: 'horns', name: 'Golden Horns', desc: 'The wyrm wears golden horns. Pure style.', cost: 120 },
  { id: 'trail', name: 'Neon Trail', desc: 'Your shots leave a glowing trail.', cost: 60 },
  { id: 'bomb', name: 'Bomb Stock', desc: 'Start each level with 2 Bombs.', cost: 90 },
];
const MISSIONS = [
  'Clear 25 orbs in one level', 'Reach combo x4', 'Clear a boss level', 'Score 5,000 in one level', 'Finish a level without losing a life', 'Clear 150 orbs total',
];

export class Game {
  constructor() {
    this.save = loadSave();
    this.audio = new AudioSynth();
    this.audio.setMuted(!!this.save.muted);
    this.hud = new NeonHud();
    this.screen = 'title';
    this.score = 0; this.coins = this.save.coins; this.lives = 3;
    this.level = Math.min(TOTAL_LEVELS, Math.max(1, this.save.level || 1));
    this.endless = false;
    this.best = this.save.best;
    this.combo = new ComboSystem();
    this.powers = new PowerUpSystem();
    this.spawner = new OrbSpawner();
    this.boss = new BossChain();
    this.cfg = levelConfig(this.level);
    this.missionsDone = [false, false, false, false, false, false];
    this.clearedTotal = 0;
    this.shotsFired = 0; this.shotsHit = 0;
    this.fps = 60; this.fpsFrames = 0; this.fpsTime = 0; this.fpsVisible = true;
    this.acc = 0; this.lastT = performance.now();
    this.aimPoint = new THREE.Vector3(0, 0.55, 0);
    this.aimS = 0;
    this.currentColor = 0; this.nextColor = 1;
    this.projectiles = [];
    this.orbPool = [];
    this.tmpV = new THREE.Vector3(); this.tmpV2 = new THREE.Vector3(); this.tmpV3 = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.55);
    this.slowFlash = 0;
    this.rng = Math.random;
    this.buildScene();
    this.bindInput();
    this.buildShop();
    this.hud.setTitleBest(this.best, this.level);
    this.updateHud();
    window.__game = this;
    window.__fps = 60;
    requestAnimationFrame((t) => this.frame(t));
  }

  buildScene() {
    const app = document.getElementById('app');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    app.appendChild(this.renderer.domElement);

    // Colourful arena: bright zone sky/fog from the start (level 1 zone),
    // never the old near-black void.
    const bootZone = levelConfig(1).zone;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bootZone.sky);
    // Fog starts beyond the overhead camera's distance to the field (~36),
    // so the top-down view stays crisp and the spiral never washes out.
    this.scene.fog = new THREE.Fog(bootZone.fog, 45, 110);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    // TOP-DOWN camera: straight overhead (a hair of z-offset only so the
    // lookAt up-vector never degenerates), the whole spiral in frame.
    this.camera.position.set(0, 36, 0.6);
    this.camera.lookAt(0, 0, 0);

    // Bright, warm ambient + soft coloured hemisphere fill so the colourful
    // floor reads as lively, not murky, from the overhead camera.
    const amb = new THREE.AmbientLight(0xfff1d6, 0.85); this.scene.add(amb);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x7c3aed, 0.5); this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xffe0b3, 1.6);
    key.position.set(8, 24, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -20; key.shadow.camera.right = 20;
    key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
    this.scene.add(key);
    const rim = new THREE.PointLight(0x22d3ee, 40, 40, 1.8); rim.position.set(-14, 6, -8); this.scene.add(rim);
    const warm = new THREE.PointLight(0xf43f5e, 30, 30, 1.8); warm.position.set(10, 4, 14); this.scene.add(warm);

    // Colourful textured ground disc + flat neon arena rings (read as the
    // arena boundary from the overhead camera). One painted texture per
    // zone, cached and swapped on level start.
    this.arenaTex = {};
    const bootTex = makeArenaTexture(bootZone);
    this.arenaTex[bootZone.name] = bootTex;
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(34, 48),
      new THREE.MeshStandardMaterial({ map: bootTex.map, bumpMap: bootTex.bump, bumpScale: 0.5, color: 0xffffff, roughness: 0.85, metalness: 0.05 }),
    );
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x22d3ee, emissiveIntensity: 1.4, roughness: 0.4 });
    for (const r of [18.5, 20.5]) {
      const arenaRing = new THREE.Mesh(new THREE.TorusGeometry(r, 0.14, 8, 80), ringMat);
      arenaRing.rotation.x = Math.PI / 2;
      arenaRing.position.y = 0.12;
      this.scene.add(arenaRing);
    }

    this.track = new SpiralTrack();
    this.chain = new OrbChain(this.track);
    // Glowing track tube along the spiral.
    const curvePts = [];
    for (let i = 0; i <= 120; i++) curvePts.push(this.track.curvePoint(i / 120));
    const curve = new THREE.CatmullRomCurve3(curvePts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.38, 10, false),
      new THREE.MeshStandardMaterial({ map: makeTrackTexture(), emissive: 0x22d3ee, emissiveIntensity: 0.55, roughness: 0.4 }),
    );
    tube.receiveShadow = true;
    this.scene.add(tube);

    // Portal at the spiral heart.
    this.portal = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.28, 12, 40), new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0xa855f7, emissiveIntensity: 2.2, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2;
    this.portal.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xc084fc, transparent: true, opacity: 0.85, depthWrite: false }));
    glow.scale.set(5, 5, 1);
    this.portal.add(glow);
    this.track.portalPosition(this.tmpV);
    this.portal.position.copy(this.tmpV);
    this.scene.add(this.portal);

    // Orb materials: one shared physical material per colour.
    this.orbGeo = new THREE.SphereGeometry(0.58, 24, 18);
    this.orbMats = ORB_COLORS.map((c) => {
      const tex = makeOrbTexture(c.hex);
      return new THREE.MeshPhysicalMaterial({
        map: tex.map, bumpMap: tex.bump, bumpScale: 0.4,
        color: 0xffffff, roughness: 0.16, metalness: 0.05,
        clearcoat: 1, clearcoatRoughness: 0.12, emissive: c.hex, emissiveIntensity: 0.12,
      });
    });
    this.armorMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.25 });
    this.lockMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.4, emissive: 0x7c3aed, emissiveIntensity: 0.5 });

    this.dragon = new DragonShooter(this.scene);
    this.particles = new ParticlePool(this.scene);

    // Loaded-orb preview sphere floating above the dragon's head, at the
    // centre of the spiral — the current shot, seen from above.
    this.loadedMesh = new THREE.Mesh(this.orbGeo, this.orbMats[0]);
    this.loadedMesh.position.set(0, 4.3, 0);
    this.scene.add(this.loadedMesh);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ---- orb mesh pool ----
  takeOrbMesh(color) {
    for (let i = 0; i < this.orbPool.length; i++) {
      const m = this.orbPool[i];
      if (!m.visible) { m.material = this.orbMats[color]; m.visible = true; return m; }
    }
    const m = new THREE.Mesh(this.orbGeo, this.orbMats[color]);
    m.castShadow = true;
    this.scene.add(m);
    this.orbPool.push(m);
    return m;
  }
  freeOrbMesh(mesh) { mesh.visible = false; }

  makeOrb(color, s, opts = {}) {
    const mesh = this.takeOrbMesh(color);
    return { color, s, armor: opts.armor || 0, locked: !!opts.locked, power: !!opts.power, powerType: opts.powerType || null, mesh };
  }

  spawnOrb(spawn) {
    const tail = this.chain.orbs.length ? this.chain.orbs[this.chain.orbs.length - 1].s : 0;
    const s = Math.max(0.6, tail - ORB_SPACING);
    const orb = this.makeOrb(spawn.color, s, spawn);
    // Power orbs get a random type and a bright emissive pulse via scale.
    if (spawn.power) { orb.powerType = POWER_TYPES[Math.floor(this.rng() * POWER_TYPES.length)]; orb.mesh.scale.setScalar(1.12); }
    this.chain.addOrb(orb);
    this.chain.headS = Math.max(this.chain.headS, this.chain.orbs[0] ? this.chain.orbs[0].s : 0);
  }

  fillDemoChain(count, rnd, boss = false) {
    this.clearChainMeshes();
    this.chain.clearAll();
    for (let i = 0; i < count; i++) {
      const color = Math.floor(rnd() * (boss ? 6 : 10));
      const orb = this.makeOrb(color, 8 + i * ORB_SPACING, {
        armor: boss && i % 6 === 2 ? 2 : 0,
        locked: boss && i % 9 === 4,
      });
      this.chain.addOrb(orb);
    }
    this.chain.headS = this.chain.orbs.length ? this.chain.orbs[0].s : 0;
    this.chain.syncMeshes(null, this.tmpV);
    this.updateHud();
  }

  clearChainMeshes() {
    for (const o of this.chain.orbs) this.freeOrbMesh(o.mesh);
    for (const p of this.projectiles) { p.mesh.visible = false; }
    this.projectiles.length = 0;
  }

  // ---- levels ----
  startLevel(level, demo = false) {
    this.level = level;
    this.cfg = levelConfig(level);
    this.endless = this.endless || level > TOTAL_LEVELS;
    this.clearChainMeshes();
    this.chain.clearAll();
    this.chain.speed = this.cfg.speed;
    this.spawner.reset(this.cfg.totalOrbs, this.cfg.colours);
    this.spawner.interval = this.cfg.spawnInterval;
    this.boss.reset(this.cfg.boss);
    this.boss.arm(this.cfg);
    this.combo.reset();
    this.powers.reset();
    if (this.save.owned.includes('slow')) this.powers.grant('slow');
    if (this.save.owned.includes('rainbow')) this.powers.grant('rainbow');
    if (this.save.owned.includes('bomb')) this.powers.grant('bomb');
    if (this.save.owned.includes('life')) this.lives = Math.min(5, this.lives + 1);
    this.currentColor = Math.floor(this.rng() * this.cfg.colours);
    this.nextColor = Math.floor(this.rng() * this.cfg.colours);
    this.applyZoneBackground();
    if (!demo) {
      this.screen = 'playing';
      this.showScreen(null);
      this.hud.showToast(this.cfg.boss ? `BOSS LEVEL ${level} — ${this.cfg.zone.name}` : `LEVEL ${level} — ${this.cfg.zone.name}`);
      this.audio.ensure();
    }
    this.updateHud();
  }

  // Swap the arena floor texture + sky/fog for the level's zone. Textures
  // are cached per zone — painted once, reused on every revisit.
  applyZoneBackground() {
    const zone = this.cfg.zone;
    this.scene.background = new THREE.Color(zone.sky);
    this.scene.fog.color = new THREE.Color(zone.fog);
    if (!this.arenaTex[zone.name]) this.arenaTex[zone.name] = makeArenaTexture(zone);
    const tex = this.arenaTex[zone.name];
    const mat = this.ground.material;
    if (mat.map !== tex.map) {
      mat.map = tex.map; mat.bumpMap = tex.bump; mat.needsUpdate = true;
    }
  }

  startGame(endless = false) {
    this.score = 0; this.coins = this.save.coins; this.lives = 3;
    this.clearedTotal = 0; this.shotsFired = 0; this.shotsHit = 0;
    this.missionsDone = [false, false, false, false, false, false];
    this.endless = endless;
    this.audio.ensure(); this.audio.click();
    this.startLevel(endless ? 1 : this.level);
  }

  // ---- input ----
  bindInput() {
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
      const hit = this.raycaster.ray.intersectPlane(this.plane, this.tmpV2);
      if (hit) {
        this.aimPoint.copy(hit);
        this.aimS = this.track.nearestS(hit);
        // The dragon is coiled at the origin: yaw is the world angle from
        // the centre to the cursor (head forward is local -Z).
        const dx = hit.x, dz = hit.z;
        this.dragon.setAim(Math.atan2(-dx, -dz));
      }
    });
    window.addEventListener('mousedown', (e) => {
      if (this.screen !== 'playing' || e.target.closest('button')) return;
      this.shoot();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); if (this.screen === 'playing') this.swapOrb(); }
      else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.togglePause();
      else if (e.key === 'm' || e.key === 'M') this.toggleMute();
      else if (e.key === 'f' || e.key === 'F') { this.fpsVisible = !this.fpsVisible; this.hud.setFpsVisible(this.fpsVisible); }
      else if (e.key === 'Enter' && this.screen === 'title') this.startGame(false);
      else if ((e.key === 'r' || e.key === 'R') && (this.screen === 'over' || this.screen === 'clear')) this.startGame(this.endless);
      else if (this.screen === 'playing' && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        this.firePower(POWER_TYPES[Number(e.key) - 1]);
      }
    });
    const bind = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
    bind('btnMenu', () => this.togglePause());
    bind('btnStart', () => this.startGame(false));
    bind('btnEndless', () => this.startGame(true));
    bind('btnHow', () => this.showScreen('how'));
    bind('btnHowBack', () => { this.audio.click(); this.startGame(false); });
    bind('btnShop', () => this.openShop('title'));
    bind('btnShop2', () => this.openShop('clear'));
    bind('btnShopBack', () => this.showScreen(this.shopReturn || 'title'));
    bind('btnResume', () => this.togglePause());
    bind('btnRestartPause', () => { this.audio.click(); this.startLevel(this.level); });
    bind('btnQuitPause', () => { this.showScreen('title'); this.screen = 'title'; this.clearChainMeshes(); this.chain.clearAll(); });
    bind('btnNext', () => { this.audio.click(); this.startLevel(Math.min(TOTAL_LEVELS, this.level + 1)); });
    bind('btnAgain', () => this.startGame(this.endless));
    bind('btnTitle2', () => { this.showScreen('title'); this.screen = 'title'; });
  }

  togglePause() {
    if (this.screen === 'playing') { this.screen = 'paused'; this.showScreen('pause'); }
    else if (this.screen === 'paused') { this.screen = 'playing'; this.showScreen(null); }
  }
  toggleMute() {
    this.save.muted = !this.save.muted;
    this.audio.setMuted(this.save.muted);
    storeSave(this.save);
    this.hud.showToast(this.save.muted ? 'MUTED' : 'SOUND ON');
  }
  swapOrb() {
    const t = this.currentColor; this.currentColor = this.nextColor; this.nextColor = t;
    this.audio.swap(); this.updateHud();
  }

  shoot() {
    if (this.projectiles.length >= 3) return;
    this.audio.ensure(); this.audio.shoot();
    const from = this.dragon.mouthWorld(this.tmpV3.clone());
    const target = this.aimPoint.clone();
    const dir = target.sub(from).normalize();
    const mesh = this.takeOrbMesh(this.currentColor);
    mesh.position.copy(from);
    const color = this.powers.rainbowNext ? -1 : this.currentColor;
    if (this.powers.rainbowNext) this.powers.rainbowNext = false;
    this.projectiles.push({ mesh, vel: dir.multiplyScalar(26), color, rawColor: this.currentColor, life: 2.5 });
    this.dragon.fire();
    this.shotsFired++;
    if (this.save.owned.includes('trail')) this.particles.burst(from, 0xff7722, 6, 2, 0.5);
    this.currentColor = this.nextColor;
    this.nextColor = Math.floor(this.rng() * this.cfg.colours);
    this.updateHud();
  }

  firePower(type) {
    if (!this.powers.has(type)) { this.hud.showToast('No ' + POWER_LABELS[type] + ' stored — clear a power orb!'); return; }
    const at = this.chain.length ? this.chain.nearestIndex(this.aimS) : 0;
    const removedIdx = this.powers.fire(type, this.chain, at);
    this.audio.power();
    this.hud.showToast(POWER_LABELS[type] + '!');
    if (removedIdx.length) this.removeIndices(removedIdx, 50);
    if (type === 'reverse') this.hud.showToast('Chain pushed back!');
    this.updateHud();
  }

  // ---- matching ----
  resolveShot(projectile, hitIndex) {
    const chain = this.chain;
    const target = chain.orbs[hitIndex];
    // Armored orb: crack it, projectile is spent.
    if (target.armor > 0) {
      target.armor--;
      this.audio.bad();
      this.particles.burst(target.mesh.position, 0x9ca3af, 14, 5, 1);
      this.hud.showToast(target.armor > 0 ? 'ARMOR CRACKED!' : 'ARMOR SHATTERED!');
      return;
    }
    const color = projectile.color === -1 ? target.color : projectile.color;
    const orb = this.makeOrb(color, 0, {});
    // Insert before or after the hit orb by arc-length.
    const insertAt = projectile.mesh.position.distanceTo(target.mesh.position) < 1.2
      ? (this.aimS <= target.s ? hitIndex : hitIndex + 1) : hitIndex + 1;
    const idx = Math.max(0, Math.min(chain.length, insertAt));
    chain.insertAt(idx, orb);
    this.shotsHit++;
    this.combo.startShot();
    this.cascadeFrom(idx);
  }

  cascadeFrom(idx) {
    const chain = this.chain;
    let at = Math.max(0, Math.min(chain.length - 1, idx));
    let guard = 0;
    while (chain.length && guard++ < 12) {
      if (at >= chain.length) at = chain.length - 1;
      const run = chain.runAround(at);
      if (run.size < 3) break;
      const removed = chain.removeRange(run.lo, run.hi);
      const pts = this.combo.scoreClear(removed.length);
      this.score += pts;
      this.coins += removed.length;
      this.clearedTotal += removed.length;
      // Floating score popup at the clear site, like the reference frames:
      // "+30" alone, or "+120  COMBO x4" when the multiplier is running.
      const clearPos = removed[0].mesh.position;
      this.tmpV.copy(clearPos).project(this.camera);
      const popText = this.combo.multiplier >= 2 ? `+${pts}  COMBO x${this.combo.multiplier}` : `+${pts}`;
      this.hud.showFloat(popText, (this.tmpV.x * 0.5 + 0.5) * 100, (-this.tmpV.y * 0.5 + 0.5) * 100);
      for (const o of removed) {
        this.particles.burst(o.mesh.position, ORB_COLORS[o.color].hex, 16, 6, 2);
        if (o.power) { this.powers.grant(o.powerType); this.hud.showToast('POWER-UP: ' + POWER_LABELS[o.powerType] + '!'); this.audio.power(); }
        this.freeOrbMesh(o.mesh);
      }
      this.audio.pop(this.combo.multiplier);
      if (this.combo.multiplier >= 4) { this.dragon.roar(); this.audio.roar(); this.hud.showCombo('COMBO x' + this.combo.multiplier + '!'); }
      if (this.combo.multiplier >= 2) this.hud.showToast('+' + pts + '  COMBO x' + this.combo.multiplier);
      at = Math.max(0, run.lo - 1);
    }
    this.checkMissions();
    this.updateHud();
  }

  removeIndices(indices, ptsEach) {
    const sorted = [...indices].sort((a, b) => b - a);
    let gained = 0;
    for (const i of sorted) {
      if (i < 0 || i >= this.chain.length) continue;
      const o = this.chain.orbs[i];
      this.particles.burst(o.mesh.position, ORB_COLORS[o.color].hex, 14, 6, 2);
      if (o.power) this.powers.grant(o.powerType);
      this.freeOrbMesh(o.mesh);
      this.chain.orbs.splice(i, 1);
      gained += ptsEach;
      this.clearedTotal++;
    }
    this.score += gained;
    if (this.chain.length) this.chain.headS = this.chain.orbs[0].s;
  }

  checkMissions() {
    if (this.clearedTotal >= 25) this.missionsDone[0] = true;
    if (this.combo.bestCombo >= 4) this.missionsDone[1] = true;
    if (this.cfg.boss && this.spawner.done && !this.chain.length) this.missionsDone[2] = true;
    if (this.score >= 5000) this.missionsDone[3] = true;
    if (this.clearedTotal >= 150) this.missionsDone[5] = true;
  }

  // ---- shop ----
  buildShop() {
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';
    for (const item of SHOP_ITEMS) {
      const div = document.createElement('div');
      div.className = 'shopItem';
      div.innerHTML = `<b>${item.name}</b> — ${item.cost} coins<br>${item.desc}<br><button class="btn ghost" data-id="${item.id}">${this.save.owned.includes(item.id) ? 'OWNED' : 'BUY'}</button>`;
      grid.appendChild(div);
    }
    grid.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const item = SHOP_ITEMS.find((s) => s.id === b.dataset.id);
      if (this.save.owned.includes(item.id)) return;
      if (this.coins < item.cost) { this.hud.showToast('Not enough coins!'); return; }
      this.coins -= item.cost; this.save.coins = this.coins;
      this.save.owned.push(item.id); storeSave(this.save);
      this.audio.coin(); this.buildShop(); this.updateHud();
      document.getElementById('shopCoins').textContent = this.coins;
    }));
  }
  openShop(from) {
    this.shopReturn = from;
    this.audio.click();
    document.getElementById('shopCoins').textContent = this.coins;
    this.buildShop();
    this.showScreen('shop');
    this.screen = 'shop';
  }

  // ---- screens ----
  showScreen(name) {
    const ids = { title: 'screen-title', how: 'screen-how', pause: 'screen-pause', clear: 'screen-clear', over: 'screen-over', shop: 'screen-shop' };
    for (const [key, id] of Object.entries(ids)) {
      document.getElementById(id).classList.toggle('hidden', key !== name);
    }
  }

  showResults(won, stats) {
    this.screen = 'over';
    const isWin = won && this.level >= TOTAL_LEVELS && !this.endless;
    document.getElementById('overTitle').textContent = isWin ? 'CAMPAIGN COMPLETE!' : (won ? 'LEVEL CLEAR!' : 'GAME OVER');
    document.getElementById('overText').textContent = isWin
      ? 'The wyrm has cleansed all twelve levels of the Neon Spiral. The portal is sealed — for now.'
      : won ? 'Level cleared! The spiral spins on.' : 'The chain reached the portal. The wyrm will try again.';
    document.getElementById('overStats').innerHTML =
      `<div>Score<b>${stats.score}</b></div><div>Orbs cleared<b>${stats.cleared}</b></div><div>Best combo<b>x${stats.bestCombo}</b></div><div>Coins<b>${stats.coins}</b></div><div>Accuracy<b>${this.shotsFired ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0}%</b></div><div>Missions<b>${this.missionsDone.filter(Boolean).length}/6</b></div>`;
    this.showScreen('over');
    if (won) this.audio.win(); else this.audio.lose();
    this.saveBest();
  }

  levelClear() {
    const bonus = 500 + this.lives * 200;
    this.score += bonus; this.coins += 50;
    this.save.coins = this.coins;
    this.save.level = Math.min(TOTAL_LEVELS, this.level + 1);
    storeSave(this.save);
    if (this.missionsDone.filter(Boolean).length >= 5) this.hud.showToast('Missions complete!');
    if (this.level >= TOTAL_LEVELS && !this.endless) {
      this.showResults(true, { score: this.score, cleared: this.clearedTotal, bestCombo: this.combo.bestCombo, level: this.level, coins: this.coins });
      return;
    }
    this.screen = 'clear';
    document.getElementById('clearStats').innerHTML =
      `<div>Score<b>${this.score}</b></div><div>Clear bonus<b>+${bonus}</b></div><div>Orbs cleared<b>${this.clearedTotal}</b></div><div>Best combo<b>x${this.combo.bestCombo}</b></div><div>Coins<b>${this.coins}</b></div><div>Missions<b>${this.missionsDone.filter(Boolean).length}/6</b></div>`;
    this.showScreen('clear');
    this.audio.win();
    this.saveBest();
  }

  gameOver() {
    this.showResults(false, { score: this.score, cleared: this.clearedTotal, bestCombo: this.combo.bestCombo, level: this.level, coins: this.coins });
  }

  saveBest() {
    if (this.score > this.best) { this.best = this.score; this.save.best = this.best; }
    if (this.endless && this.score > this.save.endlessBest) this.save.endlessBest = this.score;
    this.save.coins = this.coins;
    storeSave(this.save);
    this.hud.setTitleBest(this.best, this.save.level);
  }

  loseLife() {
    this.lives--;
    this.audio.lose();
    this.hud.showToast(this.lives > 0 ? `A life lost! ${this.lives} left — the chain resets.` : 'No lives left!');
    if (this.lives <= 0) { this.gameOver(); return; }
    this.clearChainMeshes();
    this.chain.clearAll();
    this.spawner.reset(this.cfg.totalOrbs, this.cfg.colours);
    this.spawner.interval = this.cfg.spawnInterval;
    this.updateHud();
  }

  updateHud() {
    const progress = this.chain.length ? Math.min(1, (this.chain.orbs[0] ? this.chain.orbs[0].s : 0) / this.track.totalLength) : 0;
    this.hud.update({ score: this.score, level: this.level, zone: this.cfg.zone.name, combo: this.combo.multiplier, coins: this.coins, lives: this.lives, best: this.best, progress, nextColor: this.nextColor });
    this.loadedMesh.material = this.currentColor >= 0 ? this.orbMats[this.currentColor] : this.orbMats[0];
  }

  renderOnce() {
    this.chain.syncMeshes(null, this.tmpV);
    this.renderer.render(this.scene, this.camera);
  }

  // ---- simulation ----
  step(dt) {
    if (this.screen !== 'playing') return;
    this.powers.update(dt);
    const surge = this.boss.update(dt, this.chain);
    const slow = this.powers.slowFactor();
    const spawn = this.spawner.update(dt, this.chain);
    if (spawn) {
      spawn.spawned = this.spawner.spawned;
      this.boss.decorate(spawn);
      this.spawnOrb(spawn);
    }
    const reached = this.chain.update(dt, slow * surge);
    if (reached) { this.loseLife(); return; }
    // Projectiles.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      let hit = -1;
      for (let j = 0; j < this.chain.length; j++) {
        if (p.mesh.position.distanceToSquared(this.chain.orbs[j].mesh.position) < 1.25) { hit = j; break; }
      }
      if (hit >= 0 || p.life <= 0 || p.mesh.position.y < -2) {
        if (hit >= 0) this.resolveShot(p, hit);
        p.mesh.visible = false;
        this.projectiles.splice(i, 1);
      }
    }
    // Level clear: spawner finished and chain empty.
    if (this.spawner.done && this.chain.length === 0 && this.projectiles.length === 0) {
      if (this.endless) { this.startLevel(this.level + 1); this.hud.showToast('ENDLESS — LEVEL ' + this.level); }
      else this.levelClear();
    }
    this.chain.syncMeshes(null, this.tmpV);
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dtReal = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    // FPS meter (rAF sampling).
    this.fpsFrames++; this.fpsTime += dtReal;
    if (this.fpsTime >= 1) { this.fps = this.fpsFrames / this.fpsTime; window.__fps = this.fps; if (this.fpsVisible) this.hud.setFps(this.fps); this.fpsFrames = 0; this.fpsTime = 0; }
    this.acc += dtReal;
    const STEP = 1 / 60;
    let n = 0;
    while (this.acc >= STEP && n++ < 4) { this.step(STEP); this.acc -= STEP; }
    if (this.acc > STEP) this.acc = 0;
    // Ambient animation always runs (title screen alive behind overlays).
    const t = now / 1000;
    this.dragon.update(dtReal);
    this.particles.update(dtReal);
    this.portal.rotation.z += dtReal * 0.6;
    this.portal.children[1].material.opacity = 0.65 + Math.sin(t * 2.4) * 0.2;
    this.loadedMesh.position.y = 4.3 + Math.sin(t * 2) * 0.12;
    // The loaded orb hovers just beyond the snout, following the aim, so
    // it never covers the dragon's head from above.
    const aimYaw = this.dragon.head.rotation.y;
    this.loadedMesh.position.x = -Math.sin(aimYaw) * 2.6;
    this.loadedMesh.position.z = -Math.cos(aimYaw) * 2.6;
    this.loadedMesh.rotation.y += dtReal * 1.5;
    if (this.screen === 'title' || this.screen === 'how' || this.screen === 'shop') {
      // Gentle overhead drift on the title screen — never leaves top-down.
      this.camera.position.x = Math.sin(t * 0.12) * 1.5;
      this.camera.position.z = 0.6 + Math.cos(t * 0.09) * 0.8;
      this.camera.lookAt(0, 0, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
