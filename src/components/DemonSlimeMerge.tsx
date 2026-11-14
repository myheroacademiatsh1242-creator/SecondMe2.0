import { useEffect, useRef } from 'react';
import { sounds } from '../game/logic/sound.ts';

/**
 * The Ember Demon is born from many slimes (first part of BossIntro): nine ember slimes hop in from both sides and dive into
 * the middle one by one, the heap swells with each, shakes and cracks with fire, bursts, and the demon rises from the lava
 * (slime-transform-strip-fire.png, frames 4-31). Then the camera hand-off: `onHandoff` mounts the cinematic underneath, and the
 * demon glides from the middle to its place there (.demon-cut-figure) while the cave fades across, so there is no cut. Drawn on a
 * low-resolution canvas (270 px high) scaled up, so it stays pixel art.
 */
const LH = 270;
const SLIME_W = 58, SLIME_H = 66;                     // slime-idle.png: 8 frames in a row (squash, jump, air, land)
const STRIP_W = 214, STRIP_H = 200;                   // slime-transform-strip(-fire).png: 32 frames in a row
const ABSORB_FROM = 0.25, ABSORB_STEP = 0.17;
const DEPTH = [.2, .8, .5, .1, .9, .4, .7, .3, .6];
const SLIMES = DEPTH.map((z, i) => ({
  side: i % 2 ? 1 : -1, z, scale: .38 + (1 - z) * .22, t0: ABSORB_FROM + i * ABSORB_STEP, travel: 1.25 + (i % 3) * .22, hops: 4 + (i % 2), lane: i % 3,
}));
const LAST_ABSORB = Math.max(...SLIMES.map(s => s.t0 + s.travel));
const T_CHARGE = LAST_ABSORB + .15, T_BURST = T_CHARGE + 1.1, STRIP_FROM = 4, STRIP_FRAME = .075;
const T_HAND = T_BURST + (31 - STRIP_FROM) * STRIP_FRAME + .3, HAND_DUR = 1, T_DONE = T_HAND + HAND_DUR;
// The strip's last frame is the sheet's idle frame (sheet-fire.png, cell 0) drawn at 2x, offset by (-182, -120) strip pixels:
// measured with tools (IoU 0.92), so the hand-off can swap images without a jump.
const SHEET_IN_STRIP = { scale: 2, x: -182, y: -120 }, CELL_W = 288, CELL_H = 160;
const easeInOut = (u: number) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function DemonSlimeMerge({ onHandoff, onDone }: { onHandoff: () => void; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone), handoff = useRef(onHandoff);
  done.current = onDone; handoff.current = onHandoff;
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { done.current(); return; }
    const LW = Math.max(320, Math.round(LH * window.innerWidth / Math.max(1, window.innerHeight)));
    canvas.width = LW; canvas.height = LH;
    const cx = LW / 2, GY = 214;
    const load = (name: string) => new Promise<HTMLImageElement>((ok, fail) => {
      const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = `${import.meta.env.BASE_URL}assets/demon-boss/${name}`;
    });
    let raf = 0, stopped = false;
    const heard = new Set<string>();
    const once = (key: string, play: () => void) => { if (!heard.has(key)) { heard.add(key); play(); } };

    Promise.all([load('slime-idle.png'), load('slime-transform-strip-fire.png'), load('sheet-fire.png?v=6')]).then(([slime, strip, sheet]) => {
      if (stopped) return;
      const start = performance.now();
      const sprite = (frame: number, x: number, y: number, sx: number, sy: number, flip = 1) => {
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sx * flip, sy);
        ctx.drawImage(slime, frame * SLIME_W, 0, SLIME_W, SLIME_H, -SLIME_W / 2, -SLIME_H, SLIME_W, SLIME_H);
        ctx.restore();
      };
      const shadow = (x: number, y: number, w: number, a: number) => { ctx.fillStyle = `rgba(10,3,4,${a})`; ctx.beginPath(); ctx.ellipse(x, y, w, w * .28, 0, 0, Math.PI * 2); ctx.fill(); };
      const draw = (now: number) => {
        const t = (now - start) / 1000;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, LW, LH);
        ctx.imageSmoothingEnabled = false;
        const charge = Math.min(1, Math.max(0, (t - T_CHARGE) / (T_BURST - T_CHARGE)));
        const afterBurst = t - T_BURST;
        const hand = easeInOut(Math.min(1, Math.max(0, (t - T_HAND) / HAND_DUR))), fade = 1 - hand;
        const shake = afterBurst >= 0 && afterBurst < .5 ? 6 * (1 - afterBurst / .5) : charge * 3;
        if (shake) ctx.translate(Math.round((hash(Math.floor(t * 40)) - .5) * shake * 2), Math.round((hash(Math.floor(t * 40) + 7) - .5) * shake * 2));

        // The lava seam on the floor, brighter as the heap grows and as it charges.
        const absorbed = SLIMES.filter(s => t >= s.t0 + s.travel).length;
        const heat = Math.min(1, .25 + absorbed * .06 + charge * .5 + (afterBurst > 0 ? .3 : 0));
        const seam = ctx.createLinearGradient(cx - LW * .45, 0, cx + LW * .45, 0);
        seam.addColorStop(0, 'rgba(200,52,12,0)'); seam.addColorStop(.5, `rgba(255,${150 + heat * 80},70,${.5 + heat * .5})`); seam.addColorStop(1, 'rgba(200,52,12,0)');
        ctx.globalAlpha = fade;
        ctx.fillStyle = seam; ctx.fillRect(cx - LW * .45, GY - 1, LW * .9, 2);
        const pool = ctx.createRadialGradient(cx, GY, 2, cx, GY, 70 + heat * 60);
        pool.addColorStop(0, `rgba(255,120,40,${.25 + heat * .35})`); pool.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = pool; ctx.fillRect(cx - 140, GY - 120, 280, 160);
        ctx.globalAlpha = 1;

        if (afterBurst < 0) {
          // The heap: one frame of the slime, swollen by every slime it has eaten, wobbling after each arrival.
          if (absorbed) {
            let wob = 0;
            for (const s of SLIMES) { const dt = t - (s.t0 + s.travel); if (dt >= 0 && dt < 1) wob += Math.exp(-dt * 7) * Math.sin(dt * 28) * .18; }
            const size = .6 + absorbed * .2 + charge * .25, sx = size * (1 + wob + charge * .08 * Math.sin(t * 50)), sy = size * (1 - wob);
            shadow(cx, GY, 26 * size, .55);
            // Round frames only (7 and 0); while charging they flicker fast, so the heap trembles instead of going flat.
            const frame = Math.floor(t * (charge > 0 ? 18 : 5)) % 2 ? 0 : 7;
            sprite(frame, cx, GY, sx, sy);
            if (charge > 0) {                                           // white-hot from inside, pulsing faster as it nears the burst
              ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = charge * (.55 + .3 * Math.sin(t * (10 + charge * 30))); sprite(frame, cx, GY, sx, sy); ctx.restore();
              once('charge', () => sounds.playBeamCharge());
            }
          }
          // The slimes on their way in, the farthest first.
          for (const s of [...SLIMES].sort((a, b) => b.z - a.z)) {
            const u = (t - s.t0) / s.travel;
            if (u < 0 || u >= 1) continue;
            const eased = 1 - (1 - u) * (1 - u);
            const fromX = cx + s.side * (LW / 2 + 30 + s.lane * 25), x = fromX + (cx - fromX) * eased;
            const baseY = GY - s.z * 26 + s.z * 26 * u;
            const p = (u * s.hops) % 1, last = u * s.hops >= s.hops - 1;
            const lift = Math.sin(p * Math.PI) * (last ? 34 : 14);
            const frame = p < .1 ? 1 : p < .25 ? 2 : p < .5 ? 3 : p < .75 ? 4 : p < .9 ? 5 : 6;
            shadow(x, baseY, 12 * s.scale * 1.6, .35 * (1 - lift / 40));
            sprite(frame, x, baseY - lift, s.scale, s.scale, -s.side);
          }
          // Each arrival: a ring and a spray of embers off the heap.
          SLIMES.forEach((s, i) => {
            const dt = t - (s.t0 + s.travel);
            if (dt < 0 || dt > .6) return;
            once('absorb' + i, () => sounds.playEchoSpawn());
            const size = .6 + (i + 1) * .2;
            ctx.strokeStyle = `rgba(255,190,90,${1 - dt / .6})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(cx, GY - 4, 20 * size + dt * 90, (20 * size + dt * 90) * .3, 0, 0, Math.PI * 2); ctx.stroke();
            for (let k = 0; k < 8; k++) {
              const a = -Math.PI * hash(i * 13 + k), v = 50 + hash(i * 7 + k) * 60;
              ctx.fillStyle = k % 2 ? '#ffd36a' : '#ff7a22';
              ctx.fillRect(Math.round(cx + Math.cos(a) * v * dt), Math.round(GY - 30 * size + Math.sin(a) * v * dt + 120 * dt * dt), 2, 2);
            }
          });
        } else {
          // The burst: a flash, a shockwave, gobbets of slime flung out, then the demon rises from the lava.
          once('burst', () => { sounds.playGuardianLanding(); sounds.playImpact(); });
          const frame = Math.min(31, STRIP_FROM + Math.floor(afterBurst / STRIP_FRAME));
          const k = (LH * .7) / STRIP_H;                         // the demon (orbs included) fills ~70% of the height
          const stripX = Math.round(cx - STRIP_W * k / 2), stripY = Math.round(GY + 4 - STRIP_H * k);
          if (t < T_HAND) ctx.drawImage(strip, frame * STRIP_W, 0, STRIP_W, STRIP_H, stripX, stripY, Math.round(STRIP_W * k), Math.round(STRIP_H * k));
          else {
            // The hand-off: the same pose from the sheet, gliding from here to where the cinematic shows it.
            once('handoff', () => handoff.current());
            const from = { x: stripX + SHEET_IN_STRIP.x * k, y: stripY + SHEET_IN_STRIP.y * k, w: CELL_W * SHEET_IN_STRIP.scale * k, h: CELL_H * SHEET_IN_STRIP.scale * k };
            const box = document.querySelector('.demon-cut-figure')?.getBoundingClientRect();
            const sx = LW / window.innerWidth, sy = LH / window.innerHeight;
            const to = box && box.width ? { x: box.left * sx, y: box.top * sy, w: box.width * sx, h: box.height * sy } : from;
            const at = (e: number) => ({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
            for (let g = 3; g >= 0; g--) {                          // a short afterimage trail while it moves
              const r = at(Math.max(0, hand - g * .05));
              ctx.globalAlpha = g ? .22 / g * Math.sin(hand * Math.PI) : 1;
              ctx.drawImage(sheet, 0, 0, CELL_W, CELL_H, Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
            }
            ctx.globalAlpha = 1;
          }
          if (afterBurst < .7) {
            const q = afterBurst / .7;
            ctx.strokeStyle = `rgba(255,214,140,${1 - q})`; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(cx, GY - 6, 30 + q * LW * .45, (30 + q * LW * .45) * .25, 0, 0, Math.PI * 2); ctx.stroke();
            for (let j = 0; j < 14; j++) {
              const a = -Math.PI * (.05 + .9 * hash(j + 40)), v = 90 + hash(j + 60) * 120;
              ctx.fillStyle = j % 3 ? '#c4521a' : '#ffb347';
              const s = j % 3 ? 4 : 3;
              ctx.fillRect(Math.round(cx + Math.cos(a) * v * afterBurst), Math.round(GY - 50 + Math.sin(a) * v * afterBurst + 260 * afterBurst * afterBurst), s, s);
            }
          }
          if (afterBurst < .45) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,236,200,${1 - afterBurst / .45})`; ctx.fillRect(0, 0, LW, LH); }
        }
        // Embers rising off the lava the whole time, thicker as the heat builds.
        for (let i = 0; i < 26; i++) {
          if (hash(i + 90) > .35 + heat * .65) continue;
          const ph = (t * (.25 + hash(i) * .25) + hash(i + 5)) % 1;
          ctx.fillStyle = i % 3 ? '#ffb347' : '#ff6a1a';
          ctx.globalAlpha = (1 - ph) * fade;
          ctx.fillRect(Math.round(cx + (hash(i + 20) - .5) * LW * .8 + Math.sin(ph * 6 + i) * 4), Math.round(GY - ph * 170), 1, i % 4 ? 1 : 2);
          ctx.globalAlpha = 1;
        }
        if (t >= T_DONE) { done.current(); return; }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    }).catch(() => { if (!stopped) done.current(); });
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="demon-merge" aria-hidden="true" />;
}
