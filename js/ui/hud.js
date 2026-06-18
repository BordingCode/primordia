// hud.js — all DOM UI: dynamic nav, objectives, codex, toasts, hints, intro, menu.
import { ELEMENTS, ELEMENT_LIST, el } from '../data/elements.js';
import { MOLECULES, FUSION } from '../data/recipes.js';
import { ITEMS, SYNTH, ASIDES, ENERGIES, item as synthItem, energy as energyDef } from '../data/synthesis.js';
import { LEARN } from '../data/learn.js';
import { HOWTO } from '../data/howto.js';
import { QUIZ, QUIZ_ORDER } from '../data/quiz.js';
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
  $('menuBtn').addEventListener('click', () => {
    $('reviewBtn').classList.toggle('hidden', !hasReview(game));
    $('reviewBtn').textContent = dueCount(game) > 0 ? `✦ Review what you’ve learned (${dueCount(game)} due)` : '✦ Review what you’ve learned';
    $('menu').classList.remove('hidden');
  });
  $('reviewBtn').addEventListener('click', () => { $('menu').classList.add('hidden'); showReview(game, () => updateReviewPrompt(game), false); });
  $('reviewPrompt').addEventListener('click', () => showReview(game, () => updateReviewPrompt(game), true));
  const mt = $('motionToggle');
  if (mt) { mt.checked = !!G.state.reduceMotion;
    mt.addEventListener('change', () => { G.state.reduceMotion = mt.checked; G.persist(); if (env.setReduceMotion) env.setReduceMotion(mt.checked); });
    if (env.setReduceMotion) env.setReduceMotion(G.state.reduceMotion); }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', (e) => e.target.closest('.overlay').classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o && o.id !== 'quiz') o.classList.add('hidden'); }));
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
      if (pt.checked) flash('Reason mode on — work out the energy each reaction needs.');
    });
  }
  const sb = $('sandboxBtn');
  if (sb) {
    renderSandboxBtn();
    sb.addEventListener('click', () => {
      if (!G.state.sandboxUnlocked) {
        if (G.unlockSandbox()) flash('Sandbox unlocked — toggle it on any time.');
        else { flash(`Need ✦${G.SANDBOX_COST} insight to unlock Sandbox`); return; }
      } else {
        G.setSandbox(!G.state.sandbox);
        flash(G.state.sandbox ? 'Sandbox ON — every stage & ingredient open' : 'Sandbox off — back to the journey');
      }
      renderSandboxBtn();
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
function renderSandboxBtn() {
  const sb = $('sandboxBtn'); if (!sb || !G) return;
  if (!G.state.sandboxUnlocked) sb.textContent = `Unlock Sandbox · ✦${G.SANDBOX_COST}`;
  else sb.textContent = G.state.sandbox ? 'Sandbox mode: ON' : 'Sandbox mode: OFF';
  sb.classList.toggle('on', !!G.state.sandbox);
}
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
  const wrap = $('toasts');
  let f = $('flash');
  if (!f) { f = document.createElement('div'); f.id = 'flash'; }
  f.textContent = msg;
  const rp = wrap.querySelector('#reviewPrompt');        // stack below toasts but above the review pill
  if (rp) wrap.insertBefore(f, rp);
  else if (f.parentElement !== wrap) wrap.appendChild(f);
  requestAnimationFrame(() => f.classList.add('show'));
  // Like the Lab toasts: scale the on-screen time to how much there is to read, so the long
  // story beats (the Great Oxygenation, the lineage) aren't gone before a kid finishes them.
  const words = String(msg).trim().split(/\s+/).length;
  const dwell = Math.min(13000, Math.max(3000, 1600 + words * 480));
  clearTimeout(f._t);
  f._t = setTimeout(() => { f.classList.remove('show'); setTimeout(() => { if (f.parentElement) f.remove(); }, 380); }, dwell);
}

// ---------------- conceptual quiz + spaced review ----------------
// Distractors are real, documented misconceptions; answering either way shows a one-line "why".
// Powers BOTH the after-stage quick-check and the spaced review (spacing + retrieval + interleaving).
const DAY = 86400000;
const REVIEW_DAYS = [1, 3, 7, 14, 30, 90];      // Leitner-style widening intervals
function rShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function reviewPool(game) {
  const out = [];
  QUIZ_ORDER.forEach(sid => { if (game.state.quizSeen[sid] && QUIZ[sid]) QUIZ[sid].forEach((q, qi) => out.push({ ...q, cardId: sid + '#' + qi, stage: sid })); });
  return out;
}
export function syncReview(game) {
  let changed = false;
  reviewPool(game).forEach(c => { if (!game.state.review[c.cardId]) { game.state.review[c.cardId] = { box: 0, due: Date.now() + DAY }; changed = true; } });
  if (changed) game.persist();
}
export function dueCount(game) { const now = Date.now(); return reviewPool(game).filter(c => (game.state.review[c.cardId] ? game.state.review[c.cardId].due : Infinity) <= now).length; }
export function hasReview(game) { return reviewPool(game).length > 0; }
function gradeCard(game, cardId, correct) {
  const r = game.state.review[cardId] || { box: 0, due: 0 };
  r.box = correct ? Math.min(r.box + 1, REVIEW_DAYS.length - 1) : Math.max(0, r.box - 1);
  r.due = Date.now() + REVIEW_DAYS[r.box] * DAY;
  game.state.review[cardId] = r; game.persist();
}

function runQuestions(game, items, onDone, { head, reward, review }) {
  const ov = $('quiz'); let i = 0;
  function renderQ() {
    const item = items[i];
    $('quizHead').textContent = head;
    $('quizProg').textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
    $('quizQ').textContent = item.q;
    const why = $('quizWhy'); why.classList.add('hidden'); why.classList.remove('ok');
    const next = $('quizNext'); next.classList.add('hidden');
    const box = $('quizOpts'); box.innerHTML = '';
    rShuffle(item.options.slice()).forEach(opt => {
      const b = document.createElement('button'); b.className = 'quiz-opt'; b.textContent = opt.t; b._opt = opt;
      b.addEventListener('click', () => answer(item, opt, box, why, next), { once: true });
      box.appendChild(b);
    });
    ov.classList.remove('hidden');
  }
  function answer(item, opt, box, why, next) {
    const correctOpt = item.options.find(o => o.correct);
    [...box.children].forEach(b => { b.disabled = true; const o = b._opt;
      if (o.correct) b.classList.add('correct'); else if (o === opt) b.classList.add('wrong'); else b.classList.add('dim'); });
    if (opt.correct) { game.award(reward); game.sfx && game.sfx.pickup && game.sfx.pickup(); } else game.sfx && game.sfx.reject && game.sfx.reject();
    if (review && item.cardId) gradeCard(game, item.cardId, !!opt.correct);
    why.innerHTML = (opt.correct ? '✓ ' : '') + (opt.why || (correctOpt && correctOpt.why) || '');
    why.classList.toggle('ok', !!opt.correct); why.classList.remove('hidden');
    next.textContent = i < items.length - 1 ? 'Next ›' : (review ? 'Done ›' : 'Onward ›');
    next.classList.remove('hidden');
    next.onclick = () => { i++; if (i < items.length) renderQ(); else { ov.classList.add('hidden'); onDone && onDone(); } };
  }
  renderQ();
}

// fire a stage's quick-check once, when that stage is completed
export function maybeQuiz(game, stageId, onDone) {
  if (game.state.quizSeen[stageId] || !QUIZ[stageId]) { onDone && onDone(); return; }
  game.state.quizSeen[stageId] = true; game.persist();
  runQuestions(game, QUIZ[stageId].map(q => ({ ...q })), () => { syncReview(game); updateReviewPrompt(game); onDone && onDone(); },
    { head: QUIZ[stageId].length > 1 ? 'Quick check' : 'One quick check', reward: 6, review: false });
}

// a one-off "diagnose the symptom" question (used by the Cell stage to make you DEDUCE
// which invention a failure mode needs, rather than reading it off the buttons)
export function askDiagnosis(game, item, onDone) {
  runQuestions(game, [item], onDone, { head: 'Diagnose your cell', reward: 5, review: false });
}

// spaced, INTERLEAVED retrieval of earlier concepts (mix stages, shuffle options)
export function showReview(game, onDone, onlyDue = false) {
  const now = Date.now();
  let pool = reviewPool(game).map(c => ({ ...c, _due: game.state.review[c.cardId] ? game.state.review[c.cardId].due : 0 }));
  if (onlyDue) pool = pool.filter(c => c._due <= now);
  pool.sort((a, b) => a._due - b._due);
  const items = rShuffle(pool.slice(0, 6));
  if (!items.length) { onDone && onDone(); return; }
  runQuestions(game, items, () => { updateReviewPrompt(game); flash('Nice — those ideas are a little sharper now.'); onDone && onDone(); }, { head: 'Review what you’ve learned', reward: 4, review: true });
}

let _revTimer = null;
export function updateReviewPrompt(game) {
  const n = dueCount(game), el = $('reviewPrompt'); if (!el) return;
  $('menuBtn').classList.toggle('has-due', n > 0);
  clearTimeout(_revTimer);
  if (n === 0) { el.classList.add('hidden'); return; }
  el.textContent = `✦ ${n} to review ›`;
  $('toasts').appendChild(el);          // sit at the bottom of the toast column — never over a toast/flash or the panel
  el.classList.remove('hidden');
  _revTimer = setTimeout(() => el.classList.add('hidden'), 6500);
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
    renderLabObjectives(list);
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

// ---- Lab: deduce-it-yourself ----
// No spelled-out checklist of every product. You see the broad goal, a discovery counter, and a
// RECORD of what you've already made — then you experiment to find the rest. The Lab's "wrong
// energy / something's missing" feedback is the teacher. A pull-only "Stuck?" button gives a hint
// toward the next reaction you can actually run, so nobody is ever hard-stuck.
function renderLabObjectives(list) {
  const total = SYNTH.length;
  const found = SYNTH.filter(r => G.hasItem(r.product)).length;

  const head = document.createElement('div'); head.className = 'goal world-goal';
  head.innerHTML = `<div class="goal-main"><b>${found} / ${total} building blocks discovered</b>
    <div class="goal-sub">No recipe list — experiment. Load reagents, choose an energy, and react. The same ingredients react differently (or not at all) under different energy; the Lab tells you when you're close.</div></div>`;
  list.appendChild(head);

  // a record of what you've already discovered (most recent first), so progress is felt
  const discovered = SYNTH.filter(r => G.hasItem(r.product));
  discovered.reverse().forEach(rec => list.appendChild(discoveredRecord(rec)));

  // pull-only hint toward the next reaction whose ingredients you already possess
  const next = SYNTH.find(r => !G.hasItem(r.product) && Object.keys(r.reagents).every(id => G.has(id)));
  const wrap = document.createElement('div'); wrap.className = 'goal world-goal';
  const main = document.createElement('div'); main.className = 'goal-main';
  if (next) {
    main.innerHTML = `<b>Stuck?</b><div class="goal-sub">Pull a hint toward a reaction you could run right now — or keep experimenting.</div>`;
    wrap.appendChild(main);
    const btn = document.createElement('button'); btn.className = 'learnbtn';
    btn.textContent = 'Get a hint';
    btn.addEventListener('click', () => {
      const it = synthItem(next.product);
      openHelp({ riddle: it.riddle, learn: LEARN[next.product], recipe: productRecipeStr(next), cost: revealCost(next.product), id: next.product });
    });
    wrap.appendChild(btn);
  } else if (found < total) {
    main.innerHTML = `<b>Keep building</b><div class="goal-sub">No new reaction is within reach yet — discover more molecules and blocks first to open the next ones.</div>`;
    wrap.appendChild(main);
  } else {
    main.innerHTML = `<b>Every building block found!</b><div class="goal-sub">You've discovered all of them — on to the Cell.</div>`;
    wrap.appendChild(main);
  }
  list.appendChild(wrap);
}

function discoveredRecord(rec) {
  const it = synthItem(rec.product);
  const d = document.createElement('div'); d.className = 'goal done';
  const f = it.formula || (it.abbr && it.abbr.length <= 4 ? it.abbr : '');
  d.innerHTML = `<div class="goal-dot" style="--c:${it.color}">✓</div>
    <div class="goal-main"><b>${it.name}</b>${f ? ` <span class="f">${f}</span>` : ''}
    <div class="goal-sub">${it.fact}</div></div>`;
  return d;
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
// Kept SHORT on purpose: title + a one-line sub + an optional single "spark" hook. The full
// science fact lives in the Codex (pull-depth) and the big hero reveal shows the picture — so a
// toast is a glance, not a wall of text both a 6-yo and a 16-yo would skip. (`sub` for hints may
// still carry a sentence of coaching.)
export function toast(game, { kind, sym, item: itm, title, sub, spark }) {
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
  // The fail/hint toasts ARE the lesson — they coach you toward the answer. Give them long
  // enough to actually read AND think, and flag that you can tap to clear them early.
  const coaching = kind === 'fail' || kind === 'hint';
  card.innerHTML = `<div class="t-glyph">${glyph}</div><div class="t-body"><div class="t-title">${title}</div>
    <div class="t-sub">${sub || ''}</div>${spark ? `<div class="t-fact">${spark}</div>` : ''}${
      coaching ? `<div class="t-dismiss">tap to dismiss</div>` : ''}</div>`;
  const anchor = wrap.querySelector('#flash') || wrap.querySelector('#reviewPrompt'); // keep toasts above flash & review pill
  if (anchor) wrap.insertBefore(card, anchor); else wrap.appendChild(card);
  requestAnimationFrame(() => card.classList.add('show'));
  const kill = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); };
  card.addEventListener('click', kill);
  // Scale the on-screen time to how much there is to read (a kid reading + thinking is slow).
  const words = `${title} ${sub || ''} ${spark || ''}`.trim().split(/\s+/).length;
  const dwell = coaching
    ? Math.min(16000, Math.max(7000, 2200 + words * 600))   // coaching: 7s floor, generous
    : Math.min(8000, Math.max(4000, 1500 + words * 380));   // glance toasts: snappy
  setTimeout(kill, dwell);
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
export function openPredict(game, actual, onPick) {
  const ov = $('predict'), body = $('predictBody');
  if (!ov || !body) { onPick(null); return; }
  body.innerHTML = '';
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  // multiple choice: the real answer (if any) + a few decoys you've already met, then "Nothing".
  // Never spoil an undiscovered product by name — if you haven't met it, it shows as a masked
  // "Something new" chip (id 'actual', resolved as correct in lab.js) instead of its real name.
  const discovered = new Set([...game.state.discoveredItems, ...game.state.asidesFound]);
  const knownIds = [...discovered].filter(id => ITEMS[id]);
  const decoys = shuffle(knownIds.filter(id => id !== actual)).slice(0, 3);
  const realKnown = actual && actual !== 'nothing' && ITEMS[actual] && discovered.has(actual);
  const choiceIds = [];
  if (realKnown) choiceIds.push(actual);
  decoys.forEach(d => { if (!choiceIds.includes(d)) choiceIds.push(d); });
  // if the real product is undiscovered, offer a masked chip that still counts as correct
  if (actual && actual !== 'nothing' && !realKnown) choiceIds.push('actual');
  shuffle(choiceIds);
  const grid = document.createElement('div'); grid.className = 'predict-grid';
  const pick = (id) => { ov.classList.add('hidden'); onPick(id); };
  choiceIds.forEach(id => {
    const masked = id === 'actual';
    const it = masked ? null : ITEMS[id];
    const b = document.createElement('button'); b.className = 'predict-chip';
    b.style.setProperty('--c', masked ? '#9fd0ff' : it.color);
    b.innerHTML = masked
      ? `<span class="pc-abbr">???</span><span class="pc-name">Something new</span>`
      : `<span class="pc-abbr">${it.abbr}</span><span class="pc-name">${it.name}</span>`;
    b.addEventListener('click', () => pick(id));
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

// Reason-then-test: instead of guessing the product's NAME (luck), you commit to the CONDITION —
// which energy these reagents need. That's the actual lesson ("conditions decide the outcome").
export function openEnergyPredict(game, onPick) {
  const ov = $('predict'), body = $('predictBody');
  if (!ov || !body) { onPick(null); return; }
  const h = ov.querySelector('.sheet-head h2'); if (h) h.textContent = 'What will make these react?';
  const lede = ov.querySelector('.predict-lede');
  if (lede) lede.textContent = 'Reason out the conditions — which energy do these ingredients need? A right call earns insight.';
  body.innerHTML = '';
  const grid = document.createElement('div'); grid.className = 'predict-grid';
  ENERGIES.forEach(e => {
    const b = document.createElement('button'); b.className = 'predict-chip';
    b.style.setProperty('--c', e.color);
    b.innerHTML = `<span class="pc-abbr">${e.glyph}</span><span class="pc-name">${e.name}</span>`;
    b.addEventListener('click', () => { ov.classList.add('hidden'); onPick(e.id); });
    grid.appendChild(b);
  });
  body.appendChild(grid);
  const skip = document.createElement('button'); skip.className = 'predict-skip';
  skip.textContent = 'Not sure — just react with the current energy';
  skip.addEventListener('click', () => { ov.classList.add('hidden'); onPick(null); });
  body.appendChild(skip);
  ov.classList.remove('hidden');
}

// ---------------- Finale: your journey (synthesis the PLAYER assembles) ----------------
// The one moment the whole game connects into a STORY the player can RETELL — not by READING a
// pre-written recap, but by re-deriving it with their own hands. The player taps their own
// discovered items in order (H → C/N/O → molecules → blocks → RNA/membrane → protocell → world).
// Each correct tap draws ONE connector and reveals the one-line "because…" link between stages.
// The chain is BUILT from the real FUSION + MOLECULES + SYNTH tables, using only what the player
// actually discovered — so the spine (each stage's product is the next stage's input) is ENACTED,
// not narrated. A wrong/early tap gently no-ops with a "what came before this?" nudge (never a
// punishment), and after a pause an "Assemble it for me" fallback finishes the chain for anyone
// who just wants to watch — so it's never a wall.

// Build the ordered spine of nodes from the player's real discoveries. Each node carries the
// "because" line that justifies WHY it followed from the node before it (sourced from the data
// tables wherever possible). Optional nodes are skipped if the player never found them, so the
// chain is honestly THEIRS.
function buildLineageNodes(game) {
  const nodes = [];
  const has = (id) => game.has(id);
  // 1. the seed — always there
  nodes.push({ glyph: 'H', label: 'Hydrogen', color: '#bfffe6',
    because: 'You began with the simplest, oldest atom in the universe.' });
  // 2. fusion: the atoms of life, in the order the star forges them (skip any not discovered)
  const fusedOrder = [
    { sym: 'He', because: 'Hydrogen nuclei fused, step by step, into helium — the reaction that powers the Sun.' },
    { sym: 'C',  because: 'Three helium nuclei collided to make carbon — life’s backbone atom.' },
    { sym: 'O',  because: 'Carbon captured another helium to become oxygen — the breath of life.' },
    { sym: 'N',  because: 'Carbon burning hydrogen forged nitrogen, too — the atom every protein needs.' },
  ];
  fusedOrder.forEach(f => { if (game.hasElement(f.sym)) nodes.push({ glyph: f.sym, label: ELEMENTS[f.sym].name, color: ELEMENTS[f.sym].glow, because: f.because }); });
  // 3. molecules: fill every bond. Show the early-air/ocean ones the later steps actually use.
  const molOrder = [
    { id: 'H2O', because: 'You filled oxygen’s bonds with two hydrogens — water, the cradle of all chemistry.' },
    { id: 'CH4', because: 'Carbon took four hydrogens — methane, a brick of the primordial air.' },
    { id: 'NH3', because: 'Nitrogen took three hydrogens — ammonia, life’s only usable nitrogen.' },
    { id: 'CO2', because: 'Carbon and oxygen made CO₂ — the raw carbon the soup will build from.' },
  ];
  molOrder.forEach(m => { if (game.hasMolecule(m.id)) { const mol = molById(m.id); nodes.push({ glyph: '⬡', label: mol.name, color: '#8ef0d0', because: m.because }); } });
  // 4. building blocks & polymers: the spine from soup → genetic letter → self-copying thread,
  //    and the lipids → wall branch. Each "because" is the real reaction that made it.
  const blockOrder = [
    { id: 'HCN',        because: 'A lightning spark through methane and ammonia bred hydrogen cyanide — the feedstock of the genetic code.' },
    { id: 'glycine',    because: 'That same spark through the early air forged glycine — the first amino acid (Miller–Urey, 1953).' },
    { id: 'adenine',    because: 'Five HCN, warmed, condensed into adenine — a letter of the genetic code (Oró, 1961).' },
    { id: 'ribose',    because: 'UV-made formaldehyde, warmed, coiled into ribose — the sugar that backbones RNA.' },
    { id: 'phosphate',  because: 'Phosphorus took on oxygen to become phosphate — RNA’s backbone and life’s battery.' },
    { id: 'nucleotide', because: 'Sugar, base and phosphate clasped into a nucleotide — a single letter, ready to write.' },
    { id: 'rna',        because: 'You strung the letters into RNA — one thread that carries the message AND copies itself.' },
    { id: 'protein',    because: 'Amino acids linked into a protein — the cell’s machines and catalysts.' },
    { id: 'fatty_acid', because: 'Carbon chains grew long in a vent’s heat — fatty acids, one end loving water, one fleeing it.' },
    { id: 'membrane',   because: 'In water the fatty acids wrapped themselves into a membrane — life’s very first wall.' },
  ];
  blockOrder.forEach(b => { if (has(b.id)) { const it = ITEMS[b.id]; nodes.push({ glyph: it.abbr && it.abbr.length <= 3 ? it.abbr : '✦', label: it.name, color: it.color, because: b.because }); } });
  // 5. protocell + world — the threshold, and what it became
  if (has('protocell')) nodes.push({ glyph: '⬭', label: 'Protocell', color: '#a8ffe0',
    because: 'A membrane sealed RNA and proteins inside — and you kept a colony alive: the first life.' });
  nodes.push({ glyph: '🌍', label: 'A living world', color: '#9fe6ff',
    because: 'Life spread, breathed out oxygen, survived its own poison, and inherited the Earth.' });
  return nodes;
}

const LINEAGE_END = 'From a single atom of hydrogen, by your own hand — you built a living world. That may be how life really began.';

export function showLineage() {
  const ov = $('lineage'), chain = $('lineageChain'), nextBtn = $('lineageNext');
  if (!ov || !chain || !nextBtn) return;
  const nodes = buildLineageNodes(G);
  const reduced = !!(G && G.state && G.state.reduceMotion)
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);

  chain.innerHTML = '';
  let placed = 0;          // how many nodes are confirmed into the assembled chain
  let autoTimer = null;
  let autoMode = false;    // true while "assemble for me" is running the chain itself

  // the assembled chain (top) — connectors + nodes appear here as the player gets them right
  const builtWrap = document.createElement('div');
  builtWrap.className = 'lin-built';
  chain.appendChild(builtWrap);

  // the palette of the player's own discovered pieces to tap (bottom)
  const trayLabel = document.createElement('div');
  trayLabel.className = 'lin-tray-label';
  trayLabel.textContent = 'Tap your pieces in the order you made them:';
  chain.appendChild(trayLabel);
  const tray = document.createElement('div');
  tray.className = 'lin-tray';
  chain.appendChild(tray);

  const chips = nodes.map((node, idx) => {
    const c = document.createElement('button');
    c.className = 'lin-chip';
    c.style.setProperty('--c', node.color);
    c.innerHTML = `<span class="lin-chip-g">${node.glyph}</span><span class="lin-chip-n">${node.label}</span>`;
    c.addEventListener('click', () => onPick(idx));
    tray.appendChild(c);
    return c;
  });

  // shuffle the tray order so the player must RECALL the sequence, not read it left-to-right.
  // (The very first node, H, is left findable; everything else is jumbled.)
  rShuffle(chips.slice(1)).forEach(c => tray.appendChild(c));

  function placeNode(idx) {
    const node = nodes[idx];
    // draw the connector between the previous node and this one (skipped before the first node)
    if (placed > 0) {
      const conn = document.createElement('div');
      conn.className = 'lin-conn' + (reduced ? ' nomotion' : '');
      conn.innerHTML = `<span class="lin-conn-line"></span><span class="lin-conn-why">${node.because}</span>`;
      builtWrap.appendChild(conn);
      requestAnimationFrame(() => conn.classList.add('show'));
    }
    const row = document.createElement('div');
    row.className = 'lin-node' + (reduced ? ' nomotion' : '');
    row.style.setProperty('--c', node.color);
    row.innerHTML = `<div class="lin-node-orb">${node.glyph}</div>`
      + `<div class="lin-node-body"><b>${node.label}</b>${placed === 0 ? `<div class="lin-node-sub">${node.because}</div>` : ''}</div>`;
    builtWrap.appendChild(row);
    requestAnimationFrame(() => row.classList.add('show'));

    const chip = chips[idx];
    chip.classList.add('placed'); chip.disabled = true;
    placed++;
    chain.scrollTop = chain.scrollHeight;
    updateNext();
  }

  function onPick(idx) {
    if (idx === placed) {                 // correct: the next node in the spine
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
      G.sfx && G.sfx.pickup && G.sfx.pickup();
      placeNode(idx);
      if (placed >= nodes.length) finish();
      else armAutoFallback();
    } else if (idx < placed) {
      // already placed — gentle no-op
      G.sfx && G.sfx.reject && G.sfx.reject();
    } else {
      // tapped too far ahead — never punish, just point back
      G.sfx && G.sfx.reject && G.sfx.reject();
      const want = nodes[placed];
      flash(`Not yet — what came before ${want.label}? Tap the piece you made just before it.`);
      const chip = chips[idx];
      if (!reduced) { chip.classList.add('nudge'); setTimeout(() => chip.classList.remove('nudge'), 420); }
    }
  }

  // graceful path for a player who just wants to WATCH: after a pause with no progress, offer to
  // assemble the rest automatically (and a player can press it any time).
  function armAutoFallback() {
    if (autoTimer) clearTimeout(autoTimer);
    // the "assemble for me" button is always live; after a pause we just make it glow so a player
    // who's stuck or only wants to watch can see the way out.
    autoTimer = setTimeout(() => { if (placed < nodes.length) nextBtn.classList.add('lin-hintbtn'); }, 9000);
  }
  function autoAssemble() {
    if (autoMode) return;
    autoMode = true;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    nextBtn.classList.remove('lin-hintbtn');
    nextBtn.disabled = true;
    const step = () => {
      if (placed < nodes.length) {
        placeNode(placed);
        if (placed >= nodes.length) { autoMode = false; finish(); }
        else setTimeout(step, reduced ? 120 : 650);
      }
    };
    step();
  }

  function updateNext() {
    if (autoMode || placed >= nodes.length) return;   // finish() / autoAssemble manage the button
    nextBtn.classList.remove('lin-hintbtn');
    nextBtn.disabled = false;
    nextBtn.textContent = placed <= 1 ? 'Assemble it for me ›' : 'Assemble the rest for me ›';
    nextBtn.onclick = autoAssemble;
  }

  function finish() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    const end = document.createElement('p');
    end.className = 'lin-end' + (reduced ? ' nomotion' : '');
    end.textContent = LINEAGE_END;
    builtWrap.appendChild(end);
    requestAnimationFrame(() => end.classList.add('show'));
    tray.classList.add('lin-tray-done');
    chain.scrollTop = chain.scrollHeight;
    nextBtn.classList.remove('lin-hintbtn');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Close';
    nextBtn.onclick = () => ov.classList.add('hidden');
  }

  // start: the seed (H) is already placed for the player so the FIRST connector they earn is
  // H → its first product (the assembly proper begins from a clear anchor).
  placeNode(0);
  armAutoFallback();
  ov.classList.remove('hidden');
}

// ---------------- Intro ----------------
export function showIntro(game, done) {
  const intro = $('intro'); intro.classList.remove('hidden');
  $('beginBtn').addEventListener('click', () => { audioUnlock(); intro.classList.add('hidden'); done && done(); }, { once: true });
}
