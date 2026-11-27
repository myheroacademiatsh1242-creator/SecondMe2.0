import test from 'node:test';
import assert from 'node:assert/strict';
import {Campaign} from './campaign.ts';
import {canWearOutfit,cleanOwnedOutfits,orderedShopOutfits,orderedCharacterOutfits,SHOP_OUTFITS,type ShopOutfitId} from './outfits.ts';
import {GameEngine} from '../GameEngine.ts';
test('each intermediate costume costs exactly 60 and can be bought only once',()=>{
 const c=new Campaign();c.coins=120;
 assert.equal(c.buyOutfit('swordsman-frost'),true);assert.equal(c.coins,60);
 assert.equal(c.buyOutfit('swordsman-frost'),false);assert.equal(c.coins,60);
 assert.equal(c.buyOutfit('swordsman-ember'),true);assert.equal(c.coins,0);
 assert.deepEqual(c.ownedOutfits,['swordsman-frost','swordsman-ember']);
});
test('insufficient or invalid funds and unknown products never mutate the wallet',()=>{
 const c=new Campaign();for(const coins of [0,59,-1,NaN,Infinity,60.5]){c.coins=coins;assert.equal(c.buyOutfit('swordsman-frost'),false);assert.ok(Object.is(c.coins,coins));}
 c.coins=60;assert.equal(c.buyOutfit('forged' as ShopOutfitId),false);assert.equal(c.coins,60);assert.deepEqual(c.ownedOutfits,[]);
});
test('ownership is cleaned, saved, restored, and preserved when restarting the campaign',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');});
 const c=new Campaign();c.coins=120;c.buyOutfit('swordsman-frost');c.buyOutfit('swordsman-ember');const reloaded=new Campaign();reloaded.load();assert.equal(reloaded.coins,0);assert.deepEqual(reloaded.ownedOutfits,c.ownedOutfits);reloaded.reset();const reset=new Campaign();reset.load();assert.deepEqual(reset.ownedOutfits,c.ownedOutfits);
 assert.deepEqual(cleanOwnedOutfits(['swordsman-ember','swordsman-ember','default','invalid']),['swordsman-ember']);
});
test('paid costumes are restricted to owned swordsman outfits, independent of legacy palettes',()=>{
 assert.equal(canWearOutfit('swordsman','frost',[]),false);assert.equal(canWearOutfit('mage','frost',['swordsman-frost']),false);assert.equal(canWearOutfit('swordsman','frost',['swordsman-frost']),true);assert.equal(canWearOutfit('mage','woodland',[]),true);
});
test('engine enforces shop purchase and outfit equip boundaries',()=>{
 const e=new GameEngine();e.campaign.coins=120;e.campaign.ownedOutfits=[];e.screen='playing';assert.equal(e.buyOutfit('swordsman-frost'),false);assert.equal(e.setCharacterOutfit('swordsman','frost'),false);
 e.screen='shop';assert.equal(e.setCharacterOutfit('swordsman','frost'),false);assert.equal(e.buyOutfit('swordsman-frost'),true);assert.equal(e.setCharacterOutfit('mage','frost'),false);assert.equal(e.setCharacterOutfit('swordsman','frost'),true);assert.equal(e.buyOutfit('swordsman-frost'),false);assert.equal(e.campaign.coins,60);e.setCharacterOutfit('swordsman','default');
});

test('legacy Frostbound and Ember require separate purchases for each hero while Woodland stays gifted',()=>{
 const c=new Campaign();c.coins=240;
 for(const hero of ['mage','swordsman'] as const){
  assert.equal(canWearOutfit(hero,'default',c.ownedOutfits),true);
  assert.equal(canWearOutfit(hero,'woodland',c.ownedOutfits),true);
  assert.equal(canWearOutfit(hero,'frost',c.ownedOutfits),false);
  assert.equal(canWearOutfit(hero,'ember',c.ownedOutfits),false);
 }
 for(const id of ['mage-frost','mage-ember','swordsman-frost','swordsman-ember'] as const){assert.equal(c.buyOutfit(id),true);assert.equal(c.buyOutfit(id),false);}
 assert.equal(c.coins,0);
 for(const hero of ['mage','swordsman'] as const)for(const outfit of ['frost','ember'] as const)assert.equal(canWearOutfit(hero,outfit,c.ownedOutfits),true);
});

test('shop sorts outfits by rarity then ascending price regardless of ownership',()=>{
 const ids=(owned:Parameters<typeof orderedShopOutfits>[0])=>orderedShopOutfits(owned).map(o=>o.id);
 const catalogue=SHOP_OUTFITS.map(o=>o.id);
 assert.deepEqual(ids([]),catalogue);
 assert.deepEqual(ids(['swordsman-ember','mage-ember']),catalogue);
 assert.deepEqual(ids([...catalogue].reverse()),catalogue);
});

test('character wardrobe shows wearable outfits before locked outfits in added order',()=>{
 const ids=(owned:Parameters<typeof orderedShopOutfits>[0])=>orderedCharacterOutfits('mage',owned).map(o=>o.id);
 assert.deepEqual(ids([]),['default','woodland','frost','ember']);
 assert.deepEqual(ids(['mage-ember']),['default','woodland','ember','frost']);
 assert.deepEqual(ids(['mage-ember','mage-frost']),['default','frost','woodland','ember']);
});

test("Crimson's Christmas outfit is locked outside the Christmas season", () => {
 assert.equal(canWearOutfit('assassin','frost',[]),false);
 assert.equal(canWearOutfit('assassin','frost',[],true),true);
 assert.equal(canWearOutfit('assassin','default',[]),true);
});
