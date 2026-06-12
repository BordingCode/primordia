// main.js — bootstrap, shared game context, data-driven stages, discovery flow.
import { GLLayer } from './render/gl.js';
import { createInput } from './engine/input.js';
import { createLoop } from './engine/loop.js';
import * as Save from './engine/save.js';
import { unlock as audioUnlock, sfx, setEnabled as setAudioEnabled, isEnabled as audioIsEnabled } from './engine/audio.js';
import { item as synthItem } from './data/synthesis.js';
import { ForgeScene } from './scenes/forge.js';
import { BenchScene } from './scenes/bench.js';
import { LabScene } from './scenes/lab.js';
import { CellScene } from './scenes/cell.js';
import { WorldScene } from './scenes/world.js';
import { rgb01 } from './render/molecules.js';
import * as UI from './ui/hud.js';

// The journey: nuclei → molecules → building blocks → life → a living world.
export const STAGES = [
  { id: 'forge', ico: '✶', label: 'Forge' },
  { id: 'bench', ico: '⬡', label: 'Bench' },
  { id: 'lab',   ico: '⚗', label: 'Lab' },
  { id: 'cell',  ico: '⬭', label: 'Cell' },
  { id: 'world', ico: '◍', label: 'World' },
];

const glCanvas = document.getElementById('gl');
const fxCanvas = document.getElementById('fx');
const ctx = fxCanvas.getContext('2d');
const stage = document.getElementById('stage');

const gl = new GLLayer(glCanvas);
// Attach input to the CANVAS only — not the whole #stage — so the touchstart
// preventDefault for canvas dragging never cancels taps on the HTML buttons (Begin,
// tabs, codex, hints) that sit on top of the canvas. (Critical for touch devices.)
const input = createInput(fxCanvas);

const game = {
  W: 0, H: 0, dpr: 1, time: 0,
  gl, ctx, input, sfx, STAGES,
  state: Save.load(),
  scene: null, sceneName: null,
  scenes: {},
  transition: null,

  // --- inventory queries ---
  hasElement(s) { return this.state.discoveredElements.includes(s); },
  hasMolecule(id) { return this.state.discoveredMolecules.includes(id); },
  hasItem(id) { return this.state.discoveredItems.includes(id); },
  // unified: do we possess this reagent id? (element / molecule / item)
  has(id) { return this.hasElement(id) || this.hasMolecule(id) || this.hasItem(id); },

  // --- discovery ---
  discoverElement(sym) {
    if (this.hasElement(sym)) return false;
    this.state.discoveredElements.push(sym);
    this.award(4); this.persist(); UI.refreshCodex(this); this.checkGates();
    return true;
  },
  discoverMolecule(id) {
    if (this.hasMolecule(id)) return false;
    this.state.discoveredMolecules.push(id);
    this.award(10); this.persist(); UI.refreshCodex(this);
    if (this.scenes.world) this.scenes.world.onDiscovery(id, this);
    this.checkGates();
    return true;
  },
  discoverItem(id) {
    if (this.hasItem(id)) return false;
    this.state.discoveredItems.push(id);
    const it = synthItem(id);
    this.award(it && it.kind === 'cell' ? 40 : it && it.kind === 'polymer' ? 20 : 14);
    this.persist(); UI.refreshCodex(this);
    if (this.scenes.world) this.scenes.world.onDiscovery(id, this);
    this.checkGates();
    return true;
  },

  award(n) { this.state.insight += n; UI.setInsight(this.state.insight); this.persist(); },
  spend(n) { if (this.state.insight < n) return false; this.state.insight -= n; UI.setInsight(this.state.insight); this.persist(); return true; },
  persist() { Save.save(this.state); },

  celebrate(x, y, color) {
    gl.burst(x, y, 60, { color: rgb01(color), speed: 220, size: 30, life: 1.2, alpha: 0.9 });
    gl.burst(x, y, 30, { color: [1, 1, 1], speed: 90, size: 18, life: 0.8, alpha: 0.8 });
  },

  // --- navigation ---
  go(name, withZoom = false) {
    if (this.sceneName === name) return;
    if (withZoom) { this.transition = { from: this.sceneName, to: name, t: 0, dur: 1.6 }; sfx.zoom(); }
    this._activate(name);
    UI.setActiveTab(name);
  },
  _activate(name) {
    if (this.scene && this.scene.exit) this.scene.exit(this);
    this.scene = this.scenes[name];
    this.sceneName = name;
    this.state.scene = name;
    if (this.scene.enter) this.scene.enter(this);
    UI.setSceneTitle(this.scene.title || name);
    this.persist();
  },

  // --- gates ---
  benchUnlocked() { return ['C', 'O', 'N'].every(s => this.hasElement(s)); },
  labUnlocked() { return ['CH4', 'NH3', 'H2O'].every(id => this.hasMolecule(id)); },
  cellUnlocked() { return this.hasItem('protocell'); },
  stageUnlocked(id) {
    if (id === 'forge') return true;
    if (id === 'bench') return this.benchUnlocked();
    if (id === 'lab') return this.labUnlocked();
    if (id === 'cell') return this.cellUnlocked();
    // World opens the moment the first molecule exists, so it's never a barren screen.
    if (id === 'world') return this.state.discoveredMolecules.length >= 1;
    return false;
  },
  checkGates() {
    for (const st of STAGES) {
      const btn = document.querySelector(`[data-tab="${st.id}"]`);
      if (btn) btn.classList.toggle('locked', !this.stageUnlocked(st.id));
    }
    this._autoZoom('bench', 'benchReached');
    this._autoZoom('lab', 'labReached');
    this._autoZoom('cell', 'cellReached');
  },
  _autoZoom(id, flag) {
    if (this.stageUnlocked(id) && !this.state[flag]) {
      this.state[flag] = true; this.persist();
      setTimeout(() => { this.go(id, true); UI.flash(`New stage unlocked · ${this.scenes[id].title}`); }, 850);
    }
  },
};

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.W = w; game.H = h; game.dpr = dpr;
  fxCanvas.width = Math.floor(w * dpr); fxCanvas.height = Math.floor(h * dpr);
  fxCanvas.style.width = w + 'px'; fxCanvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gl.resize(w, h, dpr);
  if (game.scene && game.scene.resize) game.scene.resize(game);
}
window.addEventListener('resize', resize);

input.on('down', (s) => { audioUnlock(); if (game.scene && game.scene.onDown) game.scene.onDown(s.x, s.y, game); });
input.on('move', (s) => { if (game.scene && game.scene.onMove) game.scene.onMove(s.x, s.y, game); });
input.on('up',   (s) => { if (game.scene && game.scene.onUp) game.scene.onUp(s.x, s.y, game); });

const loop = createLoop({
  update(dt) {
    game.time += dt;
    gl.update(dt);
    if (game.transition) { game.transition.t += dt; if (game.transition.t >= game.transition.dur) game.transition = null; }
    if (game.scene && game.scene.update) game.scene.update(dt, game);
  },
  render() {
    gl.render(game.time);
    ctx.clearRect(0, 0, game.W, game.H);
    if (game.scene && game.scene.render) game.scene.render(ctx, game);
    if (game.transition) renderTransition();
    input.endFrame();
  },
});

function renderTransition() {
  const t = game.transition.t / game.transition.dur;
  const fade = Math.sin(t * Math.PI);
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = Math.hypot(game.W, game.H);
  const g = ctx.createRadialGradient(game.W / 2, game.H / 2, R * (0.05 + e * 0.9), game.W / 2, game.H / 2, R * (0.1 + e));
  g.addColorStop(0, 'rgba(120,230,255,0)');
  g.addColorStop(0.7, `rgba(120,230,255,${0.25 * fade})`);
  g.addColorStop(1, 'rgba(180,140,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, game.W, game.H);
  ctx.restore();
}

function boot() {
  game.scenes.forge = new ForgeScene();
  game.scenes.bench = new BenchScene();
  game.scenes.lab = new LabScene();
  game.scenes.cell = new CellScene();
  game.scenes.world = new WorldScene();
  UI.init(game, { setAudioEnabled, audioIsEnabled, resetSave: () => { Save.resetSave(); location.reload(); } });
  resize();
  game.checkGates();
  const saved = game.state.scene;
  game._activate(saved && game.scenes[saved] && game.stageUnlocked(saved) ? saved : 'forge');
  UI.setInsight(game.state.insight);
  UI.refreshCodex(game);
  loop.start();
  if (!game.state.introSeen) UI.showIntro(game, () => { game.state.introSeen = true; game.persist(); });
}

boot();
window.__primordia = game;
