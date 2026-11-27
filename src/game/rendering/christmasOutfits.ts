import type {Direction} from '../logic/types.ts';
import type {OutfitId} from '../logic/outfits.ts';

const sheets = new Map<string, HTMLImageElement>();
function sheet(outfit: OutfitId, action: 'walk'|'combat') {
  if (typeof Image === 'undefined') return;
  const key = outfit + '-' + action;
  let img = sheets.get(key);
  if (!img) {
    img = new Image();
    img.src = import.meta.env.BASE_URL + 'assets/christmas-outfits/' + key + '.png';
    sheets.set(key, img);
  }
  return img.naturalWidth ? img : undefined;
}

/*
 * The atlases (tools/assets/prepare_noel_outfits.py) are pixel art with every art pixel stored as a
 * 2 x 2 block. Shown at an art pixel or larger they are copied with nearest neighbour, which keeps
 * the pixels square and the outline sharp. Only when a cell is shown smaller than its art size is it
 * averaged down (with a hard edge put back), so pixels are never dropped at random. Each result is
 * cached at the exact device size it is drawn at.
 */
const ART_PX = 2;
const scaled = new Map<string, HTMLCanvasElement>();
function scaledCell(img: HTMLImageElement, key: string, sx: number, sy: number, sw: number, sh: number,
  dw: number, dh: number) {
  const id = `${key}:${sx},${sy}:${dw}x${dh}`;
  let cell = scaled.get(id);
  if (cell) return cell;
  cell = document.createElement('canvas');
  cell.width = dw; cell.height = dh;
  const g = cell.getContext('2d', {willReadFrequently: true})!;
  if (dw >= sw / ART_PX) {
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  } else {
    const art = document.createElement('canvas');
    art.width = Math.round(sw / ART_PX); art.height = Math.round(sh / ART_PX);
    const a = art.getContext('2d')!;
    a.imageSmoothingEnabled = false;
    a.drawImage(img, sx, sy, sw, sh, 0, 0, art.width, art.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(art, 0, 0, dw, dh);
    const data = g.getImageData(0, 0, dw, dh), px = data.data;
    for (let i = 3; i < px.length; i += 4) px[i] = px[i] < 96 ? 0 : 255;
    g.putImageData(data, 0, 0);
  }
  if (scaled.size > 600) scaled.clear();
  scaled.set(id, cell);
  return cell;
}

/** Draw part of a sheet at (dx, dy, dw, dh) in the context's current units, resampled for its device size. */
function drawCell(ctx: CanvasRenderingContext2D, img: HTMLImageElement, key: string,
  sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b) || 1;
  const pw = Math.max(1, Math.round(dw * k)), ph = Math.max(1, Math.round(dh * k));
  const cell = typeof document === 'undefined' ? img : scaledCell(img, key, sx, sy, sw, sh, pw, ph);
  ctx.imageSmoothingEnabled = false;
  if (cell === img) ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  else ctx.drawImage(cell, dx, dy, pw / k, ph / k);
}

export function preloadChristmasSprites(outfit:'reindeer'|'snowman'){
  sheet(outfit,'walk');
  sheet(outfit,'combat');
}
export function drawChristmasWalk(ctx:CanvasRenderingContext2D, outfit:OutfitId, x:number, y:number,
  direction:Direction, moving:boolean, echo:boolean, time:number) {
  const img=sheet(outfit,'walk');
  if (!img) return false;
  const side=direction==='left'||direction==='right';
  const step=Math.floor(time*10);
  const row=moving&&side?(direction==='left'?1:2):0;
  const col=row?step%6:({down:0,up:4,right:2,left:6} as const)[direction];
  const height=outfit==='snowman'?58:55;
  const size=Math.round(height*200/160);
  const feet=y+(outfit==='snowman'?10:7)-(moving&&!side?step%2:0);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(echo)ctx.globalAlpha*=0.65;
  drawCell(ctx,img,outfit+'-walk',col*200,row*200,200,200,Math.round(x-size/2),Math.round(feet-186*size/200),size,size);
  ctx.restore();
  return true;
}

// Original combo indices are also used by the character-select demonstration.
// Each group selects the windup, contact and recovery poses from its corresponding asset row.
const combatCells={
  reindeer:[0,1,3,5,6,8,9,12,14,15,16,18,19,20,21,22,23],
  snowman:[0,1,2,4,5,7,8,10,11,12,13,14,15,18,19,20,21,23],
};
export function drawChristmasAttack(ctx:CanvasRenderingContext2D,outfit:'reindeer'|'snowman',
  index:number,x:number,feet:number,height:number,left=false) {
  const img=sheet(outfit,'combat');
  if(!img)return false;
  const cell=combatCells[outfit][index]??0;
  const scale=height/184;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.translate(Math.round(x),Math.round(feet));
  if(left)ctx.scale(-1,1);
  drawCell(ctx,img,outfit+'-combat',(cell%6)*300,Math.floor(cell/6)*240,300,240,
    Math.round(-150*scale),Math.round(-220*scale),Math.round(300*scale),Math.round(240*scale));
  ctx.restore();
  return true;
}

/** The standing pose for the hero-select pedestal, its body `height` px tall with the feet on `floor`. */
export function drawChristmasPortrait(ctx:CanvasRenderingContext2D,outfit:'reindeer'|'snowman',
  direction:Direction,x:number,floor:number,height:number){
  const img=sheet(outfit,'walk');
  if(!img)return false;
  const col=({down:0,up:4,right:2,left:6} as const)[direction];
  // In the walk cells the body runs from about row 22 to the feet at row 187.
  const size=Math.round(200*height/165);
  ctx.save();
  drawCell(ctx,img,outfit+'-walk',col*200,0,200,200,Math.round(x-size/2),Math.round(floor-187*size/200),size,size);
  ctx.restore();
  return true;
}
