/** Lightweight Web Audio API sound effects */
let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

function resume() {
  if (_ctx?.state === "suspended") _ctx.resume();
}

export const Sounds = {
  /** Bright chirp for tool switch */
  toolSwitch() {
    resume();
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(600, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.1);
  },

  /** Deep "thud" for stamping stickers or erasing */
  stamp() {
    resume();
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(120, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.2);
  },

  /** Bubble pop for dot/drawing point */
  pop() {
    resume();
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.04);
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.06);
  },

  /** Success trumpet arpeggio when tracing is complete */
  success() {
    resume();
    const c = ctx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "square";
      o.frequency.value = freq;
      const t = c.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.3);
    });
  },

  /** Quick "whoosh" for eraser */
  erase: () => {
    resume();
    const c = ctx();
    const b = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const s = c.createBufferSource();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1200;
    s.buffer = b;
    s.playbackRate.setValueAtTime(2, c.currentTime);
    s.playbackRate.exponentialRampToValueAtTime(0.5, c.currentTime + 0.15);
    const g = c.createGain();
    g.gain.setValueAtTime(0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    s.connect(f).connect(g).connect(c.destination);
    s.start();
  },
};
