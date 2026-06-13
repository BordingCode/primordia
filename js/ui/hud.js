// hud.js — all DOM UI: dynamic nav, objectives, codex, toasts, hints, intro, menu.
import { ELEMENTS, ELEMENT_LIST, el } from '../data/elements.js';
import { MOLECULES, FUSION } from '../data/recipes.js';
import { ITEMS, SYNTH, ASIDES, ENERGIES, item as synthItem, energy as energyDef } from '../data/synthesis.js';
import { LEARN } from '../data/learn.js';
import { HOWTO } from '../data/howto.js';
import { unlock as audioUnlock } from '../engine/audio.js';

let G = null, env = null;
const $ = (id) => document.getElementById(id);
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
function fsub(f) { return Object.keys(f).map(k => k + (f[k] > 1 ? SUB[f[k]] : '')).join(''); }

// ---- name/label helpers across elements, molecules, items ----
function molById(id) { return MOLECULES.find(m => m.id === id); }
function shortName(id) {
  if (ELEMENTS[id]) return ELEMENTS[id].sym;
  const m = molById(id); if (m) return fsub(m.formula);
  const it = ITEMS[id]; if (it) return it.abbr;
  return id;
}
function fullName(id) {
  if (ELEMENTS[id]) return ELEMENTS[id].name;
  const m = molById(id); if (m) return m.name;
  const it = ITEMS[id]; if (it) return it.name;
  return id;
}
function recipeFor(productId) { return SYNTH.find(r => r.product === productId); }
function revealCost(id) { const it = ITEMS[id]; if (!it) return 6; return it.kind === 'cell' ? 16 : it.kind === 'polymer' ? 12 : 8; }
function reagentText(rec) {
  return Object.entries(rec.reagents).map(([id, n]) => (n > 1 ? n + '×' : '') + shortName(id)).join(' + ');
}

export function init(game, environment) {
  G = game; env = environment;
  buildNav();

  $('codexBtn').addEventListener('click', openCodex);
  $('insightBtn').addEventListener('click', openCodex);
  $('menuBtn').addEventListener('click', () => $('menu').classList.remove('hidden'));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', (e) => e.target.closest('.overlay').classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) o.classList.add('hidden'); }));
  document.querySelectorAll('.ctab').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.ctab').forEach(x => x.classList.remove('active'));
    c.classList.add('active'); renderCodexBody(c.dataset.ctab);
  }));
  $('objToggle').addEventListener('click', () => {
    const p = $('objectives'); p.classList.toggle('collapsed');
    $('objToggle').textContent = p.classList.contains('collapsed') ? '+' : '–';
  });
  const st = $('soundToggle'); st.checked = env.audioIsEnabled();
  st.addEventListener('change', () => env.setAudioEnabled(st.checked));
  const pt = $('predictToggle');
  if (pt) {
    pt.checked = !!G.state.predictMode;
    pt.addEventListener('change', () => {
      G.state.predictMode = pt.checked; G.persist();
      if (pt.checked) flash('Predict mode on — guess the outcome before each reaction.');
    });
  }
  $('resetBtn').addEventListener('click', () => { if (confirm('Reset all progress?')) env.resetSave(); });
  $('howtoBtn').addEventListener('click', () => openHowto(G.sceneName));
  $('howtoOk').addEventListener('click', () => $('howto').classList.add('hidden'));

  if (window.innerWidth < 560) { $('objectives').classList.add('collapsed'); $('objToggle').textContent = '+'; }
  // On phones, tapping the play field auto-collapses the objectives drawer so it never
  // blocks the scene (you open it to read, then just tap to play).
  const fx = $('fx');
  if (fx) fx.addEventListener('pointerdown', () => {
    const p = $('objectives');
    if (window.innerWidth < 560 && !p.classList.contains('collapsed')) { p.classList.add('collapsed'); $('objToggle').textContent = '+'; }
  });
  if (G.state.introSeen) $('intro').classList.add('hidden');
}

function buildNav() {
  const nav = $('tabs'); nav.innerHTML = '';
  G.STAGES.forEach(s => {
    const b = document.createElement('button');
    b.className = 'tab'; b.dataset.tab = s.id;
    b.innerHTML = `<span class="ico">${s.ico}</span><span>${s.label}</span>`;
    b.addEventListener('click', () => {
      if (b.classList.contains('locked')) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); flash('Locked — keep building to unlock'); return; }
      G.go(s.id);
    });
    nav.appendChild(b);
  });
}

export function setSceneTitle(t) { $('sceneTitle').textContent = t ? ' · ' + t : ''; renderObjectives(); }
export function setInsight(n) { $('insightVal').textContent = n; }
export function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  renderObjectives();
}

// ---------------- How-it-works guide ----------------
export function openHowto(scene) {
  const h = HOWTO[scene]; if (!h) return;
  $('howtoTitle').textContent = h.title;
  const steps = h.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span><span>${s}</span></li>`).join('');
  $('howtoBody').innerHTML = `<p class="howto-intro">${h.intro}</p><ol class="howto-steps">${steps}</ol>`
    + (h.tip ? `<p class="howto-tip"><b>Tip:</b> ${h.tip}</p>` : '');
  $('howto').classList.remove('hidden');
}
// Auto-show the guide the first time a stage is entered (once the intro is gone).
export function maybeHowto(scene) {
  if (!HOWTO[scene]) return;
  if ($('intro') && !$('intro').classList.contains('hidden')) return; // wait until intro dismissed
  if (G.state.howtoSeen[scene]) return;
  G.state.howtoSeen[scene] = true; G.persist();
  openHowto(scene);
}

// transient top banner
export function flash(msg) {
  let f = $('flash');
  if (!f) { f = document.createElement('div'); f.id = 'flash'; document.getElementById('stage').appendChild(f); }
  f.textContent = msg; f.classList.add('show');
  clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove('show'), 2600);
}

// ---------------- Objectives ----------------
export function refreshGoals() { renderObjectives(); }
function renderObjectives() {
  if (!G) return;
  const list = $('objList'), title = $('objTitle');
  list.innerHTML = '';
  const scene = G.sceneName;
  if (scene === 'forge') {
    title.textContent = 'Forge the elements of life';
    ['C', 'O', 'N'].forEach(s => list.appendChild(elemGoal(s)));
    ['P', 'S'].forEach(s => list.appendChild(elemGoal(s, true)));
  } else if (scene === 'bench') {
    title.textContent = 'Bond the first molecules';
    MOLECULES.forEach(m => list.appendChild(molGoal(m)));
  } else if (scene === 'lab') {
    title.textContent = G.hasItem('membrane') || G.hasItem('rna') || G.hasItem('protein')
      ? 'Assemble the parts of life' : 'Brew the building blocks';
    SYNTH.forEach(rec => list.appendChild(productGoal(rec)));
  } else if (scene === 'cell') {
    title.textContent = 'Kindle the first life';
    list.appendChild(cellGoal());
  } else {
    title.textContent = 'Grow a living world';
    list.appendChild(worldGoal());
  }
}

// ---- recipe strings (only shown after a paid Reveal, inside the Learn modal) ----
function atomBreakdown(formula) {
  return Object.entries(formula).map(([s, n]) => (n > 1 ? n + '× ' : '') + s).join(' + ');
}
function fusionRecipeStr(sym) {
  const r = FUSION.find(f => f.out === sym); if (!r) return null;
  const counts = {}; r.in.forEach(s => counts[s] = (counts[s] || 0) + 1);
  return Object.entries(counts).map(([s, n]) => (n > 1 ? n + '× ' : '') + ELEMENTS[s].name).join(' + ') + '  ·  in the star’s core';
}
function productRecipeStr(rec) {
  const en = energyDef(rec.energy);
  return reagentText(rec) + (rec.energy === 'none' ? '  ·  no energy needed' : `  ·  ${en.glyph} ${en.name}`);
}

// A free "Learn" button that opens the help modal (teaches; reveal is a deeper paid step).
function learnButton(opts) {
  const btn = document.createElement('button');
  btn.className = 'learnbtn'; btn.innerHTML = 'Learn';
  btn.addEventListener('click', () => openHelp(opts));
  return btn;
}

// The help modal: shows the riddle + an educational hint for free; the exact recipe is a
// separate, optional paid reveal — so you can learn about a challenge without it being solved for you.
function openHelp(opts) {
  const body = $('learnBody');
  function render() {
    const hinted = opts.id ? (G.state.hintsUsed[opts.id] || 0) >= 2 : false;
    let html = '';
    if (opts.riddle) html += `<p class="learn-riddle">“${opts.riddle}”</p>`;
    html += `<p class="learn-text">${opts.learn}</p>`;
    if (opts.recipe) {
      if (hinted) html += `<div class="learn-recipe"><span>Recipe</span><b>${opts.recipe}</b></div>`;
      else html += `<button class="reveal-btn" id="doReveal">Reveal the exact recipe · ✦${opts.cost}</button>
        <p class="learn-foot">Try to work it out first — a hint-free solve is its own reward.</p>`;
    }
    body.innerHTML = html;
    const rb = document.getElementById('doReveal');
    if (rb) rb.addEventListener('click', () => {
      if (G.spend(opts.cost)) { G.state.hintsUsed[opts.id] = 2; G.persist(); render(); renderObjectives(); }
      else flash(`Not enough insight (✦${opts.cost})`);
    });
  }
  render();
  $('learn').classList.remove('hidden');
}

function elemGoal(sym, bonus = false) {
  const has = G.hasElement(sym), e = el(sym);
  const d = document.createElement('div'); d.className = 'goal' + (has ? ' done' : '');
  d.innerHTML = `<div class="goal-dot" style="--c:${e.glow}">${has ? '✓' : ''}</div>
    <div class="goal-main">${e.name}${bonus ? ' <em>(bonus)</em>' : ''}<div class="goal-sub">${has ? e.fact : 'Forge it from lighter nuclei'}</div></div>`;
  if (!has && LEARN[sym]) d.appendChild(learnButton({ riddle: null, learn: LEARN[sym], recipe: fusionRecipeStr(sym), cost: 6, id: 'el_' + sym }));
  return d;
}

function genericGoal({ has, hinted, name, formula, fact, riddle, dotColor, locked, lockedText, help }) {
  const d = document.createElement('div');
  d.className = 'goal' + (has ? ' done' : '') + (locked ? ' locked-goal' : '');
  let body;
  if (has) body = `<b>${name}</b>${formula ? ` <span class="f">${formula}</span>` : ''}<div class="goal-sub">${fact}</div>`;
  else if (locked) body = `<b>? ? ?</b><div class="goal-sub">${lockedText}</div>`;
  else body = `<b>? ? ?</b>${hinted ? ` <span class="f">${formula || riddle}</span>` : ''}<div class="goal-sub riddle">“${riddle}”</div>`;
  d.innerHTML = `<div class="goal-dot" style="--c:${dotColor}">${has ? '✓' : locked ? '🔒' : '◇'}</div><div class="goal-main">${body}</div>`;
  if (!has && help) d.appendChild(learnButton(help));
  return d;
}

function molGoal(m) {
  const has = G.hasMolecule(m.id), hinted = (G.state.hintsUsed[m.id] || 0) >= 2;
  return genericGoal({
    has, hinted, name: m.name, formula: fsub(m.formula), fact: m.fact, riddle: m.riddle, dotColor: '#8ef0d0',
    help: { riddle: m.riddle, learn: LEARN[m.id], recipe: atomBreakdown(m.formula), cost: 6, id: m.id },
  });
}

function productGoal(rec) {
  const it = synthItem(rec.product);
  const has = G.hasItem(rec.product);
  const prereqMet = Object.keys(rec.reagents).every(id => G.has(id));
  const hinted = (G.state.hintsUsed[rec.product] || 0) >= 2;
  const cost = revealCost(rec.product);
  return genericGoal({
    has, hinted, name: it.name, formula: it.formula || it.abbr, fact: it.fact, riddle: it.riddle,
    dotColor: it.color, locked: !has && !prereqMet, lockedText: 'Discover its ingredients first',
    help: { riddle: it.riddle, learn: LEARN[rec.product], recipe: productRecipeStr(rec), cost, id: rec.product },
  });
}

function cellGoal() {
  const d = document.createElement('div');
  const n = (G.scenes.cell && G.scenes.cell.cells) ? G.scenes.cell.cells.filter(c => !c.dead).length : 0;
  const target = G.scenes.cell ? G.scenes.cell.TARGET : 8;
  const done = G.state.colonyReached;
  d.className = 'goal' + (done ? ' done' : '');
  d.innerHTML = `<div class="goal-dot" style="--c:#a8ffe0">${done ? '✓' : '◇'}</div>
    <div class="goal-main"><b>Grow a colony</b> <span class="f">${Math.min(n, target)}/${target}</span>
    <div class="goal-sub">Feed your protocell so it grows and divides. If its energy runs out, it dies. Reach ${target} living cells to seed the world.</div></div>`;
  if (!done) d.appendChild(learnButton({ learn: LEARN.cell }));
  return d;
}
function worldGoal() {
  const d = document.createElement('div'); d.className = 'goal world-goal';
  const begun = G.state.lifeBegun;
  d.innerHTML = `<div class="goal-main"><b>${begun ? 'Life has taken hold' : 'A world awaiting life'}</b>
    <div class="goal-sub">${begun ? 'Guide photosynthesis and watch the world green and breathe.' : 'Seed your protocell colony to bring the planet alive.'}</div></div>`;
  d.appendChild(learnButton({ learn: LEARN.world }));
  return d;
}

// ---------------- Toasts ----------------
export function toast(game, { kind, sym, item: itm, title, sub, fact }) {
  const wrap = $('toasts');
  const card = document.createElement('div'); card.className = 'toast ' + kind;
  let glyph = '✦', col = '#8ef0d0';
  if (kind === 'element') { glyph = sym; col = el(sym).glow; }
  else if (kind === 'molecule') { glyph = '⬡'; col = '#8ef0d0'; }
  else if (kind === 'item') { const it = ITEMS[itm]; glyph = it.abbr.length <= 3 ? it.abbr : '✦'; col = it.color; }
  else if (kind === 'lock') { glyph = '🔒'; col = '#ff9a8a'; }
  else if (kind === 'hint') { glyph = '✦'; col = '#ffd66b'; }
  else if (kind === 'fail') { glyph = '⚐'; col = '#ff9a8a'; }
  card.style.setProperty('--c', col);
  card.innerHTML = `<div class="t-glyph">${glyph}</div><div class="t-body"><div class="t-title">${title}</div>
    <div class="t-sub">${sub || ''}</div><div class="t-fact">${fact || ''}</div></div>`;
  wrap.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  const kill = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); };
  card.addEventListener('click', kill);
  setTimeout(kill, kind === 'fail' ? 3800 : 6500);
}

// ---------------- Codex ----------------
function openCodex() { $('codex').classList.remove('hidden'); renderCodexBody(document.querySelector('.ctab.active').dataset.ctab); }
export function refreshCodex() { const c = $('codex'); if (c && !c.classList.contains('hidden')) renderCodexBody(document.querySelector('.ctab.active').dataset.ctab); renderObjectives(); }

function renderCodexBody(which) {
  const body = $('codexBody'); body.innerHTML = '';
  if (which === 'elements') {
    ELEMENT_LIST.forEach(sym => {
      const e = ELEMENTS[sym], has = G.hasElement(sym);
      body.appendChild(codexCard(has, has ? e.sym : '?', has ? e.name : 'Undiscovered', has ? e.fact : 'Forge it in the Stellar Forge.', e.glow, e.color));
    });
  } else if (which === 'molecules') {
    MOLECULES.forEach(m => {
      const has = G.hasMolecule(m.id);
      body.appendChild(codexCard(has, '⬡', has ? m.name + ' · ' + fsub(m.formula) : 'Undiscovered', has ? m.fact : '“' + m.riddle + '”', '#3ff0c8', '#3ff0c8'));
    });
  } else if (which === 'curiosities') {
    const found = G.state.asidesFound.length, total = ASIDES.length, exp = G.state.experiments || 0;
    const meter = document.createElement('p'); meter.className = 'codex-meter';
    meter.innerHTML = `<b>${exp}</b> ${exp === 1 ? 'experiment' : 'experiments'} run · <b>${found}/${total}</b> curiosities found.<br/>
      <span class="dim">Real reactions off the path to life — found only by experimenting in the Lab.</span>`;
    body.appendChild(meter);
    ASIDES.forEach(r => {
      const it = ITEMS[r.product], has = G.hasAside(r.product);
      body.appendChild(codexCard(has, has ? (it.abbr.length <= 3 ? it.abbr : '✦') : '?', has ? it.name + (it.formula ? ' · ' + it.formula : '') : 'Undiscovered curiosity', has ? it.fact : 'Stumble onto it by combining things the recipes never asked for.', it.color, it.color));
    });
  } else {
    Object.values(ITEMS).forEach(it => {
      if (it.kind === 'aside') return;            // curiosities live in their own tab
      const has = G.hasItem(it.id);
      body.appendChild(codexCard(has, has ? (it.abbr.length <= 3 ? it.abbr : '✦') : '?', has ? it.name + (it.formula ? ' · ' + it.formula : '') : 'Undiscovered', has ? it.fact : '“' + it.riddle + '”', it.color, it.color));
    });
  }
}
function codexCard(has, glyph, name, fact, glow, base) {
  const c = document.createElement('div'); c.className = 'codex-card' + (has ? '' : ' locked');
  c.innerHTML = `<div class="cc-orb" style="--c:${glow};--b:${base}">${glyph}</div>
    <div class="cc-name">${name}</div><div class="cc-fact">${fact}</div>`;
  return c;
}

// ---------------- Predict-then-test ----------------
// Opt-in. Before a reaction resolves, the player guesses the outcome; lab.js compares.
export function openPredict(game, onPick) {
  const ov = $('predict'), body = $('predictBody');
  if (!ov || !body) { onPick(null); return; }
  body.innerHTML = '';
  const known = [];
  game.state.discoveredItems.forEach(id => { if (ITEMS[id]) known.push(ITEMS[id]); });
  game.state.asidesFound.forEach(id => { if (ITEMS[id]) known.push(ITEMS[id]); });
  const grid = document.createElement('div'); grid.className = 'predict-grid';
  const pick = (id) => { ov.classList.add('hidden'); onPick(id); };
  known.forEach(it => {
    const b = document.createElement('button'); b.className = 'predict-chip';
    b.style.setProperty('--c', it.color);
    b.innerHTML = `<span class="pc-abbr">${it.abbr}</span><span class="pc-name">${it.name}</span>`;
    b.addEventListener('click', () => pick(it.id));
    grid.appendChild(b);
  });
  const none = document.createElement('button'); none.className = 'predict-chip none';
  none.innerHTML = `<span class="pc-abbr">∅</span><span class="pc-name">Nothing</span>`;
  none.addEventListener('click', () => pick('nothing'));
  grid.appendChild(none);
  body.appendChild(grid);
  const skip = document.createElement('button'); skip.className = 'predict-skip';
  skip.textContent = 'Not sure — just react';
  skip.addEventListener('click', () => pick(null));
  body.appendChild(skip);
  ov.classList.remove('hidden');
}

// ---------------- Intro ----------------
export function showIntro(game, done) {
  const intro = $('intro'); intro.classList.remove('hidden');
  $('beginBtn').addEventListener('click', () => { audioUnlock(); intro.classList.add('hidden'); done && done(); }, { once: true });
}
