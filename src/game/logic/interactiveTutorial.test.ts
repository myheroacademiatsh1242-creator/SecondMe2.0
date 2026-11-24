import test from 'node:test';
import assert from 'node:assert/strict';
import {InteractiveTutorial,TUTORIAL_STEPS,TUTORIAL_KEY,type TutorialContext} from './interactiveTutorial.ts';
import {GameEngine} from '../GameEngine.ts';
import {connectTutorial} from './tutorialBridge.ts';
import {Campaign} from './campaign.ts';
import {sounds} from './sound.ts';
sounds.setMuted(true);
const base:TutorialContext={screen:'playing',level:1,completed:[],touch:false,finalGateCrossed:true,recording:false,recordReady:false,echoes:0,canSummon:true,canSwap:false,canSkill:true,canDodge:true,canUltimate:false,canTime:false,canItem:false,hasRunes:false,pendingRuneReward:false,canRune:false,runeEditing:false,inventory:false,preparing:false,chestOpen:false,chestAvailable:true,chestRates:false,chestRewards:false,shopConfirm:false,heroUpgrade:false,resetOpen:false,guide:false};
function store(){let data='{}';return {getItem:()=>data,setItem:(_k:string,v:string)=>{data=v;},read:()=>JSON.parse(data)};}
test('progress requires the expected successful event and persists without replaying completed steps',()=>{
 const storage=store(),t=new InteractiveTutorial(storage);t.update({...base});
 assert.equal(t.active?.id,'combat.move');assert.equal(t.event('attack'),false);assert.equal(t.active?.id,'combat.move');
 assert.ok(t.event('move'));assert.equal(t.active?.id,'combat.aim');
 const restored=new InteractiveTutorial(storage);restored.update({...base});assert.equal(restored.active?.id,'combat.aim');
});
test('skip per step, skip all and replay only change tutorial state',()=>{
 const storage=store(),t=new InteractiveTutorial(storage);t.update({...base});t.skip();
 assert.ok(t.skipped.has('combat.move'));assert.equal(t.active?.id,'combat.aim');
 t.skipAll();assert.equal(t.active,null);assert.equal(t.event('attack'),false);
 const restored=new InteractiveTutorial(storage);restored.update({...base});assert.equal(restored.active,null);
 restored.replay('combat');assert.equal((restored.active as {id:string}|null)?.id,'combat.move');restored.event('move');restored.endReplay();assert.equal(restored.active,null);assert.ok(restored.skipped.has('combat.move'));
});
test('conditional actions do not prompt when impossible and resume when eligible',()=>{
 const t=new InteractiveTutorial(null);for(const s of TUTORIAL_STEPS.filter(s=>s.track==='echo'&&s.id!=='echo.swap'))t.done.add(s.id);
 t.update({...base,level:2,canSwap:false});assert.notEqual(t.active?.id,'echo.swap');
 t.update({...base,level:2,canSwap:true,echoes:1});assert.equal(t.active?.id,'echo.swap');
 t.update({...base,level:2,canSwap:true,screen:'loading'});assert.equal(t.active,null);
});
test('every track supports skip without prerequisites, malformed storage does not block play',()=>{
 const t=new InteractiveTutorial({getItem:()=>'{broken',setItem(){throw Error('blocked');}});t.update({...base});
 for(let i=0;i<8;i++)t.skip();assert.equal(TUTORIAL_STEPS.filter(s=>s.track==='combat'&&t.skipped.has(s.id)).length,8);
 assert.equal(new Set(TUTORIAL_STEPS.map(s=>s.id)).size,TUTORIAL_STEPS.length);
});
test('a closed dialog suspends the tutorial without erasing progress',()=>{
 const t=new InteractiveTutorial(null);for(const s of TUTORIAL_STEPS.filter(s=>s.track==='chest'&&s.id!=='chest.rates'))t.done.add(s.id);
 t.update({...base,screen:'shop',completed:[1],chestOpen:true});assert.equal(t.active?.id,'chest.rates');
 t.update({...base,screen:'shop',completed:[1],chestOpen:false});assert.notEqual(t.active?.id,'chest.rates');
 t.update({...base,screen:'shop',completed:[1],chestOpen:true});assert.equal(t.active?.id,'chest.rates');
});
function engineFor(t:test.TestContext){
 const doc=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});
 t.after(()=>doc?Object.defineProperty(globalThis,'document',doc):Reflect.deleteProperty(globalThis,'document'));
 const e=new GameEngine();e.tutorialEnabled=true;e.restartLevel();const stop=connectTutorial(e);t.after(stop);return {e,tick:stop.tick};
}
test('blocked movement, rejected attacks/skills and insufficient swap stability never complete actions',t=>{
 const {e,tick}=engineFor(t);const active=()=>e.onboarding.active?.id;tick();assert.equal(active(),undefined);
 e.onboarding.event('attack');assert.equal(e.onboarding.done.has('combat.attack'),false);
 e.finalGateCrossed=true;tick();assert.equal(e.onboarding.active?.id,'combat.move');tick();assert.equal(e.onboarding.active?.id,'combat.move');
 e.player.x+=30;tick();assert.ok(e.onboarding.done.has('combat.move'));
 e.onboarding.done.add('combat.aim');e.onboarding.update({...e.onboarding.context!});e.inventoryOpen=true;e.attack();assert.equal(e.onboarding.done.has('combat.attack'),false);
 e.inventoryOpen=false;e.orientationBlocked=true;e.attack();assert.equal(e.onboarding.done.has('combat.attack'),false);
 e.orientationBlocked=false;e.mana.reset();e.attack();assert.ok(e.onboarding.done.has('combat.attack'));
 e.onboarding.done.add('combat.combo');e.skillCooldown=2;e.useSkill();assert.equal(e.onboarding.done.has('combat.skill'),false);
 e.skillCooldown=0;e.mana.reset();tick();e.useSkill();assert.ok(e.onboarding.done.has('combat.skill'));
});
test('shop purchase completion follows transaction success and cannot be faked by opening confirmation',t=>{
 const {e,tick}=engineFor(t);e.campaign.completed=[1];e.goToLobby();tick();
 for(const s of TUTORIAL_STEPS.filter(s=>s.track==='chest'))e.onboarding.skipped.add(s.id);
 e.openShop();assert.ok(e.onboarding.done.has('shop.open'));
 for(const id of ['tabs','select','buy','quantity'])e.onboarding.skipped.add('shop.'+id);
 e.tutorialUI({shopConfirm:true});e.campaign.coins=0;assert.equal(e.buyShopItem('time'),false);assert.equal(e.onboarding.done.has('shop.purchase'),false);
 e.campaign.coins=5;assert.equal(e.buyShopItem('time'),true);assert.ok(e.onboarding.done.has('shop.purchase'));
});
test('three paid royal draws persist real rewards, failed draws and other chests do not count',t=>{
 const {e,tick}=engineFor(t);e.campaign.completed=[1];e.goToLobby();tick();e.openShop();
 for(const id of ['open','kind','rates'])e.onboarding.skipped.add('chest.'+id);
 e.tutorialUI({chestOpen:true,chestAvailable:true});e.campaign.chestKeys=0;
 assert.equal(e.openChest(1,'royal'),null);assert.equal(e.onboarding.done.has('chest.draw1'),false);
 e.campaign.chestKeys=15;assert.equal(e.openChest(1,'royal')?.length,1);assert.ok(e.onboarding.done.has('chest.draw1'));
 e.onboarding.event('chest-cards');assert.equal(e.openChest(1,'royal')?.length,1);assert.equal(e.openChest(1,'royal')?.length,1);
 assert.equal(e.campaign.chestKeys,0);assert.ok(e.onboarding.done.has('chest.draw2'));assert.ok(e.onboarding.done.has('chest.draw3'));
});
test('welcome reward is one-time, uses actual chest currency, and survives a reload',t=>{
 const saved=store();const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,value:saved});t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 const c=new Campaign();assert.equal(c.grantTutorialWelcome(),false);c.completed=[1];assert.ok(c.grantTutorialWelcome());assert.equal(c.coins,12);assert.equal(c.chestKeys,15);assert.equal(c.grantTutorialWelcome(),false);
 const next=new Campaign();next.load();assert.equal(next.grantTutorialWelcome(),false);assert.equal(next.chestKeys,15);
});
test('skip never buys, draws, spends stock or completes levels on a real engine',t=>{
 const {e,tick}=engineFor(t);const before=JSON.stringify({coins:e.campaign.coins,keys:e.campaign.chestKeys,completed:e.campaign.completed,runes:e.campaign.echoRunes,items:e.campaign.itemLoadout});
 e.onboarding.skip();e.onboarding.skipAll();tick();assert.equal(JSON.stringify({coins:e.campaign.coins,keys:e.campaign.chestKeys,completed:e.campaign.completed,runes:e.campaign.echoRunes,items:e.campaign.itemLoadout}),before);
});


test('reload midway through Echo lessons recovers transient recordings without erasing progress',()=>{
 const t=new InteractiveTutorial(null);t.done.add('echo.record');t.update({...base,level:2});
 assert.equal(t.active?.id,'echo.walk.recover');assert.equal(t.active?.event,'record-start');t.event('record-start');
 assert.ok(t.done.has('echo.record'));assert.equal(t.done.has('echo.walk'),false);
 t.update({...base,level:2,recording:true});assert.equal(t.active?.id,'echo.walk');
 t.event('record-move');assert.ok(t.done.has('echo.walk'));
});
test('full stock prevents purchase completion; rune inspection/equipment does not consume stock',t=>{
 const {e,tick}=engineFor(t);e.campaign.completed=[1,2];e.goToLobby();tick();e.openShop();e.campaign.coins=999;e.campaign.timeItems=99;
 const before=e.campaign.coins;assert.equal(e.buyShopItem('time'),false);assert.equal(e.campaign.coins,before);assert.equal(e.onboarding.done.has('shop.purchase'),false);
 e.goToLobby();e.campaign.echoRunes={power:2,guard:2};assert.ok(e.setRuneSlot(0,'power'));const stock=JSON.stringify(e.campaign.echoRunes);
 e.onboarding.event('rune-inspect');assert.ok(e.setRuneSlot(0,'guard'));assert.equal(JSON.stringify(e.campaign.echoRunes),stock);assert.ok(e.setRuneSlot(0,null));assert.equal(JSON.stringify(e.campaign.echoRunes),stock);
 e.setRuneSlot(0,'power');e.currentLevelIdx=1;e.restartLevel();assert.ok(e.useEchoRune('power'));assert.equal(e.campaign.echoRunes.power,1);assert.equal(e.useEchoRune('power'),false);e.restartLevel();assert.equal(e.activeEchoRunes.has('power'),false);assert.equal(e.campaign.echoRunes.power,1);
});
test('insufficient swap stability and no summon charges are genuine failures',t=>{
 const {e,tick}=engineFor(t);e.currentLevelIdx=1;e.restartLevel();e.recorder.startRecording(e.player.x,e.player.y,'right');e.player.x+=40;e.recorder.stopRecording(e.player.x,e.player.y,'right',false);e.spawnEcho();
 for(const s of TUTORIAL_STEPS.filter(s=>s.track==='echo'&&s.id!=='echo.swap'))e.onboarding.done.add(s.id);
 e.echo!.stability=1;tick();const before={x:e.player.x,y:e.player.y};e.swapEcho();assert.deepEqual({x:e.player.x,y:e.player.y},before);assert.equal(e.onboarding.done.has('echo.swap'),false);
 e.echo!.stability=100;tick();e.swapEcho();assert.ok(e.onboarding.done.has('echo.swap'));
 e.echoCharges=0;(e as any).echoFreeSummon=false;const count=e.echoes.length;e.spawnEcho();assert.equal(e.echoes.length,count);
});


test('tutorial clock assist ends immediately after skip without completing the level',t=>{
 const {e,tick}=engineFor(t);tick();const time=e.legTimeRemaining;assert.ok(e.tutorialClockPaused);
 (e as any).update(.1);assert.equal(e.legTimeRemaining,time);
 e.onboarding.skipAll();assert.equal(e.tutorialClockPaused,false);(e as any).update(.1);assert.ok(e.legTimeRemaining!<time!);assert.deepEqual(e.campaign.completed,[]);
});
test('inventory packing validates limits and quantity while tutorial observes real successes',t=>{
 const {e,tick}=engineFor(t);e.campaign.completed=[1,2];e.goToLobby();tick();
 for(const s of TUTORIAL_STEPS.filter(s=>['chest','shop','rune'].includes(s.track)))e.onboarding.skipped.add(s.id);
 e.campaign.timeItems=3;e.setInventoryOpen(true);assert.ok(e.onboarding.done.has('pack.open'));assert.ok(e.packItem('time'));assert.ok(e.onboarding.done.has('pack.add'));
 assert.equal(e.setPackedCount(0,4),false);assert.equal(e.onboarding.done.has('pack.quantity'),false);assert.ok(e.setPackedCount(0,2));assert.ok(e.onboarding.done.has('pack.quantity'));
 assert.ok(e.unpackItem(0));assert.ok(e.onboarding.done.has('pack.remove'));assert.equal(e.campaign.timeItems,3);
});
test('closing a shop confirmation retains the purchase step and offers recovery',()=>{
 const t=new InteractiveTutorial(null);for(const s of TUTORIAL_STEPS.filter(s=>s.track==='chest'||s.track==='shop'&&s.id!=='shop.purchase'&&s.id!=='shop.inventory'))t.done.add(s.id);
 t.update({...base,screen:'shop',completed:[1],shopConfirm:true});assert.equal(t.active?.id,'shop.purchase');
 t.update({...base,screen:'shop',completed:[1],shopConfirm:false});assert.equal(t.active?.id,'shop.purchase.recover');assert.equal(t.done.has('shop.purchase'),false);
 t.update({...base,screen:'shop',completed:[1],shopConfirm:true});assert.equal(t.active?.id,'shop.purchase');
});
test('mobile uses actual engine actions and does not offer unavailable ultimate or phantom targeting',t=>{
 const {e}=engineFor(t);const stop=connectTutorial(e,true);t.after(stop);e.currentLevelIdx=1;e.restartLevel();e.recorder.startRecording(e.player.x,e.player.y,'right');e.player.x+=40;e.recorder.stopRecording(e.player.x,e.player.y,'right',false);e.spawnEcho();
 for(const s of TUTORIAL_STEPS.filter(s=>s.track==='echo'&&s.id!=='echo.mark'&&s.id!=='echo.limits'))e.onboarding.done.add(s.id);stop.tick();e.armEchoMark();assert.equal(e.onboarding.done.has('echo.mark'),false);assert.ok(e.markEchoTarget({x:500,y:400}));assert.ok(e.onboarding.done.has('echo.mark'));assert.equal(e.echoMarkArmed,false);
});
