import { ENEMY_STATS } from './enemies.ts';
import { EMBER_DEMON_HP, encounterBalance } from './balance.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemonBoss,updateDemonBoss} from './demonBoss.ts';
import {demonFrame,DEMON_ANIMATIONS} from '../rendering/demonBoss.ts';
import {GameEngine} from '../GameEngine.ts';
import {LEVELS} from './levels.ts';
import {sounds} from './sound.ts';
sounds.setMuted(true);
function finishPrelude(game:GameEngine) {
 for (let stage=0; stage<2 && !game.boss; stage++) {
  game.enemies.forEach(enemy=>enemy.hp=0);
  for(let i=0;i<50;i++)(game as any).update(.02);
 }
 return game.boss;
}
test('final boss is a separate cave level with no puzzle timer or ice pillars',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const g=new GameEngine();
 g.devUnlocked=true;g.selectLevel(12);
 assert.equal(g.currentLevel.id,13);
 assert.ok(!g.boss);
 assert.equal(g.bossIntroduction,false);
 assert.equal(g.enemies.length,13);
 const farGuard = g.enemies.find(enemy=>enemy.id==='enemy-13-8')!;
 const distance = () => Math.hypot(farGuard.x-g.player.x, farGuard.y-g.player.y);
 const initialDistance = distance();
 for(let i=0;i<60;i++)(g as any).update(.02);
 assert.ok(distance() < initialDistance - 20, 'The far guard rushes the player from outside its normal detection range');
 assert.equal(g.enemies.length,13);
 const slimes = g.enemies.filter(enemy=>enemy.slimeHue!==undefined);
 assert.equal(slimes.length,4);
 const [red] = slimes.filter(enemy=>enemy.slimeHue===0);
 assert.equal(slimes.filter(enemy=>enemy.slimeHue===0).length,1);
 slimes.find(enemy=>enemy!==red)!.hp=0;
 for(let i=0;i<50;i++)(g as any).update(.02);
 assert.ok(!g.boss);
 const beforeIntro = g.enemies;
 red.hp=0;
 assert.ok(g.enemies.some(enemy=>enemy.hp>0));
 for(let i=0;i<30;i++)(g as any).update(.02);
 const boss = finishPrelude(g);
 assert.equal(g.enemies,beforeIntro);
 assert.ok(g.enemies.some(enemy=>enemy.hp>0));
 assert.equal(boss?.kind,'demon');
 assert.equal(boss?.hp,EMBER_DEMON_HP);
 assert.equal(boss?.pillars.length,0);
 assert.equal(g.legTimeRemaining,null);
 assert.equal(g.bossIntroduction,true);
 assert.equal((g as any).musicScene(),'level');
 g.revealDemon();
 assert.equal((g as any).musicScene(),'boss');
 g.beginBossFight();assert.equal(g.bossIntroduction,false);
 assert.equal(LEVELS.length,13);
});
test('cleave locks its telegraph and can be dodged or redirected into Echoes',()=>{
 const b=createDemonBoss();b.mode='warning';b.attack='melee';b.timer=.01;b.targetX=b.x+100;b.targetY=b.y;
 let damage=0,echoDamage=0;const player={x:b.x+100,y:b.y};
 updateDemonBoss(b,player,.02,player,[],undefined,n=>damage+=n,false);assert.equal(damage,24);assert.equal(b.mode,'strike');
 b.mode='warning';b.timer=.01;updateDemonBoss(b,player,.02,player,[],undefined,n=>damage+=n,true);assert.equal(damage,24);
 b.mode='warning';b.timer=.01;updateDemonBoss(b,player,.02,{x:200,y:500},[player],(_,n)=>echoDamage+=n,n=>damage+=n,false);assert.equal(echoDamage,24);assert.equal(damage,24);
 b.mode='warning';b.timer=.01;
 const outsideWarning={x:b.x+170,y:b.y};
 updateDemonBoss(b,player,.02,outsideWarning,[],undefined,n=>damage+=n,false);
 assert.equal(damage,24,'The cleave cannot hit beyond the marked sector');
});
test('later phases add real firebolts and eruptions with at least a second of warning',()=>{
 const b=createDemonBoss();b.hp=180;b.mode='stalking';b.timer=-2;b.attackIndex=2;const player={x:600,y:450};
 updateDemonBoss(b,player,.02,player,[],undefined,undefined,false);assert.equal(b.phase,3);assert.equal(b.attack,'triple');assert.equal(b.demon!.zones.length,5);assert.ok(b.demon!.zones.every(z=>z.delay>=1));
 b.demon!.zones=[];b.mode='warning';b.attack='volley';b.timer=.01;updateDemonBoss(b,player,.02,player,[],undefined,undefined,false);assert.equal(b.projectiles.length,7);
 const p=b.projectiles[3];let hits=0;updateDemonBoss(b,player,.01,{x:p.x+p.vx*.01,y:p.y+p.vy*.01},[],undefined,n=>hits=Math.max(hits,n),false);assert.equal(hits,14);
});
test('all uploaded animation rows keep their frame counts and death finishes without looping',()=>{
 assert.deepEqual(Object.values(DEMON_ANIMATIONS).map(a=>a.count),[6,12,15,5,22]);const b=createDemonBoss();b.hp=0;assert.deepEqual(demonFrame(b,1),{animation:'death',frame:10});assert.deepEqual(demonFrame(b,20),{animation:'death',frame:21});
});
test('killing the demon plays its full death and does not alter the old guardian flag',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const g=new GameEngine();g.currentLevelIdx=12;g.restartLevel();finishPrelude(g);g.beginBossFight();g.tutorialEnabled=false;const boss=g.boss!;
 g.spawnMagmaMinions(1);
 const survivor=g.enemies.at(-1)!;
 (g as any).strike(boss,10000,false,g.player);assert.equal(boss.hp,0);assert.equal(g.campaign.bossDefeated,false);assert.ok(g.campaign.completed.includes(13));
 for(let i=0;i<60;i++)(g as any).update(.02);assert.equal(g.screen,'playing');
 for(let i=0;i<65;i++)(g as any).update(.02);
 assert.equal(g.screen,'playing');assert.ok(survivor.hp>0);
 assert.equal((g as any).musicScene(),'level');
 (g as any).strike(survivor,10000,false,g.player);
 for(let i=0;i<12;i++)(g as any).update(.02);
 assert.equal(g.screen,'victory');
});

test('entering ritual smoothly leaps across the arena to center instead of instantly teleporting', () => {
  const b = createDemonBoss();
  b.x = 200;
  b.y = 500;
  b.hp = 380;
  b.mode = 'recover';
  b.timer = 0.01;
  const player = { x: 360, y: 220 };

  // Frame 1: transitions into ritual mode without instantly snapping to (640, 300)
  updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  assert.equal(b.mode, 'ritual');
  assert.equal(b.demon!.ritualStage, 1);
  assert.equal(b.x, 200);
  assert.equal(b.y, 500);

  // Frame 2: leap progresses smoothly
  updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  assert.ok(b.x > 200 && b.x < 300);
  assert.ok(b.y < 500 && b.y > 400);

  // Advance to mid-leap (~0.3s)
  for (let i = 0; i < 15; i++) {
    updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  }
  assert.ok(b.x > 350 && b.x < 600);

  // Complete leap (> 0.65s)
  for (let i = 0; i < 25; i++) {
    updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  }
  assert.equal(b.x, 640);
  assert.equal(b.y, 300);
});

test('ritual activates on recovery below 66% HP and standing on a core seals it',()=>{
  const b = createDemonBoss();
  b.hp = 380;
  b.mode = 'recover';
  b.timer = 0.01;
  const player = { x: 360, y: 220 };
  updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  assert.equal(b.mode, 'ritual');
  assert.equal(b.demon!.ritualStage, 1);

  for (let i = 0; i < 70; i++) {
    updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  }
  const frostCore = b.demon!.cores.find(c => c.id === 'frostfire')!;
  assert.equal(frostCore.sealed, true);

  for (let i = 0; i < 70; i++) {
    updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);
  }
  assert.equal(b.mode, 'charge_warning');
  assert.equal(b.demon!.ventCore, 'frostfire');
  assert.notEqual(b.demon!.activeElement, 'frostfire');
  assert.equal(b.demon!.heatShield, 1);
  assert.equal(b.demon!.overheated, true);
});

test('overheat dash colliding with cooling vent triggers thermal shock meltdown and stun', () => {
  const b = createDemonBoss();
  const d = b.demon!;
  d.ventCore = 'frostfire';
  d.activeElement = 'magma';
  d.heatShield = 1;
  d.overheated = true;
  b.mode = 'charge_dash';
  b.timer = 1.0;
  b.x = 420;
  b.y = 220;
  d.chargeAngle = Math.PI;
  d.chargeSpeed = 650;
  const hpBefore = b.hp;

  const player = { x: 800, y: 500 };
  updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);

  assert.equal(d.meltdownOccurred, true);
  assert.equal(d.heatShield, 0);
  assert.equal(b.mode, 'stunned');
  assert.ok(d.stunned > 4.0);
  assert.equal(b.hp, hpBefore - 80);
});

test('boss consistently faces target in side-view across stalking, warning, strike and recover', () => {
  const b = createDemonBoss();
  b.x = 640;
  b.y = 300;

  // 1. Target on LEFT
  const targetLeft = { x: 300, y: 300 };
  updateDemonBoss(b, targetLeft, 0.02, targetLeft, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, false, 'Stalking player on left must face left');

  b.mode = 'warning';
  b.targetX = 300;
  b.targetY = 300;
  updateDemonBoss(b, targetLeft, 0.02, targetLeft, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, false, 'Warning aiming left must face left');

  b.mode = 'strike';
  updateDemonBoss(b, targetLeft, 0.02, targetLeft, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, false, 'Strike aiming left must face left');

  b.mode = 'recover';
  updateDemonBoss(b, targetLeft, 0.02, targetLeft, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, false, 'Recover with player on left must face left');

  // 2. Target on RIGHT
  const targetRight = { x: 900, y: 300 };
  b.mode = 'stalking';
  updateDemonBoss(b, targetRight, 0.02, targetRight, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, true, 'Stalking player on right must face right');

  b.mode = 'warning';
  b.targetX = 900;
  b.targetY = 300;
  updateDemonBoss(b, targetRight, 0.02, targetRight, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, true, 'Warning aiming right must face right');

  b.mode = 'strike';
  updateDemonBoss(b, targetRight, 0.02, targetRight, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, true, 'Strike aiming right must face right');

  b.mode = 'recover';
  updateDemonBoss(b, targetRight, 0.02, targetRight, [], undefined, undefined, false);
  assert.equal(b.demon!.facingRight, true, 'Recover with player on right must face right');
});

test('boss exhibits expressive 2D side-view movement freedom and vertical motion', () => {
  const b = createDemonBoss();
  b.x = 640;
  b.y = 300;
  const d = b.demon!;

  // 1. Tactical short hop / pounce when stalking from a distance (> 270px)
  const distantTarget = { x: 950, y: 450 };
  d.hopCooldown = 0;
  // Trigger hop initiation:
  updateDemonBoss(b, distantTarget, 0.02, distantTarget, [], undefined, undefined, false);
  assert.equal(d.hopActive, true, 'Distant stalking should initiate a tactical short hop');
  assert.equal(d.hopType, 'pounce');

  // Advance 1 frame in mid-air:
  updateDemonBoss(b, distantTarget, 0.02, distantTarget, [], undefined, undefined, false);
  assert.ok(d.elevation > 0, 'Airborne hop must have positive visual elevation');

  // Advance hop to landing
  for (let i = 0; i < 25; i++) {
    updateDemonBoss(b, distantTarget, 0.02, distantTarget, [], undefined, undefined, false);
  }
  assert.equal(d.hopActive, false, 'Hop should complete cleanly');
  assert.equal(d.elevation, 0, 'Elevation returns to ground plane upon landing');
  assert.ok((d.landingImpact ?? 0) > 0 || (d.crouch ?? 0) > 0, 'Landing triggers impact squash');

  // 2. Pre-attack recoil hop for Fire Fan when target is close (< 210px)
  const closeTarget = { x: 670, y: 310 };
  b.x = 640;
  b.y = 300;
  b.mode = 'stalking';
  b.timer = 0.01;
  b.attackIndex = 0; // next attack is melee if dist < 165
  // Set dist > 165 and index % 3 === 1 to trigger volley
  const midTarget = { x: 830, y: 300 }; // dist = 190 (< 210)
  b.x = 640;
  b.y = 300;
  b.mode = 'stalking';
  b.timer = -1;
  b.attackIndex = 3; // index % 3 === 0, dist > 165 => volley
  updateDemonBoss(b, midTarget, 0.02, midTarget, [], undefined, undefined, false);

  assert.equal(b.mode, 'warning');
  assert.equal(b.attack, 'volley');
  assert.equal(d.hopActive, true, 'Close volley should trigger recoil hop backward');
  assert.equal(d.hopType, 'recoil');

  // 3. Cleave executes heavy forward slam with landing impact & screen shake
  b.mode = 'warning';
  b.attack = 'melee';
  b.timer = 0.01;
  b.targetX = b.x + 100;
  b.targetY = b.y;
  d.hopActive = false;
  d.slamShake = false;
  const player = { x: b.x + 100, y: b.y };
  updateDemonBoss(b, player, 0.02, player, [], undefined, undefined, false);

  assert.equal(b.mode, 'strike');
  assert.equal(d.slamShake, true, 'Cleave ground slam triggers screen shake');
  assert.ok((d.crouch ?? 0) > 0, 'Downard slam creates crouch compression');
});

test('demon boss executes minion swarm summon and engine spawns fiery skull minions', t => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => old ? Object.defineProperty(globalThis, 'document', old) : Reflect.deleteProperty(globalThis, 'document'));

  // 1. Minion summon triggers via attack rotation and queues summonPending
  const b = createDemonBoss();
  b.hp = b.maxHp * .5; // Phase 2
  b.mode = 'stalking';
  b.timer = -1;
  b.attackIndex = 3; // index % 4 === 3 => summon
  b.demon!.summonCooldown = 0;
  const target = { x: 700, y: 350 };
  updateDemonBoss(b, target, 0.02, target, [], undefined, undefined, false);

  assert.equal(b.mode, 'warning');
  assert.equal(b.attack, 'summon');
  assert.equal(b.demon!.summonPending, 0, 'Warning gives the player time before minions spawn');

  // Complete warning to strike
  b.timer = 0.01;
  updateDemonBoss(b, target, 0.02, target, [], undefined, undefined, false);
  assert.equal(b.mode, 'strike');
  assert.equal(b.demon!.summonPending, 3, 'The swarm spawns on impact');
  assert.equal(b.demon!.slamShake, true, 'Summon slam shakes screen');

  // 2. Engine spawns magma skull minions into game.enemies
  const g = new GameEngine();
  g.devUnlocked = true;
  g.selectLevel(12);
  finishPrelude(g);
  g.beginBossFight();
  const originalEnemies = g.enemies.length;

  g.spawnMagmaMinions(4);
  assert.equal(g.enemies.length, originalEnemies + 4);
  assert.ok(g.enemies.slice(originalEnemies).every(e => e.kind === 'skull'));
  assert.ok(g.enemies.slice(originalEnemies).every(e => e.mode === 'chase'));
  assert.ok(g.enemies.slice(originalEnemies).every(e => e.hp === Math.round(ENEMY_STATS.skull.hp * encounterBalance(g.currentLevel.id).health)));

  // Capped at 6
  g.spawnMagmaMinions(5);
  assert.equal(g.enemies.length, originalEnemies + 6, 'Active minions capped at 6');
});
