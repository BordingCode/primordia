// world.js — the living world-seed. A young planet that visibly grows an
// atmosphere and oceans from the molecules you discover.
import { hexA, rgb01 } from '../render/molecules.js';
import { MOLECULES } from '../data/recipes.js';

export class WorldScene {
  constructor() {
    this.title = 'The World';
    this.ripples = [];
    this.clouds = [];
    for (let i = 0; i < 7; i++) this.clouds.push({ a: Math.random() * Math.PI * 2, w: 0.3 + Math.random() * 0.5, sp: 0.05 + Math.random() * 0.1, r: 0.6 + Math.random() * 0.35 });
  }
  enter(game) {
    game.gl.setNebula({ colA: [0.06, 0.10, 0.30], colB: [0.10, 0.35, 0.45], intensity: 0.85, focus: [0.5, 0.45] });
    this.layout(game);
  }
  layout(game) { this.cx = game.W / 2; this.cy = game.H * 0.45; this.R = Math.min(game.W, game.H) * 0.26; }
  resize(game) { this.layout(game); }

  has(id) { return this._game && this._game.hasMolecule(id); }

  onMoleculeDiscovered(id) {
    this.ripples.push({ t: 0, max: 2.2 });
    if (this._game) {
      const mol = MOLECULES.find(m => m.id === id);
      const col = id === 'H2O' ? '#54d7ff' : id === 'O2' ? '#9fffd6' : '#ffd66b';
      this._game.gl.burst(this.cx, this.cy - this.R * 0.2, 40, { color: rgb01(col), size: 26, speed: 160, life: 1.2, alpha: 0.8 });
    }
  }

  update(dt, game) {
    this._game = game;
    for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > this.ripples[i].max) this.ripples.splice(i, 1); }
    for (const c of this.clouds) c.a += c.sp * dt;
    // ambient atmosphere motes if there's an atmosphere
    if (this.atmosphereLevel(game) > 0 && Math.random() < 0.25) {
      const a = Math.random() * Math.PI * 2;
      game.gl.spawn(this.cx + Math.cos(a) * this.R * 1.15, this.cy + Math.sin(a) * this.R * 1.15, {
        color: rgb01(this.atmoColor(game)), size: 10, alpha: 0.35, life: 1.4, vx: -Math.cos(a) * 10, vy: -Math.sin(a) * 10, drag: 0.98,
      });
    }
  }

  atmosphereLevel(game) {
    return ['CO2', 'CH4', 'NH3', 'N2', 'O2'].filter(id => game.hasMolecule(id)).length;
  }
  atmoColor(game) {
    if (game.hasMolecule('O2')) return '#bfe9ff';     // oxygen-tinged blue
    if (game.hasMolecule('N2')) return '#bcd0ff';     // thicker nitrogen sky
    if (game.hasMolecule('CH4') || game.hasMolecule('NH3')) return '#ffc27a'; // hazy reducing
    if (game.hasMolecule('CO2')) return '#e8b48a';
    return '#caa0ff';
  }

  render(ctx, game) {
    const { cx, cy, R } = this;
    const hasWater = game.hasMolecule('H2O');
    const atmo = this.atmosphereLevel(game);
    const atmoCol = this.atmoColor(game);

    // atmosphere limb glow
    if (atmo > 0 || hasWater) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const thick = 0.18 + atmo * 0.06;
      const ag = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * (1.0 + thick + 0.2));
      ag.addColorStop(0, hexA(atmoCol, 0.0));
      ag.addColorStop(0.5, hexA(atmoCol, 0.28 + atmo * 0.04));
      ag.addColorStop(1, hexA(atmoCol, 0));
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R * (1.2 + thick), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // planet body
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    // base rock
    const rock = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.3);
    if (hasWater) { rock.addColorStop(0, '#3a6e7a'); rock.addColorStop(0.6, '#22424f'); rock.addColorStop(1, '#101c26'); }
    else { rock.addColorStop(0, '#6e4a3a'); rock.addColorStop(0.6, '#3f2a22'); rock.addColorStop(1, '#1c1310'); }
    ctx.fillStyle = rock; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // oceans
    if (hasWater) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const oy = cy + R * (0.1 + k * 0.25);
        const og = ctx.createRadialGradient(cx, oy, 0, cx, oy, R * 0.9);
        og.addColorStop(0, 'rgba(70,170,220,0.30)'); og.addColorStop(1, 'rgba(70,170,220,0)');
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, oy, R * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // cloud bands if atmosphere
    if (atmo > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (const c of this.clouds) {
        const px = cx + Math.cos(c.a) * R * c.r;
        const py = cy + Math.sin(c.a * 0.6) * R * 0.5;
        const cg = ctx.createRadialGradient(px, py, 0, px, py, R * c.w);
        cg.addColorStop(0, hexA(atmoCol, 0.18)); cg.addColorStop(1, hexA(atmoCol, 0));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(px, py, R * c.w, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // day/night terminator
    const term = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    term.addColorStop(0, 'rgba(0,0,0,0)'); term.addColorStop(0.6, 'rgba(0,0,0,0.15)'); term.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = term; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // rim light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(atmoCol === '#caa0ff' ? '#88aaff' : atmoCol, 0.5); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, -0.9, 1.4); ctx.stroke();
    ctx.restore();

    // ripples on discovery
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of this.ripples) {
      const p = r.t / r.max;
      ctx.strokeStyle = `rgba(150,230,255,${(1 - p) * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * (1 + p * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // progress caption
    const total = MOLECULES.length;
    const done = game.state.discoveredMolecules.length;
    ctx.fillStyle = 'rgba(220,235,255,0.85)';
    ctx.font = '600 17px "Outfit", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.captionTitle(game, done, total), cx, cy + R + 48);
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.font = '400 13px "Outfit", system-ui, sans-serif';
    ctx.fillText(this.captionSub(game, done, total), cx, cy + R + 72);
  }

  captionTitle(game, done, total) {
    if (done >= total) return 'The stage is set for life';
    if (!game.hasMolecule('H2O')) return 'A barren young world';
    return 'Oceans and skies are forming';
  }
  captionSub(game, done, total) {
    if (done >= total) return 'Every ingredient of life is ready — the next era awaits';
    return `${done} / ${total} molecules seeded into the world`;
  }
}
