import {getOutfit} from '../logic/outfits.ts';
import {drawChristmasWalk} from './christmasOutfits.ts';
import {outfitSheet} from './outfitSprites.ts';
import type {OutfitId} from '../logic/outfits.ts';
import type { Direction } from '../logic/types.ts';

export const WIZARD_WALK_URL = (import.meta.env?.BASE_URL ?? '/') + 'assets/aeris/walk-aligned.webp';
let sheet: HTMLImageElement | null = null;
export function loadWizardSprites() {
  if (sheet || typeof Image === 'undefined') return;
  sheet = new Image();
  sheet.decoding = 'async';
  sheet.onerror = () => { sheet = null; };
  sheet.src = WIZARD_WALK_URL;
}
export function getWizardSheet() {
  loadWizardSprites();
  return sheet?.complete && sheet.naturalWidth ? sheet : null;
}
/** The sheet is an eight-frame stride; keep its authored temporal order. */
export const WIZARD_WALK_ORDER: readonly (readonly number[])[] = [
  [0,1,2,3,4,5,6,7],
  [0,1,2,3,4,5,6,7],
  [0,1,2,3,4,5,6,7],
];
/** Match the hood anchor of each frame to its row's idle pose. Keep the leg motion and bob. */
export function wizardFrameOffsets(alpha:Uint8ClampedArray,width:number):number[][]{
 const rows:number[][]=[];
 for(let row=0;row<3;row++){
  const centres:number[]=[];
  for(let frame=0;frame<8;frame++){
   let left=256,right=-1;
   for(let y=0;y<135;y++)for(let x=0;x<256;x++)if(alpha[((row*256+y)*width+frame*256+x)*4+3]>=180){left=Math.min(left,x);right=Math.max(right,x);}
   centres.push(right>=left?(left+right)/2:128);
  }
  rows.push(centres.map(x=>Math.round(centres[0]-x)));
 }
 return rows;
}

export function drawWizardSprite(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, moving: boolean, echo: boolean, time: number, outfit?:OutfitId): boolean {
  if ((outfit??getOutfit('mage'))==='snowman') return drawChristmasWalk(ctx,'snowman',x,y,direction,moving,echo,time);
  const image = getWizardSheet();
  if (!image) return false;
  const row = direction === 'up' ? 0 : direction === 'down' ? 2 : 1;
  const frame = moving ? WIZARD_WALK_ORDER[row][Math.floor(time * 10) % 8] : 0;
  ctx.save(); ctx.translate(x, y);
  if (direction === 'left') ctx.scale(-1, 1);
  if (echo) { ctx.globalAlpha *= .65; ctx.filter = 'brightness(1.65) sepia(1) saturate(4) hue-rotate(135deg)'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8; }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(outfitSheet(image,'mage',outfit), frame * 256, row * 256, 256, 256, -35, -55, 70, 70);
  ctx.restore(); return true;
}
