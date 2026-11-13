import type {GameEngine} from '../GameEngine.ts';
import {pulseWindow} from '../logic/puzzle.ts';
import {gateLabelLayout,romanRune} from './runeLabels.ts';
import type {LevelData,Rect} from '../logic/types.ts';
import { WIND_BRIDGE } from '../logic/frostLevels.ts';
const layouts=new WeakMap<LevelData,Rect[]>();
export function drawFrostMechanics(ctx:CanvasRenderingContext2D,game:GameEngine,time:number){
 const level=game.currentLevel;if(level.id<7)return;
 const vi=game.language==='vi';
 const bridgeDown=level.doors.some(door=>door.liftBridge&&door.openProgress<1);
 const onBridge=(x:number)=>x>=WIND_BRIDGE.x&&x<WIND_BRIDGE.x+WIND_BRIDGE.width;
 const tag=(text:string,x:number,y:number,color:string)=>{
  ctx.font='700 20px system-ui, sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const width=Math.ceil(ctx.measureText(text).width)+20;
  const left=Math.round(Math.max(42,Math.min(1238-width,x-width/2)));
  const top=Math.round(Math.max(102,Math.min(638,y-16)));
  ctx.fillStyle='#101419';
  ctx.fillRect(left,top,width,32);
  ctx.fillStyle=color;
  ctx.fillRect(left,top,3,32);
  ctx.fillText(text,left+width/2+1,top+16);
 };
 ctx.save();
 for(const [i,p] of level.plates.entries())if(p.wardLocked&&(!bridgeDown||!onBridge(p.x))){
  const alive=game.enemies.filter(e=>e.hp>0&&p.wardEnemyIds?.includes(e.id));
  ctx.strokeStyle='#e7b6ff';ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(p.x+25,p.y+25,35,0,Math.PI*2);ctx.stroke();
  for(const e of alive){if(bridgeDown&&onBridge(e.x))continue;ctx.beginPath();ctx.moveTo(p.x+25,p.y+25);ctx.lineTo(e.x,e.y);ctx.stroke();}
  ctx.setLineDash([]);
  const below=p.y+p.height+8;
  const blocked=level.walls.some(w=>p.x+25>=w.x&&p.x+25<=w.x+w.width&&below<w.y+w.height&&below+32>w.y);
  tag(`${romanRune(i)} · ${alive.length} ${vi?'lính gác':alive.length===1?'guard':'guards'}`,p.x+25,blocked?p.y-24:below+16,'#efd0ff');
 }
 let boxes=layouts.get(level);if(!boxes){boxes=gateLabelLayout(level);layouts.set(level,boxes);}
 for(const [i,d] of level.doors.entries()){
  if(bridgeDown&&onBridge(d.x))continue;
  const box=boxes[i],x=box.x+box.width/2;
  const above=box.y+box.height+(d.pulse&&d.releasedPlate?72:36)>670;
  let y=above?box.y-18:box.y+box.height+18;
  if(d.pulse){
   const phase=pulseWindow(d,time);
   tag(`${phase.open?(vi?'Nhịp mở':'Open window'):(vi?'Chờ':'Wait')} ${phase.remaining.toFixed(1)} s`,x,y,phase.open?'#b2ffd3':'#ffe1a0');
   y+=above?-35:35;
  }
  if(d.releasedPlate){
   const n=level.plates.findIndex(p=>p.id===d.releasedPlate),held=level.plates[n]?.isPressed;
   tag(vi?(held?`Nhả ấn ${romanRune(n)}`:`Ấn ${romanRune(n)} trống`):
    (held?`Release ${romanRune(n)}`:`Rune ${romanRune(n)} empty`),x,y,held?'#ffb4a8':'#b2ffd3');
  }
 }
 ctx.restore();
}
