/** Crimson's poses are cut directly from the supplied Gemini sprite poster.
 * No procedural body parts are drawn; horizontal mirroring is the only pose transform.
 * The poster supplies a right-facing side view, so vertical movement uses that view too.
 */
type Direction = 'up' | 'down' | 'left' | 'right';
export type AssassinPose = 'idle0'|'idle1'|'idle2'|'idle3'|'run0'|'run1'|'run2'|'run3'|'run4'|
  'atk1a'|'atk1b'|'atk2a'|'atk2b'|'atk3a'|'atk3b'|'skill0'|'skill1'|'skill2'|'skill3'|'skill4'|
  'hurt'|'kneel'|'dead';
const poses: AssassinPose[] = ['idle0','idle1','idle2','idle3','run0','run1','run2','run3','run4',
  'atk1a','atk1b','atk2a','atk2b','atk3a','atk3b','skill0','skill1','skill2','skill3','skill4','hurt','kneel','dead'];
const images = new Map<string,HTMLImageElement>();
import {getOutfit} from '../logic/outfits.ts';
// Crimson stands ~56 px tall in play, the same as Kael (55) and Aeris (58).
const SIZE=1.18;
const scale=.22*SIZE;

function sprite(name:string) {
  if(typeof Image==='undefined')return null;
  let image=images.get(name);
  if(!image){image=new Image();image.src=`${import.meta.env.BASE_URL}assets/crimson/${name}.png`;images.set(name,image);}
  return image.complete&&image.naturalWidth>0?image:null;
}
export function preloadAssassinSprites(){for(const name of [...poses,'dart'])sprite(name);}

export function drawAssassinSprite(ctx:CanvasRenderingContext2D,x:number,y:number,direction:Direction,
  moving=false,time=0,attack=false,_outfit='default',alpha=1,pose?:AssassinPose,angle?:number){
  const winter=_outfit==='frost';
  const row=direction==='up'?'up':direction==='down'?'down':'side';
  const turn={down:0,right:2,up:4,left:6}[direction];
  const action=pose??(attack?'atk1b':undefined);
  const name=action??(moving?row+Math.floor(time*10)%8:'turn'+(angle??turn));
  const image=sprite((winter?'winter-':'')+name);if(!image)return;
  const factor=action&&!winter?scale:.60*SIZE;
  const w=Math.round(image.naturalWidth*factor),h=Math.round(image.naturalHeight*factor);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha;
  ctx.translate(Math.round(x),Math.round(y));
  if(direction==='left'&&(action||moving))ctx.scale(-1,1);
  ctx.drawImage(image,-Math.round(w/2),-h+7,w,h);
  ctx.restore();
}

/** Steel dart is also from the supplied poster; rotate the source pose to aim. */
export function drawAssassinDart(ctx:CanvasRenderingContext2D,x:number,y:number,angle:number){
  const image=sprite(getOutfit('assassin')==='frost'?'winter-dart':'dart');if(!image)return;
  const w=Math.round(image.naturalWidth*(getOutfit('assassin')==='frost'?.45:.15)),h=Math.round(image.naturalHeight*(getOutfit('assassin')==='frost'?.45:.15));
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
  ctx.drawImage(image,-Math.round(w/2),-Math.round(h/2),w,h);ctx.restore();
}
