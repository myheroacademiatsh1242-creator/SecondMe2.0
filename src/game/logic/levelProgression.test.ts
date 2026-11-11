import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../GameEngine.ts';
import { LEVELS } from './levels.ts';
import { getActiveObstacles, rectIntersects, getCharacterBoundingBox } from './collision.ts';
import { trapPhase, trapEffects } from './traps.ts';
import { isPuzzleExitOpen, updateSecurityDoors } from './puzzle.ts';
import { trailObjective } from './trailObjective.ts';
import { MapValidator } from './mapValidator.ts';
import { sounds } from './sound.ts';
import { createBoss, updateBoss } from './campaign.ts';
sounds.setMuted(true);

test('redesigned maps have no geometry errors and require escalating simultaneous Echo holds',()=>{
 const audit=MapValidator.validateAll(LEVELS);assert.equal(audit.errorsCount,0,JSON.stringify(audit.issues));
 assert.deepEqual(LEVELS.slice(0,5).map(l=>l.plates.length),[1,2,3,4,5]);
 assert.deepEqual(LEVELS.slice(0,5).map(level => Math.max(...level.doors.map(door => door.requiredPlates.length))), [1,1,2,3,4]);
 const relay = structuredClone(LEVELS[4]);
 relay.plates.forEach(plate => { plate.isPressed = true; });
 const finalGate = relay.doors.at(-1)!;
 updateSecurityDoors(relay.doors, relay.plates, relay.playerSpawn, null, 1);
 assert.equal(finalGate.openProgress, 0, 'an extra Echo on rune I must block the final gate');
 relay.plates[0].isPressed = false;
 updateSecurityDoors(relay.doors, relay.plates, relay.playerSpawn, null, 1);
 assert.equal(finalGate.openProgress, 1);
 assert.equal(isPuzzleExitOpen(relay, relay.plates.length, false), false, 'opening alone does not unlock the exit');
});

function route(game:GameEngine,x:number,y:number) {
 const obstacles=getActiveObstacles(game.currentLevel.walls,game.currentLevel.doors),step=20;
 const start=[Math.round(game.player.x/step),Math.round(game.player.y/step)],end=[Math.round(x/step),Math.round(y/step)];
 for(const avoid of [true,false]) {
  const id=(a:number,b:number)=>`${a},${b}`,from=new Map<string,string|null>([[id(...start as [number,number]),null]]),q=[start];
  for(let n=0;n<q.length;n++) {
   const [a,b]=q[n];
   if(a===end[0]&&b===end[1]) {
    const path:number[][]=[];let key:string|null=id(a,b);
    while(key!==null){path.push(key.split(',').map(Number).map(v=>v*step));key=from.get(key)!;}return path.reverse();
   }
   for(const [da,db] of [[1,0],[0,1],[-1,0],[0,-1]]) {
    const aa=a+da,bb=b+db,key=id(aa,bb),box=getCharacterBoundingBox(aa*step,bb*step,26,26);
    if(aa<3||aa>61||bb<3||bb>33||from.has(key)||obstacles.some(o=>rectIntersects(box,o)))continue;
    if(avoid&&game.currentLevel.traps?.some(t=>t.kind!=='vines'&&rectIntersects(box,t)))continue;
    from.set(key,id(a,b));q.push([aa,bb]);
   }
  }
 }
 throw new Error(`No route in level ${game.currentLevel.id} to ${x},${y}`);
}

for(const [index, withRing] of [[0,false],[1,false],[2,false],[3,false],[4,false],[4,true]] as const)test(`trail ${index+1}${withRing ? ' with a limit ring' : ''}: recorded Echoes can reach victory`,t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});
 t.after(()=>previous?Object.defineProperty(globalThis,'document',previous):Reflect.deleteProperty(globalThis,'document'));
 const game=new GameEngine();game.currentLevelIdx=index;game.tutorialEnabled=true;game.restartLevel();
 if (withRing) game.limitRingActive = true;
 const control=game as unknown as {update(dt:number):void;heldKeys:Set<string>;elapsedLevelTime:number};
 const tick=(dt:number)=>{
  const crossed = game.finalGateCrossed;
  control.update(dt);
  if (!crossed && game.finalGateCrossed) while (game.echoes.length) game.dismissEcho();
  assert.ok(game.screen==='playing'||game.screen==='victory',`level ${index+1}: ${game.defeatReason} at ${game.player.x},${game.player.y}`);};
 const move=(x:number,y:number)=>{
  for(const [px,py] of route(game,x,y))for(const axis of ['x','y'] as const) {
   const goal=axis==='x'?px:py;let guard=0;
   while(Math.abs(game.player[axis]-goal)>.2&&game.screen==='playing') {
    assert.ok(++guard<2000,'movement blocked');
    const delta=goal-game.player[axis],dir=Math.sign(delta),next={...game.player,[axis]:game.player[axis]+dir*4};
    const hazards=game.currentLevel.traps!.filter(trap=>trap.kind!=='vines'&&!rectIntersects(getCharacterBoundingBox(game.player.x,game.player.y,24,24),trap)&&rectIntersects(getCharacterBoundingBox(next.x,next.y,24,24),trap));
    if(hazards.some(trap=>Array.from({length:21},(_,i)=>trapPhase(trap,control.elapsedLevelTime+i*.05)).includes('impact'))) {tick(.02);continue;}
    const key=axis==='x'?(dir>0?'KeyD':'KeyA'):(dir>0?'KeyS':'KeyW');
    control.heldKeys.add(key);const speed=game.player.speed*trapEffects(game.currentLevel.traps!,game.player,control.elapsedLevelTime).speedMultiplier;
    tick(Math.min(.02,Math.abs(delta)/speed));control.heldKeys.clear();
   }
  }
 };
 for(const plate of game.currentLevel.plates) {
  if(game.echoes.length===game.echoLimit) {
   const obsolete=game.echoes.findIndex(e=>game.currentLevel.plates.some(p=>!game.currentLevel.doors.at(-1)!.requiredPlates.includes(p.id)&&Math.hypot(p.x+25-e.x,p.y+25-e.y)<35));
   assert.equal(obsolete,0,'the oldest Echo is the reusable one in the final relay');game.dismissEcho();
  }
  game.toggleRecording();move(plate.x+25,plate.y+25);
  assert.deepEqual(trailObjective(game), { action: 'save', target: plate });
  game.toggleRecording();
  assert.deepEqual(trailObjective(game), { action: 'summon', target: plate });
  const recording=game.recorder.getDuration();game.spawnEcho();const summoned=game.echo!;
  for(let time=0;time<recording/1000+.35;time+=.02)tick(.02);
  // Echo may pause its recording to fight; wait until it actually reaches the rune
  // instead of mistaking the player standing on it for an Echo holding it.
  for(let time=0;time<10 && game.echoes.includes(summoned) && !rectIntersects(getCharacterBoundingBox(summoned.x,summoned.y,24,24),plate);time+=.02)tick(.02);
  assert.ok(game.echoes.includes(summoned) && rectIntersects(getCharacterBoundingBox(summoned.x,summoned.y,24,24),plate), 'Echo reaches its rune after combat');
  assert.ok(game.currentLevel.plates.find(p=>p.id===plate.id)!.isPressed);
 }
 if (withRing) {
  const gate = game.currentLevel.doors.at(-1)!;
  assert.equal(game.echoes.length, 5);
  assert.equal(gate.openProgress, 0);
  assert.deepEqual(trailObjective(game), { action: 'release', target: gate });
  game.dismissEcho();
  for (let time = 0; time < .4; time += .02) tick(.02);
 }
 assert.equal(isPuzzleExitOpen(game.currentLevel, game.checkpointIndex, game.finalGateCrossed), false);
 move(game.currentLevel.exit.x+30,game.currentLevel.exit.y+30);
 assert.equal(game.finalGateCrossed, true);
 assert.equal(game.echoes.length, 0);
 assert.equal(isPuzzleExitOpen(game.currentLevel, game.checkpointIndex, game.finalGateCrossed), true);
 for(let i=0;i<45&&game.screen==='playing';i++)tick(.02);
 assert.equal(game.screen,'victory');assert.ok(game.health>0);
 console.log(`Solved trail ${index+1}: ${control.elapsedLevelTime.toFixed(1)}s, ${game.health}/5 HP, ${game.echoes.length} Echoes`);
});

test('a decoy redirects targeting but cannot grant immunity to projectiles hitting the player',()=>{
 const boss=createBoss();boss.timer=100;boss.burstCooldown=100;
 boss.projectiles=[{x:500,y:400,vx:0,vy:0,life:1}];
 assert.equal(updateBoss(boss,{x:100,y:100},.01,false,{x:500,y:400}),true);
});

test('puzzle preparation does not drain health and paused Echoes survive deliberate planning',()=>{
 const game=new GameEngine();game.screen='playing';game.legTimeRemaining=null;game.player.x=1000;game.player.y=550;
 const control=game as unknown as {update(dt:number):void};
 for(let i=0;i<60;i++)control.update(.1);
 assert.equal(game.health,100,'no automatic dissonance damage in puzzle rooms');
 game.recorder.startRecording(game.player.x,game.player.y,'right');game.toggleRecording();game.spawnEcho();game.pauseEcho();
 for(let i=0;i<60;i++)control.update(.1);
 assert.equal(game.echoes.length,1);assert.ok(game.echo!.stability!>=90);
});

test('spawn portal artwork stays separated from every puzzle rune',()=>{
 for(const level of LEVELS)for(const plate of level.plates){
  const distance=Math.hypot(level.playerSpawn.x-(plate.x+plate.width/2),level.playerSpawn.y-(plate.y+plate.height/2));
  assert.ok(distance>=110,`level ${level.id}: spawn portal overlaps ${plate.id}`);
 }
});
