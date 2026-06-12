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
    // palette (all discovered reagents)
    const ids = this.reagentIds(game);
    const maxPer = 9, rows = Math.ceil(ids.length / maxPer) || 1, per = Math.ceil(ids.length / rows);
    const baseY = game.H - 96 - (rows - 1) * 42;
    this.palette = ids.map((id, i) => {
      const r = Math.floor(i / per), c = i % per, inRow = Math.min(per, ids.length - r * per);
      const gap2 = game.W / (inRow + 1);
      return { id, x: gap2 * (c + 1), y: baseY + r * 42, r: 18, vis: visual(id) };
    });
  }
  resize(game) { this.layout(game); }

  reagentIds(game) {
    const out = [];
    MOLECULES.forEach(m => { if (game.hasMolecule(m.id)) out.push(m.id); });
    if (game.hasElement('P')) out.push('P');
    Object.values(ITEMS).forEach(it => { if (it.kind !== 'cell' && game.hasItem(it.id)) out.push(it.id); });
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
    const res = synthMatch(counts, this.energy);
    if (res.status === 'empty') { this.toast(game, 'fail', 'Empty reactor', 'Tap reagents below to load them.'); game.sfx.reject(); return; }
    if (res.status === 'ok') {
      const it = synthItem(res.product);
      const isNew = !game.hasItem(res.product);
      this.reactPulse = 1;
      game.sfx.discover();
      game.celebrate(this.cx, this.cy, it.color);
      game.gl.burst(this.cx, this.cy, 70, { color: rgb01(energyDef(this.energy).color), speed: 240, size: 28, life: 1.0, alpha: 0.9 });
      game.discoverItem(res.product);
      this.toast(game, 'item', isNew ? `Synthesised ${it.name}` : it.name, it.formula ? it.name + ' · ' + it.formula : it.name, it.fact, res.product);
      this.slots.forEach(s => s.id = null);
      this.layout(game);
      import('../ui/hud.js').then(UI => UI.refreshGoals(game));
      // protocell made → nudge toward the Cell stage
      if (res.product === 'protocell') import('../ui/hud.js').then(UI => UI.flash('A protocell! Find it in the Cell stage →'));
      return;
    }
    game.sfx.reject(); this.reactPulse = 0.4;
    if (res.status === 'wrong-energy') this.toast(game, 'fail', 'No reaction', `These could react — but not under ${energyDef(this.energy).name.toLowerCase()}. Try a different energy.`);
    else if (res.status === 'incomplete') this.toast(game, 'fail', 'Something is missing', 'The right reagents are here, but not enough of them. Add another.');
    else this.toast(game, 'fail', 'No reaction', 'These reagents don’t combine. Rethink the recipe.');
  }

  toast(game, kind, title, sub, fact, item) {
    import('../ui/hud.js').then(UI => UI.toast(game, { kind, title, sub, fact, item }));
  }

  update(dt) { this.reactPulse = Math.max(0, this.reactPulse - dt * 1.5); }

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
