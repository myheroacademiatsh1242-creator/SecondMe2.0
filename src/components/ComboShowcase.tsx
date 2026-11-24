import {outfitSheet} from '../game/rendering/outfitSprites.ts';
import type {OutfitId} from '../game/logic/outfits.ts';
import React, { useEffect, useRef } from 'react';
import sprites from '../game/data/comboSprites.json';
import { COMBO_HITS, type ComboHero } from '../game/logic/combo.ts';
import { drawSantaHat, readySantaHat } from './HeroSantaHat.ts';

/** How much slower than in battle the showcase plays, so each swing can be followed. */
const SLOW = 1.35;
const IDLE_BEFORE = 0.55, REST_AFTER = 0.9;
/** A changed frame leaves its predecessor fading out over this long (motion smear). */
const GHOST_S = 0.11;
interface Sheet { file: string; frameW: number; frameH: number; anims: Record<string, number[]> }
const SHEETS: Record<ComboHero, Sheet> = { swordsman: sprites.kael, mage: sprites.aeris };
// Crown positions in the original combo sheets, indexed by frame.
const CROWNS: Record<ComboHero, [number, number][]> = {
  swordsman: [[44,5],[44,6],[44,8],[44,6],[44,8],[44,8],[44,7],[44,4],[44,5],
    [44,4],[44,3],[44,5],[44,8],[44,7],[44,8],[44,13],[44,5]],
  mage: [[48,15],[50,16],[50,16],[52,15],[51,17],[51,16],[51,16],[51,16],[51,17],
    [51,11],[50,12],[52,11],[52,12],[39,10],[51,12],[51,12],[51,13],[51,10]],
};

/**
 * The loop: idle, the four hits, a rest. Frames are not evenly timed: the wind-up before the
 * hit frame and the hit frame itself hold longer, the swing between passes quickly, the last
 * frame settles; with only 3-6 drawn frames per hit, even timing reads as a slideshow.
 */
function timeline(hero: ComboHero) {
  const s = SHEETS[hero];
  const steps: { frame: number; dur: number; hit: number }[] = [{ frame: s.anims.idle[0], dur: IDLE_BEFORE, hit: -1 }];
  COMBO_HITS[hero].forEach((h, i) => {
    const frames = s.anims[h.anim];
    frames.forEach((f, k) => {
      const weight = k === h.hitFrame ? 1.9 : k === h.hitFrame - 1 ? 1.25 : k === frames.length - 1 ? 1.4 : 0.75;
      steps.push({ frame: f, dur: h.frameTime * SLOW * weight * (h.heavy ? 1.15 : 1), hit: i });
    });
  });
  steps.push({ frame: s.anims.idle[0], dur: REST_AFTER, hit: -1 });
  return steps;
}

/**
 * Plays a hero's four-hit combo on a loop with the game's own combo frames (scaled up with
 * nearest-neighbour), for the character screen.
 * Draws only when something changes (a new frame, or the previous one still fading).
 */
export function ComboPreview({ hero, outfit, reducedMotion=false, winter=false }: { hero: ComboHero;outfit?:OutfitId;reducedMotion?:boolean;winter?:boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = SHEETS[hero];
  const scale = Math.max(2, Math.floor(380 / s.frameW));
  const headroom = winter ? 13 : 0;

  useEffect(() => {
    const cv = canvas.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/combat/${s.file}`;
    const steps = timeline(hero);
    const total = steps.reduce((a, b) => a + b.dur, 0);
    const t0 = performance.now();
    let raf = 0, current = -1, previous = -1, changedAt = 0, ghostDone = true;
    const draw = (f: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(outfitSheet(img,hero,outfit), f * s.frameW, 0, s.frameW, s.frameH, 0, headroom * scale, s.frameW * scale, s.frameH * scale);
      const crown = CROWNS[hero][f];
      if (winter && crown) drawSantaHat(ctx, crown[0] * scale, (crown[1] + headroom) * scale, (hero === 'mage' ? 29 : 26) * scale);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!img.complete || !img.naturalWidth || (winter && !readySantaHat())) return;
      let t = reducedMotion?0:((now - t0) / 1000) % total, i = 0;
      while (t >= steps[i].dur) { t -= steps[i].dur; i++; }
      const st = steps[i];
      if (i !== current) { previous = current; current = i; changedAt = now; ghostDone = false; }
      else if (ghostDone) return;                          // nothing moves: keep the canvas as is
      const k = Math.min(1, (now - changedAt) / 1000 / GHOST_S);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      if (previous >= 0 && k < 1 && steps[previous].frame !== st.frame) draw(steps[previous].frame, 0.5 * (1 - k));
      draw(st.frame, 1);
      ctx.globalAlpha = 1;
      ghostDone = k >= 1;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [hero,outfit,reducedMotion,winter,headroom,s,scale]);

  return <canvas ref={canvas} className="combo-preview" width={s.frameW * scale} height={(s.frameH + headroom) * scale} aria-hidden="true"/>;
}
