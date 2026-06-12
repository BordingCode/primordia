// cell.js — Protocell survival sim. Your protocell drifts in a warm pool; its energy
// drains. Tap to release nutrients (a limited, regenerating supply). Cells seek food,
// grow, and divide — but starve and DIE if unfed. Grow a colony to seed the world.
import { hexA, rgb01 } from '../render/molecules.js';

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
  }

  enter(game) {
    game.gl.setNebula({ colA: [0.06, 0.20, 0.30], colB: [0.10, 0.30, 0.26], intensity: 0.9, focus: [0.5, 0.45] });
    this.layout(game);
    if (!this.started && game.hasItem('protocell')) { this.spawnCell(this.cx, this.cy, 0.88); this.started = true; }
  }
  layout(game) {
    this.cx = game.W / 2; this.cy = game.H * 0.44;
    this.R = Math.min(game.W * 0.46, game.H * 0.34);
  }
  resize(game) { this.layout(game); }

  spawnCell(x, y, energy = 0.7) {
    this.cells.push({ x, y, vx: 0, vy: 0, energy, size: 20 + Math.random() * 2, wob: Math.random() * 6, dead: 0 });
  }

  onDown(x, y, game) {
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

  update(dt, game) {
    // food budget regen
    this.regen += dt;
    if (this.regen > 1.7 && this.foodBudget < this.foodMax) { this.foodBudget++; this.regen = 0; }
    this.deathMsgT = Math.max(0, this.deathMsgT - dt);

    // food decay + clamp to dish
    for (let i = this.food.length - 1; i >= 0; i--) {
      const f = this.food[i]; f.life -= dt;
      if (f.life <= 0) this.food.splice(i, 1);
    }

    for (const c of this.cells) {
      if (c.dead) { c.dead += dt; continue; }
      // energy drain scales gently with crowding
      c.energy -= (0.030 + this.cells.length * 0.0013) * dt;
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
      // eat
      for (let i = this.food.length - 1; i >= 0; i--) {
        const f = this.food[i];
        if (Math.hypot(f.x - c.x, f.y - c.y) < c.size + 8) {
          this.food.splice(i, 1);
          c.energy = Math.min(1, c.energy + 0.16);
          c.size = Math.min(28, c.size + 0.5);
          game.gl.spawn(c.x, c.y, { color: [0.6, 1, 0.8], size: 14, alpha: 0.7, life: 0.4 });
        }
      }
      // divide — needs sustained feeding (size near full); both halves keep a healthy charge
      if (c.energy > 0.9 && c.size > 26 && this.cells.length < this.CAP) {
        c.energy = 0.5; c.size *= 0.72;
        const a = Math.random() * Math.PI * 2;
        this.spawnCell(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 20, 0.5);
        game.sfx.bond();
        game.gl.burst(c.x, c.y, 14, { color: [0.6, 1, 0.85], size: 14, speed: 70, life: 0.5, alpha: 0.7 });
      }
      // death
      if (c.energy <= 0) { c.dead = 0.001; game.gl.burst(c.x, c.y, 12, { color: [1, 0.5, 0.45], size: 14, speed: 60, life: 0.6, alpha: 0.7 }); }
    }
    // remove fully-faded dead cells
    this.cells = this.cells.filter(c => !(c.dead && c.dead > 1.0));
    const living = this.cells.filter(c => !c.dead);
    // colony perished
    if (this.started && living.length === 0) {
      this.deathMsgT = 3.2;
      import('../ui/hud.js').then(UI => UI.flash('The colony perished — a fresh protocell forms'));
      game.sfx.reject();
      this.food.length = 0; this.foodBudget = this.foodMax;
      this.spawnCell(this.cx, this.cy, 0.85);
    }
    // success
    if (!game.state.colonyReached && living.length >= this.TARGET) {
      game.state.colonyReached = true; game.persist();
      game.celebrate(this.cx, this.cy, '#a8ffe0'); game.sfx.discover();
      if (game.scenes.world) game.scenes.world.beginLife(game);
      import('../ui/hud.js').then(UI => { UI.refreshGoals(game); UI.flash('A living colony! The world stirs →'); });
    }
  }

  render(ctx, game) {
    const { cx, cy, R } = this;
    // dish
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.1);
    g.addColorStop(0, 'rgba(40,120,110,0.10)'); g.addColorStop(1, 'rgba(40,120,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,230,210,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // food
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.food) {
      const a = Math.min(1, f.life / 4);
      const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 8);
      fg.addColorStop(0, `rgba(150,255,200,${0.8 * a})`); fg.addColorStop(1, 'rgba(150,255,200,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // cells
    for (const c of this.cells) {
      const fade = c.dead ? Math.max(0, 1 - c.dead) : 1;
      this.drawCell(ctx, c, game.time, fade);
    }

    // empty hint
    if (!this.started) {
      ctx.fillStyle = 'rgba(220,235,255,0.6)'; ctx.font = '500 15px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Synthesise a protocell in the Lab first', cx, cy);
    } else {
      ctx.fillStyle = 'rgba(220,235,255,0.55)'; ctx.font = '500 13px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Tap in the pool to release nutrients', cx, cy + R + 30);
    }

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

  drawCell(ctx, c, t, fade) {
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
    // membrane (wobbling)
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
    ctx.lineWidth = 2; ctx.strokeStyle = hexA(col, 0.8); ctx.stroke();
    // inner RNA squiggle
    ctx.strokeStyle = hexA('#bfefff', 0.7); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = k / 10 * Math.PI * 2, rr = r * 0.45 * (0.6 + 0.4 * Math.sin(a * 2 + t * 3 + c.wob));
      const px = x + Math.cos(a + t) * rr, py = y + Math.sin(a + t) * rr;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}
