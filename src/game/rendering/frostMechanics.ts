import type {GameEngine} from '../GameEngine.ts';
import {pulseWindow} from '../logic/puzzle.ts';
import {gateLabelLayout,romanRune} from './runeLabels.ts';
import type {LevelData,Rect} from '../logic/types.ts';
const layouts=new WeakMap<LevelData,Rect[]>();
export function drawFrostMechanics(ctx:CanvasRenderingContext2D,game:GameEngine,time:number){
 const level=game.currentLevel;if(level.id<7)return;
 const vi=game.language==='vi';
 const tag=(text:string,x:number,y:number,color:string)=>{ctx.font='20px "Second Me Pixel",monospace';ctx.textAlign='center';ctx.textBaseline='middle';const w=ctx.measureText(text).width+12;x=Math.max(w/2+42,Math.min(1238-w/2,x));y=Math.max(118,Math.min(654,y));ctx.fillStyle='#102329ee';ctx.fillRect(x-w/2,y-12,w,24);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(x-w/2,y-12,w,24);ctx.fillStyle=color;ctx.fillText(text,x,y);};
 ctx.save();
 for(const [i,p] of level.plates.entries())if(p.wardLocked){
  const alive=game.enemies.filter(e=>e.hp>0&&p.wardEnemyIds?.includes(e.id));
  ctx.strokeStyle='#dc9aff';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x+25,p.y+25,35,0,Math.PI*2);ctx.stroke();
  for(const e of alive){ctx.beginPath();ctx.moveTo(p.x+25,p.y+25);ctx.lineTo(e.x,e.y);ctx.stroke();}
  ctx.setLineDash([]);tag(`${romanRune(i)} · ${vi?'PHONG ẤN':'SEALED'} · ${alive.length}`,p.x+25,p.y+80,'#e0afff');
 }
 let boxes=layouts.get(level);if(!boxes){boxes=gateLabelLayout(level);layouts.set(level,boxes);}
 for(const [i,d] of level.doors.entries()){
  const box=boxes[i],x=box.x+box.width/2;let y=box.y+box.height+17;
  if(d.pulse){const phase=pulseWindow(d,time);tag(`${phase.open?(vi?'MỞ':'OPEN'):(vi?'ĐỢI':'WAIT')} ${phase.remaining.toFixed(1)}s`,x,y,phase.open?'#a9f7cb':'#ffda94');y+=27;}
  if(d.releasedPlate){const n=level.plates.findIndex(p=>p.id===d.releasedPlate),held=level.plates[n]?.isPressed;tag(`${vi?'NHẢ':'RELEASE'} ${romanRune(n)}${held?' ×':' OK'}`,x,y,held?'#ffa398':'#a9f7cb');}
 }
 ctx.restore();
}
