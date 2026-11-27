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
  ctx.drawImage(img,col*200,row*200,200,200,Math.round(x-size/2),Math.round(feet-186*size/200),size,size);
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
  ctx.drawImage(img,(cell%6)*300,Math.floor(cell/6)*240,300,240,
    Math.round(-150*scale),Math.round(-220*scale),Math.round(300*scale),Math.round(240*scale));
  ctx.restore();
  return true;
}
