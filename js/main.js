// main.js — bootstrap, shared game context, scene router, discovery flow.
import { GLLayer } from './render/gl.js';
import { createInput } from './engine/input.js';
import { createLoop } from './engine/loop.js';
import * as Save from './engine/save.js';
import { unlock as audioUnlock, sfx, setEnabled as setAudioEnabled, isEnabled as audioIsEnabled } from './engine/audio.js';
import { ELEMENTS, el } from './data/elements.js';
import { MOLECULES } from './data/recipes.js';
import { ForgeScene } from './scenes/forge.js';
import { BenchScene } from './scenes/bench.js';
import { WorldScene } from './scenes/world.js';
import { rgb01 } from './render/molecules.js';
import * as UI from './ui/hud.js';

const glCanvas = document.getElementById('gl');
const fxCanvas = document.getElementById('fx');
const ctx = fxCanvas.getContext('2d');
const stage = document.getElementById('stage');

const gl = new GLLayer(glCanvas);
const input = createInput(stage);

const game = {
  W: 0, H: 0, dpr: 1, time: 0,
  gl, ctx, input,
  state: Save.load(),
  scene: null, sceneName: null,
  scenes: {},
  transition: null, // {from,to,t,dur}
  sfx,
  // --- discovery API ---
  hasElement(sym) { return this.state.discoveredElements.includes(sym); },
  hasMolecule(id) { return this.state.discoveredMolecules.includes(id); },
  discoverElement(sym) {
    if (this.hasElement(sym)) return false;
    this.state.discoveredElements.push(sym);
    this.persist();
    UI.refreshCodex(this);
    this.checkGates();
    return true;
  },
  discoverMolecule(id) {
    if (this.hasMolecule(id)) return false;
    this.state.discoveredMolecules.push(id);
    this.award(10);
    this.persist();
    UI.refreshCodex(this);
    if (this.scenes.world) this.scenes.world.onMoleculeDiscovered(id);
    this.checkGates();
    return true;
  },
  award(n) { this.state.insight += n; UI.setInsight(this.state.insight); this.persist(); },
  spend(n) { if (this.state.insight < n) return false; this.state.insight -= n; UI.setInsight(this.state.insight); this.persist(); return true; },
  persist() { Save.save(this.state); },
  // celebratory toast + particle burst
  celebrate(x, y, color) {
    gl.burst(x, y, 60, { color: rgb01(color), speed: 220, size: 30, life: 1.2, alpha: 0.9 });
    gl.burst(x, y, 30, { color: [1, 1, 1], speed: 90, size: 18, life: 0.8, alpha: 0.8 });
  },
  go(name, withZoom = false) {
    if (this.sceneName === name) return;
    const prev = this.sceneName;
    if (withZoom) {
      this.transition = { from: prev, to: name, t: 0, dur: 1.6 };
      sfx.zoom();
    }
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
  // progression gates
  benchUnlocked() { return ['C', 'O', 'N'].every(s => this.hasElement(s)); },
  worldUnlocked() { return this.benchUnlocked(); },
  checkGates() {
    const benchTab = document.querySelector('[data-tab="bench"]');
    const worldTab = document.querySelector('[data-tab="world"]');
    if (benchTab) benchTab.classList.toggle('locked', !this.benchUnlocked());
    if (worldTab) worldTab.classList.toggle('locked', !this.worldUnlocked());
    // first time bench unlocks, fly there with the signature zoom
    if (this.benchUnlocked() && !this.state.benchReached) {
      this.state.benchReached = true;
      this.persist();
      setTimeout(() => this.go('bench', true), 900);
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

// --- pointer delegation to active scene ---
input.on('down', (s) => { audioUnlock(); if (game.scene && game.scene.onDown) game.scene.onDown(s.x, s.y, game); });
input.on('move', (s) => { if (game.scene && game.scene.onMove) game.scene.onMove(s.x, s.y, game); });
input.on('up',   (s) => { if (game.scene && game.scene.onUp) game.scene.onUp(s.x, s.y, game); });

// --- main loop ---
const loop = createLoop({
  update(dt) {
    game.time += dt;
    gl.update(dt);
    if (game.transition) {
      game.transition.t += dt;
      if (game.transition.t >= game.transition.dur) game.transition = null;
    }
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
  // a luminous radial wipe that reads as a zoom/dive between scales
  const t = game.transition.t / game.transition.dur;
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = Math.hypot(game.W, game.H);
  const g = ctx.createRadialGradient(game.W / 2, game.H / 2, R * (0.05 + e * 0.9), game.W / 2, game.H / 2, R * (0.1 + e));
  const fade = Math.sin(t * Math.PI);
  g.addColorStop(0, `rgba(120,230,255,${0.0})`);
  g.addColorStop(0.7, `rgba(120,230,255,${0.25 * fade})`);
  g.addColorStop(1, `rgba(180,140,255,${0.0})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, game.W, game.H);
  ctx.restore();
}

// --- boot ---
function boot() {
  game.scenes.forge = new ForgeScene();
  game.scenes.bench = new BenchScene();
  game.scenes.world = new WorldScene();
  UI.init(game, { setAudioEnabled, audioIsEnabled, resetSave: () => { game.state = Save.resetSave(); location.reload(); } });
  resize();
  game.checkGates();
  game._activate(game.state.scene && game.scenes[game.state.scene] && (game.state.scene !== 'bench' || game.benchUnlocked()) ? game.state.scene : 'forge');
  UI.setInsight(game.state.insight);
  UI.refreshCodex(game);
  loop.start();
  // intro story beat
  if (!game.state.introSeen) UI.showIntro(game, () => { game.state.introSeen = true; game.persist(); });
}

boot();
window.__primordia = game; // debug handle
