// molecules.js — canvas2D lit ball-and-stick drawing primitives.
// Spheres are radial-gradient shaded with an offset specular highlight;
// bonds are luminous capsules whose count shows bond order (1/2/3).

import { el } from '../data/elements.js';

// Draw a single shaded atom sphere with bioluminescent rim glow.
export function drawAtom(ctx, x, y, sym, { r = null, hungry = false, scale = 1, pulse = 0 } = {}) {
  const e = el(sym);
  const radius = (r || e.r) * scale;

  // outer glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glowR = radius * (2.3 + pulse * 0.6);
  const g = ctx.createRadialGradient(x, y, radius * 0.4, x, y, glowR);
  g.addColorStop(0, hexA(e.glow, hungry ? 0.55 : 0.32));
  g.addColorStop(1, hexA(e.glow, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // sphere body (light from upper-left)
  const lx = x - radius * 0.35, ly = y - radius * 0.35;
  const body = ctx.createRadialGradient(lx, ly, radius * 0.1, x, y, radius * 1.05);
  body.addColorStop(0, lighten(e.color, 0.5));
  body.addColorStop(0.45, e.color);
  body.addColorStop(1, darken(e.color, 0.55));
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = body; ctx.fill();

  // rim light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.strokeStyle = hexA(e.glow, hungry ? 0.9 : 0.5);
  ctx.beginPath(); ctx.arc(x, y, radius * 0.96, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // specular highlight
  const sg = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 0.6);
  sg.addColorStop(0, 'rgba(255,255,255,0.85)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(lx, ly, radius * 0.6, 0, Math.PI * 2); ctx.fill();

  // hungry indicator: dashed pulsing ring
  if (hungry) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA('#ffffff', 0.35 + pulse * 0.4);
    ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(x, y, radius * 1.45, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // element label
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `600 ${Math.round(radius * 0.95)}px "Outfit", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e.sym, x, y + radius * 0.04);
}

// Draw a bond between two points with given order (1..3).
export function drawBond(ctx, ax, ay, bx, by, order = 1, { color = '#bfefff' } = {}) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // perpendicular
  const gap = 6;
  const offs = order === 1 ? [0] : order === 2 ? [-gap, gap] : [-gap * 1.4, 0, gap * 1.4];

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const o of offs) {
    const ox = nx * o, oy = ny * o;
    // glow underlay
    ctx.strokeStyle = hexA(color, 0.18); ctx.lineWidth = 11;
    line(ctx, ax + ox, ay + oy, bx + ox, by + oy);
    // core
    ctx.strokeStyle = hexA(color, 0.85); ctx.lineWidth = 3.2;
    line(ctx, ax + ox, ay + oy, bx + ox, by + oy);
  }
  ctx.restore();
}

function line(ctx, ax, ay, bx, by) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }

// ---- colour helpers ----
function clamp(v) { return Math.max(0, Math.min(255, v | 0)); }
function parse(hex) {
  hex = hex.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
export function lighten(hex, amt) {
  const [r, g, b] = parse(hex);
  return `rgb(${clamp(r + (255 - r) * amt)},${clamp(g + (255 - g) * amt)},${clamp(b + (255 - b) * amt)})`;
}
export function darken(hex, amt) {
  const [r, g, b] = parse(hex);
  return `rgb(${clamp(r * (1 - amt))},${clamp(g * (1 - amt))},${clamp(b * (1 - amt))})`;
}
export function hexA(hex, a) {
  if (hex.startsWith('rgb')) return hex;
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}
// normalised [0..1] rgb for GL particles
export function rgb01(hex) { const [r, g, b] = parse(hex); return [r / 255, g / 255, b / 255]; }

// Draw a building-block / polymer / cell as a luminous rounded token with a short label.
export function drawToken(ctx, x, y, item, { r = 30, pulse = 0, dim = false } = {}) {
  const col = item.color || '#8ef0d0';
  ctx.save();
  // glow
  ctx.globalCompositeOperation = 'lighter';
  const gr = r * (2.0 + pulse * 0.6);
  const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, gr);
  g.addColorStop(0, hexA(col, dim ? 0.14 : 0.30)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // body — hexagon-ish rounded disc with glassy gradient
  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  body.addColorStop(0, lighten(col, 0.55));
  body.addColorStop(0.5, col);
  body.addColorStop(1, darken(col, 0.5));
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = body; ctx.globalAlpha = dim ? 0.5 : 1; ctx.fill(); ctx.globalAlpha = 1;

  // rim
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.strokeStyle = hexA(col, 0.6);
  ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // specular
  const sg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x - r * 0.35, y - r * 0.35, r * 0.55);
  sg.addColorStop(0, 'rgba(255,255,255,0.7)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.55, 0, Math.PI * 2); ctx.fill();

  // label
  ctx.fillStyle = 'rgba(8,16,24,0.9)';
  const txt = item.abbr || '?';
  const fs = Math.max(9, Math.min(r * 0.7, r * 2 / Math.max(2, txt.length)));
  ctx.font = `700 ${Math.round(fs)}px "Outfit", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y + 1);
  ctx.restore();
}
