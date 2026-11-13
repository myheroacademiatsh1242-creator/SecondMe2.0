import { encounterBalance } from './balance.ts';
import { reachableWaypoint } from './enemyNavigation.ts';
import { getActiveObstacles, resolveMovement } from './collision.ts';
import { segmentCircle, segmentWall } from './combatGeometry.ts';
import type { LevelData } from './types.ts';
import { DUMMY_RESET } from './training.ts';
/** 'dummy': the dev training ground's target (logic/training.ts): never moves, attacks or dies. */
export type EnemyKind='goblin'|'bear'|'skull'|'shaman'|'minotaur'|'dummy';
export const EMBER_SLIME_ID = 'ember-slime';
export interface Enemy {id:string;kind:EnemyKind;x:number;y:number;homeX:number;homeY:number;hp:number;maxHp:number;mode:'idle'|'chase'|'warning'|'recover';timer:number;targetX:number;targetY:number;facingLeft:boolean;hitFlash:number;deathAge:number;targetId:number|null;attackFx?:number;slimeHue?:number;/** Push-back still to slide (logic/hitFeel.ts). */push?:{x:number;y:number};targetEcho?:{x:number;y:number;aggroTime?:number};
 /** The Echo this enemy was drawn to, and how long it keeps after it once out of sight (s). */
 lureEcho?:{x:number;y:number};lureTime?:number; bolt?:EnemyBolt}
interface EnemyBolt {x:number;y:number;vx:number;vy:number;life:number;damage:number}
const SHAMAN_BOLT_SPEED = 260;
const SHAMAN_KEEP_DISTANCE = 155;
export const SHAMAN_BOLT_RADIUS = 7;
/**
 * notice: how near the player has to be (in sight) to be chased. lure: how near an Echo has to
 * be, in sight (walls and closed gates block it), to draw the enemy instead: notice + 80, a
 * little further, as an Echo is a decoy.
 */
export const ENEMY_STATS={goblin:{hp:108,speed:82,reach:42,notice:180,lure:260,damage:12},bear:{hp:150,speed:68,reach:47,notice:175,lure:255,damage:20},skull:{hp:98,speed:93,reach:39,notice:190,lure:270,damage:12},shaman:{hp:100,speed:72,reach:280,notice:340,lure:360,damage:18},minotaur:{hp:205,speed:68,reach:58,notice:195,lure:275,damage:28},dummy:{hp:500,speed:0,reach:0,notice:0,lure:0,damage:0}};
/** An enemy drawn to an Echo keeps after it this long once it loses sight of it (round a corner). */
export const LURE_MEMORY = 2;
/** How far from home an Echo can lead an enemy: its lure range plus this (px). */
export const LURE_LEASH = 120;
const encounters:Record<number,[EnemyKind,number,number][]>= {
 2:[['goblin',450,580],['shaman',1040,220]],
 3:[['goblin',830,130],['bear',420,120],['shaman',440,580]],
 4:[['goblin',1140,400],['bear',850,580],['shaman',510,235],['skull',230,500]],
 5:[['goblin',1130,95],['skull',935,580],['bear',760,440],['shaman',550,95],['minotaur',355,435]],
 7:[['goblin',350,520],['skull',680,130],['shaman',740,570],['bear',1080,520]],
 8:[['goblin',420,560],['bear',980,550],['skull',850,170],['shaman',1120,230],['goblin',220,220]],
 9:[['skull',1100,290],['goblin',770,140],['bear',400,180],['shaman',140,550],['skull',470,460],['bear',1020,570]],
 10:[['goblin',106,365],['skull',374,330],['shaman',470,498],['bear',696,368],['goblin',850,243],['shaman',968,405],['skull',1150,290]],
 11:[['skull',245,620],['shaman',565,450],['bear',965,600],['goblin',1145,435],['skull',755,105],['minotaur',1050,110],['shaman',405,230],['bear',115,85]],
 12:[['goblin',295,610],['skull',90,120],['bear',315,200],['shaman',490,140],['goblin',730,270],['minotaur',700,470],['skull',990,620],['shaman',1180,600],['bear',965,120]],
 13:[['skull',380,435],['goblin',895,435],['skull',470,305],['goblin',815,305],['shaman',345,275],['shaman',940,275],['skull',525,185],['skull',755,185],['bear',640,195]],
 // Training ground (TRAINING_LEVEL_ID): a group of three for sweeping hits, one far for range.
 0:[['dummy',700,290],['dummy',770,360],['dummy',700,430],['dummy',1040,360]],
};
export function createEnemies(level:LevelData):Enemy[]{
 const obstacles=getActiveObstacles(level.walls,level.doors);
 const healthMultiplier=encounterBalance(level.id).health;
 return (encounters[level.id]??[]).map(([kind,x,y],i)=>{
  const safe=resolveMovement(x,y,x,y,30,30,obstacles);
  const maxHp=Math.round(ENEMY_STATS[kind].hp*healthMultiplier);
  return {id:`enemy-${level.id}-${i}`,kind,x:safe.x,y:safe.y,homeX:safe.x,homeY:safe.y,hp:maxHp,maxHp,mode:'idle',timer:1+i*.25,targetX:x,targetY:y,facingLeft:false,hitFlash:0,deathAge:0,targetId:null};
 });
}
const SLIME_STATS = {speed:62,reach:68,notice:220,lure:240,damage:8};
const slimeTraits: Record<number, {speed:number;reach:number;damage:number}> = {
 0:{speed:62,reach:68,damage:8},
 85:{speed:79,reach:59,damage:6},
 165:{speed:52,reach:86,damage:8},
 245:{speed:58,reach:70,damage:11},
};

export function createCaveSlimes(): Enemy[] {
 const spawns = [
  {id:EMBER_SLIME_ID,x:640,y:300,hue:0},
  {id:'slime-moss',x:495,y:420,hue:85},
  {id:'slime-ice',x:780,y:410,hue:165},
  {id:'slime-violet',x:605,y:220,hue:245},
 ];
 return spawns.map(({id,x,y,hue})=>({
  id,kind:'skull',x,y,homeX:x,homeY:y,hp:hue===0?56:68,maxHp:hue===0?56:68,mode:'idle',timer:0,
  targetX:x,targetY:y,facingLeft:false,hitFlash:0,deathAge:0,targetId:null,slimeHue:hue,
 }));
}
export interface EnemyTarget{x:number;y:number;echoIndex:number|null}

function advanceBolt(e:Enemy, obstacles:ReturnType<typeof getActiveObstacles>, player:{x:number;y:number}, echoes:{x:number;y:number}[], dt:number, onHit:(target:EnemyTarget,damage:number,source:Enemy)=>void){
 const bolt=e.bolt;
 if(!bolt)return;
 const travel=Math.min(dt,bolt.life);
 const end={x:bolt.x+bolt.vx*travel,y:bolt.y+bolt.vy*travel};
 let first=Infinity;
 for(const wall of obstacles)first=Math.min(first,segmentWall(bolt,end,wall,SHAMAN_BOLT_RADIUS)??Infinity);
 let hit:EnemyTarget|undefined;
 const defenders=[{...player,echoIndex:null},...echoes.map((echo,i)=>({...echo,echoIndex:i}))];
 for(const target of defenders){
  const contact=segmentCircle(bolt,end,target,SHAMAN_BOLT_RADIUS+12);
  if(contact!==null&&contact<first){first=contact;hit=target;}
 }
 if(hit)onHit(hit,bolt.damage,e);
 bolt.life-=dt;
 if(first!==Infinity||bolt.life<=0){e.bolt=undefined;return;}
 bolt.x=end.x;bolt.y=end.y;
}
/** Leashed, wall-aware enemies telegraph a locked impact point before attacking. */
export function updateEnemies(enemies:Enemy[],level:LevelData,player:{x:number;y:number},echoes:{x:number;y:number;aggroTime?:number}[],dt:number,onHit:(target:EnemyTarget,damage:number,source:Enemy)=>void,onAttack?:(enemy:Enemy,stage:'warning'|'release')=>void){
 const obstacles=getActiveObstacles(level.walls,level.doors);
 const damageMultiplier=encounterBalance(level.id).damage;
 const sight=(a:{x:number;y:number},b:{x:number;y:number})=>!obstacles.some(w=>segmentWall(a,b,w,0)!==null);
 for(const e of enemies){
  advanceBolt(e,obstacles,player,echoes,dt,onHit);
  e.attackFx=Math.max(0,(e.attackFx??0)-dt);
  e.hitFlash=Math.max(0,e.hitFlash-dt);
  // A dummy only counts the time since its last hit (strike() zeroes it) and refills when left alone.
  if(e.kind==='dummy'){e.timer+=dt;if(e.timer>DUMMY_RESET)e.hp=e.maxHp;continue;}
  if(e.hp<=0){e.deathAge+=dt;continue;}
  const slime=e.slimeHue!==undefined;
  const stat=slime?{...SLIME_STATS,...slimeTraits[e.slimeHue!]}:ENEMY_STATS[e.kind];e.timer-=dt;
  const ranged=e.kind==='shaman';
  const caveAmbush=level.id===13&&e.id.startsWith('enemy-13-');
  if(e.mode==='warning'){
   if(slime&&e.timer<.18){
    const remaining=Math.max(dt,e.timer+dt);
    const advance=Math.min(1,dt/remaining);
    const dx=e.targetX-e.x,dy=e.targetY-e.y,length=Math.hypot(dx,dy)||1;
    const step=Math.max(0,length-16)*advance;
    const landing=resolveMovement(e.x,e.y,e.x+dx/length*step,e.y+dy/length*step,30,30,obstacles);
    e.x=landing.x;e.y=landing.y;
   }
   if(e.timer<=0){
    e.attackFx=.32;
    onAttack?.(e,'release');
    const index=e.targetEcho?echoes.indexOf(e.targetEcho):-1;
    const target=e.targetId===null?player:index>=0?echoes[index]:undefined;
    const hitX=slime?e.x:e.targetX,hitY=slime?e.y:e.targetY;
    const damage=Math.round(stat.damage*damageMultiplier);
    if(ranged){
     const angle=Math.atan2(e.targetY-e.y,e.targetX-e.x);
     e.bolt={x:e.x,y:e.y,vx:Math.cos(angle)*SHAMAN_BOLT_SPEED,vy:Math.sin(angle)*SHAMAN_BOLT_SPEED,life:1.3,damage};
    }else if(target&&Math.hypot(target.x-hitX,target.y-hitY)<(slime?28:44)&&sight(e,target))onHit({...target,echoIndex:e.targetId===null?null:index},damage,e);
    e.mode='recover';e.timer=ranged?.85:slime?.95:e.kind==='minotaur'?1.1:.82;
   }continue;
  }
  if(e.mode==='recover'){if(e.timer<=0)e.mode='idle';continue;}
  // An Echo draws an enemy that can see it within its lure range (not through walls or closed
  // gates), the nearest first, and not further than LURE_LEASH past that range from home. Once
  // drawn, the enemy keeps after that Echo for LURE_MEMORY s out of sight, routing round walls.
  const fromHome=Math.hypot(e.x-e.homeX,e.y-e.homeY),leashed=fromHome<stat.lure+LURE_LEASH;
  let decoy:EnemyTarget|undefined=leashed?echoes.map((echo,i)=>({...echo,echoIndex:i}))
   .filter(c=>Math.hypot(c.x-e.x,c.y-e.y)<=stat.lure&&sight(e,c))
   .sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]:undefined;
  if(decoy){e.lureEcho=echoes[decoy.echoIndex!];e.lureTime=LURE_MEMORY;}
  else if(leashed&&e.lureEcho&&(e.lureTime??0)>0&&echoes.includes(e.lureEcho)){
   e.lureTime=(e.lureTime??0)-dt;decoy={...e.lureEcho,echoIndex:echoes.indexOf(e.lureEcho)};
  }else{e.lureEcho=undefined;e.lureTime=0;}
  const target:EnemyTarget=decoy??{...player,echoIndex:null};const distance=Math.hypot(target.x-e.x,target.y-e.y);
  const engaged=caveAmbush||!!decoy||(distance<stat.notice&&fromHome<235&&sight(e,target));
  // Even ranged enemies close in on an Echo, allowing it to defend itself inside 3m.
  const attackReach=decoy?Math.min(stat.reach,90):stat.reach;
  const retreat=engaged&&!decoy&&ranged&&distance<SHAMAN_KEEP_DISTANCE;
  const escape={x:e.x+(e.x-target.x),y:e.y+(e.y-target.y)};
  const backstep=retreat?resolveMovement(e.x,e.y,e.x+(escape.x-e.x)*.15,e.y+(escape.y-e.y)*.15,30,30,obstacles):e;
  const canRetreat=retreat&&Math.hypot(backstep.x-e.x,backstep.y-e.y)>1;
  if(engaged&&distance<attackReach&&e.timer<=0&&!canRetreat&&sight(e,target)){
   e.mode='warning';e.timer=ranged?.64:slime?.48:e.kind==='minotaur'?.78:.57;e.targetX=target.x;e.targetY=target.y;e.targetId=target.echoIndex;e.targetEcho=target.echoIndex===null?undefined:echoes[target.echoIndex];
   e.facingLeft=target.x<e.x;
   onAttack?.(e,'warning');
   continue;
  }
  // No way through to the Echo (a gate closed between them): give it up instead of walking into the wall.
  let way=decoy||(caveAmbush&&!sight(e,target))?reachableWaypoint(e,target,obstacles,dt):target;
  if(!way){e.lureEcho=undefined;e.lureTime=0;way={x:e.homeX,y:e.homeY};}
  const patrolAngle=e.timer*.65+e.homeX;
  const patrol=level.id===13?{x:e.homeX+Math.cos(patrolAngle)*28,y:e.homeY+Math.sin(patrolAngle)*22}:{x:e.homeX,y:e.homeY};
  const hasFiringPosition=ranged&&!decoy&&distance<attackReach&&sight(e,target);
  let destination=patrol;
  if(engaged)destination=hasFiringPosition?e:way;
  if(canRetreat)destination=escape;
  let dx=destination.x-e.x,dy=destination.y-e.y;
  if(level.id===13&&engaged){
   for(const ally of enemies){
    if(ally===e||ally.hp<=0)continue;
    const ax=e.x-ally.x,ay=e.y-ally.y,gap=Math.hypot(ax,ay);
    if(gap>0&&gap<38){dx+=ax/gap*(38-gap)*2;dy+=ay/gap*(38-gap)*2;}
   }
  }
  const length=Math.hypot(dx,dy);
  e.mode=length>5?'chase':'idle';e.facingLeft=ranged&&engaged?target.x<e.x:dx<0;
  if(length>5){
   const speed=stat.speed*(canRetreat?.9:caveAmbush?1.2:engaged?1:.45);
   const amount=Math.min(length,speed*dt);
   const pos=resolveMovement(e.x,e.y,e.x+dx/length*amount,e.y+dy/length*amount,30,30,obstacles);
   const nextDistance=Math.hypot(pos.x-player.x,pos.y-player.y);
   if(level.id!==13||nextDistance>=18||nextDistance>=Math.hypot(e.x-player.x,e.y-player.y)){
    e.x=pos.x;e.y=pos.y;
   }
  }
 }
}
