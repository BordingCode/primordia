// world.js — the living world. A young planet that grows an atmosphere & oceans from the
// molecules you discover, and — once a protocell colony takes hold — bursts into life:
// green spreads, photosynthesis fills the air with oxygen, and the world breathes.
import { hexA, rgb01 } from '../render/molecules.js';
import { MOLECULES } from '../data/recipes.js';

const CRISIS_O2 = 0.48;   // O₂ fraction that first tips the world into the oxygen catastrophe

export class WorldScene {
  constructor() {
    this.title = 'The World';
    this.ripples = [];
    this.clouds = [];
    this.lifeSpots = [];
    this.life = 0;             // 0..1 coverage of life
    this.oxygen = 0;           // 0..1 atmospheric O₂ — breathed out by photosynthetic life
    this.crisis = null;        // {t} during the Great Oxygenation die-off animation
    this.aerobic = false;      // life has adapted to oxygen (survived the catastrophe)
    this.finale = false;
    this.tapCD = 0;            // tap cooldown so the finale can't be spam-filled
    for (let i = 0; i < 7; i++) this.clouds.push({ a: Math.random() * Math.PI * 2, w: 0.3 + Math.random() * 0.5, sp: 0.04 + Math.random() * 0.08, r: 0.6 + Math.random() * 0.35 });
  }
  enter(game) {
    this._game = game;
    if (game.state.lifeBegun) this.lifeBegun = true;
    // The oxygen catastrophe is a one-time historical event. If it already happened in a past
    // visit, the returning world is already aerobic — it greens straight to the finale.
    if (game.state.oxygenCrisisSeen) this.aerobic = true;
    if (game.state.colonyReached && this.lifeSpots.length === 0) this.beginLife(game, true);
    game.gl.setNebula({ colA: [0.06, 0.10, 0.30], colB: [0.10, 0.35, 0.45], intensity: 0.85, focus: [0.5, 0.45] });
    this.layout(game);
  }
  layout(game) { this.cx = game.W / 2; this.cy = game.H * 0.45; this.R = Math.min(game.W, game.H) * 0.26; }
  resize(game) { this.layout(game); }

  onDiscovery(id, game) {
    this.ripples.push({ t: 0, max: 2.2 });
    const col = id === 'H2O' ? '#54d7ff' : id === 'O2' ? '#9fffd6' : '#ffd66b';
    game.gl.burst(this.cx, this.cy - this.R * 0.2, 36, { color: rgb01(col), size: 24, speed: 150, life: 1.1, alpha: 0.8 });
  }

  beginLife(game, silent = false) {
    this.lifeBegun = true; game.state.lifeBegun = true; game.persist();
    if (this.lifeSpots.length === 0) {
      for (let i = 0; i < 4; i++) this.lifeSpots.push(this.randomSpot());
    }
    if (!silent) { this.ripples.push({ t: 0, max: 3 }); }
  }
  randomSpot() {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.8;
    return { ox: Math.cos(a) * r, oy: Math.sin(a * 0.7) * r * 0.7, s: 0.05 + Math.random() * 0.08 };
  }

  onDown(x, y, game) {
    if (!this.lifeBegun) return;
    if (this.tapCD > 0) return;               // rate-limit so life is grown, not spam-filled
    if (Math.hypot(x - this.cx, y - this.cy) < this.R) {
      this.tapCD = 0.22;
      // During the oxygen catastrophe your help barely tells — the world is dying back. After
      // it, life is aerobic and your taps green it for good.
      const dying = !!this.crisis;
      this.life = Math.min(1, this.life + (dying ? 0.002 : 0.014));
      if (!dying && this.lifeSpots.length < 26) this.lifeSpots.push(this.randomSpot());
      game.gl.burst(x, y, 16, { color: dying ? [1, 0.55, 0.45] : [0.5, 1, 0.6], size: 14, speed: 80, life: 0.6, alpha: 0.8 });
      game.sfx.pickup();
    }
  }
  onMove() {} onUp() {}

  atmosphereLevel(game) { return ['CO2', 'CH4', 'NH3', 'N2', 'O2'].filter(id => game.hasMolecule(id)).length; }
  atmoColor(game) {
    if (this.oxygen > 0.3 || this.aerobic) return '#bfe9ff';   // an oxygen-rich, blue sky
    if (game.hasMolecule('N2')) return '#bcd0ff';
    if (game.hasMolecule('CH4') || game.hasMolecule('NH3')) return '#ffc27a';
    if (game.hasMolecule('CO2')) return '#e8b48a';
    return '#caa0ff';
  }

  // The Great Oxygenation Event: the oxygen photosynthetic life breathes out was poison to
  // most early life. The world dies back — then a hardy, oxygen-adapted remnant inherits it.
  triggerOxygenCrisis(game) {
    this.crisis = { t: 0 };
    game.state.oxygenCrisisSeen = true; game.persist();
    // a real die-off: most of the green world is lost
    this.life = Math.max(0.18, this.life * 0.38);
    for (const s of this.lifeSpots) s.s *= 0.4;
    this.lifeSpots = this.lifeSpots.filter((_, i) => i % 3 !== 0);   // ~a third wiped out
    game.gl.burst(this.cx, this.cy, 70, { color: rgb01('#ff6a4a'), speed: 240, size: 24, life: 1.4, alpha: 0.9 });
    game.sfx.reject();
    import('../ui/hud.js').then(UI => UI.flash('☠ The Great Oxygenation — the oxygen life breathed out is poison to it. Most of the world dies off.'));
  }

  update(dt, game) {
    this._game = game;
    for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > this.ripples[i].max) this.ripples.splice(i, 1); }
    for (const c of this.clouds) c.a += c.sp * dt;
    if (this.tapCD > 0) this.tapCD -= dt;

    // --- the oxygen catastrophe playing out: the world dies back before it adapts ---
    if (this.crisis) {
      this.crisis.t += dt;
      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2, rr = this.R * (0.4 + Math.random() * 0.6);
        game.gl.spawn(this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr, { color: rgb01('#ff7a52'), size: 12, alpha: 0.5, life: 0.9, vy: -20 });
      }
      for (const s of this.lifeSpots) s.s = Math.max(0.02, s.s - dt * 0.05);
      if (this.crisis.t > 2.6) {
        this.crisis = null; this.aerobic = true;
        game.sfx.discover();
        import('../ui/hud.js').then(UI => UI.flash('Life adapts — a hardy, oxygen-breathing world inherits the Earth. Tap to green it anew.'));
      }
      return;                 // normal growth is paused while the world reels
    }

    if (this.lifeBegun && this.life < 1) {
      // a richer atmosphere (more of the molecules you discovered) greens the world faster —
      // your Lab work pays off here, not just on the goal list.
      const boost = 0.006 + 0.004 * this.atmosphereLevel(game);
      this.life = Math.min(1, this.life + dt * boost);
      for (const s of this.lifeSpots) s.s = Math.min(0.5, s.s + dt * 0.02 * (0.5 + this.life));
      if (Math.random() < this.life * dt * 2 && this.lifeSpots.length < 26) this.lifeSpots.push(this.randomSpot());
    }
    // photosynthetic life breathes out oxygen — it builds up, lagging the green coverage
    if (this.lifeBegun && this.life > 0.12) {
      this.oxygen += (this.life * 0.95 - this.oxygen) * 0.35 * dt;
      this.oxygen = Math.max(0, Math.min(1, this.oxygen));
    }
    // The Great Oxygenation: the first time O₂ builds past the threshold, the world dies back.
    if (this.lifeBegun && !this.aerobic && !this.crisis && this.oxygen >= CRISIS_O2) {
      this.triggerOxygenCrisis(game);
      return;
    }
    // finale only after the world has weathered the oxygen catastrophe and re-greened
    if (this.lifeBegun && this.aerobic && this.life >= 0.999 && !this.finale) {
      this.finale = true;
      game.celebrate(this.cx, this.cy - this.R * 0.3, '#8effa8');
      game.gl.burst(this.cx, this.cy, 90, { color: [0.5, 1, 0.6], speed: 260, size: 26, life: 1.6, alpha: 0.9 });
      game.sfx.discover();
      import('../ui/hud.js').then(UI => UI.flash('A living world that breathes oxygen 🌍'));
    }
    if (this.lifeBegun && Math.random() < 0.3) {
      const a = Math.random() * Math.PI * 2;
      game.gl.spawn(this.cx + Math.cos(a) * this.R * 1.15, this.cy + Math.sin(a) * this.R * 1.15, {
        color: this.life > 0.4 ? [0.6, 1, 0.7] : rgb01(this.atmoColor(game)), size: 9, alpha: 0.3, life: 1.4, vx: -Math.cos(a) * 10, vy: -Math.sin(a) * 10, drag: 0.98,
      });
    }
  }

  render(ctx, game) {
    const { cx, cy, R } = this;
    const hasWater = game.hasMolecule('H2O');
    const atmo = this.atmosphereLevel(game);
    const atmoCol = this.atmoColor(game);

    // atmosphere limb glow
    if (atmo > 0 || hasWater || this.life > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const thick = 0.18 + atmo * 0.05 + this.life * 0.1;
      const ag = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * (1.0 + thick + 0.2));
      ag.addColorStop(0, hexA(atmoCol, 0)); ag.addColorStop(0.5, hexA(atmoCol, 0.28 + atmo * 0.04)); ag.addColorStop(1, hexA(atmoCol, 0));
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R * (1.2 + thick), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // planet body
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const rock = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.3);
    if (hasWater) { rock.addColorStop(0, '#3a6e7a'); rock.addColorStop(0.6, '#22424f'); rock.addColorStop(1, '#101c26'); }
    else { rock.addColorStop(0, '#6e4a3a'); rock.addColorStop(0.6, '#3f2a22'); rock.addColorStop(1, '#1c1310'); }
    ctx.fillStyle = rock; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

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

    // LIFE — green patches spreading across the surface
    if (this.lifeBegun) {
      for (const s of this.lifeSpots) {
        const px = cx + s.ox * R, py = cy + s.oy * R;
        const rad = R * s.s;
        const lg = ctx.createRadialGradient(px, py, 0, px, py, rad);
        lg.addColorStop(0, `rgba(90,210,110,${0.5 * this.life + 0.2})`);
        lg.addColorStop(0.7, `rgba(60,170,90,${0.3 * this.life})`);
        lg.addColorStop(1, 'rgba(60,170,90,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      }
    }

    // clouds
    if (atmo > 0 || this.life > 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      for (const c of this.clouds) {
        const px = cx + Math.cos(c.a) * R * c.r, py = cy + Math.sin(c.a * 0.6) * R * 0.5;
        const cg = ctx.createRadialGradient(px, py, 0, px, py, R * c.w);
        cg.addColorStop(0, hexA('#eaf6ff', 0.14)); cg.addColorStop(1, hexA('#eaf6ff', 0));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(px, py, R * c.w, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // terminator
    const term = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    term.addColorStop(0, 'rgba(0,0,0,0)'); term.addColorStop(0.6, 'rgba(0,0,0,0.15)'); term.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = term; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // rim light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(this.life > 0.4 ? '#9effc0' : atmoCol, 0.5); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, -0.9, 1.4); ctx.stroke();
    ctx.restore();

    // ripples
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of this.ripples) { const p = r.t / r.max; ctx.strokeStyle = `rgba(150,230,255,${(1 - p) * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + p * 0.6), 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();

    // caption
    ctx.fillStyle = 'rgba(220,235,255,0.9)'; ctx.font = '600 17px "Outfit", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.titleLine(game), cx, cy + R + 48);
    ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.font = '400 13px "Outfit", system-ui, sans-serif';
    ctx.fillText(this.subLine(game), cx, cy + R + 72);

    // the oxygen catastrophe: a fading red wash over the whole world
    if (this.crisis) {
      const a = Math.max(0, 0.45 - this.crisis.t * 0.12);
      ctx.save(); ctx.fillStyle = `rgba(180,45,25,${a})`; ctx.fillRect(0, 0, game.W, game.H); ctx.restore();
    }
  }

  titleLine(game) {
    if (this.finale) return 'A living world';
    if (this.crisis) return 'The Great Oxygenation';
    if (this.lifeBegun) {
      if (this.aerobic) return this.life > 0.5 ? 'An oxygen world greens anew' : 'A hardy world recovers';
      return this.life > 0.5 ? 'Life is greening the world' : 'The first life takes hold';
    }
    const done = game.state.discoveredMolecules.length;
    if (done >= MOLECULES.length) return 'The stage is set for life';
    if (!game.hasMolecule('H2O')) return 'A barren young world';
    return 'Oceans and skies are forming';
  }
  subLine(game) {
    if (this.finale) return 'From a single atom of hydrogen — you grew a world that breathes oxygen.';
    if (this.crisis) return 'The oxygen life breathes out is poison to it — the world dies back.';
    if (this.lifeBegun) {
      const pct = Math.round(this.life * 100), o2 = Math.round(this.oxygen * 100);
      if (!this.aerobic && this.oxygen > 0.25) return `${pct}% alive · O₂ rising ${o2}% · tap to spread life — but watch the oxygen…`;
      return `${pct}% alive · O₂ ${o2}% · tap to spread photosynthetic life`;
    }
    const done = game.state.discoveredMolecules.length;
    if (done >= MOLECULES.length) return 'Now brew the building blocks of life in the Lab';
    return `${done} / ${MOLECULES.length} molecules seeded into the world`;
  }
}
