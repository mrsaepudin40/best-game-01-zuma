// AudioSynth: all sound is synthesized with WebAudio — no audio files.
// A tiny step-sequencer plays a neon bass loop; effects are short
// oscillator/noise envelopes. Audio starts only after a user gesture.
export class AudioSynth {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null;
    this.muted = false; this.musicTimer = null; this.step = 0;
    this.bassNotes = [55, 0, 55, 65.41, 0, 49, 0, 58.27, 55, 0, 73.42, 0, 65.41, 0, 49, 61.74];
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq = 1200) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  shoot() { this.tone(520, 0.14, 'square', 0.16, 0, 180); this.noise(0.08, 0.08, 3000); }
  swap() { this.tone(660, 0.07, 'sine', 0.12); }
  pop(combo) { const base = 440 + Math.min(combo, 10) * 55; this.tone(base, 0.12, 'triangle', 0.22); this.tone(base * 1.5, 0.16, 'triangle', 0.18, 0.05); }
  bad() { this.tone(160, 0.25, 'sawtooth', 0.16, 0, 70); }
  power() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.14, i * 0.06)); }
  roar() { this.tone(90, 0.7, 'sawtooth', 0.25, 0, 45); this.noise(0.6, 0.18, 500); }
  coin() { this.tone(988, 0.09, 'sine', 0.16); this.tone(1319, 0.16, 'sine', 0.16, 0.08); }
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.11)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.18, i * 0.16)); }
  click() { this.tone(880, 0.06, 'sine', 0.12); }

  startMusic() {
    if (this.musicTimer) return;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const n = this.bassNotes[this.step % this.bassNotes.length];
      this.step++;
      if (n) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = n;
        const t0 = this.ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
        o.connect(g); g.connect(this.musicGain);
        o.start(t0); o.stop(t0 + 0.26);
      }
      if (this.step % 8 === 4) this.tone(1760, 0.1, 'sine', 0.05);
    }, 210);
  }
}
