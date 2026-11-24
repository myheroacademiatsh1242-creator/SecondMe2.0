import {getCharacterBoundingBox,rectIntersects} from './collision.ts';
import type {GameEngine} from '../GameEngine.ts';
import type {TutorialContext} from './interactiveTutorial.ts';
import {TUTORIAL_STEPS} from './interactiveTutorial.ts';
import {ECHO_RUNES} from './echoRunes.ts';
/** All completion signals below follow real state changes or successful return values. */
export function connectTutorial(engine:GameEngine,touch=false){
 const tutorial=engine.onboarding;
 const ui={chestOpen:false,chestAvailable:true,chestRates:false,chestRewards:false,shopConfirm:false,heroUpgrade:false,resetOpen:false};
 const internals=engine as unknown as Record<string,any>;
 const context=():TutorialContext=>({screen:engine.screen,level:engine.currentLevel.id,completed:[...engine.campaign.completed],touch,finalGateCrossed:engine.finalGateCrossed,
  recording:engine.recorder.getStatus()==='recording',recordReady:engine.recorder.getSamples().length>1,
  echoes:engine.echoes.length,canSummon:engine.echoes.length<engine.echoLimit&&(engine.echoCharges>0||internals.echoFreeSummon),
  canSwap:!!engine.echo&&internals.swapCooldown<=0&&(engine.echo.stability??100)>=(engine.activeEchoRunes.has('swap')?15:30),
  canSkill:engine.skillCooldown<=0&&engine.mana.value>=internals.personalSkillManaCost,
  canDodge:engine.dodgeCooldown<=0&&(!!engine.boss||engine.enemies.some(e=>e.hp>0)),canUltimate:engine.hasUltimate&&engine.rage.value>=100,
  canTime:engine.canUseTimeItem(),canItem:[0,1,2].some(i=>engine.canUseCarriedItem(i)),
  pendingRuneReward:engine.campaign.pendingRuneChoices.length>0,hasRunes:ECHO_RUNES.some(r=>(engine.campaign.echoRunes[r.id]??0)>0),canRune:ECHO_RUNES.some(r=>engine.canUseEchoRune(r.id)),
  runeEditing:engine.runeEditing,inventory:engine.inventoryOpen,preparing:!!internals.pendingBattleStart,
  guide:engine.guides.libraryOpen,...ui});
 const update=()=>tutorial.update(context());
 // Local view state is explicit, so closed dialogs never leave a stale spotlight.
 engine.tutorialUI=(patch)=>{Object.assign(ui,patch);update();};
 const restores:(()=>void)[]=[];
 const wrap=(name:string,event:string,success:(before:any,after:any,result:any,args:any[])=>boolean,read:()=>any)=>{
  const original=internals[name];
  internals[name]=function(...args:any[]){update();const ticket=tutorial.active;const before=read();const result=original.apply(this,args);if(success(before,read(),result,args))tutorial.event(event,ticket);update();return result;};
  restores.push(()=>{internals[name]=original;});
 };
 const booleanResult=(_a:any,_b:any,result:any)=>result===true;
 for(const [name,event] of Object.entries({buyShopItem:'purchase',packItem:'pack-add',unpackItem:'pack-remove',chooseRune:'rune-reward',useEchoRune:'rune-use',useTimeItem:'time-use',useCarriedItem:'item-use',useSupply:'item-use',markEchoTarget:'echo-mark',markTarget:'echo-mark',buyHeroUpgrade:'upgrade-buy',resetHeroUpgrades:'upgrade-reset-close'}))wrap(name,event,booleanResult,()=>null);
 const supply=engine.useSupply.bind(engine);engine.useSupply=(id)=>{update();const ticket=tutorial.active;const ok=supply(id);if(ok&&id==='revive')tutorial.event('defeat-choice',ticket);update();return ok;};restores.push(()=>{engine.useSupply=supply;});
 wrap('setPackedCount','pack-quantity',(a,b,r)=>r===true&&a!==b,()=>JSON.stringify(engine.campaign.itemLoadout));
 wrap('setRuneSlot','rune-equip',(_a,_b,r,args)=>r===true&&args[1]!==null,()=>null);
 // Clearing has a distinct signal and never spends stock.
 const originalSlot=engine.setRuneSlot.bind(engine);engine.setRuneSlot=(slot,id)=>{update();const ticket=tutorial.active;const ok=originalSlot(slot,id);if(ok&&id===null)tutorial.event('rune-clear',ticket);update();return ok;};restores.push(()=>{engine.setRuneSlot=originalSlot;});
 wrap('requestBattleRetry','defeat-choice',(a,b)=>a!==b,()=>engine.screen+':'+!!internals.pendingBattleStart);
 wrap('goToLobby','defeat-choice',(a,b)=>a==='defeat'&&b==='lobby',()=>engine.screen);
 wrap('openShop','shop-open',(a,b)=>a!=='shop'&&b==='shop',()=>engine.screen);
 wrap('pauseGame','pause-menu',(a,b)=>a==='playing'&&b==='paused',()=>engine.screen);
 wrap('setInventoryOpen','inventory-open',(a,b)=>!a&&b,()=>engine.inventoryOpen);
 const originalInventory=engine.setInventoryOpen.bind(engine);engine.setInventoryOpen=(open)=>{update();const ticket=tutorial.active;const before=engine.inventoryOpen;originalInventory(open);if(before&&!open)tutorial.event('inventory-close',ticket);update();};restores.push(()=>{engine.setInventoryOpen=originalInventory;});
 wrap('setRuneEditing','rune-edit',(a,b)=>!a&&b,()=>engine.runeEditing);
 const originalEditing=engine.setRuneEditing.bind(engine);engine.setRuneEditing=(open)=>{update();const ticket=tutorial.active;const before=engine.runeEditing;originalEditing(open);if(before&&!open)tutorial.event('rune-close',ticket);update();};restores.push(()=>{engine.setRuneEditing=originalEditing;});
 wrap('toggleRecording','record-start',(a,b)=>a!=='recording'&&b==='recording',()=>engine.recorder.getStatus());
 const originalRecord=engine.toggleRecording.bind(engine);engine.toggleRecording=()=>{update();const ticket=tutorial.active;const before=engine.recorder.getStatus();originalRecord();if(before==='recording'&&engine.recorder.getStatus()!=='recording'&&engine.recorder.getSamples().length>1)tutorial.event('record-save',ticket);update();};restores.push(()=>{engine.toggleRecording=originalRecord;});
 wrap('spawnEcho','echo-summon',(a,b)=>b>a,()=>engine.echoes.length);
 wrap('dismissEcho','echo-recall',(a,b)=>b<a,()=>engine.echoes.length);
 wrap('pauseEcho','echo-pause',(a,b)=>a!==b&&!!b,()=>engine.echo?.status);
 wrap('swapEcho','echo-swap',(a,b)=>b>a,()=>internals.swapCooldown);
 wrap('useSkill','skill',(a,b)=>b>a,()=>engine.skillCooldown);
 wrap('dodge','dodge',(a,b)=>b>a,()=>engine.dodgeCooldown);
 wrap('useUltimate','ultimate',(a,b)=>b<a,()=>engine.rage.value);
 wrap('attack','attack',(a,b)=>b>a,()=>engine.attackCooldown);
 wrap('startComboHit','combo',(a,b,_r,args)=>args[0]>=1&&b<a,()=>engine.mana.value);
 // The first combo hit is also a successful attack (a buffered button press is not).
 const startHit=internals.startComboHit;internals.startComboHit=function(step:number){update();const ticket=tutorial.active;const before=engine.mana.value;startHit.call(this,step);if(engine.mana.value<before)tutorial.event('attack',ticket);update();};restores.push(()=>{internals.startComboHit=startHit;});
 wrap('confirmBattleStart','battle-start',(a,b)=>a&&!b,()=>!!internals.pendingBattleStart);
 wrap('selectClass','hero-confirm',(_a,_b,_r,args)=>(engine.screen==='characters'||engine.screen==='lobby')&&engine.characterClass===args[0],()=>null);
 wrap('openChest','chest-draw',(_a,_b,r,args)=>Array.isArray(r)&&r.length===1&&args[1]==='royal',()=>null);
 let anchor={x:engine.player.x,y:engine.player.y};let lastStep='';let oldCompleted=engine.campaign.completed.length;let oldAim=internals.cursorTarget?{...internals.cursorTarget}:null;
 const tick=()=>{
  if(engine.campaign.completed.length>oldCompleted){tutorial.event('level-clear',TUTORIAL_STEPS.find(s=>s.id==='combat.finish'));oldCompleted=engine.campaign.completed.length;}
  update();const active=tutorial.active;if(active?.id!==lastStep){lastStep=active?.id??'';anchor={x:engine.player.x,y:engine.player.y};}
  if(engine.screen==='playing'&&!engine.inventoryOpen&&!engine.runeEditing&&!engine.orientationBlocked&&!engine.bossIntroduction){
   if(Math.hypot(engine.player.x-anchor.x,engine.player.y-anchor.y)>=24){tutorial.event('move');if(engine.recorder.getStatus()==='recording')tutorial.event('record-move');if(touch)tutorial.event('aim');anchor={x:engine.player.x,y:engine.player.y};}
   if(engine.mouseAimAngle!==null&&internals.cursorTarget){const aim=internals.cursorTarget;if(oldAim&&Math.hypot(aim.x-oldAim.x,aim.y-oldAim.y)>4)tutorial.event('aim');oldAim={...aim};}
   if(engine.echoes.some(e=>engine.currentLevel.plates.some(p=>p.isPressed&&!p.wardLocked&&rectIntersects(getCharacterBoundingBox(e.x,e.y,24,24),p))&&Math.hypot(engine.player.x-e.x,engine.player.y-e.y)>36))tutorial.event('echo-hold');
  }
  if(engine.campaign.completed.length>oldCompleted){tutorial.event('level-clear');oldCompleted=engine.campaign.completed.length;}
  if(engine.campaign.completed.includes(1)&&!engine.campaign.tutorialWelcomeClaimed&&!tutorial.disabled){engine.campaign.grantTutorialWelcome();internals.showBanner('Shop & Rương đã mở khóa · +12 xu · +15 phàm tinh thể',6);engine.notifyTutorialHUD();}
 };
 const timer=setInterval(tick,100);update();
 return Object.assign(()=>{clearInterval(timer);for(const restore of restores.reverse())restore();engine.tutorialUI=()=>{};},{tick});
}
