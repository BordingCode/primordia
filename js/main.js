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
import { rgb01, drawAtom, drawToken, hexA } from './render/molecules.js';
import { el } from './data/elements.js';
import { MOLECULES } from './data/recipes.js';
import * as UI from './ui/hud.js';

// subscript helper for molecule formulae shown in the big "you made it" reveal
const REV_SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const revFormula = (f) => Object.keys(f).map(k => k + (f[k] > 1 ? REV_SUB[f[k]] : '')).join('');

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
    this.showReveal('element', sym);
    this.award(4); this.persist(); UI.refreshCodex(this); this.checkGates();
    return true;
  },
  discoverMolecule(id) {
    if (this.hasMolecule(id)) return false;
    this.state.discoveredMolecules.push(id);
    this.showReveal('molecule', id);
    this.award(10); this.persist(); UI.refreshCodex(this);
    if (this.scenes.world) this.scenes.world.onDiscovery(id, this);
    this.checkGates();
    return true;
  },
  discoverItem(id) {
    if (this.hasItem(id)) return false;
    this.state.discoveredItems.push(id);
    this.showReveal('item', id);
    const it = synthItem(id);
    this.award(it && it.kind === 'cell' ? 40 : it && it.kind === 'polymer' ? 20 : 14);
    this.persist(); UI.refreshCodex(this);
    if (this.scenes.world) this.scenes.world.onDiscovery(id, this);
    this.checkGates();
    return true;
  },

  // --- wonder layer (wordless cues for the youngest players) ---
  // The big "you made THIS" hero reveal: a large picture of the new thing rises in the centre,
  // so a child who can't read still knows exactly what they just created. Two-level: the picture
  // is for the 6-yo, the small corner toast (with the science fact) is for the older reader.
  reveal: null,
  showReveal(kind, ref) {
    let d;
    if (kind === 'element') { const e = el(ref); d = { kind, sym: e.sym, name: e.name, color: e.glow }; }
    else if (kind === 'molecule') { const m = MOLECULES.find(x => x.id === ref); if (!m) return; d = { kind, abbr: revFormula(m.formula), name: m.name, color: '#8ef0d0' }; }
    else { const it = synthItem(ref); if (!it) return; d = { kind, abbr: it.abbr, name: it.name, color: it.color }; }
    this.reveal = { ...d, t: 0, dur: 2.6 };
  },
  // "Drag-me" cues on tray atoms pulse only until the player has clearly learned to drag,
  // then fade for everyone (so a teen isn't nagged). Counts successful pickups.
  wonderActive() { return (this.state.wonderDrags || 0) < 6; },
  noteWonderDrag() {
    if ((this.state.wonderDrags || 0) >= 6) return;
    this.state.wonderDrags = (this.state.wonderDrags || 0) + 1; this.persist();
  },

  hasAside(id) { return this.state.asidesFound.includes(id); },
  discoverAside(id) {
    if (this.hasAside(id)) return false;
    this.state.asidesFound.push(id);
    this.award(6); this.persist(); UI.refreshCodex(this);
    return true;
  },
  logExperiment() { this.state.experiments = (this.state.experiments || 0) + 1; this.persist(); },
  // Sandbox: a free-play space where every stage and reagent is open. Bought once with insight.
  SANDBOX_COST: 40,
  unlockSandbox() {
    if (this.state.sandboxUnlocked) return true;
    if (!this.spend(this.SANDBOX_COST)) return false;
    this.state.sandboxUnlocked = true; this.persist();
    return true;
  },
  setSandbox(on) {
    this.state.sandbox = !!on; this.persist();
    this.checkGates();
    // rebuild the current scene's tray/palette so freed reagents appear immediately
    if (this.scene && this.scene.layout) this.scene.layout(this);
    UI.refreshCodex(this);
  },
  // in sandbox you "have" everything; otherwise fall back to real discovery
  ownsElement(s) { return this.state.sandbox || this.hasElement(s); },
  ownsMolecule(id) { return this.state.sandbox || this.hasMolecule(id); },
  ownsItem(id) { return this.state.sandbox || this.hasItem(id); },
  // one-time coaching toast (gated by a saved flag so veterans never see it twice)
  coachOnce(id, opts) {
    if (this.state.coachSeen[id]) return;
    this.state.coachSeen[id] = true; this.persist();
    UI.toast(this, opts);
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
    UI.maybeHowto(name);
    this.persist();
  },

  // --- gates ---
  benchUnlocked() { return ['C', 'O', 'N'].every(s => this.hasElement(s)); },
  labUnlocked() { return ['CH4', 'NH3', 'H2O'].every(id => this.hasMolecule(id)); },
  cellUnlocked() { return this.hasItem('protocell'); },
  stageUnlocked(id) {
    if (this.state.sandbox) return true;   // sandbox frees the whole journey
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
    // Don't burn the first-unlock celebration while sandbox is on — sandbox unlocks everything,
    // so leave the *Reached flags untouched so the real auto-zoom can still fire later.
    if (this.state.sandbox) return;
    if (this.stageUnlocked(id) && !this.state[flag]) {
      this.state[flag] = true; this.persist();
      // reaching a new stage means you've finished the previous one → its quick-check fires
      const prior = { bench: 'forge', lab: 'bench', cell: 'lab' }[id];
      setTimeout(() => {
        this.go(id, true); UI.flash(`New stage unlocked · ${this.scenes[id].title}`);
        if (prior) setTimeout(() => this.maybeQuiz(prior), 1500);
      }, 850);
    }
  },
  // fire a stage's conceptual quick-check once it's complete (also seeds it into spaced review)
  maybeQuiz(stageId, onDone) { UI.maybeQuiz(this, stageId, onDone); },
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
    if (game.reveal) { game.reveal.t += dt; if (game.reveal.t >= game.reveal.dur) game.reveal = null; }
    if (game.scene && game.scene.update) game.scene.update(dt, game);
  },
  render() {
    gl.render(game.time);
    ctx.clearRect(0, 0, game.W, game.H);
    if (game.scene && game.scene.render) game.scene.render(ctx, game);
    if (game.transition) renderTransition();
    if (game.reveal) renderReveal();
    input.endFrame();
  },
});

// The big "you made THIS" hero reveal — a large picture of the new discovery rises and glows
// in the centre, holds, then fades. For the youngest players: knowing WHAT you made, shown not told.
function renderReveal() {
  const rv = game.reveal;
  const p = rv.t / rv.dur;
  const appear = Math.min(1, rv.t / 0.32);                  // ease/scale in
  const fade = p > 0.78 ? Math.max(0, 1 - (p - 0.78) / 0.22) : 1;
  const a = appear * fade;
  const cx = game.W / 2, cy = game.H * 0.40;
  const pop = 1 + 0.12 * Math.sin(Math.min(rv.t, 0.5) / 0.5 * Math.PI);  // little bounce on entry
  const r = 52 * (0.7 + appear * 0.3) * pop;

  ctx.save();
  // soft radial halo so the icon pops without fully dimming the scene
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3.4);
  hg.addColorStop(0, hexA(rv.color, 0.34 * a)); hg.addColorStop(1, hexA(rv.color, 0));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2); ctx.fill();
  // an expanding celebratory ring
  const ringP = Math.min(1, rv.t / 0.9);
  ctx.strokeStyle = hexA(rv.color, (1 - ringP) * 0.6 * a); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r * (1.1 + ringP * 1.8), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = a;
  // the big picture of what you made
  if (rv.kind === 'element') drawAtom(ctx, cx, cy, rv.sym, { r, time: game.time });
  else drawToken(ctx, cx, cy, { abbr: rv.abbr, color: rv.color }, { r });
  // name + a wordless "new!" sparkle
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '700 22px "Outfit", system-ui, sans-serif';
  ctx.fillText(rv.name, cx, cy + r + 34);
  ctx.fillStyle = hexA(rv.color, 0.9);
  ctx.font = '600 13px "Outfit", system-ui, sans-serif';
  ctx.fillText('✦ you made it!', cx, cy + r + 56);
  ctx.restore();
}

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
  UI.init(game, { setAudioEnabled, audioIsEnabled, setReduceMotion: (on) => { gl.lowMotion = on; }, resetSave: () => { Save.resetSave(); location.reload(); } });
  resize();
  game.checkGates();
  const saved = game.state.scene;
  game._activate(saved && game.scenes[saved] && game.stageUnlocked(saved) ? saved : 'forge');
  UI.setInsight(game.state.insight);
  UI.refreshCodex(game);
  UI.syncReview(game); UI.updateReviewPrompt(game);   // schedule earned concepts; nudge if any are due
  loop.start();
  if (!game.state.introSeen) UI.showIntro(game, () => { game.state.introSeen = true; game.persist(); UI.maybeHowto(game.sceneName); });
  else UI.maybeHowto(game.sceneName);
}

boot();
window.__primordia = game;
