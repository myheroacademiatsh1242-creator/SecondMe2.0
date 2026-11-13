import { ENEMY_TIME_BONUS, puzzleBalance } from './balance.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../GameEngine.ts';
import { sounds } from './sound.ts';
import { comboDamage } from './combo.ts';
sounds.setMuted(true);
function setup(t:any){const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{},classList:{toggle(){}}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));const g=new GameEngine();g.currentLevelIdx=1;g.restartLevel();g.currentLevel.walls=[];g.currentLevel.doors=[];g.currentLevel.traps=[];return g;}
test('both Aeris and Kael can damage trail enemies with their basic attack; Amplification never boosts player attacks',t=>{
 const g=setup(t),enemy=g.enemies[0];g.player.x=enemy.x-70;g.player.y=enemy.y;g.activeEchoRunes.add('power');
 const tick=(g as any).updateCombo.bind(g);
 for(const kind of ['mage','swordsman'] as const){enemy.hp=30;g.characterClass=kind;g.combo?.cancel();g.attack(enemy);for(let i=0;i<180;i++)tick(1/120);assert.equal(enemy.hp,30-comboDamage(kind,0),kind);}
});
test('enemy kills restore time and a summon charge exactly once; neither combat nor rewards advance puzzle switches',t=>{
 const g=setup(t),enemy=g.enemies[0];g.legTimeRemaining=5;g.echoCharges=1;(g as any).damageCombatTarget(enemy.x,enemy.y,enemy.maxHp,10);assert.equal(enemy.hp,0);assert.equal(g.legTimeRemaining,5+ENEMY_TIME_BONUS);assert.equal(g.echoCharges,2);assert.equal(g.checkpointIndex,0);
 (g as any).damageCombatTarget(enemy.x,enemy.y,enemy.maxHp,10);assert.equal(g.echoCharges,2);assert.equal(g.legTimeRemaining,5+ENEMY_TIME_BONUS);
});
test('pause and the manual guide freeze combat; automatic hints leave it running',t=>{
 const g=setup(t);g.enemies[0].mode='warning';g.enemies[0].timer=.7;g.screen='paused';(g as any).update(.5);assert.equal(g.enemies[0].timer,.7);
 g.screen='playing';g.tutorialEnabled=true;g.guides.offer('enemies');const time=g.legTimeRemaining!;
 (g as any).update(.1);assert.ok(g.enemies[0].timer<.7);assert.ok(g.legTimeRemaining!<time);
 g.openGuide();const enemyTimer=g.enemies[0].timer,pausedTime=g.legTimeRemaining;
 (g as any).update(.5);assert.equal(g.enemies[0].timer,enemyTimer);assert.equal(g.legTimeRemaining,pausedTime);
});

test('early frontline enemies survive four basic slashes and later ones take more punishment',t=>{
 const g=setup(t),frontline=g.enemies[0];
 const fullCombo=(enemy:typeof frontline)=>{
  for(let step=0;step<4;step++)assert.ok(g['strike'](enemy,comboDamage('swordsman',step)));
 };
 for(const enemy of g.enemies){fullCombo(enemy);assert.ok(enemy.hp>0); }
 assert.ok(frontline.hp>0);
 g.currentLevelIdx=12;g.restartLevel();
 const late=g.enemies.find(enemy=>enemy.kind===frontline.kind)!;
 assert.ok(late.maxHp>frontline.maxHp);
 fullCombo(late);
 assert.ok(late.hp>frontline.hp);
});

test('kill rewards preserve extra time earned from pickups without adding beyond the leg budget',t=>{
 const g=setup(t);
 g.legTimeRemaining=puzzleBalance(g.currentLevel.id).legSeconds+1;
 const enemy=g.enemies[0];
 assert.ok(g['strike'](enemy,enemy.maxHp));
 assert.equal(g.legTimeRemaining,puzzleBalance(g.currentLevel.id).legSeconds+1);
});
