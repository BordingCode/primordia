// forge.js — Stellar Forge: drag nuclei into a star's core; gravity packs them;
// matching sets fuse into heavier elements (real nucleosynthesis chains).
import { drawAtom, hexA, rgb01 } from '../render/molecules.js';
import { el } from '../data/elements.js';
import { FUSION } from '../data/recipes.js';

const FUSION_INPUTS = ['H', 'He', 'C', 'O']; // nuclei you can feed the core

export class ForgeScene {
  constructor() {
    this.title = 'Stellar Forge';
    this.nuclei = [];
    this.drag = null;
    this.charge = 0;        // 0..1 buildup before a fusion fires
    this.chargeSet = null;  // the recipe currently charging
    this.chips = [];
  }

  enter(game) {
    this.layout(game);
    game.gl.setNebula({ colA: [0.22, 0.10, 0.42], colB: [0.55, 0.35, 0.12], intensity: 1.15, focus: [0.5, this.cy / game.H] });
  }

  layout(game) {
    this.cx = game.W / 2;
    this.cy = game.H * 0.44;
    this.coreR = Math.min(game.W, game.H) * 0.24;
    const avail = FUSION_INPUTS.filter(s => game.hasElement(s));
    const n = avail.length;
    const gap = Math.min(96, game.W / (n + 1));
    const startX = game.W / 2 - (n - 1) * gap / 2;
    this.trayY = game.H - 138;
    this.chips = avail.map((sym, i) => ({ sym, x: startX + i * gap, y: this.trayY, r: 26 }));
  }
  resize(game) { this.layout(game); }

  spawnNucleus(sym, x, y) {
    const e = el(sym);
    return { sym, x, y, vx: 0, vy: 0, r: e.r, drag: false };
  }

  hitNucleus(x, y) {
    for (let i = this.nuclei.length - 1; i >= 0; i--) {
      const n = this.nuclei[i];
      if (Math.hypot(n.x - x, n.y - y) < n.r + 8) return n;
    }
    return null;
  }
  hitChip(x, y) {
    return this.chips.find(c => Math.hypot(c.x - x, c.y - y) < c.r + 10) || null;
  }

  onDown(x, y, game) {
    const n = this.hitNucleus(x, y);
    if (n) { this.drag = n; n.drag = true; game.sfx.pickup(); return; }
    const chip = this.hitChip(x, y);
    if (chip) {
      const nn = this.spawnNucleus(chip.sym, x, y - 4);
      this.nuclei.push(nn); this.drag = nn; nn.drag = true;
      game.sfx.pickup();
    }
  }
  onMove(x, y) { if (this.drag) { this.drag.x = x; this.drag.y = y; this.drag.vx = 0; this.drag.vy = 0; } }
  onUp() { if (this.drag) { this.drag.drag = false; this.drag = null; } }

  // nuclei currently inside the core, counted by symbol
  coreContents() {
    const counts = {};
    const inside = [];
    for (const n of this.nuclei) {
      if (Math.hypot(n.x - this.cx, n.y - this.cy) < this.coreR) {
        counts[n.sym] = (counts[n.sym] || 0) + 1;
        inside.push(n);
      }
    }
    return { counts, inside };
  }

  // does a recipe's inputs fit inside the core contents?
  fusableRecipe(counts) {
    let best = null;
    for (const r of FUSION) {
      const need = {};
      r.in.forEach(s => need[s] = (need[s] || 0) + 1);
      if (Object.keys(need).every(s => (counts[s] || 0) >= need[s])) {
        if (!best || r.in.length > best.in.length) best = r;
      }
    }
    return best;
  }

  update(dt, game) {
    const ns = this.nuclei;
    // physics: gravity toward core, mutual repulsion, settle
    for (const n of ns) {
      if (n.drag) continue;
      const dx = this.cx - n.x, dy = this.cy - n.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = d < this.coreR * 1.6 ? 320 : 90;
      n.vx += (dx / d) * pull * dt;
      n.vy += (dy / d) * pull * dt;
      // gentle swirl
      n.vx += (-dy / d) * 30 * dt;
      n.vy += (dx / d) * 30 * dt;
    }
    // repulsion so they pack rather than overlap
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i], b = ns[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = a.r + b.r;
      if (d < min) {
        const f = (min - d) / min * 600;
        const ux = dx / d, uy = dy / d;
        if (!a.drag) { a.vx -= ux * f * dt; a.vy -= uy * f * dt; }
        if (!b.drag) { b.vx += ux * f * dt; b.vy += uy * f * dt; }
      }
    }
    for (const n of ns) {
      if (n.drag) continue;
      n.vx *= 0.90; n.vy *= 0.90;
      n.x += n.vx * dt; n.y += n.vy * dt;
      // keep on screen
      n.x = Math.max(n.r, Math.min(game.W - n.r, n.x));
      n.y = Math.max(n.r + 56, Math.min(game.H - 168, n.y));
    }

    // fusion charge
    const { counts } = this.coreContents();
    const recipe = this.fusableRecipe(counts);
    if (recipe) {
      if (this.chargeSet !== recipe) { this.chargeSet = recipe; this.charge = 0; }
      this.charge += dt / 1.0;
      // charge particles spiral into core
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2, rr = this.coreR * (0.9 + Math.random() * 0.6);
        game.gl.spawn(this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr, {
          color: rgb01(el(recipe.out).glow), size: 16, alpha: 0.7,
          vx: -Math.cos(a) * 160, vy: -Math.sin(a) * 160, life: 0.5, drag: 0.9,
        });
      }
      if (this.charge >= 1) this.fuse(recipe, game);
    } else { this.chargeSet = null; this.charge = 0; }
  }

  fuse(recipe, game) {
    // consume one instance of each required input from inside the core
    const need = {};
    recipe.in.forEach(s => need[s] = (need[s] || 0) + 1);
    const keep = [];
    const consumed = [];
    for (const n of this.nuclei) {
      const inside = Math.hypot(n.x - this.cx, n.y - this.cy) < this.coreR;
      if (inside && need[n.sym] > 0) { need[n.sym]--; consumed.push(n); }
      else keep.push(n);
    }
    this.nuclei = keep;
    this.charge = 0; this.chargeSet = null;

    // flash
    game.sfx.fuse();
    game.gl.burst(this.cx, this.cy, 80, { color: rgb01(el(recipe.out).glow), speed: 280, size: 36, life: 1.1, alpha: 0.95 });
    game.gl.burst(this.cx, this.cy, 40, { color: [1, 1, 1], speed: 120, size: 20, life: 0.7, alpha: 0.9 });

    // product nucleus
    const prod = this.spawnNucleus(recipe.out, this.cx, this.cy);
    prod.vx = (Math.random() - 0.5) * 40; prod.vy = -60;
    this.nuclei.push(prod);

    const isNew = game.discoverElement(recipe.out);
    import('../ui/hud.js').then(UI => {
      UI.toast(game, {
        kind: 'element', sym: recipe.out,
        title: isNew ? `Forged ${el(recipe.out).name}` : el(recipe.out).name,
        sub: recipe.name,
        fact: isNew ? el(recipe.out).fact : recipe.note,
      });
    });
    this.layout(game);
  }

  render(ctx, game) {
    // core crucible glow ring
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 1.6);
    const cg = ctx.createRadialGradient(this.cx, this.cy, this.coreR * 0.2, this.cx, this.cy, this.coreR * 1.25);
    const charge = this.charge;
    cg.addColorStop(0, `rgba(255,220,150,${0.10 + charge * 0.25})`);
    cg.addColorStop(0.6, `rgba(120,180,255,${0.05 + charge * 0.12})`);
    cg.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.coreR * 1.25, 0, Math.PI * 2); ctx.fill();
    // dashed core boundary
    ctx.strokeStyle = `rgba(180,220,255,${0.18 + pulse * 0.12})`;
    ctx.lineWidth = 1.5; ctx.setLineDash([3, 10]);
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // label inside core when empty
    if (this.nuclei.length === 0) {
      ctx.fillStyle = 'rgba(220,235,255,0.5)';
      ctx.font = '500 15px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drag hydrogen into the core', this.cx, this.cy - 6);
      ctx.fillStyle = 'rgba(220,235,255,0.32)';
      ctx.font = '400 13px "Outfit", system-ui, sans-serif';
      ctx.fillText('gravity will do the rest', this.cx, this.cy + 16);
    }

    // nuclei
    for (const n of this.nuclei) drawAtom(ctx, n.x, n.y, n.sym, { hungry: false, pulse: n.drag ? 0.4 : 0 });

    // source tray
    for (const c of this.chips) this.drawChip(ctx, c, game);
  }

  drawChip(ctx, c, game) {
    ctx.save();
    const e = el(c.sym);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * 1.8);
    g.addColorStop(0, hexA(e.glow, 0.3)); g.addColorStop(1, hexA(e.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawAtom(ctx, c.x, c.y, c.sym, { r: c.r });
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    ctx.font = '500 11px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(el(c.sym).name, c.x, c.y + c.r + 16);
  }
}
