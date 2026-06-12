// hud.js — all DOM UI: objectives, codex, toasts, hints, intro, menu.
import { ELEMENTS, ELEMENT_LIST, el } from '../data/elements.js';
import { MOLECULES } from '../data/recipes.js';
import { unlock as audioUnlock } from '../engine/audio.js';

let G = null;
let env = null;
const $ = (id) => document.getElementById(id);
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆' };
const REVEAL_COST = 6;

function formula(f) { return Object.keys(f).map(k => k + (f[k] > 1 ? SUB[f[k]] : '')).join(''); }

export function init(game, environment) {
  G = game; env = environment;

  // tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const name = t.dataset.tab;
      if (t.classList.contains('locked')) { flashLocked(t); return; }
      G.go(name);
    });
  });

  // codex / menu open
  $('codexBtn').addEventListener('click', () => openCodex());
  $('menuBtn').addEventListener('click', () => $('menu').classList.remove('hidden'));
  $('insightBtn').addEventListener('click', () => openCodex());
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', (e) => e.target.closest('.overlay').classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) o.classList.add('hidden'); }));

  // codex tabs
  document.querySelectorAll('.ctab').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.ctab').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    renderCodexBody(c.dataset.ctab);
  }));

  // objectives toggle
  $('objToggle').addEventListener('click', () => {
    const p = $('objectives'); p.classList.toggle('collapsed');
    $('objToggle').textContent = p.classList.contains('collapsed') ? '+' : '–';
  });

  // menu controls
  const st = $('soundToggle'); st.checked = env.audioIsEnabled();
  st.addEventListener('change', () => env.setAudioEnabled(st.checked));
  $('resetBtn').addEventListener('click', () => { if (confirm('Reset all progress?')) env.resetSave(); });

  // on small screens, collapse objectives by default so they don't cover the play field
  if (window.innerWidth < 560) {
    $('objectives').classList.add('collapsed');
    $('objToggle').textContent = '+';
  }

  // intro
  if (G.state.introSeen) $('intro').classList.add('hidden');
}

export function setSceneTitle(t) { $('sceneTitle').textContent = t ? ' · ' + t : ''; renderObjectives(); }
export function setInsight(n) { $('insightVal').textContent = n; }
export function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  renderObjectives();
}

function flashLocked(t) {
  t.classList.add('shake');
  setTimeout(() => t.classList.remove('shake'), 400);
  toast(G, { kind: 'lock', title: 'Locked', sub: 'Forge Carbon, Oxygen and Nitrogen first', fact: 'The Bench needs the elements of life before you can bond them.' });
}

// ---------------- Objectives ----------------
export function refreshGoals() { renderObjectives(); }

function renderObjectives() {
  if (!G) return;
  const list = $('objList'); const title = $('objTitle');
  const scene = G.sceneName;
  list.innerHTML = '';
  if (scene === 'forge') {
    title.textContent = 'Forge the elements of life';
    ['C', 'O', 'N'].forEach(sym => list.appendChild(elemGoal(sym)));
    const bonus = ['P', 'S'].filter(s => G.hasElement(s));
    if (bonus.length) bonus.forEach(s => list.appendChild(elemGoal(s, true)));
  } else if (scene === 'bench') {
    title.textContent = 'Assemble the molecules';
    MOLECULES.forEach(m => list.appendChild(molGoal(m)));
  } else {
    title.textContent = 'Grow the world';
    const done = G.state.discoveredMolecules.length;
    const d = document.createElement('div'); d.className = 'goal world-goal';
    d.innerHTML = `<div class="goal-main"><b>${done} / ${MOLECULES.length}</b> molecules seeded</div>
      <div class="goal-sub">Discover every molecule to ready the world for life.</div>`;
    list.appendChild(d);
  }
}

function elemGoal(sym, bonus = false) {
  const has = G.hasElement(sym);
  const e = el(sym);
  const d = document.createElement('div');
  d.className = 'goal' + (has ? ' done' : '');
  d.innerHTML = `<div class="goal-dot" style="--c:${e.glow}">${has ? '✓' : ''}</div>
    <div class="goal-main">${e.name}${bonus ? ' <em>(bonus)</em>' : ''}<div class="goal-sub">${has ? e.fact : 'Fuse lighter nuclei in the Forge'}</div></div>`;
  return d;
}

function molGoal(m) {
  const has = G.hasMolecule(m.id);
  const hinted = (G.state.hintsUsed[m.id] || 0) >= 2;
  const d = document.createElement('div');
  d.className = 'goal' + (has ? ' done' : '');
  let body;
  if (has) {
    body = `<b>${m.name}</b> <span class="f">${formula(m.formula)}</span><div class="goal-sub">${m.fact}</div>`;
  } else {
    body = `<b>?  ?  ?</b>${hinted ? ` <span class="f">${formula(m.formula)}</span>` : ''}
      <div class="goal-sub riddle">“${m.riddle}”</div>`;
  }
  d.innerHTML = `<div class="goal-dot" style="--c:#8ef0d0">${has ? '✓' : '◇'}</div><div class="goal-main">${body}</div>`;
  if (!has && !hinted) {
    const btn = document.createElement('button');
    btn.className = 'hintbtn';
    btn.innerHTML = `Reveal ✦${REVEAL_COST}`;
    btn.addEventListener('click', () => {
      if (G.spend(REVEAL_COST)) {
        G.state.hintsUsed[m.id] = 2; G.persist();
        renderObjectives();
        toast(G, { kind: 'hint', title: 'Recipe revealed', sub: `${m.name} = ${formula(m.formula)}`, fact: 'Discovering it without a hint earns more respect — but the world still grows either way.' });
      } else {
        toast(G, { kind: 'lock', title: 'Not enough insight', sub: `Need ✦${REVEAL_COST}`, fact: 'Earn insight by discovering elements and molecules.' });
      }
    });
    d.appendChild(btn);
  }
  return d;
}

// ---------------- Toasts ----------------
export function toast(game, { kind, sym, mol, title, sub, fact }) {
  const wrap = $('toasts');
  const card = document.createElement('div');
  card.className = 'toast ' + kind;
  let glyph = '✦';
  let col = '#8ef0d0';
  if (kind === 'element') { glyph = sym; col = el(sym).glow; }
  else if (kind === 'molecule') { glyph = '⬡'; col = '#8ef0d0'; }
  else if (kind === 'lock') { glyph = '🔒'; col = '#ff9a8a'; }
  else if (kind === 'hint') { glyph = '✦'; col = '#ffd66b'; }
  card.style.setProperty('--c', col);
  card.innerHTML = `<div class="t-glyph">${glyph}</div>
    <div class="t-body"><div class="t-title">${title}</div>
    <div class="t-sub">${sub || ''}</div>
    <div class="t-fact">${fact || ''}</div></div>`;
  wrap.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  const kill = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); };
  card.addEventListener('click', kill);
  setTimeout(kill, 6500);
}

// ---------------- Codex ----------------
function openCodex() { $('codex').classList.remove('hidden'); renderCodexBody(document.querySelector('.ctab.active').dataset.ctab); }
export function refreshCodex() { if (!$('codex').classList.contains('hidden')) renderCodexBody(document.querySelector('.ctab.active').dataset.ctab); renderObjectives(); }

function renderCodexBody(which) {
  const body = $('codexBody'); body.innerHTML = '';
  if (which === 'elements') {
    ELEMENT_LIST.forEach(sym => {
      const e = ELEMENTS[sym]; const has = G.hasElement(sym);
      const c = document.createElement('div'); c.className = 'codex-card' + (has ? '' : ' locked');
      c.innerHTML = `<div class="cc-orb" style="--c:${e.glow};--b:${e.color}">${has ? e.sym : '?'}</div>
        <div class="cc-name">${has ? e.name : 'Undiscovered'}</div>
        <div class="cc-fact">${has ? e.fact : 'Forge it in the Stellar Forge.'}</div>`;
      body.appendChild(c);
    });
  } else {
    MOLECULES.forEach(m => {
      const has = G.hasMolecule(m.id);
      const c = document.createElement('div'); c.className = 'codex-card' + (has ? '' : ' locked');
      c.innerHTML = `<div class="cc-orb mol" >${has ? '⬡' : '?'}</div>
        <div class="cc-name">${has ? m.name + ' · ' + formula(m.formula) : 'Undiscovered'}</div>
        <div class="cc-fact">${has ? m.fact : '“' + m.riddle + '”'}</div>`;
      body.appendChild(c);
    });
  }
}

// ---------------- Intro ----------------
export function showIntro(game, done) {
  const intro = $('intro');
  intro.classList.remove('hidden');
  $('beginBtn').addEventListener('click', () => {
    audioUnlock();
    intro.classList.add('hidden');
    done && done();
  }, { once: true });
}
