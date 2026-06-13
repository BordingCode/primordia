// bench.js — The Bench: tactile valence bonding.
// Atoms float on spring-bonds; proximity forms bonds; the solver raises bond order
// to satisfy each atom's valence. A connected, fully-satisfied cluster that matches a
// real formula is discovered. Unsatisfied atoms glow "hungry".
import { drawAtom, drawBond, hexA, rgb01 } from '../render/molecules.js';
import { el, ELEMENTS } from '../data/elements.js';
import { MOLECULES, moleculeByFormula } from '../data/recipes.js';

// Atoms you can bond on the Bench. (Phosphorus has no stable small bench molecule here —
// it's used as a raw reagent in the Lab — so it's intentionally not bondable.)
const BOND_ELEMENTS = ['H', 'C', 'N', 'O', 'S'];

export class BenchScene {
  constructor() {
    this.title = 'The Bench';
    this.atoms = [];
    this.bonds = [];
    this.nextId = 1;
    this.drag = null;
    this.completed = new Set();
    this.chips = [];
    this.clearBtn = { x: 0, y: 0, r: 22 };
    this.lastRejectAt = -10;
  }

  enter(game) {
    this.layout(game);
    game.gl.setNebula({ colA: [0.10, 0.30, 0.42], colB: [0.30, 0.12, 0.45], intensity: 1.0, focus: [0.5, 0.42] });
  }
  layout(game) {
    const avail = BOND_ELEMENTS.filter(s => game.hasElement(s));
    const n = avail.length;
    const gap = Math.min(86, game.W / (n + 1.5));
    const startX = game.W / 2 - (n - 1) * gap / 2;
    this.trayY = game.H - 132;
    this.chips = avail.map((sym, i) => ({ sym, x: startX + i * gap, y: this.trayY, r: 24 }));
    this.clearBtn = { x: 40, y: 92, r: 22 };
  }
  resize(game) { this.layout(game); }

  spawnAtom(sym, x, y) {
    return { id: this.nextId++, sym, x, y, vx: 0, vy: 0, r: el(sym).r, drag: false, pulse: 0 };
  }

  valence(sym) { return ELEMENTS[sym].valence; }
  freeSlots(atom) {
    let used = 0;
    for (const b of this.bonds) if (b.a === atom.id || b.b === atom.id) used += b.order;
    return this.valence(atom.sym) - used;
  }
  byId(id) { return this.atoms.find(a => a.id === id); }
  bonded(a, b) { return this.bonds.find(x => (x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id)); }

  hitAtom(x, y) {
    for (let i = this.atoms.length - 1; i >= 0; i--) {
      const a = this.atoms[i];
      if (Math.hypot(a.x - x, a.y - y) < a.r + 8) return a;
    }
    return null;
  }
  hitChip(x, y) { return this.chips.find(c => Math.hypot(c.x - x, c.y - y) < c.r + 10) || null; }

  onDown(x, y, game) {
    if (Math.hypot(x - this.clearBtn.x, y - this.clearBtn.y) < this.clearBtn.r + 6) {
      this.clearField(game); return;
    }
    const a = this.hitAtom(x, y);
    if (a) { this.drag = a; a.drag = true; game.sfx.pickup(); return; }
    const chip = this.hitChip(x, y);
    if (chip) {
      const na = this.spawnAtom(chip.sym, x, y - 4);
      this.atoms.push(na); this.drag = na; na.drag = true; game.sfx.pickup();
      this.feltCoach(game, chip.sym);
    }
  }

  // First time you pick up each element, meet its character — taught at the moment you hold it.
  feltCoach(game, sym) {
    const lines = {
      H: 'Hydrogen has just one bond to give — life’s universal little connector.',
      C: 'Carbon reaches for FOUR bonds at once — that’s why it can build the long chains and rings that all life is made of.',
      N: 'Nitrogen wants three bonds. Two nitrogens can only satisfy each other by sharing a rare, super-strong triple bond.',
      O: 'Oxygen is greedy — watch it lunge at partners, pulling them in until both of its two bonds are filled.',
      S: 'Sulfur is oxygen’s heavier cousin and behaves like it here — it too wants two bonds.',
    };
    if (lines[sym]) game.coachOnce('felt_' + sym, { kind: 'hint', title: el(sym).name, sub: lines[sym] });
  }
  onMove(x, y) { if (this.drag) { this.drag.x = x; this.drag.y = y; this.drag.vx = 0; this.drag.vy = 0; } }
  onUp() { if (this.drag) { this.drag.drag = false; this.drag = null; } }

  clearField(game) {
    for (const a of this.atoms) game.gl.spawn(a.x, a.y, { color: rgb01(el(a.sym).glow), size: 22, alpha: 0.7, life: 0.5, vx: (Math.random() - .5) * 80, vy: (Math.random() - .5) * 80 });
    this.atoms = []; this.bonds = []; this.completed.clear();
    game.sfx.reject();
  }

  // ---- bonding passes ----
  formBonds(game) {
    for (let i = 0; i < this.atoms.length; i++) for (let j = i + 1; j < this.atoms.length; j++) {
      const a = this.atoms[i], b = this.atoms[j];
      if (this.bonded(a, b)) continue;
      const rest = a.r + b.r + 12;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < rest * 1.12 && this.freeSlots(a) > 0 && this.freeSlots(b) > 0) {
        this.bonds.push({ a: a.id, b: b.id, order: 1, rest });
        game.sfx.bond();
        game.gl.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 8, { color: rgb01('#bfefff'), size: 14, speed: 70, life: 0.4, alpha: 0.7 });
        // NOTE: do NOT clear `completed` here — the per-cluster keys already re-evaluate
        // only the cluster that actually changed. Clearing makes every existing molecule
        // on the table re-fire its discovery (toast + celebration spam).
      }
    }
  }
  raiseOrders() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const bond of this.bonds) {
        const a = this.byId(bond.a), b = this.byId(bond.b);
        if (!a || !b) continue;
        if (bond.order < 3 && this.freeSlots(a) > 0 && this.freeSlots(b) > 0) { bond.order++; changed = true; }
      }
    }
  }
  breakStretched(game) {
    for (let i = this.bonds.length - 1; i >= 0; i--) {
      const bd = this.bonds[i];
      const a = this.byId(bd.a), b = this.byId(bd.b);
      if (!a || !b) { this.bonds.splice(i, 1); continue; }
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > bd.rest * 2.3) {
        this.bonds.splice(i, 1);
        game.gl.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 6, { color: rgb01('#ff8f7a'), size: 12, speed: 90, life: 0.35, alpha: 0.7 });
      }
    }
  }

  components() {
    const parent = {};
    const find = (x) => (parent[x] === undefined ? (parent[x] = x) : (parent[x] === x ? x : (parent[x] = find(parent[x]))));
    const union = (a, b) => { parent[find(a)] = find(b); };
    for (const a of this.atoms) find(a.id);
    for (const b of this.bonds) union(b.a, b.b);
    const groups = {};
    for (const a of this.atoms) { const r = find(a.id); (groups[r] = groups[r] || []).push(a); }
    return Object.values(groups);
  }

  checkStable(game) {
    let satisfiedCluster = false;
    for (const comp of this.components()) {
      if (comp.length < 2) continue;
      const allSatisfied = comp.every(a => this.freeSlots(a) === 0 && this.valence(a.sym) > 0);
      if (!allSatisfied) continue;
      satisfiedCluster = true;
      const counts = {};
      comp.forEach(a => counts[a.sym] = (counts[a.sym] || 0) + 1);
      const mol = moleculeByFormula(counts);
      const key = comp.map(a => a.id).sort((p, q) => p - q).join('-');
      if (this.completed.has(key)) continue;
      this.completed.add(key);
      if (mol) this.onStableMolecule(mol, comp, game);
      else this.onStableUnlisted(comp, game);
    }
    // Free-build teaching: a finished molecule sitting next to a still-hungry leftover atom
    // (the "fifth hydrogen on carbon" moment) — every atom takes a fixed number of bonds.
    if (satisfiedCluster && this.atoms.some(a => this.freeSlots(a) > 0)) {
      game.coachOnce('felt_hungry', { kind: 'hint', title: 'Still hungry',
        sub: 'See the atom still glowing? It wants a bond, but every partner nearby is already full. Each atom takes a fixed number of bonds — no more, no less.' });
    }
  }

  // A fully-bonded cluster that isn't a molecule life uses — reward the experiment, teach stability.
  onStableUnlisted(comp, game) {
    const cx = comp.reduce((s, a) => s + a.x, 0) / comp.length;
    const cy = comp.reduce((s, a) => s + a.y, 0) / comp.length;
    game.gl.burst(cx, cy, 14, { color: rgb01('#bfe0ff'), speed: 90, size: 14, life: 0.5, alpha: 0.6 });
    game.sfx.bond();
    game.coachOnce('felt_stable', { kind: 'hint', title: 'A stable structure',
      sub: 'Every bond is filled, so it holds together — even though it isn’t a molecule life needs. That’s all stability asks: no atom left hungry.' });
  }

  onStableMolecule(mol, comp, game) {
    const cx = comp.reduce((s, a) => s + a.x, 0) / comp.length;
    const cy = comp.reduce((s, a) => s + a.y, 0) / comp.length;
    if (!game.hasMolecule(mol.id)) {
      // first time: full celebration + discovery toast
      game.celebrate(cx, cy, '#8ef0d0');
      game.sfx.discover();
      game.discoverMolecule(mol.id);
      import('../ui/hud.js').then(UI => {
        UI.toast(game, { kind: 'molecule', title: `Discovered ${mol.name}`, sub: formulaText(mol.formula), fact: mol.fact });
        UI.refreshGoals(game);
      });
    } else {
      // already known: a quiet little spark, no toast — keeps the table free of clutter
      game.gl.burst(cx, cy, 16, { color: rgb01('#8ef0d0'), speed: 110, size: 16, life: 0.55, alpha: 0.7 });
      game.sfx.bond();
    }
  }

  update(dt, game) {
    this.formBonds(game);
    this.raiseOrders();
    this.breakStretched(game);

    const as = this.atoms;
    // spring bonds
    for (const bd of this.bonds) {
      const a = this.byId(bd.a), b = this.byId(bd.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - bd.rest) * 14;
      const ux = dx / d, uy = dy / d;
      if (!a.drag) { a.vx += ux * f * dt; a.vy += uy * f * dt; }
      if (!b.drag) { b.vx -= ux * f * dt; b.vy -= uy * f * dt; }
    }
    // repulsion for non-bonded pairs that are close (and bonded pairs keep min dist)
    for (let i = 0; i < as.length; i++) for (let j = i + 1; j < as.length; j++) {
      const a = as[i], b = as[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = a.r + b.r + (this.bonded(a, b) ? 2 : 14);
      if (d < min) {
        const f = (min - d) * 18;
        const ux = dx / d, uy = dy / d;
        if (!a.drag) { a.vx -= ux * f * dt; a.vy -= uy * f * dt; }
        if (!b.drag) { b.vx += ux * f * dt; b.vy += uy * f * dt; }
      }
    }
    // personality: oxygen is "greedy" — while it still has an open bond it gently lunges
    // toward the nearest atom that could satisfy it. You SEE it reach for partners.
    for (const a of as) {
      if (a.drag || a.sym !== 'O' || this.freeSlots(a) <= 0) continue;
      let best = null, bestD = 1e9;
      for (const b of as) {
        if (b === a || this.bonded(a, b) || this.freeSlots(b) <= 0) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      if (best && bestD < 240 && bestD > a.r + best.r + 10) {
        const ux = (best.x - a.x) / bestD, uy = (best.y - a.y) / bestD;
        a.vx += ux * 70 * dt; a.vy += uy * 70 * dt;
      }
    }
    // integrate
    for (const a of as) {
      a.pulse = a.pulse * 0.9 + (this.freeSlots(a) > 0 ? 0.5 + 0.5 * Math.sin(game.time * 4 + a.id) : 0) * 0.1;
      if (a.drag) continue;
      a.vx *= 0.86; a.vy *= 0.86;
      // gentle float toward upper field if free
      a.x += a.vx * dt; a.y += a.vy * dt;
      a.x = Math.max(a.r, Math.min(game.W - a.r, a.x));
      a.y = Math.max(a.r + 56, Math.min(game.H - 162, a.y));
    }
    this.checkStable(game);
  }

  render(ctx, game) {
    // field hint
    if (this.atoms.length === 0) {
      ctx.fillStyle = 'rgba(220,235,255,0.5)';
      ctx.font = '500 16px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drag atoms together to bond them', game.W / 2, game.H * 0.42);
      ctx.fillStyle = 'rgba(220,235,255,0.32)';
      ctx.font = '400 13px "Outfit", system-ui, sans-serif';
      ctx.fillText('every atom must fill all its bonds — no leftovers', game.W / 2, game.H * 0.42 + 22);
    }
    // bonds first
    for (const bd of this.bonds) {
      const a = this.byId(bd.a), b = this.byId(bd.b);
      if (a && b) drawBond(ctx, a.x, a.y, b.x, b.y, bd.order);
    }
    // atoms
    for (const a of this.atoms) {
      const v = this.valence(a.sym), fs = this.freeSlots(a);
      drawAtom(ctx, a.x, a.y, a.sym, { hungry: fs > 0, pulse: Math.abs(a.pulse), slots: v, filled: v - fs, time: game.time });
    }
    // tray
    for (const c of this.chips) this.drawChip(ctx, c, game.time);
    // clear button
    this.drawClear(ctx);
  }

  drawChip(ctx, c, time = 0) {
    ctx.save();
    const e = el(c.sym);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * 1.7);
    g.addColorStop(0, hexA(e.glow, 0.28)); g.addColorStop(1, hexA(e.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // tray atoms show all their arms open, so you can read each element's "appetite" at rest
    drawAtom(ctx, c.x, c.y, c.sym, { r: c.r, slots: el(c.sym).valence, filled: 0, time });
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.font = '500 10px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('×' + el(c.sym).valence, c.x, c.y + c.r + 13);
  }
  drawClear(ctx) {
    const b = this.clearBtn;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,150,140,0.6)'; ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(255,120,110,0.08)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,170,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x - 6, b.y - 6); ctx.lineTo(b.x + 6, b.y + 6);
    ctx.moveTo(b.x + 6, b.y - 6); ctx.lineTo(b.x - 6, b.y + 6); ctx.stroke();
    ctx.restore();
  }
}

function formulaText(f) {
  const sub = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆' };
  return Object.keys(f).map(k => k + (f[k] > 1 ? sub[f[k]] : '')).join('');
}
