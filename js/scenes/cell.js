// cell.js — Protocell survival sim. Your protocell drifts in a warm pool; its energy
// drains. Tap to release nutrients (a limited, regenerating supply). Cells seek food,
// grow, and divide — but starve and DIE if unfed. Grow a colony to seed the world.
//
// The three inventions you assembled in the Lab each do a DISTINCT, felt job here, so the
// parts you spent an hour making finally matter mechanically:
//   • Membrane — the wall: less energy leaks out, and it shields the colony from UV flares.
//   • Enzymes (protein) — the workers: wring more energy from every bite of food.
//   • RNA — the copier: a well-fed cell divides sooner.
// You spend Insight (the discovery currency, otherwise idle by now) to upgrade whichever is
// your weak link. A recurring UV flare (early Earth had no ozone) is the real stakes.
import { hexA, rgb01 } from '../render/molecules.js';

const UP_MAX = 3;                 // extra levels each invention can be raised
const HAZ_COOLDOWN = 18;          // seconds of calm between UV flares
const HAZ_WARN = 3.4;             // telegraph time before a flare strikes

// Each upgrade has its own colour (matching the Lab item), a short name + felt effect.
const UPGRADES = [
  { key: 'membrane', name: 'Membrane', effect: 'less energy leaks', color: '#7fd0ff' },
  { key: 'protein',  name: 'Enzymes',  effect: '+energy per feed',  color: '#54d7ff' },
  { key: 'rna',      name: 'RNA',      effect: 'divides sooner',    color: '#8ef0d0' },
];

export class CellScene {
  constructor() {
    this.title = 'First Life';
    this.TARGET = 8;
    this.CAP = 24;
    this.cells = [];
    this.food = [];
    this.foodBudget = 6; this.foodMax = 6; this.regen = 0;
    this.started = false;
    this.deathMsgT = 0;
    this.haz = { phase: 'cooldown', t: 0 };   // UV-flare hazard state machine
    this.uvFlashT = 0;                          // brief white-purple flash on a strike
    this.upBtns = [];
  }

  enter(game) {
    game.gl.setNebula({ colA: [0.06, 0.20, 0.30], colB: [0.10, 0.30, 0.26], intensity: 0.9, focus: [0.5, 0.45] });
    // make sure the upgrade record exists (older saves predate it)
    if (!game.state.cellUpgrades) game.state.cellUpgrades = { membrane: 0, protein: 0, rna: 0 };
    this.layout(game);
    if (!this.started && game.hasItem('protocell')) { this.spawnCell(this.cx, this.cy, 0.88); this.started = true; }
    game.coachOnce('cell_parts', { kind: 'hint', title: 'Your three inventions',
      sub: 'A protocell is a Membrane, an RNA copier and protein Enzymes. Spend insight (top-right ✦) to upgrade each — the Membrane stops energy leaking and shields from UV, Enzymes pull more energy from food, RNA divides sooner.' });
  }

  layout(game) {
    this.cx = game.W / 2; this.cy = game.H * 0.42;
    this.R = Math.min(game.W * 0.46, game.H * 0.32);
    // three upgrade buttons in a row above the nutrient HUD
    const by = game.H - 206, h = 60, pad = 14, gap = 8;
    const bw = (game.W - pad * 2 - gap * 2) / 3;
    this.upBtns = UPGRADES.map((u, i) => ({ ...u, x: pad + bw / 2 + i * (bw + gap), y: by, w: bw, h }));
  }
  resize(game) { this.layout(game); }

  spawnCell(x, y, energy = 0.7) {
    this.cells.push({ x, y, vx: 0, vy: 0, energy, size: 20 + Math.random() * 2, wob: Math.random() * 6, dead: 0 });
  }

  // ---- the inventions' effects, derived from purchased levels ----
  ups(game) { const u = game.state.cellUpgrades || {}; return { m: u.membrane || 0, p: u.protein || 0, r: u.rna || 0 }; }
  drainFactor(game) { return 1 - 0.16 * this.ups(game).m; }     // membrane: 1 → 0.52
  foodGain(game)    { return 0.16 * (1 + 0.35 * this.ups(game).p); } // enzymes: 0.16 → 0.328
  divideEnergy(game){ return 0.9 - 0.05 * this.ups(game).r; }   // rna: 0.90 → 0.75
  divideSize(game)  { return 26 - 1.2 * this.ups(game).r; }     // rna: 26 → 22.4
  uvMitigation(game){ return Math.min(0.78, 0.22 * this.ups(game).m); } // membrane shields UV
  upCost(level) { return 10 * (level + 1); }                    // 10, 20, 30

  onDown(x, y, game) {
    // upgrade buttons first (they sit over the lower pool edge)
    for (const b of this.upBtns) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { this.buyUpgrade(b.key, game); return; }
    }
    if (Math.hypot(x - this.cx, y - this.cy) > this.R) return;
    if (this.foodBudget < 1) { import('../ui/hud.js').then(UI => UI.flash('No nutrients left — they’re replenishing')); game.sfx.reject(); return; }
    this.foodBudget -= 1;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 38;
      this.food.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, life: 15 });
    }
    game.sfx.pickup();
    game.gl.spawn(x, y, { color: [0.6, 1, 0.8], size: 22, alpha: 0.6, life: 0.5 });
  }
  onMove() {} onUp() {}

  buyUpgrade(key, game) {
    const cur = (game.state.cellUpgrades[key] || 0);
    const u = UPGRADES.find(z => z.key === key);
    if (cur >= UP_MAX) { import('../ui/hud.js').then(UI => UI.flash(`${u.name} is fully evolved`)); game.sfx.reject(); return; }
    const cost = this.upCost(cur);
    if (!game.spend(cost)) { import('../ui/hud.js').then(UI => UI.flash(`Need ✦${cost} insight for ${u.name}`)); game.sfx.reject(); return; }
    game.state.cellUpgrades[key] = cur + 1; game.persist();
    game.sfx.discover();
    // a felt pulse over the whole colony so the upgrade is something you SEE
    for (const c of this.cells) if (!c.dead) game.gl.burst(c.x, c.y, 8, { color: rgb01(u.color), size: 12, speed: 60, life: 0.5, alpha: 0.7 });
    import('../ui/hud.js').then(UI => UI.flash(`${u.name} evolved · ${u.effect}`));
  }

  update(dt, game) {
    // food budget regen
    this.regen += dt;
    if (this.regen > 1.7 && this.foodBudget < this.foodMax) { this.foodBudget++; this.regen = 0; }
    this.deathMsgT = Math.max(0, this.deathMsgT - dt);
    if (this.uvFlashT > 0) this.uvFlashT -= dt;

    // food decay
    for (let i = this.food.length - 1; i >= 0; i--) {
      const f = this.food[i]; f.life -= dt;
      if (f.life <= 0) this.food.splice(i, 1);
    }

    const drainFactor = this.drainFactor(game);
    const foodGain = this.foodGain(game);
    const divEnergy = this.divideEnergy(game), divSize = this.divideSize(game);

    for (const c of this.cells) {
      if (c.dead) { c.dead += dt; continue; }
      // energy drain — a leaky wall costs more; a crowd costs more; a strong membrane saves you
      c.energy -= (0.052 * drainFactor + this.cells.length * 0.0024) * dt;
      // seek nearest food
      let best = null, bd = 1e9;
      for (const f of this.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
      if (best && bd < 270) {
        const ux = (best.x - c.x) / bd, uy = (best.y - c.y) / bd;
        c.vx += ux * 60 * dt; c.vy += uy * 60 * dt;
      } else {
        c.vx += (Math.random() - 0.5) * 14 * dt; c.vy += (Math.random() - 0.5) * 14 * dt;
      }
      c.vx *= 0.92; c.vy *= 0.92;
      c.x += c.vx * dt; c.y += c.vy * dt;
      // keep inside dish
      const dd = Math.hypot(c.x - this.cx, c.y - this.cy);
      if (dd > this.R - c.size) { const ux = (c.x - this.cx) / dd, uy = (c.y - this.cy) / dd; c.x = this.cx + ux * (this.R - c.size); c.y = this.cy + uy * (this.R - c.size); c.vx *= -0.4; c.vy *= -0.4; }
      // eat — enzymes decide how much energy each bite is worth
      for (let i = this.food.length - 1; i >= 0; i--) {
        const f = this.food[i];
        if (Math.hypot(f.x - c.x, f.y - c.y) < c.size + 8) {
          this.food.splice(i, 1);
          c.energy = Math.min(1, c.energy + foodGain);
          c.size = Math.min(28, c.size + 0.5);
          game.gl.spawn(c.x, c.y, { color: [0.6, 1, 0.8], size: 14, alpha: 0.7, life: 0.4 });
        }
      }
      // divide — RNA lets a well-fed cell split sooner
      if (c.energy > divEnergy && c.size > divSize && this.cells.length < this.CAP) {
        c.energy = 0.5; c.size *= 0.72;
        const a = Math.random() * Math.PI * 2;
        this.spawnCell(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 20, 0.5);
        game.sfx.bond();
        game.gl.burst(c.x, c.y, 14, { color: [0.6, 1, 0.85], size: 14, speed: 70, life: 0.5, alpha: 0.7 });
      }
      // death
      if (c.energy <= 0) { c.dead = 0.001; game.gl.burst(c.x, c.y, 12, { color: [1, 0.5, 0.45], size: 14, speed: 60, life: 0.6, alpha: 0.7 }); }
    }

    this.updateHazard(dt, game);

    // remove fully-faded dead cells
    this.cells = this.cells.filter(c => !(c.dead && c.dead > 1.0));
    const living = this.cells.filter(c => !c.dead);
    // colony perished
    if (this.started && living.length === 0) {
      this.deathMsgT = 3.2;
      game.state.coloniesLost = (game.state.coloniesLost || 0) + 1; game.persist();
      import('../ui/hud.js').then(UI => UI.flash(`The colony perished (lost: ${game.state.coloniesLost}) — begin again from a single cell`));
      game.sfx.reject();
      // A real setback: you lose the colony and the nutrient pool isn't handed back full. Your
      // bought upgrades are kept (you paid insight for them) — so you restart wiser, not poorer.
      this.food.length = 0;
      this.foodBudget = Math.max(this.foodBudget, 2);
      this.haz = { phase: 'cooldown', t: 0 };
      this.spawnCell(this.cx, this.cy, 0.8);
    }
    // success
    if (!game.state.colonyReached && living.length >= this.TARGET) {
      game.state.colonyReached = true; game.persist();
      game.celebrate(this.cx, this.cy, '#a8ffe0'); game.sfx.discover();
      if (game.scenes.world) game.scenes.world.beginLife(game);
      import('../ui/hud.js').then(UI => { UI.refreshGoals(game); UI.flash('A living colony! The world stirs →'); });
    }
  }

  // UV flares: early Earth had no ozone, so brutal ultraviolet periodically swept the seas.
  // It drains every cell — a strong membrane shields them. Real stakes, taught by consequence.
  updateHazard(dt, game) {
    const living = this.cells.filter(c => !c.dead).length;
    const h = this.haz;
    h.t += dt;
    if (h.phase === 'cooldown') {
      if (h.t > HAZ_COOLDOWN && living >= 2) {
        h.phase = 'warn'; h.t = 0;
        game.sfx.reject();
        game.coachOnce('cell_uv', { kind: 'hint', title: 'A UV flare is coming',
          sub: 'Early Earth had no ozone layer, so raw ultraviolet scoured the seas. It drains every cell. A stronger Membrane is your shield — upgrade it.' });
        import('../ui/hud.js').then(UI => UI.flash('☼ UV flare building — brace the colony'));
      }
    } else if (h.phase === 'warn') {
      if (h.t > HAZ_WARN) {
        h.phase = 'cooldown'; h.t = 0;
        this.strikeUV(game);
      }
    }
  }

  strikeUV(game) {
    const drain = 0.30 * (1 - this.uvMitigation(game));
    this.uvFlashT = 0.5;
    game.sfx.fuse();
    for (const c of this.cells) {
      if (c.dead) continue;
      c.energy -= drain;
      game.gl.spawn(c.x, c.y, { color: rgb01('#c9a8ff'), size: 16, alpha: 0.7, life: 0.5, vy: -30 });
    }
    game.gl.burst(this.cx, this.cy, 30, { color: rgb01('#c9a8ff'), size: 20, speed: 180, life: 0.8, alpha: 0.6 });
  }

  render(ctx, game) {
    const { cx, cy, R } = this;
    const warn = this.haz.phase === 'warn';
    // dish
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.1);
    g.addColorStop(0, 'rgba(40,120,110,0.10)'); g.addColorStop(1, 'rgba(40,120,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,230,210,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // UV telegraph: a building purple haze over the pool during the warning window
    if (warn) {
      const p = Math.min(1, this.haz.t / HAZ_WARN);
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 10);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ug = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15);
      ug.addColorStop(0, `rgba(180,140,255,${0.04 + p * 0.18 * pulse})`);
      ug.addColorStop(1, 'rgba(180,140,255,0)');
      ctx.fillStyle = ug; ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // food
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.food) {
      const a = Math.min(1, f.life / 4);
      const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 8);
      fg.addColorStop(0, `rgba(150,255,200,${0.8 * a})`); fg.addColorStop(1, 'rgba(150,255,200,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // cells (a thicker, brighter membrane reads the membrane upgrade level)
    const memLevel = this.ups(game).m;
    for (const c of this.cells) {
      const fade = c.dead ? Math.max(0, 1 - c.dead) : 1;
      this.drawCell(ctx, c, game.time, fade, memLevel);
    }

    // UV strike flash — a brief screen-wide violet wash
    if (this.uvFlashT > 0) {
      ctx.save(); ctx.fillStyle = `rgba(180,150,255,${0.4 * (this.uvFlashT / 0.5)})`;
      ctx.fillRect(0, 0, game.W, game.H); ctx.restore();
    }

    // empty hint
    if (!this.started) {
      ctx.fillStyle = 'rgba(220,235,255,0.6)'; ctx.font = '500 15px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Synthesise a protocell in the Lab first', cx, cy);
    } else {
      ctx.fillStyle = 'rgba(220,235,255,0.5)'; ctx.font = '500 12px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Tap the pool to feed · evolve your inventions below', cx, cy + R + 16);
    }

    // upgrade buttons
    if (this.started) for (const b of this.upBtns) this.drawUpgrade(ctx, b, game);

    // HUD: colony + nutrient budget
    const living = this.cells.filter(c => !c.dead).length;
    ctx.fillStyle = 'rgba(168,255,224,0.95)'; ctx.font = '700 16px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`⬭ ${living} / ${this.TARGET}`, 18, game.H - 150);
    // nutrient pips
    ctx.font = '600 12px "Outfit", system-ui, sans-serif'; ctx.fillStyle = 'rgba(150,255,200,0.8)';
    ctx.fillText('nutrients', 18, game.H - 128);
    for (let i = 0; i < this.foodMax; i++) {
      ctx.beginPath(); ctx.arc(90 + i * 16, game.H - 132, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < this.foodBudget ? 'rgba(150,255,200,0.9)' : 'rgba(150,255,200,0.18)'; ctx.fill();
    }
  }

  drawUpgrade(ctx, b, game) {
    const level = (game.state.cellUpgrades[b.key] || 0);
    const maxed = level >= UP_MAX;
    const cost = this.upCost(level);
    const afford = maxed || game.state.insight >= cost;
    const x = b.x, y = b.y, w = b.w, h = b.h, rad = 10;
    ctx.save();
    // panel
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + rad, y - h / 2);
    ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, rad);
    ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, rad);
    ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, rad);
    ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, rad);
    ctx.closePath();
    ctx.fillStyle = afford ? hexA(b.color, 0.12) : 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = hexA(b.color, afford ? 0.7 : 0.28); ctx.stroke();
    // name
    ctx.textAlign = 'center';
    ctx.fillStyle = hexA(b.color, 0.95); ctx.font = '700 13px "Outfit", system-ui, sans-serif';
    ctx.fillText(b.name, x, y - h / 2 + 16);
    // effect
    ctx.fillStyle = 'rgba(220,235,255,0.6)'; ctx.font = '400 10px "Outfit", system-ui, sans-serif';
    ctx.fillText(b.effect, x, y - h / 2 + 30);
    // level pips
    const pipY = y + h / 2 - 18, pipGap = 12, pipX0 = x - pipGap;
    for (let i = 0; i < UP_MAX; i++) {
      ctx.beginPath(); ctx.arc(pipX0 + i * pipGap, pipY, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = i < level ? hexA(b.color, 0.95) : hexA(b.color, 0.2); ctx.fill();
    }
    // cost / maxed
    ctx.font = '600 11px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = maxed ? hexA(b.color, 0.85) : afford ? 'rgba(255,235,150,0.95)' : 'rgba(255,150,140,0.85)';
    ctx.fillText(maxed ? 'evolved' : `✦${cost}`, x, y + h / 2 - 4);
    ctx.restore();
  }

  drawCell(ctx, c, t, fade, memLevel = 0) {
    const x = c.x, y = c.y, r = c.size;
    const col = c.energy > 0.5 ? '#7fffd0' : c.energy > 0.25 ? '#ffe08a' : '#ff9a7a';
    ctx.save(); ctx.globalAlpha = fade;
    // glow
    ctx.globalCompositeOperation = 'lighter';
    const gr = r * 2.0;
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, gr);
    g.addColorStop(0, hexA(col, 0.3)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // membrane (wobbling) — a reinforced wall is drawn thicker & with a faint blue shield ring
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.4) {
      const wob = 1 + 0.06 * Math.sin(a * 3 + t * 2 + c.wob);
      const px = x + Math.cos(a) * r * wob, py = y + Math.sin(a) * r * wob;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const mg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    mg.addColorStop(0, hexA(col, 0.20)); mg.addColorStop(1, hexA(col, 0.04));
    ctx.fillStyle = mg; ctx.fill();
    ctx.lineWidth = 2 + memLevel * 0.9; ctx.strokeStyle = hexA(col, 0.8); ctx.stroke();
    if (memLevel > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.5; ctx.strokeStyle = hexA('#7fd0ff', 0.18 + memLevel * 0.08);
      ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // inner RNA squiggle
    ctx.strokeStyle = hexA('#bfefff', 0.7); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = k / 10 * Math.PI * 2, rr = r * 0.45 * (0.6 + 0.4 * Math.sin(a * 2 + t * 3 + c.wob));
      const px = x + Math.cos(a + t) * rr, py = y + Math.sin(a + t) * rr;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    // energy ring — you can SEE at a glance which cells are starving
    ctx.globalCompositeOperation = 'source-over';
    const a0 = -Math.PI / 2;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA('#ffffff', 0.12);
    ctx.beginPath(); ctx.arc(x, y, r * 1.28, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = hexA(col, 0.95);
    ctx.beginPath(); ctx.arc(x, y, r * 1.28, a0, a0 + Math.PI * 2 * Math.max(0.03, c.energy)); ctx.stroke();
    // danger telegraph — a starving cell flashes red so a death is never a surprise
    if (!c.dead && c.energy < 0.28) {
      const p = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,90,70,${0.35 + p * 0.5})`; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
