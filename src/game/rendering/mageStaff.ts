import type { Direction } from '../logic/types.ts';

/** Aeris is about 59 px tall in the match; the staff is drawn 1.55x its design size so it stands as tall as she does. */
export const STAFF_K = 1.55;

type Pal = [string, string, string, string];                 // dark, mid, light, core
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * Aeris's weapon, upright with its hand at (0, 0), in design units (1 unit = STAFF_K px). Each weapon has a shaft, a head and its
 * own animated flourish (glow, motes, arcs, orbiting pieces). `time` in seconds; 0 gives a still frame (reduced motion).
 */
export function drawMageStaff(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, weaponId = 'wand-novice', time = 0) {
  const K = STAFF_K, base = ctx.globalAlpha;
  ctx.save();
  ctx.translate(Math.round(x + (direction === 'left' ? -28 : 28)), Math.round(y - 4));
  if (direction === 'left') ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  // Edges are rounded, not the sizes, so neighbouring blocks still meet without gaps or blur at the larger scale.
  const r = (c: string, px: number, py: number, w: number, h: number, a = 1) => {
    const l = Math.round(px * K), t = Math.round(py * K);
    ctx.globalAlpha = base * a; ctx.fillStyle = c;
    ctx.fillRect(l, t, Math.max(1, Math.round((px + w) * K) - l), Math.max(1, Math.round((py + h) * K) - t));
  };
  const disc = (c: string, cx: number, cy: number, rad: number, a: number) => {
    for (let dy = -rad; dy <= rad; dy++) { const half = Math.floor(Math.sqrt(rad * rad - dy * dy)); r(c, cx - half, cy + dy, half * 2 + 1, 1, a); }
  };
  const glow = (c: string, cx: number, cy: number, rad: number, pulse = 1) => { disc(c, cx, cy, rad, .07 * pulse); disc(c, cx, cy, Math.round(rad * .7), .1 * pulse); disc(c, cx, cy, Math.round(rad * .4), .16 * pulse); };
  const sparkle = (c: string, cx: number, cy: number, s: number, a = 1) => { r(c, cx - s, cy, s * 2 + 1, 1, a); r(c, cx, cy - s, 1, s * 2 + 1, a); };
  /** n motes drifting from (cx, by) over `rise` units (negative falls), each fading as it goes. */
  const motes = (c: string, n: number, cx: number, by: number, rise: number, spread: number, speed = .45) => {
    for (let i = 0; i < n; i++) {
      const ph = (time * speed + i / n) % 1;
      r(c, Math.round(cx + (hash(i) - .5) * spread + Math.sin((ph + i) * 6) * 2), Math.round(by - ph * rise), 1, i % 3 ? 1 : 2, 1 - ph);
    }
  };
  const shaft = (w: [string, string, string, string], metal = '#9aa0aa') => {
    r(w[0], -3, -19, 6, 29); r(w[1], -2, -19, 4, 28); r(w[2], -1, -19, 1, 27); r(w[0], 1, -19, 1, 27, .35);
    for (let y = -10; y <= 4; y += 4) { r(w[3], -3, y, 6, 1); r(w[0], -3, y + 1, 6, 1, .5); }   // grip wrapping
    r(w[0], -4, 7, 8, 3); r(metal, -3, 7, 6, 2); r('#dfe3ea', -3, 7, 2, 1);                      // ferrule
  };
  /** Prongs that hold the head: a collar and two curved claws. */
  const claws = (c: string, hl: string) => {
    r('#1d1716', -6, -21, 12, 4); r(c, -5, -20, 10, 2); r(hl, -5, -20, 4, 1);
    r('#1d1716', -7, -30, 3, 11); r(c, -6, -29, 1, 9); r('#1d1716', 4, -30, 3, 11); r(c, 5, -29, 1, 9);
    r(c, -5, -31, 2, 2); r(c, 3, -31, 2, 2); r(hl, -6, -29, 1, 3);
  };
  const WIDTHS = [2, 4, 6, 8, 8, 8, 8, 6, 6, 4, 2];
  /** A faceted crystal whose centre is at (0, cy): dark outline, lit right side, bright core, a pulsing heart. */
  const crystal = (h: Pal, cy: number, pulse = 1, scale = 1) => {
    const top = cy - 6;
    WIDTHS.forEach((w, i) => {
      const ww = Math.max(2, Math.round(w * scale)), yy = top + i;
      r(h[0], -ww / 2, yy, ww, 1); if (ww > 3) { r(h[1], -ww / 2 + 1, yy, ww - 2, 1); r(h[2], 0, yy, ww / 2 - 1, 1, .85); }
    });
    r(h[3], -2, cy - 3, 2, 3, .9); r(h[3], -1, cy - 4, 1, 1); r(h[3], -1, cy + 1, 2, 2, .35 + .35 * pulse);
  };

  const pulse = .7 + .3 * Math.sin(time * 3);
  const CRYS: Record<string, { wood: [string, string, string, string]; metal: string; claw: [string, string]; head: Pal }> = {
    'wand-novice': { wood: ['#1d1716', '#593b2b', '#a17952', '#2d1f18'], metal: '#c9a44a', claw: ['#a9863a', '#ffe08a'], head: ['#0b476e', '#078cc5', '#67e5ff', '#e6fdff'] },
    'staff-frost': { wood: ['#1d2a33', '#9db8cc', '#eaf6ff', '#5f86a3'], metal: '#cfe3f0', claw: ['#8fb8d0', '#ffffff'], head: ['#2f6a98', '#7fcdef', '#d9f6ff', '#ffffff'] },
  };
  const c = CRYS[weaponId];
  if (c) {
    shaft(c.wood, c.metal);
    if (weaponId === 'wand-novice') {
      glow('#67e5ff', 0, -28, 15, pulse); claws(c.claw[0], c.claw[1]); crystal(c.head, -26, pulse);
      sparkle('#ffffff', -9, -34 - Math.round(Math.sin(time * 4)), 1, .5 + .5 * Math.sin(time * 5)); sparkle('#d6fcff', 9, -22, 1, .5 + .5 * Math.sin(time * 4 + 2));
      motes('#9be9ff', 5, 0, -34, 22, 14);
    } else {
      glow('#9be2ff', 0, -29, 16, pulse);
      for (let k = 0; k < 3; k++) { const sx = (k - 1) * 3; r('#cfe9f7', sx - 1, -17, 2, 3 + (k === 1 ? 2 : 0)); r('#ffffff', sx - 1, -17, 1, 2); } // icicles on the collar
      claws(c.claw[0], c.claw[1]); crystal(c.head, -26, pulse);
      r('#7fcdef', -5, -37, 2, 6); r('#d9f6ff', -1, -42, 3, 12); r('#7fcdef', 3, -36, 2, 5); r('#ffffff', 0, -42, 1, 5);     // jagged crown of ice
      sparkle('#ffffff', 8, -34, 2, .5 + .5 * Math.sin(time * 5)); sparkle('#d9f6ff', -9, -24, 1, .5 + .5 * Math.sin(time * 4 + 1));
      motes('#ffffff', 6, 0, -14, -8, 24, .3);
    }
  } else if (weaponId === 'wand-fire') {
    shaft(['#1d1210', '#7a3a22', '#c97a4a', '#3a1a10'], '#6b6f78');
    glow('#ff8a2a', 0, -30, 17, pulse); claws('#5a2a1a', '#ff9a3c');
    crystal(['#5a1608', '#d4481a', '#ff9a3c', '#fff2c2'], -24, pulse, .8);
    for (let k = -1; k <= 1; k++) {                                                     // flame tongues, each flickering on its own
      const h = (k ? 9 : 14) + Math.round(3 * Math.sin(time * 10 + k * 2.3)), fx = k * 3;
      r('#c23a12', fx - 2, -29 - h, 4, h + 4); r('#ff7a22', fx - 1, -28 - h + 2, 3, h + 2); r('#ffd36a', fx - 1, -27 - h + 5, 2, Math.max(2, h - 4)); r('#fff6d6', fx, -27 - h + 8, 1, Math.max(1, h - 8));
    }
    motes('#ffb347', 8, 0, -34, 30, 14, .6); motes('#ff5a1a', 4, 2, -36, 24, 10, .5);
  } else if (weaponId === 'staff-lightning') {
    shaft(['#2a1d08', '#b8862a', '#f0cf6a', '#6e4c12'], '#d9d3c0');
    glow('#ffe45c', 0, -30, 17, pulse);
    for (const sx of [-1, 1]) {                                                         // two prongs wound with a coil
      r('#2a1d08', sx * 5 - 2, -38, 4, 22); r('#d9a82e', sx * 5 - 1, -37, 2, 20); r('#fff6a8', sx * 5 - 1, -37, 1, 18);
      for (let y = -34; y < -18; y += 3) r('#7a5410', sx * 5 - 2, y, 4, 1);
      r('#fff27a', sx * 5 - 1, -42, 2, 5); r('#ffffff', sx * 5 - 1, -43, 2, 2);
    }
    r('#2a1d08', -7, -19, 14, 3); r('#d9a82e', -6, -18, 12, 1);
    const f = Math.floor(time * 16);                                                    // a bolt jumping between the prongs
    for (let i = 0; i < 6; i++) { const bx = -5 + i * 2, by = -34 + Math.round((hash(f * 9 + i) - .5) * 10); r('#ffffff', bx, by, 2, 1); r('#fff27a', bx, by + 1, 2, 1, .7); r('#ffe45c', bx - 1, by - 1, 1, 3, .35); }
    disc('#fff6a8', 0, -31, 3, .35); r('#ffffff', -1, -32, 2, 2, .9);
    if (f % 3 === 0) sparkle('#ffffff', Math.round((hash(f) - .5) * 24), -36 + Math.round((hash(f + 1) - .5) * 10), 1);
    motes('#fff27a', 5, 0, -30, 16, 22, 1.1);
  } else if (weaponId === 'grimoire-shield') {
    const bob = Math.round(Math.sin(time * 2.4) * 2);
    glow('#6fa8ff', 0, -16 + bob, 20, pulse);
    ctx.translate(0, Math.round((bob - 12) * K));
    for (let i = 0; i < 6; i++) { const a = time * 1.4 + i * Math.PI / 3, hx = Math.round(Math.cos(a) * 12), hy = Math.round(-17 + Math.sin(a) * 5); r('#e6c26a', hx - 1, hy - 1, 3, 3); r('#fff2b0', hx, hy - 1, 1, 1); }  // runes of the ward
    r('#0b1f4d', -10, -12, 20, 24); r('#2a5fc4', -9, -11, 18, 22); r('#4a86f0', -9, -11, 18, 3); r('#1c3d8f', -9, 7, 18, 4);
    r('#f1e4b8', 6, -10, 3, 20); for (let y = -9; y < 9; y += 3) r('#c9b88a', 6, y, 3, 1);                                            // page edges
    r('#e6c26a', -9, -11, 4, 4); r('#e6c26a', 5, -11, 4, 4); r('#e6c26a', -9, 8, 4, 3); r('#e6c26a', 5, 8, 4, 3);                       // brass corners
    r('#e6c26a', -5, -3, 10, 2); r('#e6c26a', -1, -7, 2, 10); r('#ffe9a8', -1, -7, 1, 10);
    r('#8fc1ff', -3, -2, 1, 1); r('#d4e7ff', 0, -4, 2, 2);
    sparkle('#d4e7ff', 12, -8, 1, .5 + .5 * Math.sin(time * 5)); motes('#9fd0ff', 5, 0, -12, 20, 18);
  } else if (weaponId === 'staff-blizzard') {
    shaft(['#1d2a33', '#8fb8d0', '#e4f6ff', '#4f7896'], '#e4f6ff');
    glow('#9be2ff', 0, -29, 19, pulse); claws('#8fb8d0', '#ffffff'); crystal(['#2f6a98', '#7fcdef', '#d9f6ff', '#ffffff'], -26, pulse, 1.15);
    for (let k = 0; k < 3; k++) {
      const a = time * 2.2 + k * Math.PI * 2 / 3, sx = Math.round(Math.cos(a) * 12), sy = Math.round(-27 + Math.sin(a) * 5), front = Math.sin(a) > 0;
      r('#8fd4f2', sx - 1, sy - 4, 3, 9, front ? 1 : .6); r('#e4faff', sx, sy - 5, 1, 8, front ? 1 : .6); r('#ffffff', sx, sy - 5, 1, 2);
      for (let t = 1; t <= 3; t++) { const ta = a - t * .22; r('#d9f6ff', Math.round(Math.cos(ta) * 12), Math.round(-27 + Math.sin(ta) * 5), 1, 1, .5 / t); }
    }
    for (let i = 0; i < 9; i++) { const ph = (time * .35 + i / 9) % 1; r('#ffffff', Math.round(Math.sin((ph + i) * 5) * 16), Math.round(-44 + ph * 50), 1, i % 3 ? 1 : 2, Math.min(1, 2 - ph * 2)); } // snow
  } else if (weaponId === 'staff-meteor') {
    shaft(['#0e0b0a', '#3f3835', '#6d635d', '#1a1412'], '#4a4340');
    const lava = .55 + .45 * Math.sin(time * 3);
    for (const [cy, h] of [[-15, 4], [-8, 5], [-1, 3], [4, 4]] as const) { r('#ff6a1a', -1, cy, 1, h, lava); r('#ffd36a', -1, cy + 1, 1, 1, lava); }
    glow('#ff5a1a', 0, -30, 18, pulse); claws('#2b2522', '#ff8a2a');
    r('#0e0b0a', -8, -35, 16, 12); r('#2f2825', -7, -34, 14, 10); r('#4a423e', -7, -34, 8, 3); r('#2f2825', -9, -31, 2, 5); r('#2f2825', 7, -32, 2, 4);   // basalt head
    r('#c23a12', -4, -32, 8, 6, pulse); r('#ff7a22', -3, -31, 6, 4); r('#ffd36a', -2, -30, 4, 2); r('#fff6d6', -1, -30, 2, 1);                            // magma core
    for (let k = 0; k < 2; k++) { const a = time * 2 + k * Math.PI, sx = Math.round(Math.cos(a) * 14), sy = Math.round(-30 + Math.sin(a) * 6); r('#0e0b0a', sx - 2, sy - 2, 5, 4); r('#4a423e', sx - 1, sy - 1, 3, 2); r('#ff7a22', sx, sy, 1, 1); }
    motes('#ff8a2a', 8, 0, -22, -26, 22, .6); motes('#ffd36a', 4, 0, -36, 18, 12, .7);
  } else if (weaponId === 'staff-archmage') {
    shaft(['#1f1530', '#6b4fa0', '#c3a8f0', '#e6c26a'], '#e6c26a');
    glow('#b98bff', 0, -30, 22, pulse); claws('#c9a44a', '#fff0a0'); r('#c9a44a', -1, -37, 2, 3); r('#fff0a0', -1, -37, 1, 2);
    crystal(['#4a2a8a', '#9a6be0', '#e2cfff', '#ffffff'], -27, pulse, 1.2);
    const cols = ['#ff5a4a', '#4ab3ff', '#ffe45c', '#6fe07a'];
    for (let k = 0; k < 4; k++) {
      const a = time * 2.2 + k * Math.PI / 2, sx = Math.round(Math.cos(a) * 15), sy = Math.round(-27 + Math.sin(a) * 6), front = Math.sin(a) > 0;
      for (let t = 1; t <= 3; t++) { const ta = a - t * .2; r(cols[k], Math.round(Math.cos(ta) * 15), Math.round(-27 + Math.sin(ta) * 6), 1, 1, .5 / t); }
      disc(cols[k], sx, sy, 3, front ? .3 : .15); r('#1d1716', sx - 2, sy - 2, 5, 5, front ? 1 : .6); r(cols[k], sx - 1, sy - 1, 3, 3, front ? 1 : .6); r('#ffffff', sx - 1, sy - 1, 1, 1, front ? 1 : .6);
    }
    for (let i = 0; i < 4; i++) sparkle('#fff0a0', Math.round((hash(i) - .5) * 34), -48 + Math.round(hash(i + 9) * 28), 1, .5 + .5 * Math.sin(time * 4 + i * 1.7));
    motes('#e2cfff', 6, 0, -36, 24, 24);
  }
  ctx.restore();
}
