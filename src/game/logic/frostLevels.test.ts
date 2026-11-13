import test from 'node:test';
import assert from 'node:assert/strict';
import {FROST_LEVELS} from './frostLevels.ts';
import {createEnemies} from './enemies.ts';
import {getCharacterBoundingBox,rectIntersects} from './collision.ts';
import {Campaign} from './campaign.ts';
import {GameEngine} from '../GameEngine.ts';
import {sounds} from './sound.ts';
sounds.setMuted(true);
test('six snow trails increase combat pressure without unsafe spawns or extra bosses',()=>{
 assert.deepEqual(FROST_LEVELS.map(l=>l.id),[7,8,9,10,11,12]);
 assert.deepEqual(FROST_LEVELS.map(l=>createEnemies(l).length),[4,5,6,7,8,9]);
 for(const level of FROST_LEVELS)for(const e of createEnemies(level)){
  const box=getCharacterBoundingBox(e.x,e.y,30,30);
  assert.ok([...level.walls,...level.doors,...level.plates,...level.traps??[]].every(r=>!rectIntersects(box,r)),`${e.id} overlaps obstacle/rune/trap`);
  assert.ok(Math.hypot(e.x-level.playerSpawn.x,e.y-level.playerSpawn.y)>100,`${e.id} too near spawn`);
 }
});
test('frozen progress saves independently and never unlocks the original boss',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 const c=new Campaign();for(const l of FROST_LEVELS){assert.ok(c.award(l.id));assert.equal(c.award(l.id),false);c.completeLevel(l.id,120);assert.equal(c.pendingRuneChoices.length,3);assert.ok(c.chooseRune(c.pendingRuneChoices[0]));}
 const reload=new Campaign();reload.load();assert.deepEqual(reload.completed,[7,8,9,10,11,12]);assert.equal(reload.unlockedLevel,0);assert.equal(reload.bossDefeated,false);assert.ok(reload.chestKeys>0);
});
test('first snow trail is accessible locally; later ones require the previous clear; exit requires combat',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const g=new GameEngine();g.tutorialEnabled=false;g.selectLevel(7);assert.equal(g.currentLevelIdx,0);g.selectLevel(6);assert.equal(g.currentLevel.id,7);assert.equal(g.boss,null);assert.ok(g.legTimeRemaining!>0);
 g.checkpointIndex=g.currentLevel.plates.length;g.finalGateCrossed=true;g.player.x=g.currentLevel.exit.x+30;g.player.y=g.currentLevel.exit.y+30;(g as any).update(.02);assert.equal(g.exitTravelRemaining,0);
 g.enemies.forEach(e=>e.hp=0);(g as any).update(.02);assert.ok(g.exitTravelRemaining>0);
 g.campaign.award(7);g.selectLevel(7);assert.equal(g.currentLevel.id,8);assert.equal(g.boss,null);
});
