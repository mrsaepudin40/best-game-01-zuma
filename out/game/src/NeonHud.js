// NeonHud: the DOM heads-up display — score, level, combo, chain progress
// to the portal, next orb, coins, lives and best. Kept out of the WebGL
// canvas so text stays crisp when the screenshot is shrunk.
import { ORB_COLORS } from './TextureForge.js';

export class NeonHud {
  constructor() {
    this.el = {
      score: document.getElementById('hudScore'),
      level: document.getElementById('hudLevel'),
      zone: document.getElementById('hudZone'),
      combo: document.getElementById('hudCombo'),
      coins: document.getElementById('hudCoins'),
      lives: document.getElementById('hudLives'),
      best: document.getElementById('hudBest'),
      bar: document.getElementById('progressBar'),
      next: document.getElementById('nextOrb'),
      toast: document.getElementById('toast'),
      pop: document.getElementById('comboPop'),
      fps: document.getElementById('fpsMeter'),
      titleBest: document.getElementById('titleBest'),
    };
    this.toastTimer = null;
  }

  update(state) {
    this.el.score.textContent = state.score;
    this.el.level.textContent = state.level;
    this.el.zone.textContent = state.zone;
    this.el.combo.textContent = 'x' + state.combo;
    this.el.coins.textContent = state.coins;
    this.el.lives.textContent = state.lives;
    this.el.best.textContent = state.best;
    this.el.bar.style.width = Math.round(Math.min(100, state.progress * 100)) + '%';
    const c = ORB_COLORS[state.nextColor % ORB_COLORS.length];
    this.el.next.style.background = c.css;
    this.el.next.style.color = c.css;
  }

  showToast(text, ms = 1600) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.opacity = '0'; }, ms);
  }

  showCombo(text) {
    this.el.pop.textContent = text;
    this.el.pop.style.opacity = '1';
    this.el.pop.style.transform = 'translate(-50%,-50%) scale(1.15)';
    setTimeout(() => { this.el.pop.style.opacity = '0'; this.el.pop.style.transform = 'translate(-50%,-50%) scale(1)'; }, 700);
  }

  setFps(n) { this.el.fps.textContent = Math.round(n) + ' FPS'; }
  setFpsVisible(v) { this.el.fps.style.display = v ? 'block' : 'none'; }
  setTitleBest(best, level) { this.el.titleBest.textContent = `Best score: ${best} · Campaign level ${level} · Progress saved on this device.`; }
}
