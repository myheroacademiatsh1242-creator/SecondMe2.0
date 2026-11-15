import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from './GameEngine.ts';
import {sounds} from './logic/sound.ts';
sounds.setMuted(true);
function setup(t:test.TestContext){const before=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>before?Object.defineProperty(globalThis,'document',before):Reflect.deleteProperty(globalThis,'document'));const e=new GameEngine();e.missionBriefingEnabled=true;return e;}
test('each level starts with a mission briefing and freezes the actual simulation until Continue',t=>{
 const e=setup(t);e.restartLevel();assert.equal(e.missionBriefing,true);assert.equal(e.screen,'paused');
 const time=e.legTimeRemaining,health=e.health,player={x:e.player.x,y:e.player.y};const enemies=e.enemies.map(x=>({x:x.x,y:x.y,hp:x.hp}));
 (e as any).update(2);e.resumeGame();e.attack();e.useSkill();e.dodge();
 assert.equal(e.screen,'paused');assert.equal(e.legTimeRemaining,time);assert.equal(e.health,health);assert.deepEqual({x:e.player.x,y:e.player.y},player);assert.deepEqual(e.enemies.map(x=>({x:x.x,y:x.y,hp:x.hp})),enemies);
 e.continueMission();assert.equal(e.missionBriefing,false);assert.equal(e.screen,'playing');(e as any).update(.1);assert.ok(e.legTimeRemaining!<time!);
 e.pauseGame();assert.equal(e.screen,'paused');assert.equal(e.missionBriefing,false);e.resumeGame();assert.equal(e.screen,'playing');
});
test('retry and later levels show a fresh briefing; orientation prevents starting early',t=>{
 const e=setup(t);e.currentLevelIdx=1;e.restartLevel();e.setOrientationBlocked(true);e.continueMission();assert.equal(e.missionBriefing,true);
 e.setOrientationBlocked(false);e.continueMission();e.restartLevel();assert.equal(e.missionBriefing,true);assert.equal(e.currentLevel.id,2);e.continueMission();assert.equal(e.screen,'playing');
});
