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
