// TextureForge: every texture in the game is painted on canvas at boot —
// no external images. Scale hide for the wyrm, marble swirls per orb colour,
// and a soft radial glow sprite for particles and the portal.
import * as THREE from 'three';

export const ORB_COLORS = [
  { name: 'Ruby', hex: 0xe11d48, css: '#e11d48' },
  { name: 'Amber', hex: 0xf59e0b, css: '#f59e0b' },
  { name: 'Lime', hex: 0x84cc16, css: '#84cc16' },
  { name: 'Jade', hex: 0x10b981, css: '#10b981' },
  { name: 'Aqua', hex: 0x06b6d4, css: '#06b6d4' },
  { name: 'Azure', hex: 0x2563eb, css: '#2563eb' },
  { name: 'Violet', hex: 0x8b5cf6, css: '#8b5cf6' },
  { name: 'Magenta', hex: 0xd946ef, css: '#d946ef' },
  { name: 'Rose', hex: 0xfb7185, css: '#fb7185' },
  { name: 'Gold', hex: 0xfacc15, css: '#facc15' },
];

function canvasTexture(size, painter) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  painter(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Overlapping scale arcs, like a dragon's hide.
export function makeScaleTexture() {
  const map = canvasTexture(512, (g, s) => {
    g.fillStyle = '#7f1d1d'; g.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 9; col++) {
        const x = col * 64 + (row % 2 ? 32 : 0), y = row * 64;
        const grad = g.createRadialGradient(x + 32, y + 22, 4, x + 32, y + 32, 46);
        grad.addColorStop(0, '#f87171'); grad.addColorStop(0.55, '#dc2626'); grad.addColorStop(1, '#450a0a');
        g.fillStyle = grad;
        g.beginPath(); g.arc(x + 32, y + 32, 40, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.stroke();
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 2);
  const bump = canvasTexture(512, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 9; col++) {
      const x = col * 64 + (row % 2 ? 32 : 0), y = row * 64;
      const grad = g.createRadialGradient(x + 32, y + 32, 4, x + 32, y + 32, 40);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#202020');
      g.fillStyle = grad; g.beginPath(); g.arc(x + 32, y + 32, 40, 0, Math.PI * 2); g.fill();
    }
  });
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(3, 2);
  return { map, bump };
}

// Marbled swirl for one orb colour: light core, dark veins, bright rim.
export function makeOrbTexture(hex) {
  const base = '#' + hex.toString(16).padStart(6, '0');
  const map = canvasTexture(256, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    g.globalAlpha = 0.35;
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = i % 3 ? '#ffffff' : '#000000';
      g.lineWidth = 3 + Math.random() * 7;
      g.beginPath();
      const y0 = Math.random() * s;
      g.moveTo(-10, y0);
      g.bezierCurveTo(s * 0.3, y0 - 40 + Math.random() * 80, s * 0.7, y0 + 40 - Math.random() * 80, s + 10, y0 + (Math.random() - 0.5) * 60);
      g.stroke();
    }
    g.globalAlpha = 0.5;
    const core = g.createRadialGradient(s * 0.35, s * 0.3, 4, s * 0.35, s * 0.3, 90);
    core.addColorStop(0, 'rgba(255,255,255,0.9)'); core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core; g.fillRect(0, 0, s, s);
    g.globalAlpha = 1;
  });
  const bump = canvasTexture(256, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    g.globalAlpha = 0.4;
    for (let i = 0; i < 20; i++) {
      g.strokeStyle = i % 2 ? '#c8c8c8' : '#383838'; g.lineWidth = 4 + Math.random() * 6;
      g.beginPath(); const y0 = Math.random() * s;
      g.moveTo(0, y0); g.bezierCurveTo(s * 0.4, y0 - 30, s * 0.6, y0 + 30, s, y0); g.stroke();
    }
    g.globalAlpha = 1;
  });
  return { map, bump };
}

export function makeGlowTexture() {
  return canvasTexture(128, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
  });
}

// ---- Colourful arena floor ----
// Deterministic seeded painter (mulberry32) so the floor is identical on
// every run and ?shot= screenshots stay stable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeCss(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function mixCss(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

function roundTile(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath(); g.fill();
}

// Colourful textured arena floor for one zone: rich gradient base, mosaic
// tiles with dark grout, glowing rune rings, circuit traces, speckle stars,
// a darker annulus under the spiral (orb/track readability) and a bright
// medallion under the dragon at the heart. zone.floor is [light, deep, accent].
export function makeArenaTexture(zone) {
  const rnd = mulberry32(0xA11CE5);
  const [c1, c2, accent] = zone.floor;
  const map = canvasTexture(1024, (g, s) => {
    const cx = s / 2, cy = s / 2;
    // Rich radial base: bright heart fading to a deeper rim.
    const base = g.createRadialGradient(cx, cy, 30, cx, cy, s * 0.72);
    base.addColorStop(0, c1);
    base.addColorStop(0.55, mixCss(c1, c2, 0.5));
    base.addColorStop(1, shadeCss(c2, -30));
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    // Mosaic tiles: jittered rounded tiles with dark grout — the texture.
    const T = 64;
    for (let row = 0; row < s / T; row++) {
      for (let col = 0; col < s / T; col++) {
        g.fillStyle = rnd() < 0.12 ? accent : mixCss(c1, c2, rnd());
        g.globalAlpha = 0.28 + rnd() * 0.25;
        roundTile(g, col * T + 3, row * T + 3, T - 6, T - 6, 12);
      }
    }
    g.globalAlpha = 1;
    // Glowing rune rings with tick marks.
    for (const [r, w, a] of [[300, 5, 0.55], [380, 3, 0.45], [470, 4, 0.35]]) {
      g.strokeStyle = accent; g.globalAlpha = a; g.lineWidth = w;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 24; i++) {
        const an = (i / 24) * Math.PI * 2;
        g.save(); g.translate(cx + Math.cos(an) * r, cy + Math.sin(an) * r); g.rotate(an);
        g.fillStyle = accent; g.globalAlpha = a;
        g.fillRect(-2, -12, 4, 24); g.restore();
      }
    }
    g.globalAlpha = 1;
    // Circuit traces: bright bezier lines with node dots.
    for (let i = 0; i < 10; i++) {
      const an = rnd() * Math.PI * 2, r0 = 200 + rnd() * 280;
      const x0 = cx + Math.cos(an) * r0, y0 = cy + Math.sin(an) * r0;
      const x1 = cx + Math.cos(an + 0.5) * (r0 + 60), y1 = cy + Math.sin(an + 0.5) * (r0 + 60);
      g.strokeStyle = accent; g.globalAlpha = 0.5; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0, y0);
      g.quadraticCurveTo(cx + (x0 - cx) * 0.4, cy + (y0 - cy) * 0.4, x1, y1); g.stroke();
      g.fillStyle = '#ffffff'; g.globalAlpha = 0.8;
      g.beginPath(); g.arc(x1, y1, 5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // Speckle stars.
    for (let i = 0; i < 260; i++) {
      g.fillStyle = rnd() < 0.5 ? '#ffffff' : accent;
      g.globalAlpha = 0.15 + rnd() * 0.35;
      g.beginPath(); g.arc(rnd() * s, rnd() * s, 1 + rnd() * 2.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // Darker annulus under the spiral (world radius ~5.5–17.5 of the 34 disc)
    // so the glowing track and the orb chain stay readable on the bright floor.
    const px = (r) => (r / 68) * s;
    g.beginPath();
    g.arc(cx, cy, px(17.5), 0, Math.PI * 2);
    g.arc(cx, cy, px(5.5), 0, Math.PI * 2, true);
    g.fillStyle = 'rgba(8,4,28,0.42)'; g.fill();
    g.strokeStyle = accent; g.globalAlpha = 0.55; g.lineWidth = 4;
    g.beginPath(); g.arc(cx, cy, px(17.5), 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, px(5.5), 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
    // Bright medallion under the dragon at the heart.
    const med = g.createRadialGradient(cx, cy, 4, cx, cy, px(5.5));
    med.addColorStop(0, 'rgba(255,255,255,0.30)');
    med.addColorStop(0.7, accent);
    med.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.35; g.fillStyle = med;
    g.beginPath(); g.arc(cx, cy, px(5.5), 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  });
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const bump = canvasTexture(1024, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    const T = 64;
    for (let row = 0; row < s / T; row++) for (let col = 0; col < s / T; col++) {
      const v = 110 + Math.floor(rnd() * 60);
      g.fillStyle = `rgb(${v},${v},${v})`;
      roundTile(g, col * T + 3, row * T + 3, T - 6, T - 6, 12);
    }
  });
  bump.wrapS = bump.wrapT = THREE.ClampToEdgeWrapping;
  return { map, bump };
}

export function makeTrackTexture() {
  const t = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0b0620'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(34,211,238,0.9)'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
    g.strokeStyle = 'rgba(168,85,247,0.8)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, s / 2 - 14); g.lineTo(s, s / 2 - 14); g.stroke();
    g.beginPath(); g.moveTo(0, s / 2 + 14); g.lineTo(s, s / 2 + 14); g.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
