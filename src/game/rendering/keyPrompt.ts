import type { GameEngine } from '../GameEngine.ts';
import { controls, shortBindingLabel } from '../logic/controlSettings.ts';
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
  const binding = game.touchControls || !prompt.action || prompt.action === 'move' ? '' : controls.value.keys[prompt.action]?.[0] ?? '';
  // A mouse binding is drawn as a pixel mouse with the button lit; "Shift" stays as a key cap before it.
  const mouseButton = /Mouse([012])$/.exec(binding)?.[1];
  const mouse = mouseButton === undefined ? null : Number(mouseButton) as 0 | 1 | 2;
  const key = game.touchControls || !prompt.action ? '' : prompt.action === 'move' ? 'WASD'
    : mouse !== null ? (binding.startsWith('Shift+') ? 'Shift' : '') : shortBindingLabel(prompt.action);
  const id = key + (mouse ?? '') + text;
  if (id !== shown) { shown = id; since = time; }
  const fade = Math.min(1, (time - since) / 0.2);

  ctx.save();
  // Big enough to stay legible when the 1280x720 stage is scaled down to a small window.
  const TEXT_FONT = '23px "Second Me Pixel", monospace', KEY_FONT = '26px "Second Me Pixel", monospace';
  ctx.font = KEY_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const keyW = key ? Math.max(32, Math.ceil(ctx.measureText(key).width) + 18) : 0;
  ctx.font = TEXT_FONT;
  const textW = Math.ceil(ctx.measureText(text).width);
  const MOUSE_W = 24;
  const mouseW = mouse !== null ? MOUSE_W + (key ? 8 : 0) : 0;
  const pad = 10, gap = key || mouse !== null ? 10 : 0, h = 46;
  const w = pad * 2 + keyW + mouseW + gap + textW;
  const bob = game.reducedMotion ? 0 : Math.round(Math.sin(time * 3) * 2);
  const x = Math.round(Math.max(48, Math.min(1232 - w, game.player.x - w / 2)));
  let y = Math.round(game.player.y - 104 + bob);
  if (y < 48) y = Math.round(game.player.y + 40);   // too close to the top wall: show it under the hero
  ctx.globalAlpha = fade;

  // Plate: dark stone face, light stone rim, drop shadow, and a little pointer toward the hero.
  ctx.fillStyle = '#0b140c'; ctx.fillRect(x + 2, y + 3, w, h);
  ctx.fillStyle = '#c9b071'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#18221a'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  const px = Math.round(Math.max(x + 10, Math.min(x + w - 10, game.player.x)));
  ctx.fillStyle = '#c9b071';
  if (y < game.player.y) { ctx.fillRect(px - 5, y + h, 10, 3); ctx.fillRect(px - 2, y + h + 3, 4, 3); }
  else { ctx.fillRect(px - 5, y - 3, 10, 3); ctx.fillRect(px - 2, y - 6, 4, 3); }

  let cx = x + pad;
  if (key) {
    // Key cap: light stone with a darker base, like a physical key.
    // A chunky key cap: dark base for depth, bright face, outlined letter centred on it.
    const top = y + 7, capH = h - 18;
    ctx.fillStyle = '#0b120d'; ctx.fillRect(cx - 1, top - 1, keyW + 2, capH + 6);
    ctx.fillStyle = '#8c7a46'; ctx.fillRect(cx, top + 3, keyW, capH + 2);
    ctx.fillStyle = '#fff4d0'; ctx.fillRect(cx, top, keyW, capH);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 2, top + 2, keyW - 4, 2);
    ctx.font = KEY_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#121a10';
    ctx.fillText(key, cx + keyW / 2, top + capH / 2 + 1);
    ctx.textAlign = 'left'; ctx.font = TEXT_FONT;
    cx += keyW + (mouse !== null ? 8 : gap);
  }
  if (mouse !== null) { drawMouse(ctx, cx, y + 6, mouse); cx += MOUSE_W + gap; }
  ctx.lineWidth = 4; ctx.strokeStyle = '#0b120d'; ctx.strokeText(text, cx, y + h / 2 + 1);
  ctx.fillStyle = '#fff1c8'; ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}

/**
 * A 24x34 pixel mouse: light shell, dark outline, a seam between the buttons, and the button to
 * press lit gold (0 left, 1 middle wheel, 2 right).
 */
function drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, button: 0 | 1 | 2) {
  const p = (px: number, py: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
  // Outline and shell, with chamfered corners.
  p(4, 0, 16, 2, '#0b120d'); p(2, 2, 2, 2, '#0b120d'); p(20, 2, 2, 2, '#0b120d');
  p(0, 4, 2, 24, '#0b120d'); p(22, 4, 2, 24, '#0b120d');
  p(2, 28, 2, 2, '#0b120d'); p(20, 28, 2, 2, '#0b120d'); p(4, 30, 16, 2, '#0b120d');
  p(4, 2, 16, 28, '#fff4d0'); p(2, 4, 20, 24, '#fff4d0');
  p(2, 22, 20, 6, '#d8c99a'); p(4, 28, 16, 2, '#d8c99a');          // shaded lower shell
  // Lit button.
  const lit = '#f2b13b', litEdge = '#b8702a';
  if (button === 0) { p(4, 2, 7, 11, lit); p(2, 4, 2, 9, lit); p(4, 12, 7, 1, litEdge); }
  if (button === 2) { p(13, 2, 7, 11, lit); p(20, 4, 2, 9, lit); p(13, 12, 7, 1, litEdge); }
  // Seam between the buttons and across their base.
  p(11, 2, 2, 11, '#0b120d'); p(2, 13, 20, 2, '#0b120d');
  // Wheel.
  p(11, 4, 2, 6, button === 1 ? lit : '#5d5a46');
}
