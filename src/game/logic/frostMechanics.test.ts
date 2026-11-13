import test from 'node:test';
import assert from 'node:assert/strict';
import {FROST_LEVELS} from './frostLevels.ts';
import {updateSecurityDoors,pulseWindow,updatePressurePlates} from './puzzle.ts';
import {GameEngine} from '../GameEngine.ts';
import {createEnemies} from './enemies.ts';
import {sounds} from './sound.ts';
sounds.setMuted(true);
test('pulse gates follow the countdown and still require every seal',()=>{
 const level=structuredClone(FROST_LEVELS[1]),door=level.doors[0];
 assert.deepEqual(pulseWindow(door,2),{open:true,remaining:2});assert.deepEqual(pulseWindow(door,6),{open:false,remaining:2});assert.equal(pulseWindow(door,8).open,true);
 const player={x:160,y:560};level.plates.forEach(p=>p.isPressed=true);
 updateSecurityDoors([door],level.plates,player,null,1,3.5,2);assert.equal(door.openProgress,1);
 updateSecurityDoors([door],level.plates,player,null,1,3.5,6);assert.equal(door.openProgress,0);
 level.plates[0].isPressed=false;updateSecurityDoors([door],level.plates,player,null,1,3.5,8);assert.equal(door.openProgress,0);
 // A closing pulse never crushes a character already in the threshold.
 door.openProgress=1;updateSecurityDoors([door],level.plates,{x:door.x+door.width/2,y:door.y+door.height/2},null,1,3.5,6);assert.equal(door.openProgress,1);
});
test('a sealed rune cannot be held by player or Echo until its own sentries are gone',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const game=new GameEngine();game.currentLevelIdx=8;game.restartLevel();game.tutorialEnabled=false;
 const plate=game.currentLevel.plates[0];game.player.x=plate.x+25;game.player.y=plate.y+25;(game as any).update(.02);
 assert.equal(plate.wardLocked,true);assert.equal(plate.isPressed,false);assert.equal(game.checkpointIndex,0);
 const stock=game.echoCharges;for(const enemy of game.enemies)if(plate.wardEnemyIds?.includes(enemy.id))enemy.hp=0;
 (game as any).update(.02);assert.equal(plate.wardLocked,false);assert.equal(plate.isPressed,true);assert.equal(game.checkpointIndex,1);assert.ok(game.echoCharges>=stock);
 const locked={...plate,wardLocked:true,isPressed:false};updatePressurePlates([locked],{x:100,y:100},[{x:plate.x+25,y:plate.y+25}],.1);assert.equal(locked.isPressed,false);
});
test('ward references name real enemies, and relay doors require a different rune to be empty',()=>{
 for(const level of FROST_LEVELS){const ids=new Set(createEnemies(level).map(e=>e.id));for(const plate of level.plates)for(const id of plate.wardEnemyIds??[])assert.ok(ids.has(id));for(const door of level.doors){if(door.releasedPlate){assert.ok(level.plates.some(p=>p.id===door.releasedPlate));assert.equal(door.requiredPlates.includes(door.releasedPlate),false);}if(door.pulse)assert.ok(door.pulse.openSeconds>=3.5&&door.pulse.openSeconds<door.pulse.period);}}
 const relay=structuredClone(FROST_LEVELS[4]),last=relay.doors.at(-1)!;relay.plates.forEach(p=>p.isPressed=true);
 updateSecurityDoors([last],relay.plates,{x:100,y:100},null,1);assert.equal(last.isOpen,false);
 relay.plates.find(p=>p.id===last.releasedPlate)!.isPressed=false;updateSecurityDoors([last],relay.plates,{x:100,y:100},null,1);assert.equal(last.isOpen,true);
});
test('developer unlock does not bypass snow puzzles or their timer',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const game=new GameEngine();game.currentLevelIdx=6;game.campaign.pendingRuneChoices=[];game.restartLevel();game.tutorialEnabled=false;game.devUnlocked=true;game.enemies.forEach(e=>e.hp=0);game.player.x=game.currentLevel.exit.x+30;game.player.y=game.currentLevel.exit.y+30;(game as any).update(.02);assert.equal(game.exitTravelRemaining,0);
 game.legTimeRemaining=.005;(game as any).update(.02);assert.equal(game.screen,'defeat');assert.equal(game.defeatReason,'timeout');
});
