// lab.js — The Synthesis Lab: combine reagents UNDER A CONDITION (energy).
// Tap a reagent to load a slot, pick an energy, tap the reactor to react.
// Same reagents + wrong energy = no reaction (the puzzle + the real chemistry).
import { drawToken, hexA, rgb01 } from '../render/molecules.js';
import { ELEMENTS, el } from '../data/elements.js';
import { MOLECULES } from '../data/recipes.js';
import { ITEMS, SYNTH, ENERGIES, synthMatch, item as synthItem, energy as energyDef } from '../data/synthesis.js';

const SUB = { 0:'₀',1:'₁',2:'₂',3:'₃',4:'₄',5:'₅',6:'₆',7:'₇',8:'₈',9:'₉' };
const fsub = (f) => Object.keys(f).map(k => k + (f[k] > 1 ? SUB[f[k]] : '')).join('');
const NSLOTS = 6;
const PREDICT_REWARD = 3;   // Insight for correctly predicting a reaction's outcome

// visual descriptor for any reagent id (element / molecule / item)
function visual(id) {
  if (ELEMENTS[id]) return { abbr: ELEMENTS[id].sym, color: ELEMENTS[id].glow };
  const m = MOLECULES.find(x => x.id === id); if (m) return { abbr: fsub(m.formula), color: '#86e8d0' };
  const it = ITEMS[id]; if (it) return { abbr: it.abbr, color: it.color };
  return { abbr: id, color: '#8ef0d0' };
}

export class LabScene {
  constructor() {
    this.title = 'Synthesis Lab';
    this.slots = Array.from({ length: NSLOTS }, () => ({ id: null }));
    this.energy = 'lightning';
    this.palette = [];
    this.energyChips = [];
    this.flashT = 0; this.reactPulse = 0;
  }

  enter(game) {
    this.title = game.hasItem('membrane') || game.hasItem('rna') || game.hasItem('protein') ? 'Assembly Lab' : 'Primordial Soup';
    game.gl.setNebula({ colA: [0.10, 0.22, 0.40], colB: [0.34, 0.16, 0.42], intensity: 1.0, focus: [0.5, 0.40] });
    this.layout(game);
    game.coachOnce('lab_experiment', { kind: 'hint',
      title: 'Experiment freely',
      sub: 'Load anything, pick any energy, and react — you don’t have to follow the goals. Before each reaction you’ll guess the outcome: a correct call earns insight, and a wrong one teaches the most. (Turn guessing off in the menu.)' });
  }

  layout(game) {
    this.cx = game.W / 2; this.cy = game.H * 0.38;
    this.RR = Math.min(game.W, game.H) * 0.13;
    this.ring = this.RR * 2.2;
    // slot positions around reactor (start at top)
    this.slotPos = this.slots.map((_, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / NSLOTS);
      return { x: this.cx + Math.cos(a) * this.ring, y: this.cy + Math.sin(a) * this.ring };
    });
    // energy chips row
    const ey = game.H * 0.60;
    const n = ENERGIES.length, gap = Math.min(84, game.W / (n + 0.5)), sx = game.W / 2 - (n - 1) * gap / 2;
    this.energyChips = ENERGIES.map((e, i) => ({ id: e.id, x: sx + i * gap, y: ey, r: 24, glyph: e.glyph, color: e.color, name: e.name }));
    // palette (all discovered reagents) — laid out ABOVE the bottom tab bar
    const ids = this.reagentIds(game);
    const maxPer = 8, rows = Math.ceil(ids.length / maxPer) || 1, per = Math.ceil(ids.length / rows);
    const rowH = 40;
    const bottomRowY = game.H - 136;                 // clears the ~80px tab bar with margin
    const baseY = bottomRowY - (rows - 1) * rowH;     // first (top) row
    this.palette = ids.map((id, i) => {
      const r = Math.floor(i / per), c = i % per, inRow = Math.min(per, ids.length - r * per);
      const gap2 = game.W / (inRow + 1);
      return { id, x: gap2 * (c + 1), y: baseY + r * rowH, r: 17, vis: visual(id) };
    });
  }
  resize(game) { this.layout(game); }

  reagentIds(game) {
    const out = [];
    MOLECULES.forEach(m => { if (game.ownsMolecule(m.id)) out.push(m.id); });
    if (game.ownsElement('P')) out.push('P');
    Object.values(ITEMS).forEach(it => { if (it.kind !== 'cell' && it.kind !== 'aside' && game.ownsItem(it.id)) out.push(it.id); });
    return out;
  }

  firstEmpty() { return this.slots.findIndex(s => s.id === null); }

  onDown(x, y, game) {
    // palette?
    for (const p of this.palette) {
      if (Math.hypot(p.x - x, p.y - y) < p.r + 9) {
        const idx = this.firstEmpty();
        if (idx < 0) { this.toast(game, 'fail', 'Reactor full', 'Tap a loaded slot to clear it.'); game.sfx.reject(); return; }
        this.slots[idx].id = p.id; game.sfx.pickup();
        game.gl.spawn(this.slotPos[idx].x, this.slotPos[idx].y, { color: rgb01(p.vis.color), size: 18, alpha: 0.7, life: 0.4 });
        return;
      }
    }
    // energy chip?
    for (const c of this.energyChips) {
      if (Math.hypot(c.x - x, c.y - y) < c.r + 9) { this.energy = c.id; game.sfx.pickup(); return; }
    }
    // slot? (clear it)
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].id && Math.hypot(this.slotPos[i].x - x, this.slotPos[i].y - y) < 26) {
        this.slots[i].id = null; game.sfx.reject(); return;
      }
    }
    // reactor center → react
    if (Math.hypot(this.cx - x, this.cy - y) < this.RR + 12) this.react(game);
  }
  onMove() {}
  onUp() {}

  counts() {
    const c = {};
    for (const s of this.slots) if (s.id) c[s.id] = (c[s.id] || 0) + 1;
    return c;
  }

  react(game) {
    const counts = this.counts();
    if (Object.keys(counts).length === 0) { this.toast(game, 'fail', 'Empty reactor', 'Tap reagents below to load them.'); game.sfx.reject(); return; }
    // Predict-then-test (opt-in): guess the outcome first, then see if you were right.
    if (game.state.predictMode) {
      const res = synthMatch(counts, this.energy);
      const actual = (res.status === 'ok' || res.status === 'aside') ? res.product : 'nothing';
      import('../ui/hud.js').then(UI => UI.openPredict(game, actual, (guess) => this._doReact(game, guess)));
    } else {
      this._doReact(game, null);
    }
  }

  // Resolve a reaction. `prediction` is a product id, 'nothing', or null (predict mode off).
  _doReact(game, prediction) {
    const counts = this.counts();
    game.logExperiment();
    const res = synthMatch(counts, this.energy);
    const made = (res.status === 'ok' || res.status === 'aside') ? res.product : 'nothing';
    // Reasoning, not luck, is what the game rewards: a correct prediction earns Insight —
    // including correctly calling that NOTHING would form (that's real chemical judgement too).
    const correctCall = prediction != null && (
      (made === 'nothing' && prediction === 'nothing') ||
      (made !== 'nothing' && (prediction === made || prediction === 'actual'))
    );
    let pre = '';
    if (prediction != null) {
      if (correctCall) { pre = `✓ You called it! +✦${PREDICT_REWARD} `; game.award(PREDICT_REWARD); }
      else {
        const g = prediction === 'nothing' ? 'nothing' : (synthItem(prediction)?.name || prediction);
        pre = `✗ You guessed ${g}. `;
      }
    }

    if (res.status === 'ok' || res.status === 'aside') {
      const it = synthItem(res.product);
      const aside = res.status === 'aside';
      const isNew = aside ? !game.hasAside(res.product) : !game.hasItem(res.product);
      this.reactPulse = 1;
      game.sfx.discover();
      game.celebrate(this.cx, this.cy, it.color);
      game.gl.burst(this.cx, this.cy, aside ? 50 : 70, { color: rgb01(energyDef(this.energy).color), speed: 240, size: 28, life: 1.0, alpha: 0.9 });
      // Conservation made visible: condensation reactions physically expel a water molecule.
      // You SEE the atoms aren't free — every peptide/glycosidic/ester bond sheds an H₂O.
      const shedsWater = res.recipe && res.recipe.releases === 'H2O';
      if (shedsWater) this.ejectWater(game);
      if (aside) game.discoverAside(res.product); else game.discoverItem(res.product);
      const title = aside ? (isNew ? `Curiosity — ${it.name}` : it.name) : (isNew ? `Synthesised ${it.name}` : it.name);
      const sub = pre + (it.formula ? it.name + ' · ' + it.formula : it.name) + (shedsWater ? '  ·  + H₂O released' : '');
      this.toast(game, 'item', title, sub, it.spark, res.product);
      this.slots.forEach(s => s.id = null);
      this.layout(game);
      import('../ui/hud.js').then(UI => UI.refreshGoals(game));
      if (aside && isNew) import('../ui/hud.js').then(UI => UI.flash('A curiosity! Off the path of life — see the Codex.'));
      if (res.product === 'protocell') import('../ui/hud.js').then(UI => UI.flash('A protocell! Find it in the Cell stage →'));
      return;
    }
    game.sfx.reject(); this.reactPulse = 0.4;
    if (res.status === 'wrong-energy') this.toast(game, 'fail', 'No reaction', pre + (res.hint || `These could react — but not under ${energyDef(this.energy).name.toLowerCase()}. Try a different energy.`));
    else if (res.status === 'incomplete') this.toast(game, 'fail', 'Something is missing', pre + 'The right reagents are here, but not enough of them. Add another.');
    else this.toast(game, 'fail', 'No reaction', pre + (res.hint || 'These reagents don’t combine. Rethink the recipe.'));
  }

  // A little water molecule visibly squeezed out of the reactor and flung aside — the felt
  // proof that atoms are conserved (dehydration synthesis), not conjured from nowhere.
  ejectWater(game) {
    const ax = Math.random() < 0.5 ? -1 : 1;
    const dropX = this.cx + ax * (this.RR + 26), dropY = this.cy - 8;
    game.gl.burst(this.cx, this.cy, 10, { color: rgb01('#9fe6ff'), size: 14, speed: 130, life: 0.6, alpha: 0.85 });
    game.gl.spawn(dropX, dropY, { color: rgb01('#9fe6ff'), size: 22, alpha: 0.9, life: 1.1, vx: ax * 70, vy: -30, drag: 0.96 });
    this.waterPop = { x: dropX, y: dropY, t: 0 };
    game.sfx.bond();
  }

  toast(game, kind, title, sub, spark, item) {
    import('../ui/hud.js').then(UI => UI.toast(game, { kind, title, sub, spark, item }));
  }

  update(dt) {
    this.reactPulse = Math.max(0, this.reactPulse - dt * 1.5);
    if (this.waterPop) {
      this.waterPop.t += dt;
      this.waterPop.y -= 18 * dt;                 // the droplet label drifts up as it fades
      if (this.waterPop.t > 1.4) this.waterPop = null;
    }
  }

  render(ctx, game) {
    const { cx, cy, RR } = this;
    const en = energyDef(this.energy);
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 1.8);

    // connections slot→core
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].id) continue;
      const p = this.slotPos[i];
      ctx.strokeStyle = hexA(en.color, 0.18 + this.reactPulse * 0.4); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cx, cy); ctx.stroke();
    }
    ctx.restore();

    // reactor core
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(cx, cy, RR * 0.2, cx, cy, RR * (1.6 + this.reactPulse));
    cg.addColorStop(0, hexA(en.color, 0.4 + this.reactPulse * 0.4 + pulse * 0.08));
    cg.addColorStop(1, hexA(en.color, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, RR * (1.6 + this.reactPulse), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hexA(en.color, 0.5 + pulse * 0.2); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, RR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(230,242,255,0.92)';
    ctx.font = '700 15px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('REACT', cx, cy - 2);
    ctx.font = '500 11px "Outfit", system-ui, sans-serif'; ctx.fillStyle = hexA(en.color, 0.9);
    ctx.fillText(en.glyph + ' ' + en.name, cx, cy + RR + 16);

    // slots
    for (let i = 0; i < this.slots.length; i++) {
      const p = this.slotPos[i], s = this.slots[i];
      if (s.id) { drawToken(ctx, p.x, p.y, visual(s.id), { r: 20 }); }
      else {
        ctx.strokeStyle = 'rgba(160,190,230,0.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // energy chips
    for (const c of this.energyChips) {
      const on = c.id === this.energy;
      ctx.save();
      if (on) { ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * 1.8);
        g.addColorStop(0, hexA(c.color, 0.4)); g.addColorStop(1, hexA(c.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = hexA(c.color, on ? 0.95 : 0.35); ctx.lineWidth = on ? 2.4 : 1.4;
      ctx.fillStyle = on ? hexA(c.color, 0.16) : 'rgba(255,255,255,0.03)';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#ffffff' : hexA(c.color, 0.8);
      ctx.font = '600 18px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.glyph, c.x, c.y + 1);
    }
    ctx.fillStyle = 'rgba(200,220,255,0.5)'; ctx.font = '500 11px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('energy source', cx, this.energyChips[0].y - 34);

    // a water molecule squeezed out by a condensation reaction, drifting up and fading
    if (this.waterPop) {
      const a = Math.max(0, 1 - this.waterPop.t / 1.4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cdeeff';
      ctx.font = '700 14px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+ H₂O', this.waterPop.x, this.waterPop.y);
      ctx.restore();
    }

    // palette
    for (const p of this.palette) {
      drawToken(ctx, p.x, p.y, p.vis, { r: p.r });
    }
    if (this.palette.length === 0) {
      ctx.fillStyle = 'rgba(220,235,255,0.5)'; ctx.font = '500 14px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('Discover molecules on the Bench first', cx, game.H - 110);
    }
  }
}
