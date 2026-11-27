import test from 'node:test';
import assert from 'node:assert/strict';
import {rollClawReward,CLAW_COINS} from './clawRewards.ts';
import {SHOP_ITEMS} from './shopItems.ts';
import {SHOP_OUTFITS} from './outfits.ts';
import {Campaign} from './campaign.ts';

test('all coin boundaries and common items can be awarded',()=>{
 const coins=new Set(),items=new Set();
 for(let i=0;i<10000;i++){
  coins.add(rollClawReward(0,[],()=>i/10000)!.quantity);
  const reward=rollClawReward(1,[],()=>i/10000)!;
  assert.equal(reward.quantity,1);
  if(reward.type==='item')items.add(reward.id);
 }
 assert.deepEqual([...coins],CLAW_COINS);
 assert.deepEqual(items,new Set(SHOP_ITEMS.filter(i=>i.rarity==='common').map(i=>i.id)));
});
test('candy quantities remain in 1..10 and penguins include every reward category',()=>{
 const kinds=new Set();let seed=23;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<20000;i++){
  const candy=rollClawReward(2,[],random)!;
  assert.ok(candy.quantity>=1&&candy.quantity<=10);
  assert.ok(['item','tickets'].includes(candy.type));
  const reward=rollClawReward(3,[],random)!;
  kinds.add(reward.type);
 }
 assert.deepEqual(kinds,new Set(['coins','crystals','item','tickets','outfit']));
});
test('owned outfits and full stock exchange safely without exceeding caps',()=>{
 const outfit=rollClawReward(3,SHOP_OUTFITS.map(o=>o.id),()=>.87);
 assert.deepEqual(outfit,{type:'crystals',quantity:10});
 const c=new Campaign();c.supplies.manaSmall=99;c.coins=0;
 const rolls=[.9,.6,0,0];
 assert.deepEqual(c.claimClawPrize(3,()=>rolls.shift()!)?.catalogue,{type:'coins',quantity:1});
 assert.equal(c.coins,1);assert.equal(c.supplies.manaSmall,99);
 assert.equal(c.claimClawPrize(4),null);
 assert.throws(()=>rollClawReward(0,[],()=>1),RangeError);
});
