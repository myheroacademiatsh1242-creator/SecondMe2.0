import { useEffect, useRef } from 'react';
import { sounds } from '../game/logic/sound.ts';
import { drawPfx, preloadPfx } from '../game/rendering/pixelfx.ts';
import DANCE from '../game/data/frostFusionDance.json';

/**
 * Lưỡng Long Nhất Thể: the last two Frost Crystals do the fusion dance and become the Frost Guardian (first part of BossIntro
 * on level 6). The dance itself is body animation from tools/gen_frost_crystal.py (frost-crystal-dance.png + data/
 * frostFusionDance.json); this places the two dancers as mirror images and adds the light. Timeline (s):
 *  0-.8 stand facing each other · .8-1.65 "Fuuu" three side steps out, arms swung out · 1.65-2.5 "-sion" arms over the head,
 *  three steps in, knee up · 2.5-TOUCH "Ha!" lunge, index fingers meet at the centre · TOUCH-4 the pose is held (a small spark) ·
 *  4-5 light from the touch: a cold beam, both bodies light up, motes circle, a frost nova under their feet, a light shake ·
 *  5-6.2 they vanish in the light, ice shards rush in, a snowflake burst, and the Guardian forms (its own sheet: the death row
 *  played backwards, the pieces gathering into it, fists raised) · 6.2-6.8 it slams both fists into the ground: shockwaves, dust,
 *  a hard screen shake at T_IMPACT · then it stands in a fading aura · HANDOFF `onHandoff` mounts the
 *  Guardian's card (.boss-cut.from-fusion) underneath and the Guardian glides into its place there · DONE `onDone`.
 * The two dancers are drawn at a fixed 2x: nothing is scaled up to fake motion, and the camera never turns.
 */
const LH = 200, GY = 166, K = 2, GK = 1.5;
const FPS = DANCE.fps, FRAMES = DANCE.frames, [CW, CH] = DANCE.cell, CXC = DANCE.centerX, FEET = DANCE.feetY;
export const TOUCH = DANCE.touchFrame / FPS;
const SLAM = .6, SLAM_HIT = .65;                                            // the fists' slam: length (s) and when they land (share of it)
const DANCE_END = FRAMES / FPS, T_LIGHT = DANCE_END, T_FORM = 5, T_BURST = 5.5, T_RAISE = 6.2, T_IMPACT = T_RAISE + SLAM * SLAM_HIT,
  T_STAND = T_RAISE + SLAM + .15, T_HANDOFF = 7.35, T_DONE = 7.95;
const G_W = 192, G_H = 128, G_FEET = 110, G_CX = 96;                       // frost-guardian/sheet.png cells; feet row, body centre
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (u: number) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Where the two dancers stand at `t` (canvas px, cx an integer): the left one's root, and the right one's as its mirror. At the
 *  touch frame the right edge of the left fingertip and the left edge of the mirrored one are both exactly cx. */
export function dancePlacement(t: number, cx: number) {
  const frame = Math.min(FRAMES - 1, Math.max(0, Math.floor(t * FPS)));
  const touch = DANCE.touchFrame, tipU = DANCE.tip[touch]![0];
  const xL = Math.round(cx - (tipU + 1 - CXC) * K - (DANCE.dx[touch] - DANCE.dx[frame]) * K);
  return { frame, xL, xR: 2 * cx - xL, bodyRightL: xL + (DANCE.bodyRight[frame] + 1 - CXC) * K, tipY: GY - (FEET - DANCE.tip[touch]![1]) * K + K / 2 };
}

export function FrostCrystalFusion({ onHandoff, onDone }: { onHandoff: () => void; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const handoff = useRef(onHandoff), done = useRef(onDone);
  handoff.current = onHandoff; done.current = onDone;
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { handoff.current(); done.current(); return; }
    const LW = Math.max(320, Math.round(LH * window.innerWidth / Math.max(1, window.innerHeight)));
    canvas.width = LW; canvas.height = LH;
    const cx = Math.floor(LW / 2);
    preloadPfx(['frost-nova', 'snowflake-burst', 'ground-slam']);
    let raf = 0, stopped = false;
    const heard = new Set<string>();
    const once = (key: string, play: () => void) => { if (!heard.has(key)) { heard.add(key); play(); } };
    const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = `${import.meta.env.BASE_URL}${src}`; });
    Promise.all([load('assets/enemies/frost-crystal-dance.png'), load('assets/frost-guardian/sheet.png')]).then(([dance, guardian]) => {
      if (stopped) return;
      const start = performance.now();
      // One dancer: the left one as drawn, the right one mirrored about its root. `light` adds a white-hot copy on top.
      const dancer = (frame: number, x: number, mirror: boolean, alpha: number, light: number) => {
        const sx = (frame % DANCE.columns) * CW, sy = Math.floor(frame / DANCE.columns) * CH;
        ctx.save(); ctx.translate(x, GY - FEET * K); if (mirror) ctx.scale(-1, 1); ctx.globalAlpha = alpha;
        ctx.drawImage(dance, sx, sy, CW, CH, -CXC * K, 0, CW * K, CH * K);
        if (light > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * light; ctx.drawImage(dance, sx, sy, CW, CH, -CXC * K, 0, CW * K, CH * K); }
        ctx.restore();
      };
      const guardianAt = (row: number, frame: number, box: { x: number; y: number; w: number; h: number }, light: number, alpha = 1) => {
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawImage(guardian, frame * G_W, row * G_H, G_W, G_H, Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h));
        if (light > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * light; ctx.drawImage(guardian, frame * G_W, row * G_H, G_W, G_H, Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h)); }
        ctx.restore();
      };
      const home = { x: cx - G_CX * GK, y: GY - G_FEET * GK, w: G_W * GK, h: G_H * GK };
      const glow = (x: number, y: number, r: number, a: number, rgb = '150,230,255') => {
        const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const frameAt = (now: number) => {
        const t = (now - start) / 1000;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, LW, LH);
        ctx.imageSmoothingEnabled = false;
        const leave = ease(seg(t, T_HANDOFF, T_DONE));                        // the scene fades off the Guardian's card
        const p = dancePlacement(t, cx);
        // The whole view shakes (sky and floor too): lightly when the energy peaks, hard when the Guardian's fists hit the ground.
        const hit = t - T_IMPACT;
        const shake = seg(t, 4.55, 4.8) * (1 - seg(t, 5.0, 5.25)) * 1.5 + (t > T_BURST && t < T_BURST + .3 ? 2 * (1 - (t - T_BURST) / .3) : 0)
          + (hit >= 0 && hit < .6 ? 9 * (1 - hit / .6) ** 2 : 0);
        if (shake) ctx.translate(Math.round((hash(Math.floor(t * 45)) - .5) * shake * 2), Math.round((hash(Math.floor(t * 45) + 3) - .5) * shake * 2));
        // Night over an ice floor (both fade away during the hand-off); drawn past the edges so a shake never shows a gap.
        ctx.globalAlpha = 1 - leave;
        const sky = ctx.createLinearGradient(0, 0, 0, LH);
        sky.addColorStop(0, '#030a12'); sky.addColorStop(.75, '#0b2433'); sky.addColorStop(1, '#123448');
        ctx.fillStyle = sky; ctx.fillRect(-14, -14, LW + 28, LH + 28);
        ctx.fillStyle = '#143a4f'; ctx.fillRect(-14, GY + 1, LW + 28, LH - GY + 14);
        ctx.fillStyle = '#2a6a86'; ctx.fillRect(-14, GY + 1, LW + 28, 1);
        // Cold light round each dancer from the start.
        if (t < T_FORM) for (const x of [p.xL, p.xR]) glow(x, GY - 14, 34, .22);

        // Fusion energy: a frost nova blooming under their feet.
        if (t >= T_LIGHT) { once('nova', () => sounds.playBeamCharge()); drawPfx(ctx, 'frost-nova', t - T_LIGHT, cx, GY + 2, { scale: .7, alpha: 1 - leave }); }

        // The dancers: in sync, mirror images (same frame, mirrored root). They light up after the touch and vanish in it.
        if (t < T_FORM + .4) {
          const light = Math.min(1, ease(seg(t, T_LIGHT + .15, T_FORM)) + (t >= TOUCH && t < T_LIGHT ? .12 + .08 * Math.sin(t * 18) : 0));
          const alpha = 1 - ease(seg(t, T_FORM, T_FORM + .4));
          dancer(p.frame, p.xL, false, alpha, light);
          dancer(p.frame, p.xR, true, alpha, light);
          if (t >= .8) once('fu', () => sounds.playFrostCharge());
          if (t >= 1.65) once('sion', () => sounds.playEchoSpawn());
          if (t >= TOUCH) once('touch', () => sounds.playIceHit(false));
        }
        // The touch: a small spark held on the fingertips, then a cold cross of light from it.
        if (t >= TOUCH && t < T_FORM + .3) {
          const k = t < T_LIGHT ? .6 + .4 * Math.sin((t - TOUCH) * 14) : 1;
          const arm = t < T_LIGHT ? 2 : 2 + 60 * ease(seg(t, T_LIGHT, T_FORM));
          ctx.fillStyle = `rgba(235,253,255,${k})`;
          ctx.fillRect(cx - 1, Math.round(p.tipY - arm), 2, Math.round(arm * 2)); ctx.fillRect(Math.round(cx - arm * .6), Math.round(p.tipY) - 1, Math.round(arm * 1.2), 2);
          glow(cx, p.tipY, 8 + 120 * ease(seg(t, T_LIGHT, T_FORM)), .35 + .55 * seg(t, T_LIGHT, T_FORM), '200,245,255');
        }
        // Ice motes circling both, closing in as the light peaks; they drift off once the Guardian stands.
        if (t > T_LIGHT + .2 && t < T_STAND + 1) {
          const inA = seg(t, T_LIGHT + .2, T_LIGHT + .6), outA = 1 - seg(t, T_STAND, T_STAND + 1);
          for (let i = 0; i < 26; i++) {
            const a = hash(i) * Math.PI * 2 + t * (1.6 + hash(i + 9)), r = (70 - 30 * seg(t, T_LIGHT, T_FORM)) * (.7 + .3 * hash(i + 3));
            const y = GY - 18 - 22 * hash(i + 7) + Math.sin(a) * 10 - (t > T_STAND ? (t - T_STAND) * 30 * hash(i + 2) : 0);
            ctx.fillStyle = i % 3 ? `rgba(190,240,255,${inA * outA})` : `rgba(255,255,255,${inA * outA})`;
            ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(y), i % 4 ? 1 : 2, i % 4 ? 1 : 2);
          }
        }
        // Ice shards rushing into the light, then the burst.
        if (t >= T_FORM && t < T_BURST + .1) {
          const u = ease(seg(t, T_FORM, T_BURST));
          for (let i = 0; i < 22; i++) {
            const a = hash(i + 50) * Math.PI * 2, r0 = 90 + hash(i + 70) * 80, r = r0 * (1 - u);
            const x = cx + Math.cos(a) * r, y = GY - 30 + Math.sin(a) * r * .55, s = 1 + (i % 3);
            ctx.fillStyle = i % 2 ? '#dff8ff' : '#7fd8f2';
            ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.fill();
          }
          glow(cx, GY - 40, 70, .6 + .3 * u, '220,250,255');
        }
        if (t >= T_BURST) {
          once('burst', () => { sounds.playGuardianLanding(); sounds.playFrostBurst(); });
          drawPfx(ctx, 'snowflake-burst', t - T_BURST + .12, cx, GY - 30, { scale: 1.2, alpha: 1 - leave });
          if (t < T_BURST + .5) { const q = (t - T_BURST) / .5; ctx.strokeStyle = `rgba(230,252,255,${1 - q})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, GY - 2, 20 + q * 150, (20 + q * 150) * .25, 0, 0, Math.PI * 2); ctx.stroke(); }
          // The Guardian: its death row backwards (the pieces gather, the core stands, the ice closes over it), then idle.
          // then it raises both fists (death row frame 5) and brings them down together on the ground (the card's old slam: frames
          // 5, 4, 3, 2 of row 4 over SLAM s, impact at SLAM_HIT of it), and settles into its idle.
          const forming = seg(t, T_BURST, T_RAISE), slam = (t - T_RAISE) / SLAM;
          const row = slam < 1 ? 4 : 0;
          const frame = forming < 1 ? 15 - Math.floor(forming * 10.99)
            : slam < 1 ? (slam < .41 ? 5 : slam < .53 ? 4 : slam < SLAM_HIT ? 3 : 2) : Math.floor(t * 6) % 6;
          if (hit >= 0) {
            once('slam', () => { sounds.playGuardianLanding(); sounds.playImpact(); sounds.playFrostBurst(); });
            drawPfx(ctx, 'ground-slam', hit, cx, GY + 4, { scale: .9, alpha: 1 - leave });          // dust and ice kicked up by the fists
            if (hit < .6) {                                                                              // two shockwaves along the floor, a white flash
              for (const [q, w] of [[hit / .6, 1], [Math.max(0, hit - .1) / .6, .6]] as const) {
                ctx.strokeStyle = `rgba(230,252,255,${(1 - q) * w})`; ctx.lineWidth = 2; ctx.beginPath();
                ctx.ellipse(cx, GY - 1, 24 + q * LW * .45, (24 + q * LW * .45) * .16, 0, 0, Math.PI * 2); ctx.stroke();
              }
              ctx.fillStyle = `rgba(235,252,255,${.35 * (1 - hit / .18 > 0 ? 1 - hit / .18 : 0)})`; ctx.fillRect(-14, -14, LW + 28, LH + 28);
              for (let i = 0; i < 16; i++) {                                                             // shards flung up and falling
                const a = -Math.PI * (.1 + .8 * hash(i + 120)), v = 60 + hash(i + 140) * 90;
                ctx.fillStyle = i % 2 ? '#dff8ff' : '#7fd8f2';
                ctx.fillRect(Math.round(cx + Math.cos(a) * v * hit), Math.round(GY - 4 + Math.sin(a) * v * hit + 220 * hit * hit), 2 + (i % 2), 2 + (i % 2));
              }
            }
          }
          if (t < T_HANDOFF) {
            glow(cx, GY - 60, 90, .25 + .35 * (1 - seg(t, T_BURST, T_STAND)), '160,230,255');      // its cold aura, settling
            guardianAt(row, frame, home, 1 - ease(seg(t, T_BURST, T_RAISE - .2)));
          } else {
            // Hand-off: glide from here into its place on the card (.boss-cut-guardian) with no cut.
            once('handoff', () => handoff.current());
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const box = document.querySelector('.boss-cut-guardian')?.getBoundingClientRect();
            const sx = LW / window.innerWidth, sy = LH / window.innerHeight;
            const to = box && box.width ? { x: box.left * sx, y: box.top * sy, w: box.width * sx, h: box.height * sy } : home;
            const at = (e: number) => ({ x: home.x + (to.x - home.x) * e, y: home.y + (to.y - home.y) * e, w: home.w + (to.w - home.w) * e, h: home.h + (to.h - home.h) * e });
            guardianAt(0, frame, at(leave), 0);
          }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Snow over everything (screen space), and the fade in.
        for (let i = 0; i < 36; i++) {
          const ph = (t * (.1 + hash(i) * .08) + hash(i + 5)) % 1;
          ctx.fillStyle = i % 4 ? 'rgba(207,239,255,.7)' : 'rgba(255,255,255,.8)';
          ctx.globalAlpha = 1 - leave;
          ctx.fillRect(Math.round((hash(i + 20) * LW + Math.sin(ph * 6 + i) * 5 + t * 6) % LW), Math.round(ph * LH), 1, i % 5 ? 1 : 2);
        }
        ctx.globalAlpha = 1;
        if (t < .35) { ctx.fillStyle = `rgba(3,10,18,${1 - t / .35})`; ctx.fillRect(0, 0, LW, LH); }
        if (t >= T_DONE) { done.current(); return; }
        raf = requestAnimationFrame(frameAt);
      };
      raf = requestAnimationFrame(frameAt);
    }).catch(() => { if (!stopped) { handoff.current(); done.current(); } });
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="frost-fusion-canvas" aria-hidden="true" />;
}
