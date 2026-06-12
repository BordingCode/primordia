// audio.js — procedural Web Audio. Warm, musical, never harsh.
// A soft pentatonic palette + gentle noise textures for fusion/bonds.
let ctx = null;
let master = null;
let enabled = true;

const PENTA = [0, 2, 4, 7, 9]; // major pentatonic semitone offsets
const BASE = 220; // A3

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch (e) { console.warn('audio unavailable', e); }
  return ctx;
}

export function unlock() {
  ensure();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setEnabled(v) { enabled = v; }
export function isEnabled() { return enabled; }

function noteFreq(scaleDegree, octave = 0) {
  const semis = PENTA[((scaleDegree % 5) + 5) % 5] + 12 * (octave + Math.floor(scaleDegree / 5));
  return BASE * Math.pow(2, semis / 12);
}

// A soft bell/marimba-ish tone with gentle attack & long release.
function tone(freq, { dur = 0.6, gain = 0.18, type = 'sine', detune = 0 } = {}) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  // soft attack, exponential release
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(master);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// soft filtered-noise swell (fusion / cosmic whoosh)
function swell({ dur = 0.9, gain = 0.12, cutoff = 900 } = {}) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff, t);
  f.frequency.exponentialRampToValueAtTime(cutoff * 2.2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur);
}

// ---- musical events ----
export const sfx = {
  pickup()  { tone(noteFreq(2, 1), { dur: 0.25, gain: 0.10, type: 'triangle' }); },
  bond()    { tone(noteFreq(3, 0), { dur: 0.5, gain: 0.14, type: 'triangle' });
              tone(noteFreq(5, 1), { dur: 0.5, gain: 0.08, type: 'sine', detune: 4 }); },
  reject()  { tone(noteFreq(0, -1), { dur: 0.22, gain: 0.08, type: 'sine' }); },
  fuse()    { swell({ dur: 0.8, gain: 0.16, cutoff: 700 });
              tone(noteFreq(4, 0), { dur: 0.7, gain: 0.12, type: 'sine' }); },
  discover(i = 0) {
    // gentle ascending arpeggio
    const seq = [0, 2, 4, 7];
    seq.forEach((deg, k) => setTimeout(() => tone(noteFreq(deg, 1), { dur: 0.7, gain: 0.13, type: 'triangle' }), k * 90));
    swell({ dur: 1.1, gain: 0.07, cutoff: 1400 });
  },
  zoom()    { swell({ dur: 1.6, gain: 0.14, cutoff: 500 });
              tone(noteFreq(0, -1), { dur: 1.4, gain: 0.10, type: 'sine' });
              tone(noteFreq(2, 0), { dur: 1.4, gain: 0.06, type: 'sine', detune: -6 }); },
};
