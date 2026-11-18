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
