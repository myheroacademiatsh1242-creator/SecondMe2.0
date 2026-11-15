import type { Enemy } from '../logic/enemies.ts';
import { drawPfx } from './pixelfx.ts';

/**
 * Frost Crystal: the ice pillars' minion (tools/gen_frost_crystal.py makes the sheet). 32 x 32 cells, feet on row 29,
 * facing right. Rows: 0 idle (6) · 1 walk (8) · 2 attack (8: 0-3 wind-up, 4-5 leap, 6-7 slam) · 3 hit (3) · 4 death (8).
 */
const CELL = 32, SCALE = 2;
let sheet: HTMLImageElement | null = null;

/** Frame for the slime AI states (logic/enemies.ts: .48 s wind-up, leaps in the last .18 s, attackFx .32 s on landing). */
export function frostCrystalFrame(e: Pick<Enemy, 'hp' | 'mode' | 'timer' | 'hitFlash' | 'attackFx' | 'deathAge' | 'homeX'>, time: number) {
  if (e.hp <= 0) return { row: 4, frame: Math.min(7, Math.floor(e.deathAge * 12)) };
  if (e.mode === 'warning') return e.timer < .18
    ? { row: 2, frame: 4 + Math.min(1, Math.floor((.18 - e.timer) / .18 * 2)) }
    : { row: 2, frame: Math.min(3, Math.floor((.48 - e.timer) / .3 * 4)) };
  if ((e.attackFx ?? 0) > 0) return { row: 2, frame: 6 + Math.min(1, Math.floor((.32 - e.attackFx!) / .32 * 2)) };
  if (e.hitFlash > 0) return { row: 3, frame: e.hitFlash > .25 ? 0 : e.hitFlash > .1 ? 1 : 2 };
  return e.mode === 'chase'
    ? { row: 1, frame: Math.floor(time * 10 + e.homeX) % 8 }
    : { row: 0, frame: Math.floor(time * 6 + e.homeX) % 6 };
}

/** Draws one Frost Crystal with its feet on (x, y). False until the sheet has loaded. */
export function drawFrostCrystal(ctx: CanvasRenderingContext2D, e: Enemy, time: number): boolean {
  if (!sheet && typeof Image !== 'undefined') {
    sheet = new Image();
    sheet.src = `${import.meta.env.BASE_URL}assets/enemies/frost-crystal.png`;
  }
  if (!sheet?.complete || !sheet.naturalWidth) return false;
  if (e.hp <= 0 && e.deathAge >= .7) return true;
  const { row, frame } = frostCrystalFrame(e, time);
  const x = Math.round(e.x), y = Math.round(e.y);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (e.mode === 'warning' && e.hp > 0) {   // where it will land
    ctx.strokeStyle = '#bff4ff'; ctx.fillStyle = '#7fd8f22a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.targetX, e.targetY, 28, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (e.hp > 0) { ctx.fillStyle = '#04121b80'; ctx.beginPath(); ctx.ellipse(x, y + 3, 17, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.translate(x, y);
  if (e.facingLeft) ctx.scale(-1, 1);
  ctx.drawImage(sheet, frame * CELL, row * CELL, CELL, CELL, -CELL * SCALE / 2, -29 * SCALE + 3, CELL * SCALE, CELL * SCALE);
  ctx.restore();
  // Its heart: pixelfx ice/ice-crystal (facets turning in their own cold light, glints, frost motes) floating over its spikes;
  // it flares while winding up and goes out as the body breaks.
  const alive = e.hp > 0, fade = alive ? 1 : Math.max(0, 1 - e.deathAge / .3);
  if (fade > 0) drawPfx(ctx, 'ice-crystal', time + (e.homeX % 7) * .37, x, y - 46 + Math.round(Math.sin(time * 2.6 + e.homeX) * 2),
    { scale: e.mode === 'warning' && alive ? .62 : .5, alpha: fade });
  if (e.hp > 0 && e.hp < e.maxHp) {
    ctx.fillStyle = '#06141d'; ctx.fillRect(x - 15, y - 62, 30, 4);
    ctx.fillStyle = '#9fe3f2'; ctx.fillRect(x - 15, y - 62, 30 * e.hp / e.maxHp, 4);
  }
  return true;
}
