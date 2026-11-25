import type {GameEngine} from '../GameEngine.ts';
import {pulseWindow} from '../logic/puzzle.ts';
import {gateLabelLayout,romanRune} from './runeLabels.ts';
import type {LevelData,Rect} from '../logic/types.ts';
import { WIND_BRIDGE } from '../logic/frostLevels.ts';
const layouts=new WeakMap<LevelData,Rect[]>();
/** Labels within this distance of the hero read in full; farther ones shrink to a short form so the map stays readable. */
const LABEL_NEAR=300;
export function drawFrostMechanics(ctx:CanvasRenderingContext2D,game:GameEngine,time:number){
 const level=game.currentLevel;if(level.id<7)return;
 const vi=game.language==='vi';
 const bridgeDown=level.doors.some(door=>door.liftBridge&&door.openProgress<1);
 const onBridge=(x:number)=>x>=WIND_BRIDGE.x&&x<WIND_BRIDGE.x+WIND_BRIDGE.width;
 const near=(x:number,y:number)=>Math.hypot(game.player.x-x,game.player.y-y)<LABEL_NEAR;
 const tag=(text:string,x:number,y:number,color:string,compact=false)=>{
  const h=compact?24:32;
  ctx.font=`${compact?16:20}px "Second Me Pixel", monospace`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const width=Math.ceil(ctx.measureText(text).width)+(compact?14:20);
  const left=Math.round(Math.max(42,Math.min(1238-width,x-width/2)));
  const top=Math.round(Math.max(102,Math.min(638,y-h/2)));
  ctx.globalAlpha=compact?.85:1;
  ctx.fillStyle='#101419';
  ctx.fillRect(left,top,width,h);
  ctx.fillStyle=color;
  ctx.fillRect(left,top,3,h);
  ctx.fillText(text,left+width/2+1,top+h/2);
  ctx.globalAlpha=1;
 };
 ctx.save();
 for(const [i,p] of level.plates.entries())if(p.wardLocked&&(!bridgeDown||!onBridge(p.x))){
  const alive=game.enemies.filter(e=>e.hp>0&&p.wardEnemyIds?.includes(e.id));
  ctx.strokeStyle='#e7b6ff';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(p.x+25,p.y+25,35,0,Math.PI*2);ctx.stroke();
  for(const e of alive){if(bridgeDown&&onBridge(e.x))continue;ctx.beginPath();ctx.moveTo(p.x+25,p.y+25);ctx.lineTo(e.x,e.y);ctx.stroke();}
  ctx.setLineDash([]);
  const below=p.y+p.height+8;
  const blocked=level.walls.some(w=>p.x+25>=w.x&&p.x+25<=w.x+w.width&&below<w.y+w.height&&below+32>w.y);
  const full=near(p.x+25,p.y+25);
  tag(full?`${romanRune(i)} · ${alive.length} ${vi?'lính gác':alive.length===1?'guard':'guards'}`:`${romanRune(i)} · ${alive.length}`,
   p.x+25,blocked?p.y-24:below+16,'#efd0ff',!full);
 }
 let boxes=layouts.get(level);if(!boxes){boxes=gateLabelLayout(level);layouts.set(level,boxes);}
 for(const [i,d] of level.doors.entries()){
  if(bridgeDown&&onBridge(d.x))continue;
  const box=boxes[i],x=box.x+box.width/2;
  const full=near(x,box.y+box.height/2);
  const above=box.y+box.height+(d.pulse&&d.releasedPlate?72:36)>670;
  let y=above?box.y-18:box.y+box.height+18;
  if(d.pulse){
   const phase=pulseWindow(d,time);
   const seconds=`${phase.remaining.toFixed(1)} s`;
   tag(full?`${phase.open?(vi?'Nhịp mở':'Open window'):(vi?'Chờ':'Wait')} ${seconds}`:seconds,x,y,phase.open?'#b2ffd3':'#ffe1a0',!full);
   y+=above?-35:35;
  }
  // The release reminder only matters once the hero is at this gate.
  if(d.releasedPlate&&full){
   const n=level.plates.findIndex(p=>p.id===d.releasedPlate),held=level.plates[n]?.isPressed;
   tag(vi?(held?`Nhả ấn ${romanRune(n)}`:`Ấn ${romanRune(n)} trống`):
    (held?`Release ${romanRune(n)}`:`Rune ${romanRune(n)} empty`),x,y,held?'#ffb4a8':'#b2ffd3');
  }
 }
 ctx.restore();
}
