import test from 'node:test';
import assert from 'node:assert/strict';
import {ManaPool,COMBO_MP,comboManaCost,skillManaCost,maxMana} from './mana.ts';
import {heroStats,cleanHeroRanks,HERO_MAX_RANK} from './heroUpgrades.ts';
test('combo costs MP and an unaffordable hit spends nothing',()=>{const m=new ManaPool();for(const n of COMBO_MP.swordsman)assert.equal(m.spend(n),true);assert.equal(m.value,69);assert.equal(m.spend(70),false);assert.equal(m.value,69);assert.equal(m.spend(69),true);assert.equal(m.spend(0),true);assert.equal(m.value,0);});
test('mage has 120 MP for five casts; regen and switching heroes respect their capacity',()=>{
 let hero='mage';const mana=new ManaPool(()=>maxMana(hero));assert.equal(mana.value,120);
 for(let i=0;i<5;i++)assert.ok(mana.spend(skillManaCost(hero)));
 assert.equal(mana.value,0);assert.equal(mana.spend(skillManaCost(hero)),false);
 mana.update(100);assert.equal(mana.value,120);
 hero='swordsman';mana.reset();assert.equal(mana.max,100);assert.equal(mana.value,100);
 hero='mage';mana.reset();assert.equal(mana.value,120);
});
test('regeneration waits two seconds and restores five MP per second regardless of frame size',()=>{
 const mana=new ManaPool();mana.spend(50);
 mana.update(1);mana.update(1);assert.equal(mana.value,50);
 mana.update(1);assert.equal(mana.value,55);
 const other=new ManaPool();other.spend(50);other.update(3);assert.equal(other.value,mana.value);
 mana.update(100);assert.equal(mana.value,100);mana.reset();assert.equal(mana.value,100);
});
test('spending again restarts the regen delay, while free attacks let mana recover',()=>{
 const mana=new ManaPool();mana.spend(100);mana.update(6);
 assert.equal(mana.value,20,'One cooldown restores 20 MP after the regen delay');
 assert.equal(mana.spend(10),true);
 mana.update(1);assert.equal(mana.spend(0),true);
 mana.update(1);assert.equal(mana.value,10);
 mana.update(2);assert.equal(mana.value,20);
});
test('Aeris can cast two complete ranged combos and still has 28 MP',()=>{
 const sum=(h:'mage'|'swordsman')=>COMBO_MP[h].reduce((a:number,b:number)=>a+b,0);
 assert.equal(sum('mage'),36);assert.equal(sum('swordsman'),31);
 assert.deepEqual([skillManaCost('mage'),skillManaCost('swordsman')],[24,30]);
 const m=new ManaPool();for(let c=0;c<2;c++)for(let s=0;s<4;s++)assert.equal(m.spend(comboManaCost('mage',s)),true);
 assert.equal(m.value,28);assert.ok(m.spend(comboManaCost('mage',1)));assert.ok(m.spend(comboManaCost('mage',2)));
 assert.equal(m.spend(comboManaCost('mage',3)),false);
 assert.equal(comboManaCost('mage',9),0,'past the last hit: free, never NaN');
});
test('mage can cast four skills from full mana and all upgrades retain a positive, decreasing cost',()=>{
 const mana=new ManaPool();for(let i=0;i<4;i++)assert.ok(mana.spend(skillManaCost('mage')));
 assert.equal(mana.value,4);assert.equal(mana.spend(skillManaCost('mage')),false);
 let previous=25;
 for(let rank=0;rank<=HERO_MAX_RANK;rank++){
  const cost=skillManaCost('mage')-heroStats('mage',cleanHeroRanks({mage:rank})).skillManaDiscount;
  assert.ok(cost<previous);assert.ok(cost>=12);previous=cost;
 }
 assert.equal(previous,12);
});
