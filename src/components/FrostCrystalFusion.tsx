import { useEffect, useRef } from 'react';
import { sounds } from '../game/logic/sound.ts';
import { drawPfx, preloadPfx } from '../game/rendering/pixelfx.ts';

/**
 * The Frost Guardian is born from the last two Frost Crystals (first part of BossIntro on level 6). Timeline (s):
 *  0-.5 fade in · .5-2 SWELL: both swell up in three pulses, a blizzard vortex at their feet · 2-4.2 FUSION DANCE, mirrored:
 *  three side hops inward, arms swept over to one side, knee up and swept to the other, both point at each other ·
 *  4.2-5.45 LEAP: the camera closes in and swings while they leap, spin round each other (swapping sides) and meet in the air ·
 *  5.45 the final pose flashes white (frost nova + snowflake burst): `onFlash` mounts the Guardian's entrance underneath,
 *  and the white fades off it until `onDone`. Ice effects are pixelfx (PIXELFX_CHEATSHEET.md: ice/ice-crystal hearts,
 *  ice/blizzard-vortex, ice/frost-nova, ice/snowflake-burst). Drawn on a 270 px high canvas scaled up, so it stays pixel art.
 */
const LH = 270, GY = 214, CELL = 32;
const T_SWELL = .5, T_DANCE = 2, T_LEAP = 4.2, T_MEET = 5.45, T_FLASH = 5.62, T_DONE = 6.5;
const BEATS = [2, 2.55, 3.1, 3.65];                       // hop in · sweep up · knee + sweep across · point
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (u: number) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

interface Pose { x: number; lift: number; scale: number; row: number; frame: number; rot: number; faceRight: boolean; glow: number }

/** Where crystal `s` (-1 left, 1 right) is and how it stands at `t`. Exported for the test. */
export function fusionPose(t: number, s: -1 | 1, cx: number): Pose {
  const pulses = [.85, 1.3, 1.75].reduce((a, p) => t > p ? a + Math.exp(-(t - p) * 7) * Math.sin((t - p) * 32) * .28 : a, 0);
  const scale = 2 + 1.4 * ease(seg(t, T_SWELL, T_DANCE)) + pulses;
  const idle = Math.floor(t * 6) % 6;
  const base: Pose = { x: cx + s * 80, lift: 0, scale, row: 0, frame: idle, rot: 0, faceRight: s < 0, glow: .25 * seg(t, T_SWELL, T_DANCE) };
  if (t < BEATS[0]) return base;
  if (t < BEATS[1]) {                                       // three hops inward
    const u = seg(t, BEATS[0], BEATS[1]);
    return { ...base, x: cx + s * (80 - 22 * ease(u)), lift: Math.abs(Math.sin(u * 3 * Math.PI)) * 7, row: 1, frame: Math.floor(t * 14) % 8 };
  }
  if (t < BEATS[2]) {                                       // arms swept up and over, leaning out
    const u = ease(seg(t, BEATS[1], BEATS[2]));
    return { ...base, x: cx + s * 58, row: 2, frame: u < .4 ? 1 : 2, rot: -s * .3 * u };
  }
  if (t < BEATS[3]) {                                       // knee up, arms swept across, leaning in
    const u = seg(t, BEATS[2], BEATS[3]);
    return { ...base, x: cx + s * 58, lift: Math.sin(u * Math.PI) * 10, row: 2, frame: 3, rot: -s * .3 + s * .6 * ease(u) };
  }
  if (t < T_LEAP) {                                         // point at each other
    const u = ease(seg(t, BEATS[3], BEATS[3] + .25));
    return { ...base, x: cx + s * (58 - 8 * u), row: 2, frame: 6, rot: s * (.3 - .18 * u), glow: .4 };
  }
  // The leap: rise, circle round each other (they swap sides), spin, and meet in the air.
  const u = seg(t, T_LEAP, T_MEET), turn = Math.PI * ease(u), r = 50 * (1 - ease(seg(t, T_LEAP + .65, T_MEET)));
  const meet = t >= T_MEET;
  return {
    ...base, x: cx + s * (meet ? 0 : r) * Math.cos(turn) - (meet ? s * 9 : 0), lift: 78 * Math.sin(Math.min(1, u / .45) * Math.PI / 2),
    row: 2, frame: meet ? 6 : u < .8 ? 4 : 5, rot: meet ? 0 : s * ease(u) * Math.PI * 2,
    faceRight: meet ? s < 0 : (s < 0) !== (turn > Math.PI / 2), glow: .4 + .6 * seg(t, T_MEET - .3, T_FLASH),
  };
}

export function FrostCrystalFusion({ onFlash, onDone }: { onFlash: () => void; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const flash = useRef(onFlash), done = useRef(onDone);
  flash.current = onFlash; done.current = onDone;
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { flash.current(); done.current(); return; }
    const LW = Math.max(320, Math.round(LH * window.innerWidth / Math.max(1, window.innerHeight)));
    canvas.width = LW; canvas.height = LH;
    const cx = LW / 2;
    preloadPfx(['ice-crystal', 'blizzard-vortex', 'frost-nova', 'snowflake-burst']);
    let raf = 0, stopped = false;
    const heard = new Set<string>();
    const once = (key: string, play: () => void) => { if (!heard.has(key)) { heard.add(key); play(); } };
    const sheet = new Image();
    sheet.onerror = () => { if (!stopped) { flash.current(); done.current(); } };
    sheet.onload = () => {
      if (stopped) return;
      const start = performance.now();
      const crystal = (p: Pose, light: number) => {
        const k = p.scale, footY = GY - p.lift;
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(footY - 14 * k));                  // turn about the body's middle
        ctx.rotate(p.rot);
        if (!p.faceRight) ctx.scale(-1, 1);
        const draw = () => ctx.drawImage(sheet, p.frame * CELL, p.row * CELL, CELL, CELL, -CELL * k / 2, -15 * k, CELL * k, CELL * k);
        draw();
        if (light > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = light; draw(); }   // white-hot from inside
        ctx.restore();
      };
      const frame = (now: number) => {
        const t = (now - start) / 1000;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, LW, LH);
        ctx.imageSmoothingEnabled = false;
        if (t >= T_FLASH) {                                                           // only the white is left, fading off the Guardian
          once('flash', () => { flash.current(); sounds.playGuardianReveal(); });
          ctx.fillStyle = `rgba(234,252,255,${1 - seg(t, T_FLASH + .15, T_DONE)})`; ctx.fillRect(0, 0, LW, LH);
          if (t >= T_DONE) { done.current(); return; }
          raf = requestAnimationFrame(frame); return;
        }
        const L = fusionPose(t, -1, cx), R = fusionPose(t, 1, cx);
        // Night sky over an ice floor.
        const sky = ctx.createLinearGradient(0, 0, 0, LH);
        sky.addColorStop(0, '#030a12'); sky.addColorStop(.7, '#0b2433'); sky.addColorStop(1, '#123448');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, LW, LH);
        // Camera: still for the swell, a slow push in through the dance, then close in and swing for the leap.
        const leap = seg(t, T_LEAP, T_MEET);
        // Close-up: at most ~1.8x, so the swollen pair (about 110 px tall) still fits the 270 px frame.
        const zoom = 1 + .15 * seg(t, T_DANCE, T_LEAP) + .5 * ease(leap) + .15 * seg(t, T_MEET, T_FLASH);
        const roll = Math.sin(leap * Math.PI * 2) * .2 * (1 - seg(t, T_MEET - .2, T_MEET));
        const fy = (GY - 55) * (1 - ease(leap)) + (GY - L.lift - 13 * L.scale) * ease(leap);   // follows their bodies (sprite middle) up
        const beat = BEATS.reduce((a, b) => t >= b && t < b + .2 ? 1 - (t - b) / .2 : a, 0);
        const shake = beat * 2 + seg(t, T_MEET - .25, T_FLASH) * 3;
        ctx.translate(cx + (hash(Math.floor(t * 40)) - .5) * shake * 2, LH * (.55 - .05 * ease(leap)) + (hash(Math.floor(t * 40) + 3) - .5) * shake * 2);
        ctx.rotate(roll); ctx.scale(zoom, zoom); ctx.translate(-cx, -fy);
        // Floor: a cold glow under them, rings on each beat of the dance.
        const glow = ctx.createRadialGradient(cx, GY, 4, cx, GY, 160);
        glow.addColorStop(0, `rgba(140,230,255,${.25 + .35 * L.glow})`); glow.addColorStop(1, 'rgba(60,140,200,0)');
        ctx.fillStyle = glow; ctx.fillRect(cx - 200, GY - 90, 400, 140);
        ctx.fillStyle = '#163f55'; ctx.fillRect(cx - LW, GY + 2, LW * 2, LH);
        BEATS.forEach((b, i) => {
          const q = (t - b) / .6;
          if (q < 0 || q > 1) return;
          once('beat' + i, () => sounds.playEchoSpawn());
          for (const p of [L, R]) {
            ctx.strokeStyle = `rgba(200,245,255,${1 - q})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(p.x, GY, 20 + q * 50, (20 + q * 50) * .28, 0, 0, Math.PI * 2); ctx.stroke();
          }
        });
        // The swell: a blizzard vortex round each, growing with them.
        const storm = seg(t, T_SWELL, T_SWELL + .6) * (1 - seg(t, T_DANCE, T_DANCE + .4));
        if (storm > 0) {
          once('swell', () => { sounds.playFrostCharge(); sounds.playBeamCharge(); });
          for (const p of [L, R]) drawPfx(ctx, 'blizzard-vortex', t, p.x, GY + 4, { scale: .45 * p.scale, alpha: storm });
        }
        for (const [i, pulse] of [.85, 1.3, 1.75].entries()) if (t >= pulse) once('pulse' + i, () => sounds.playIceHit(true));
        // Shadows, then the two crystals with their floating hearts.
        for (const p of [L, R]) {
          ctx.fillStyle = `rgba(2,10,18,${.5 * (1 - p.lift / 100)})`;
          ctx.beginPath(); ctx.ellipse(p.x, GY + 1, 9 * p.scale * (1 - p.lift / 160), 2.6 * p.scale, 0, 0, Math.PI * 2); ctx.fill();
        }
        if (t >= T_LEAP) once('leap', () => { sounds.playDodge(); sounds.playFrostBurst(); });
        for (const p of [L, R]) {
          crystal(p, p.glow * (.6 + .4 * Math.sin(t * 30)));
          if (t < T_LEAP) drawPfx(ctx, 'ice-crystal', t + (p === L ? 0 : 1.1), p.x, GY - p.lift - 24 * p.scale, { scale: .25 * p.scale });
        }
        // Speed lines while they fly.
        if (leap > 0 && leap < 1) {
          ctx.strokeStyle = `rgba(220,248,255,${.35 * Math.sin(leap * Math.PI)})`; ctx.lineWidth = 1;
          for (let i = 0; i < 18; i++) {
            const a = hash(i + Math.floor(t * 20)) * Math.PI * 2, r0 = 70 + hash(i * 3) * 40;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, fy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 60), fy + Math.sin(a) * (r0 + 60)); ctx.stroke();
          }
        }
        // The meeting: a frost nova blooms where their fists touch, snowflakes burst out.
        if (t >= T_MEET) {
          once('meet', () => { sounds.playGuardianLanding(); sounds.playImpact(); });
          const at = GY - (L.lift + R.lift) / 2 - 14 * L.scale;
          drawPfx(ctx, 'frost-nova', (t - T_MEET) + .9, cx, at + 40, { scale: 1.3 });
          drawPfx(ctx, 'snowflake-burst', (t - T_MEET) + .15, cx, at + 40, { scale: 1.6 });
        }
        // Snow falling through it all (screen space).
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 40; i++) {
          const ph = (t * (.12 + hash(i) * .1) + hash(i + 5)) % 1;
          ctx.fillStyle = i % 4 ? '#cfefff' : '#ffffff'; ctx.globalAlpha = .75;
          ctx.fillRect(Math.round((hash(i + 20) * LW + Math.sin(ph * 6 + i) * 6 + t * 8) % LW), Math.round(ph * LH), 1, i % 5 ? 1 : 2);
        }
        ctx.globalAlpha = 1;
        // Fade in, and the white rising into the flash.
        if (t < T_SWELL) { ctx.fillStyle = `rgba(3,10,18,${1 - t / T_SWELL})`; ctx.fillRect(0, 0, LW, LH); }
        const white = seg(t, T_MEET - .1, T_FLASH);
        if (white > 0) { ctx.fillStyle = `rgba(234,252,255,${white})`; ctx.fillRect(0, 0, LW, LH); }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    sheet.src = `${import.meta.env.BASE_URL}assets/enemies/frost-crystal.png`;
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="frost-fusion-canvas" aria-hidden="true" />;
}
