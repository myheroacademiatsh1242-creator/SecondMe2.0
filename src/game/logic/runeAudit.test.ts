import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../GameEngine.ts';
import {createEnemies} from './enemies.ts';
import {createBoss} from './campaign.ts';
import {sounds} from './sound.ts';
import {ECHO_RUNES,rollEchoRune} from './echoRunes.ts';
sounds.setMuted(true);
function setup(t:TestContext){
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const g=new GameEngine();g.currentLevelIdx=1;g.restartLevel();g.currentLevel=structuredClone(g.currentLevel);g.currentLevel.walls=[];g.currentLevel.doors=[];g.currentLevel.traps=[];g.enemies=[];g.legTimeRemaining=null;g.tutorialEnabled=false;
 g.campaign.echoRunes=Object.fromEntries(ECHO_RUNES.map(r=>[r.id,10]));g.player.x=100;g.player.y=600;
 const summon=(x=400,y=300)=>{const before={x:g.player.x,y:g.player.y};g.player.x=x;g.player.y=y;g.recorder.startRecording(x,y,'right');g.spawnEcho();g.player.x=before.x;g.player.y=before.y;g.echo!.status='finished';return g.echo!;};
 return {g,summon,hit:(e:NonNullable<GameEngine['echo']>,n:number)=>(g as any).hitEcho(e,n),combat:(e:NonNullable<GameEngine['echo']>,dt:number)=>(g as any).updateEchoCombat(e,dt)};
}
test('Calling replenishes charges up to six with a ring and does not consume at the cap',t=>{
 const {g}=setup(t);g.limitRingActive=true;g.echoCharges=3;
 assert.ok(g.useEchoRune('call'));assert.equal(g.echoCharges,4);assert.ok(g.useEchoRune('call'));assert.equal(g.echoCharges,5);
 assert.equal(g.useEchoRune('call'),false);assert.equal(g.campaign.echoRunes.call,8);
});
test('Endurance protects existing and newly summoned Echoes, but does not buff hero health',t=>{
 const {g,summon,hit}=setup(t);const first=summon();g.useEchoRune('guard');hit(first,20);assert.equal(first.stability,87);
 const second=summon(700,300);hit(second,20);assert.equal(second.stability,87);
 (g as any).takeDamage(20);assert.equal(g.health,80);
});
test('Endurance reduces paused drain; swapping retains its fixed 30 point cost',t=>{
 const {g,summon}=setup(t);const echo=summon();echo.status='paused';g.useEchoRune('guard');(g as any).update(.1);
 assert.equal(echo.stability,99.9025);const before=echo.stability!;g.swapEcho();assert.equal(echo.stability,before-30);
});
test('Restoration heals all current Echoes, caps at 100, does not revive and cannot waste stock',t=>{
 const {g,summon,hit}=setup(t);const a=summon(),b=summon(700,300),c=summon(800,300);a.stability=20;b.stability=85;hit(c,100);
 assert.ok(g.useEchoRune('restore'));assert.equal(a.stability,70);assert.equal(b.stability,100);assert.equal(g.echoes.length,2);assert.equal(g.campaign.echoRunes.restore,9);
 g.useEchoRune('restore');assert.equal(a.stability,100);assert.equal(g.useEchoRune('restore'),false);assert.equal(g.campaign.echoRunes.restore,8);
});
test('Amplification boosts automatic, recorded attack and recorded skill damage; protected boss stays immune',t=>{
 const {g,summon,combat}=setup(t);const echo=summon();const enemy={...createEnemies(g.currentLevel)[0],x:430,y:300,homeX:430,homeY:300,hp:1000,maxHp:1000};g.enemies=[enemy];
 combat(echo,.1);assert.equal(enemy.hp,985);g.useEchoRune('power');echo.attackTimer=0;combat(echo,.1);assert.equal(enemy.hp,965.5);
 const event={time:0,kind:'attack',x:0,y:0,targetX:100,targetY:0};(g as any).replayEchoEvent(event);assert.equal(enemy.hp,952.5);(g as any).replayEchoEvent({...event,kind:'skill'});assert.equal(enemy.hp,933);
 g.enemies=[];g.boss=createBoss();g.boss.x=430;g.boss.y=300;echo.attackTimer=0;combat(echo,.1);assert.equal(g.boss.hp,240);
 g.boss.pillars.forEach(p=>p.hp=0);echo.attackTimer=0;combat(echo,.1);assert.equal(g.boss.hp,230.25);
});
test('recorded rune-boosted attacks cannot hit through walls or fall back onto unrelated nearby targets',t=>{
 const {g,summon}=setup(t);summon();g.useEchoRune('power');const enemy={...createEnemies(g.currentLevel)[0],x:500,y:300,homeX:500,homeY:300,hp:100,maxHp:100};g.enemies=[enemy];g.currentLevel.walls=[{x:445,y:250,width:20,height:100}];
 const event={time:0,kind:'attack',x:0,y:0,targetX:100,targetY:0};(g as any).replayEchoEvent(event);assert.equal(enemy.hp,100);
 g.currentLevel.walls=[];enemy.x=520;enemy.y=360;(g as any).replayEchoEvent(event);assert.equal(enemy.hp,100,'outside aim cone must not be hit by fallback AoE');
});
test('both attempt buffs end in lobby and on retry; unused inventory is retained',t=>{
 const {g}=setup(t);for(const id of ECHO_RUNES.map(r=>r.id).filter(id=>id!=='call'&&id!=='restore'))assert.ok(g.useEchoRune(id));g.goToLobby();assert.equal(g.activeEchoRunes.size,0);g.restartLevel();assert.equal(g.activeEchoRunes.size,0);assert.deepEqual(g.campaign.echoRunes,Object.fromEntries(ECHO_RUNES.map(r=>[r.id,r.id==='call'||r.id==='restore'?10:9])));
});

test('every rune is usable only in trails 2–6 and cannot spend inventory outside gameplay',t=>{
 const {g,summon}=setup(t);const ids=ECHO_RUNES.map(r=>r.id);
 for(const screen of ['intro','loading','lobby','shop','characters','paused','victory','defeat','ending'] as const){
  g.screen=screen;for(const id of ids)assert.equal(g.useEchoRune(id),false,screen+':'+id);
 }
 for(let index=0;index<6;index++){
  g.currentLevelIdx=index;g.restartLevel();g.currentLevel.walls=[];g.currentLevel.doors=[];g.echoCharges=1;const echo=summon();echo.stability=40;
  for(const id of ids){const before=g.campaign.echoRunes[id]!;assert.equal(g.useEchoRune(id),index>0,`level ${index+1}: ${id}`);assert.equal(g.campaign.echoRunes[id],before-(index>0?1:0));}
 }
});
test('legacy inventory converts without losing counts and pending choices stay valid',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const values=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
 try{const g=new GameEngine();g.campaign.echoRunes={call:2,cleave:3,regen:1,execute:2};g.campaign.pendingRuneChoices=['rapid','anchor','vamp'];g.campaign.save();const restored=new GameEngine();restored.campaign.load();assert.deepEqual(restored.campaign.echoRunes,{call:2,power:5,restore:1});assert.equal(restored.campaign.pendingRuneChoices.length,3);assert.ok(restored.campaign.pendingRuneChoices.every(id=>ECHO_RUNES.some(r=>r.id===id)));}
 finally{old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage');}
});

test('single rune rolls reach all four runes with equally-sized random intervals',()=>{
 assert.deepEqual(ECHO_RUNES.map((_,i)=>rollEchoRune(()=>(i+.5)/ECHO_RUNES.length)),ECHO_RUNES.map(r=>r.id));
});