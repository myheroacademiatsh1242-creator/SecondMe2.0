import type { GameEngine } from '../GameEngine.ts';
import { HUNT_DECOR } from '../logic/snowHunt.ts';

/**
 * The Snow Hunt arena's Christmas dressing, drawn in chunky pixels to sit on the snowy ground:
 * a big lit tree in the middle, snowmen, gift piles, candy canes, a string of lights round the
 * edge and falling snow, plus the run's pickups (XP gems, Noel tickets, coins). Pixel unit P = 3.
 */
const P = 3;
const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w * P, h * P);
};
const BULBS = ['#ff5a5a', '#ffd76a', '#6ee7ff', '#7dff8a', '#ff9bf0'];

function tree(ctx: CanvasRenderingContext2D, cx: number, base: number, time: number, still: boolean) {
  // Shadow, trunk, three tiers of needles with snow on their edges, bulbs, star.
  ctx.fillStyle = '#00000033'; ctx.beginPath(); ctx.ellipse(cx, base + 4, 46, 12, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, cx - 6, base - 18, 4, 7, '#5b3a1e'); px(ctx, cx - 3, base - 18, 1, 7, '#7a5230');
  const tiers = [{ w: 30, y: base - 40, h: 9 }, { w: 24, y: base - 64, h: 9 }, { w: 17, y: base - 86, h: 8 }];
  for (const t of tiers) {
    for (let row = 0; row < t.h; row++) {
      const half = Math.round((t.w * (row + 1)) / t.h / 2);
      px(ctx, cx - half * P, t.y + row * P, half * 2, 1, row % 3 === 0 ? '#1f6b3a' : '#2b8a4b');
      px(ctx, cx - half * P, t.y + row * P, 1, 1, '#174f2b');
    }
    px(ctx, cx - (t.w / 2) * P, t.y + t.h * P - P, t.w, 1, '#e8f6ff');
  }
  let i = 0;
  for (const t of tiers) for (let k = -2; k <= 2; k++) {
    const on = still || Math.sin(time * 3 + i * 1.7) > -0.2;
    px(ctx, cx + k * (t.w / 6) * P - P, t.y + (t.h - 3) * P, 2, 2, on ? BULBS[i % BULBS.length] : '#3a3a3a');
    i++;
  }
  const glow = still ? 0.9 : 0.75 + 0.25 * Math.sin(time * 4);
  ctx.save(); ctx.globalAlpha = glow; ctx.fillStyle = '#ffe58a';
  ctx.beginPath(); ctx.arc(cx, base - 92, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  px(ctx, cx - 3, base - 98, 2, 4, '#ffd23f'); px(ctx, cx - 6, base - 95, 4, 2, '#ffd23f');
}

function snowman(ctx: CanvasRenderingContext2D, cx: number, base: number) {
  ctx.fillStyle = '#00000026'; ctx.beginPath(); ctx.ellipse(cx, base + 2, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  const ball = (y: number, r: number) => { ctx.fillStyle = '#eef7ff'; ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c9dbe8'; ctx.beginPath(); ctx.arc(cx + r * .35, y + r * .3, r * .55, 0, Math.PI * 2); ctx.fill(); };
  ball(base - 12, 16); ball(base - 36, 12);
  px(ctx, cx - 12, base - 30, 8, 2, '#c8323a');                     // scarf
  px(ctx, cx + 4, base - 28, 2, 4, '#c8323a');
  px(ctx, cx - 4, base - 42, 1, 1, '#1a1a1a'); px(ctx, cx + 2, base - 42, 1, 1, '#1a1a1a'); // eyes
  px(ctx, cx - 1, base - 39, 3, 1, '#ff8a2a');                      // carrot
  px(ctx, cx - 10, base - 54, 7, 2, '#1d1d24'); px(ctx, cx - 7, base - 62, 5, 3, '#1d1d24'); // hat
  px(ctx, cx - 1, base - 18, 1, 1, '#1a1a1a'); px(ctx, cx - 1, base - 10, 1, 1, '#1a1a1a');
}

function gifts(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const box = (bx: number, by: number, w: number, h: number, body: string, ribbon: string) => {
    px(ctx, bx, by, w, h, body); px(ctx, bx, by, w, 1, '#ffffff33');
    px(ctx, bx + Math.floor(w / 2) * P - P, by, 2, h, ribbon); px(ctx, bx, by + Math.floor(h / 2) * P - P, w, 2, ribbon);
    px(ctx, bx + Math.floor(w / 2) * P - 2 * P, by - 2 * P, 2, 2, ribbon); px(ctx, bx + Math.floor(w / 2) * P, by - 2 * P, 2, 2, ribbon);
  };
  ctx.fillStyle = '#00000026'; ctx.beginPath(); ctx.ellipse(x + 28, y + 36, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
  box(x, y + 6, 10, 9, '#c8323a', '#ffd76a');
  box(x + 30, y + 12, 8, 7, '#2b8a4b', '#f4f4f4');
  box(x + 16, y - 16, 8, 8, '#3c6fd8', '#ff9bf0');
}

function candyCane(ctx: CanvasRenderingContext2D, x: number, y: number) {
  for (let i = 0; i < 12; i++) px(ctx, x, y + i * P, 2, 1, i % 3 === 0 ? '#f4f4f4' : '#d8283a');
  px(ctx, x + 2 * P, y - P, 2, 1, '#d8283a'); px(ctx, x + 4 * P, y, 1, 2, '#f4f4f4'); px(ctx, x + 4 * P, y + 2 * P, 1, 1, '#d8283a');
}

/** Ground layer: drawn after the terrain, before characters. */
export function drawHuntArena(ctx: CanvasRenderingContext2D, game: GameEngine, time: number) {
  const still = game.reducedMotion;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // A soft warm glow round the tree, like the light of its bulbs on the snow.
  const g = ctx.createRadialGradient(640, 340, 20, 640, 340, 220);
  g.addColorStop(0, '#ffd76a33'); g.addColorStop(1, '#ffd76a00');
  ctx.fillStyle = g; ctx.fillRect(420, 120, 440, 440);
  // String of lights along the top and bottom walls.
  for (let x = 60; x < 1230; x += 36) {
    const sag = Math.sin(((x - 60) / 144) * Math.PI) * 6;
    const k = Math.floor(x / 36);
    const on = still || Math.sin(time * 2.4 + k) > -0.3;
    for (const y of [46 + Math.abs(sag), 670 - Math.abs(sag)]) {
      ctx.fillStyle = '#1f3a24'; ctx.fillRect(x - 18, y - 1, 36, 2);
      px(ctx, x - 3, y, 2, 3, on ? BULBS[k % BULBS.length] : '#3b3b3b');
    }
  }
  candyCane(ctx, 62, 70); candyCane(ctx, 1200, 70); candyCane(ctx, 62, 600); candyCane(ctx, 1200, 600);
  for (const d of HUNT_DECOR) {
    const cx = d.rect.x + d.rect.width / 2, base = d.rect.y + d.rect.height;
    if (d.kind === 'tree') tree(ctx, cx, base, time, still);
    else if (d.kind === 'snowman') snowman(ctx, cx, base);
    else gifts(ctx, d.rect.x, d.rect.y);
  }
  // Pickups bob a little.
  for (const p of game.hunt?.pickups ?? []) {
    const bob = still ? 0 : Math.sin(time * 5 + p.x) * 2;
    if (p.kind === 'xp') {
      const big = p.value > 1;
      ctx.fillStyle = big ? '#b48cff' : '#6ee7ff';
      ctx.beginPath(); const r = big ? 9 : 6;
      ctx.moveTo(p.x, p.y - r + bob); ctx.lineTo(p.x + r * .7, p.y + bob); ctx.lineTo(p.x, p.y + r + bob); ctx.lineTo(p.x - r * .7, p.y + bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffffaa'; ctx.fillRect(p.x - 2, p.y - r / 2 + bob, 2, 3);
    } else if (p.kind === 'ticket') {
      px(ctx, p.x - 9, p.y - 6 + bob, 6, 4, '#ffd76a'); px(ctx, p.x - 9, p.y - 6 + bob, 6, 1, '#fff3c2');
      px(ctx, p.x - 3, p.y - 3 + bob, 2, 1, '#c8323a');
      if (p.value > 1) { ctx.fillStyle = '#2a1a05'; ctx.font = '12px "Second Me Pixel", monospace'; ctx.fillText(`×${p.value}`, p.x + 10, p.y + bob); }
    } else if (p.kind === 'hp' || p.kind === 'mp') {
      // Potion: glass bottle, cork, coloured contents.
      const liquid = p.kind === 'hp' ? '#e2384a' : '#3a8bff';
      px(ctx, p.x - 3, p.y - 12 + bob, 2, 1, '#9a6a3a');
      px(ctx, p.x - 6, p.y - 9 + bob, 4, 5, '#dfe9f0');
      px(ctx, p.x - 6, p.y - 6 + bob, 4, 4, liquid);
      px(ctx, p.x - 6, p.y - 9 + bob, 1, 2, '#ffffffcc');
    } else if (p.kind === 'maxHp' || p.kind === 'maxMp') {
      // Shard: a glowing heart (max HP) or star (max MP).
      const c = p.kind === 'maxHp' ? '#ff6b8a' : '#6ec3ff';
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (p.kind === 'maxHp') { px(ctx, p.x - 9, p.y - 6 + bob, 2, 2, c); px(ctx, p.x + 3, p.y - 6 + bob, 2, 2, c); px(ctx, p.x - 9, p.y - 3 + bob, 6, 2, c); px(ctx, p.x - 6, p.y + 3 + bob, 4, 1, c); px(ctx, p.x - 3, p.y + 6 + bob, 2, 1, c); }
      else { px(ctx, p.x - 2, p.y - 9 + bob, 1, 6, c); px(ctx, p.x - 9, p.y - 2 + bob, 6, 1, c); px(ctx, p.x - 5, p.y - 5 + bob, 3, 3, '#e8f6ff'); }
    } else {
      ctx.fillStyle = '#e0a83a'; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Top layer: falling snow over everything in the arena. */
export function drawHuntSnow(ctx: CanvasRenderingContext2D, time: number, still: boolean) {
  ctx.save(); ctx.fillStyle = '#ffffffcc';
  for (let i = 0; i < 70; i++) {
    const seed = (i * 9301 + 49297) % 233280 / 233280;
    const x = (seed * 1280 + (still ? 0 : Math.sin(time * .6 + i) * 18)) % 1280;
    const y = still ? (i * 97) % 720 : ((seed * 720 + time * (30 + seed * 40)) % 720);
    const s = i % 5 === 0 ? 3 : 2;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.restore();
}
