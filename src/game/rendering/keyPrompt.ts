import type { GameEngine } from '../GameEngine.ts';
import { shortBindingLabel } from '../logic/controlSettings.ts';
import { currentKeyPrompt } from '../logic/keyPrompts.ts';

/**
 * The key hint over the hero: a small flat-stone plate (the in-match frame) with a key cap and a
 * verb, e.g. "[E] Ghi đường đi". It bobs gently and fades in when the prompt changes. On touch
 * screens it shows the verb only; the buttons carry their own labels.
 */
let shown = '';
let since = 0;
export function drawKeyPrompt(ctx: CanvasRenderingContext2D, game: GameEngine, time: number) {
  const prompt = currentKeyPrompt(game);
  if (!prompt) { shown = ''; return; }
  const vi = game.language === 'vi';
  const text = vi ? prompt.vi : prompt.en;
  const key = game.touchControls || !prompt.action ? '' : prompt.action === 'move' ? 'WASD' : shortBindingLabel(prompt.action);
  const id = key + text;
  if (id !== shown) { shown = id; since = time; }
  const fade = Math.min(1, (time - since) / 0.2);

  ctx.save();
  ctx.font = '17px "Second Me Pixel", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const keyW = key ? Math.ceil(ctx.measureText(key).width) + 14 : 0;
  const textW = Math.ceil(ctx.measureText(text).width);
  const pad = 9, gap = key ? 8 : 0, h = 34;
  const w = pad * 2 + keyW + gap + textW;
  const bob = game.reducedMotion ? 0 : Math.round(Math.sin(time * 3) * 2);
  const x = Math.round(Math.max(48, Math.min(1232 - w, game.player.x - w / 2)));
  let y = Math.round(game.player.y - 92 + bob);
  if (y < 48) y = Math.round(game.player.y + 40);   // too close to the top wall: show it under the hero
  ctx.globalAlpha = fade;

  // Plate: dark stone face, light stone rim, drop shadow, and a little pointer toward the hero.
  ctx.fillStyle = '#0b140c'; ctx.fillRect(x + 2, y + 3, w, h);
  ctx.fillStyle = '#6f7a55'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1f2b21'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  const px = Math.round(Math.max(x + 10, Math.min(x + w - 10, game.player.x)));
  ctx.fillStyle = '#6f7a55';
  if (y < game.player.y) { ctx.fillRect(px - 5, y + h, 10, 3); ctx.fillRect(px - 2, y + h + 3, 4, 3); }
  else { ctx.fillRect(px - 5, y - 3, 10, 3); ctx.fillRect(px - 2, y - 6, 4, 3); }

  let cx = x + pad;
  if (key) {
    // Key cap: light stone with a darker base, like a physical key.
    ctx.fillStyle = '#3a4430'; ctx.fillRect(cx, y + 7, keyW, h - 12);
    ctx.fillStyle = '#d9d2b4'; ctx.fillRect(cx, y + 6, keyW, h - 15);
    ctx.fillStyle = '#1d2419'; ctx.fillText(key, cx + 7, y + 6 + (h - 15) / 2 + 1);
    cx += keyW + gap;
  }
  ctx.lineWidth = 3; ctx.strokeStyle = '#0b120d'; ctx.strokeText(text, cx, y + h / 2 + 1);
  ctx.fillStyle = '#f1e6c0'; ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}
