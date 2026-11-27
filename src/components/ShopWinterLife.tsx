import { useEffect, useRef } from 'react';

/*
 * Moving parts on top of the painted Noel shop (public/assets/ui/noel/shop-winter.webp).
 * Spots below are in half-scale units (640 x 360) measured on the painting; the canvas itself is
 * the full 1280 x 720 shop world drawn at 2x, and moving things are drawn at sub-pixel positions
 * so slow snow glides instead of stepping a block at a time.
 */
const W = 640, H = 360, SCALE = 2;
const STAR = { x: 254, y: 44 };
const TREE_LIGHTS: [number, number, string][] = [
  [246, 62, '#ffd35a'], [262, 66, '#ff5a4a'], [240, 76, '#7fd8ff'], [268, 80, '#ffd35a'],
  [234, 90, '#ff5a4a'], [256, 88, '#7fd8ff'], [276, 94, '#ff5a4a'], [244, 100, '#ffd35a'],
  [262, 104, '#7fd8ff'], [230, 104, '#ffd35a'],
];
const LANTERN = { x: 147, y: 160 };
const JARS: [number, number][] = [[116, 198], [142, 196], [155, 196]];
const MUSHROOMS = { x0: 18, x1: 92, y0: 112, y1: 190 };
/* points on the snowy pine branches where a clump of snow can slide off */
const BRANCHES: [number, number][] = [
  [322, 70], [352, 104], [398, 92], [430, 128], [496, 108], [540, 84], [582, 120], [612, 96], [466, 150],
];
const GROUND = { y0: 300, y1: 352 };

type Flake = { x: number; y: number; vy: number; size: number; phase: number; depth: number };
type Clump = { x: number; y: number; vy: number; vx: number; life: number; burst: boolean; bits: { x: number; y: number; vx: number; vy: number }[] };
type Mote = { x: number; y: number; vy: number; phase: number; life: number };
type Glint = { x: number; y: number; life: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeFlake(top: boolean): Flake {
  const depth = Math.random() < .5 ? 0 : Math.random() < .65 ? 1 : 2;
  return {
    x: rand(-20, W + 20), y: top ? rand(-30, -2) : rand(0, H), depth,
    vy: [9, 16, 26][depth] * rand(.8, 1.2), size: [1, 1, 2][depth], phase: rand(0, Math.PI * 2),
  };
}

export function ShopWinterLife({ still }: { still: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (still) return;
    /* soft glows are drawn once into small sprites and then stamped, instead of a new gradient every frame */
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (color: string) => {
      let c = sprites.get(color);
      if (!c) {
        c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        sprites.set(color, c);
      }
      return c;
    };
    const flakes = Array.from({ length: 110 }, () => makeFlake(false));
    const clumps: Clump[] = [];
    const motes: Mote[] = [];
    const glints: Glint[] = [];
    let nextClump = 2.5, nextGust = 7, gustStart = -99, last = performance.now(), frame = 0;
    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    const glow = (x: number, y: number, r: number, color: string, alpha: number) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    };
    const step = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      /* wind: a calm drift, with a gust every so often */
      if (t > nextGust) { gustStart = t; nextGust = t + rand(10, 16); }
      const g = t - gustStart;
      const gust = g >= 0 && g < 3.2 ? Math.sin(Math.PI * g / 3.2) : 0;
      const wind = 3 + Math.sin(t * .4) * 3 + gust * 46;

      /* warm lights: lantern, jars, the tree's star and bulbs */
      const flicker = .75 + Math.sin(t * 9.3) * .08 + Math.sin(t * 23.1) * .06 + Math.sin(t * 3.1) * .08;
      glow(LANTERN.x, LANTERN.y, 22, '#ffb347', .32 * flicker);
      JARS.forEach(([x, y], i) => glow(x, y, 9, '#c8ff8a', .16 + .1 * Math.sin(t * 1.7 + i * 2)));
      const pulse = .55 + .45 * Math.sin(t * 2.2);
      glow(STAR.x, STAR.y, 16, '#fff1a0', .25 + .25 * pulse);
      if (pulse > .8) {
        ctx.globalAlpha = (pulse - .8) * 5;
        px(STAR.x - 6, STAR.y, 13, 1, '#fffbe0');
        px(STAR.x, STAR.y - 6, 1, 13, '#fffbe0');
        ctx.globalAlpha = 1;
      }
      TREE_LIGHTS.forEach(([x, y, color], i) => {
        const on = Math.sin(t * (1.3 + i % 3 * .4) + i * 1.9) > -.2;
        if (!on) { px(x, y, 2, 2, '#1d3a2a'); return; }
        glow(x + 1, y + 1, 5, color, .45);
        px(x, y, 2, 2, color);
      });

      /* glowing spores drifting up from the mushrooms */
      if (motes.length < 7 && Math.random() < dt * 1.2) {
        motes.push({ x: rand(MUSHROOMS.x0, MUSHROOMS.x1), y: rand(MUSHROOMS.y0 + 30, MUSHROOMS.y1), vy: rand(4, 8), phase: rand(0, 6), life: 0 });
      }
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.life += dt; m.y -= m.vy * dt;
        const x = m.x + Math.sin(t * 1.4 + m.phase) * 4;
        const a = Math.min(1, m.life) * Math.max(0, 1 - m.life / 5);
        if (a <= 0) { motes.splice(i, 1); continue; }
        glow(x, m.y, 4, '#9ff0ff', .5 * a);
        ctx.globalAlpha = a;
        px(x, m.y, 1, 1, '#e6fdff');
        ctx.globalAlpha = 1;
      }

      /* snow sliding off a pine branch, bursting into powder */
      if (t > nextClump) {
        const [x, y] = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];
        clumps.push({ x, y, vx: rand(-4, 4), vy: 0, life: 0, burst: false, bits: [] });
        nextClump = t + rand(3, 6.5);
      }
      for (let i = clumps.length - 1; i >= 0; i--) {
        const c = clumps[i];
        c.life += dt;
        if (!c.burst) {
          c.vy += 140 * dt; c.x += (c.vx + wind * .3) * dt; c.y += c.vy * dt;
          px(c.x - 2, c.y - 1, 5, 3, '#f4fbff');
          px(c.x - 1, c.y + 2, 3, 1, '#b8d2ea');
          if (c.life > .55) {
            c.burst = true;
            for (let k = 0; k < 9; k++) c.bits.push({ x: c.x, y: c.y, vx: rand(-14, 14), vy: rand(-10, 8) });
          }
        } else {
          for (const b of c.bits) {
            b.vy += 30 * dt; b.x += (b.vx + wind * .5) * dt; b.y += b.vy * dt;
            ctx.globalAlpha = Math.max(0, 1 - (c.life - .55) / 1.4);
            px(b.x, b.y, 1, 1, '#eef7ff');
          }
          ctx.globalAlpha = 1;
          if (c.life > 2) clumps.splice(i, 1);
        }
      }

      /* falling snow in three depths; near flakes are bigger and faster */
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.x += (wind * (.5 + f.depth * .35) + Math.sin(t * .9 + f.phase) * (4 + f.depth * 2)) * dt;
        if (f.y > H + 4 || f.x > W + 30 || f.x < -30) Object.assign(f, makeFlake(true), { x: rand(-60, W) });
        ctx.globalAlpha = [.45, .7, .9][f.depth];
        px(f.x, f.y, f.size, f.size, '#f2f9ff');
        if (f.depth === 2) px(f.x, f.y + 2, 2, 1, '#a9c4dc');
      }
      ctx.globalAlpha = 1;

      /* during a gust, powder streams low across the ground */
      if (gust > .3) {
        for (let k = 0; k < 6; k++) {
          const x = ((t * 140 + k * 113) % (W + 80)) - 40;
          const y = GROUND.y0 + 8 + k * 7 + Math.sin(t * 3 + k) * 2;
          ctx.globalAlpha = (gust - .3) * .9;
          px(x, y, 14 + k % 3 * 6, 1, '#eef6ff');
        }
        ctx.globalAlpha = 1;
      }

      /* the snow on the ground catches the light here and there */
      if (Math.random() < dt * 3) glints.push({ x: rand(150, 600), y: rand(GROUND.y0, GROUND.y1), life: 0 });
      for (let i = glints.length - 1; i >= 0; i--) {
        const s = glints[i];
        s.life += dt;
        if (s.life > .6) { glints.splice(i, 1); continue; }
        const a = Math.sin(Math.PI * s.life / .6);
        ctx.globalAlpha = a;
        px(s.x, s.y, 1, 1, '#ffffff');
        if (a > .6) { px(s.x - 2, s.y, 5, 1, '#ffffff'); px(s.x, s.y - 2, 1, 5, '#ffffff'); }
        ctx.globalAlpha = 1;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [still]);
  return <canvas ref={canvas} className="shop-winter-life" width={W * SCALE} height={H * SCALE} aria-hidden="true"/>;
}
