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
 assert.deepEqual(ids([]),['default','woodland','frost','ember','amethyst','rose','sand','turquoise','snowman']);
 assert.deepEqual(ids(['mage-ember']),['default','woodland','ember','frost','amethyst','rose','sand','turquoise','snowman']);
 assert.deepEqual(ids(['mage-ember','mage-frost']),['default','frost','woodland','ember','amethyst','rose','sand','turquoise','snowman']);
});

test("Crimson's Christmas outfit is locked outside the Christmas season", () => {
 assert.equal(canWearOutfit('assassin','frost',[]),false);
 assert.equal(canWearOutfit('assassin','frost',[],true),false);
 assert.equal(canWearOutfit('assassin','frost',[],true,true),true);
 assert.equal(canWearOutfit('assassin','default',[]),true);
});

test('Christmas Deluxe unlocks both hero-specific outfits through participation or DEV',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');});

 const g=new GameEngine();
 g.screen='characters';
 assert.equal(g.setCharacterOutfit('mage','snowman'),false);
 g.devUnlocked=true;
 g.setDevSeasonPreview('none');
 assert.equal(g.setCharacterOutfit('mage','snowman'),false);
 assert.equal(g.setCharacterOutfit('swordsman','reindeer'),false);
 g.setDevSeasonPreview('christmas');
 assert.equal(g.setCharacterOutfit('mage','snowman'),true);
 assert.equal(g.setCharacterOutfit('swordsman','reindeer'),true);
 assert.equal(g.setCharacterOutfit('mage','reindeer'),false);
 assert.deepEqual(g.campaign.ownedNoelSkins,[]);
 g.devUnlocked=false;
 g.campaign.ownedNoelSkins=['mage','swordsman'];
 g.campaign.save();
 const saved=new Campaign();saved.load();
 assert.deepEqual(saved.ownedNoelSkins,['mage','swordsman']);
 for(const [hero,id] of [['swordsman','reindeer'],['mage','snowman']] as const){
  assert.equal(canWearOutfit(hero,id,[],false,saved.ownedNoelSkins.includes(hero)),false);
  assert.equal(canWearOutfit(hero,id,[],true,saved.ownedNoelSkins.includes(hero)),true);
 }
});

test('seven new colours are Common purchases, restricted to their hero',()=>{
 const c=new Campaign();
 c.coins=420;
 const added=SHOP_OUTFITS.filter(o=>!['frost','ember'].includes(o.outfit));
 assert.equal(added.filter(o=>o.hero==='mage').length,4);
 assert.equal(added.filter(o=>o.hero==='swordsman').length,3);
 for(const outfit of added){
  assert.equal(outfit.rarity,'common');assert.equal(outfit.price,60);
  assert.equal(canWearOutfit(outfit.hero,outfit.outfit,c.ownedOutfits),false);
  assert.equal(c.buyOutfit(outfit.id),true);
  assert.equal(c.buyOutfit(outfit.id),false);
  assert.equal(canWearOutfit(outfit.hero,outfit.outfit,c.ownedOutfits),true);
 }
 assert.equal(c.coins,0);
 assert.equal(canWearOutfit('mage','slate',c.ownedOutfits),false);
 assert.equal(canWearOutfit('swordsman','rose',c.ownedOutfits),false);
});

test('seven new Common palettes require separate purchases for the correct hero',()=>{
 const c=new Campaign();
 const added=SHOP_OUTFITS.filter(p=>!['frost','ember'].includes(p.outfit));
 assert.equal(added.filter(p=>p.hero==='mage').length,4);
 assert.equal(added.filter(p=>p.hero==='swordsman').length,3);
 c.coins=added.length*60;
 for(const p of added){
  assert.equal(p.price,60);assert.equal(p.rarity,'common');
  assert.equal(canWearOutfit(p.hero,p.outfit,c.ownedOutfits),false);
  assert.equal(c.buyOutfit(p.id),true);
  assert.equal(canWearOutfit(p.hero,p.outfit,c.ownedOutfits),true);
  assert.equal(c.buyOutfit(p.id),false);
 }
 assert.equal(c.coins,0);
});
