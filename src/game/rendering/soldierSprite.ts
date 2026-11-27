import {getOutfit} from '../logic/outfits.ts';
import {drawChristmasWalk} from './christmasOutfits.ts';
import {outfitSheet} from './outfitSprites.ts';
import type {OutfitId} from '../logic/outfits.ts';
import type { Direction } from '../logic/types.ts';

const sheets = new Map<string, HTMLImageElement>();
function spriteSheet(name: string) {
  if (typeof Image === 'undefined') return;
  let image = sheets.get(name);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = `${import.meta.env.BASE_URL}assets/soldier/Kael_${name}.webp`;
    sheets.set(name, image);
  }
  return image.complete && image.naturalWidth ? image : undefined;
}

export function drawSoldierSprite(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, moving: boolean, echo: boolean, time: number, attacking = false, attackProgress = 0, outfit?:OutfitId) {
  if ((outfit??getOutfit('swordsman'))==='reindeer') return drawChristmasWalk(ctx,'reindeer',x,y,direction,moving,echo,time);
  attacking = attacking && (direction === 'left' || direction === 'right');
  const image = spriteSheet(attacking ? 'Attack' : 'Walk');
  if (!image) return;
  const row = attacking ? 2 : direction === 'up' ? 0 : direction === 'down' ? 2 : 1;
  const frame = attacking ? Math.min(7, Math.max(0, Math.floor(attackProgress * 8))) : moving ? Math.floor(time * 10) % 8 : 0;
  ctx.save(); ctx.translate(x, y);
  if (direction === 'left') ctx.scale(-1, 1);
  if (echo) { ctx.globalAlpha *= .7; ctx.filter = 'brightness(1.6) sepia(1) saturate(4) hue-rotate(135deg)'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12; }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(outfitSheet(image,'swordsman',outfit), frame * 256, row * 256, 256, 256, -35, -55, 70, 70);
  ctx.restore();
}
