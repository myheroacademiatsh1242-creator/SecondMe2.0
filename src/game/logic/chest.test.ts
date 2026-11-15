import {puzzleBalance} from './balance.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Campaign} from './campaign.ts';
import {COMMON_CHEST_POOL,chestPool,CHEST_POOL,CHEST_PRICES,CURRENCY_RARITY,chestCurrencyName,rollChest} from './chest.ts';
import {GameEngine} from '../GameEngine.ts';

test('common chest charges 20 / 200 coins with zero crystals and credits each reward once',()=>{
 for(const count of [1,10] as const){
  const c=new Campaign();c.coins=count*20;c.chestKeys=0;
  const rewards=c.openChest(count,()=>.99,'wood');
  assert.equal(rewards?.length,count);assert.equal(c.coins,0);assert.equal(c.chestKeys,0);
  assert.equal(c.timeItems,count);
 }
});
test('common chest rejects insufficient coins even with crystals; never funds a draw from future rewards',()=>{
 for(const [count,coins] of [[1,0],[1,19],[10,199]] as const){
  const c=new Campaign();c.coins=coins;c.chestKeys=99999;
  const before=JSON.stringify(c);let rolled=false;
  assert.equal(c.openChest(count,()=>{rolled=true;return .99;},'wood'),null);
  assert.equal(JSON.stringify(c),before);assert.equal(rolled,false);
 }
});
test('coin rewards add to the balance only after common chest payment',()=>{
 const c=new Campaign();c.coins=20;c.chestKeys=37;
 assert.deepEqual(c.openChest(1,()=>0,'wood'),['coins1']);
 assert.equal(c.coins,1);assert.equal(c.chestKeys,37);
});
test('royal chest still charges regular crystals and rejects coins as a substitute',()=>{
 for(const kind of ['royal'] as const){
  const c=new Campaign();c.coins=99999;c.chestKeys=0;
  assert.equal(c.openChest(1,()=>.99,kind),null);
  c.chestKeys=55;
  assert.equal(c.openChest(1,()=>.99,kind)?.length,1);
  assert.equal(c.openChest(10,()=>.99,kind)?.length,10);
  assert.equal(c.chestKeys,0);assert.equal(c.coins,99999);
 }
});
test('engine forwards the selected chest type and still enforces the shop boundary',()=>{
 const engine=new GameEngine();engine.campaign.coins=200;engine.campaign.chestKeys=0;
 assert.equal(engine.openChest(10,'wood'),null);
 engine.screen='shop';assert.equal(engine.openChest(10,'wood')?.length,10);
 assert.ok(engine.campaign.chestKeys>=0);
});
test('100 equally spaced rolls yield the published probabilities',()=>{
 assert.equal(CHEST_POOL.reduce((sum,item)=>sum+item.weight,0),100);
 const results=Array.from({length:100},(_,i)=>rollChest(()=>(i+.5)/100));
 for(const item of CHEST_POOL)assert.equal(results.filter(id=>id===item.id).length,item.weight);
});
test('x1 and x10 charge keys once and credit every reward once',()=>{
 const c=new Campaign();c.chestKeys=55;c.coins=100;
 assert.deepEqual(c.openChest(1,()=>.99),['revive']);assert.equal(c.supplies.revive,1);assert.equal(c.chestKeys,50);assert.equal(c.coins,100);
 const sequence=[0,.4,.55,.64,.70,.78,.84,.99,0,.4];let i=0;
 assert.equal(c.openChest(10,()=>sequence[i++])?.length,10);
 assert.equal(c.chestKeys,0);assert.equal(c.coins,270);assert.equal(c.timeItems,1);
 assert.equal(c.supplies.healSmall,1);assert.equal(c.supplies.healLarge,1);assert.equal(c.supplies.revive,2);assert.equal(c.limitRings,0);
 const before=JSON.stringify(c);assert.equal(c.openChest(1),null);assert.equal(JSON.stringify(c),before);
});
test('keys and awarded rewards survive reload; old saves start with zero keys',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let data='{}';
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>data,setItem:(_key:string,value:string)=>{data=value;}}});
 t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 const c=new Campaign();c.load();assert.equal(c.chestKeys,0);c.chestKeys=10;c.openChest(1,()=>.99);
 const loaded=new Campaign();loaded.load();assert.equal(loaded.chestKeys,5);assert.equal(loaded.supplies.revive,1);assert.deepEqual(loaded.lastChestRewards,['revive']);
});
test('trail stars award 5, 4, 3 keys; boss awards 3–5 independently of rating',()=>{
 const c=new Campaign();
 assert.equal(c.completeLevel(1,0).commonCrystals,5);
 assert.equal(c.completeLevel(1,10000).commonCrystals,0);
 assert.equal(c.completeLevel(6,10000,()=>0).commonCrystals,3);
 assert.equal(c.completeLevel(6,0,()=>.5).commonCrystals,4);
 assert.equal(c.completeLevel(6,0,()=>.99).commonCrystals,5);
 const target=puzzleBalance(1).threeStars;
 assert.equal(c.completeLevel(1,target*1.1).commonCrystals,4);
 assert.equal(c.completeLevel(1,target*1.5).commonCrystals,3);
 assert.equal(c.chestKeys,24);
});

test('Imperial chest stays locked even with sufficient white crystals',()=>{
 for(const count of [1,10] as const){
  const c=new Campaign();c.coins=99999;c.chestKeys=99999;c.whiteCrystals=count*5-1;
  const before=JSON.stringify(c);assert.equal(c.openChest(count,()=>.99,'platinum'),null);assert.equal(JSON.stringify(c),before);
  c.whiteCrystals=count*5;
  assert.equal(c.openChest(count,()=>.99,'platinum'),null);
  assert.equal(c.whiteCrystals,count*5);assert.equal(c.coins,99999);assert.equal(c.chestKeys,99999);
 }
});
test('white crystals cannot pay for any other chest and have no normal reward source',()=>{
 const c=new Campaign();c.whiteCrystals=99999;
 for(const kind of ['wood','royal','crystal'] as const)assert.equal(c.openChest(1,()=>.99,kind),null);
 for(const id of [1,6,13])c.completeLevel(id,0,()=>.99);
 c.openChest(1,()=>.99,'royal');c.coins=200;c.openChest(10,()=>.99,'wood');
 assert.equal(c.whiteCrystals,99999);
});
test('white crystals migrate to zero, reject invalid saved values, persist balances, and reset with the campaign',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let data='{}';
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>data,setItem:(_key:string,value:string)=>{data=value;}}});
 t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 for(const value of [undefined,-1,'100',1.5,null]){
  data=JSON.stringify({whiteCrystals:value});const c=new Campaign();c.load();assert.equal(c.whiteCrystals,0);
 }
 const c=new Campaign();c.whiteCrystals=60;c.coins=20;c.chestKeys=5;c.save();c.openChest(10,()=>.99,'platinum');
 const restored=new Campaign();restored.load();assert.equal(restored.whiteCrystals,60);assert.equal(restored.chestKeys,5);assert.equal(restored.coins,20);
 restored.reset();assert.equal(restored.whiteCrystals,0);
});

test('both energy potions drop and credit inventory independently',()=>{
 const c=new Campaign();c.chestKeys=10;
 assert.deepEqual(c.openChest(1,()=>.90,'royal'),['manaSmall']);
 assert.deepEqual(c.openChest(1,()=>.95,'royal'),['manaLarge']);
 assert.equal(c.supplies.manaSmall,1);assert.equal(c.supplies.manaLarge,1);
});

test('Peerless chest stays locked even with sufficient mystic crystals',()=>{
 for(const count of [1,10] as const){
  const c=new Campaign();c.coins=99999;c.chestKeys=99999;c.whiteCrystals=99999;c.mysticCrystals=count*5-1;
  const before=JSON.stringify(c);let rolled=false;
  assert.equal(c.openChest(count,()=>{rolled=true;return .99},'crystal'),null);assert.equal(JSON.stringify(c),before);assert.equal(rolled,false);
  c.mysticCrystals=count*5;assert.equal(c.openChest(count,()=>.99,'crystal'),null);
  assert.equal(c.mysticCrystals,count*5);assert.equal(c.coins,99999);assert.equal(c.chestKeys,99999);assert.equal(c.whiteCrystals,99999);
 }
});
test('mystic crystals cannot pay for other chests and cannot be gained via levels or chest rewards',()=>{
 const c=new Campaign();c.mysticCrystals=99999;
 for(const kind of ['wood','royal','platinum'] as const)assert.equal(c.openChest(1,()=>.99,kind),null);
 for(const id of [1,6,13])c.completeLevel(id,0,()=>.99);
 c.openChest(1,()=>.99,'royal');c.coins=200;c.openChest(10,()=>.99,'wood');
 assert.equal(c.mysticCrystals,99999);
});
test('mystic crystals default to zero for old or invalid saves and persist balances and reset',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let data='{}';
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>data,setItem:(_key:string,value:string)=>{data=value;}}});
 t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 for(const value of [undefined,-1,'100',1.5,null]){data=JSON.stringify({mysticCrystals:value});const c=new Campaign();c.load();assert.equal(c.mysticCrystals,0);}
 const c=new Campaign();c.mysticCrystals=60;c.coins=20;c.chestKeys=5;c.whiteCrystals=7;c.save();c.openChest(10,()=>.99,'crystal');
 const loaded=new Campaign();loaded.load();assert.equal(loaded.mysticCrystals,60);assert.equal(loaded.whiteCrystals,7);assert.equal(loaded.chestKeys,5);assert.equal(loaded.coins,20);
 loaded.reset();assert.equal(loaded.mysticCrystals,0);
});


test('all campaign levels award common crystals and preserve legacy saved balance',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let data=JSON.stringify({chestKeys:42});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>data,setItem:(_key:string,value:string)=>{data=value;}}});
 t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));
 const c=new Campaign();c.load();assert.equal(c.chestKeys,42);
 for(let level=1;level<=13;level++){
  const previous:number=c.chestKeys;const reward=c.completeLevel(level,0,()=>0);
  assert.equal(reward.commonCrystals,level===6||level===13?3:5);
  assert.equal(c.chestKeys,previous+reward.commonCrystals);
 }
 const restored=new Campaign();restored.load();assert.equal(restored.chestKeys,c.chestKeys);
 assert.equal(restored.whiteCrystals,0);assert.equal(restored.mysticCrystals,0);
});

test('currencies have the requested rarities and crystal names',()=>{
 assert.deepEqual(CURRENCY_RARITY,{coins:'common',commonCrystals:'common',whiteCrystals:'deluxe',mysticCrystals:'bespoke'});
 assert.equal(chestCurrencyName(CHEST_PRICES.royal.currency,true),'Tanuki phàm tinh thể');
 assert.equal(chestCurrencyName(CHEST_PRICES.platinum.currency,true),'Tanuki thanh tinh thể');
 assert.equal(chestCurrencyName(CHEST_PRICES.crystal.currency,true),'Tanuki huyền tinh thể');
 for(const item of CHEST_POOL.filter(item=>item.id.startsWith('coins')))assert.notEqual(item.tier,'fire');
});

 test('common pool probabilities and all reward credits match the selected chest',()=>{
 assert.equal(COMMON_CHEST_POOL.reduce((sum,item)=>sum+item.weight,0),100);
 let cumulative=0;
 for(const item of COMMON_CHEST_POOL){
  const roll=(cumulative+item.weight/2)/100;cumulative+=item.weight;
  const c=new Campaign();c.coins=20;
  assert.deepEqual(c.openChest(1,()=>roll,'wood'),[item.id]);
  if(item.id.startsWith('coins'))assert.equal(c.coins,Number(item.id.slice(5)));
  else if(item.id.startsWith('commonCrystals'))assert.equal(c.chestKeys,Number(item.id.slice('commonCrystals'.length)));
  else if(item.id==='time')assert.equal(c.timeItems,1);
  else assert.equal(c.supplies.manaSmall,1);
 }
 assert.deepEqual(chestPool('royal'),CHEST_POOL);
 for(const kind of ['platinum','crystal'] as const){
  assert.deepEqual(chestPool(kind),[]);
  for(const count of [1,10] as const){const c=new Campaign();c.whiteCrystals=c.mysticCrystals=99999;const before=JSON.stringify(c);let rolled=false;assert.equal(c.openChest(count,()=>{rolled=true;return 0;},kind),null);assert.equal(JSON.stringify(c),before);assert.equal(rolled,false);}
 }
 });
