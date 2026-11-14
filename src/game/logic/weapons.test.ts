import test from 'node:test';
import assert from 'node:assert/strict';
import {RARITIES} from './rarity.ts';
import {Campaign} from './campaign.ts';
import {GameEngine} from '../GameEngine.ts';
import {PFX} from '../rendering/pixelfx.ts';
import {
 WEAPONS,DEFAULT_WEAPON,WEAPON_KEY,cleanOwnedWeapons,cleanWeapons,canUseWeapon,equipWeapon,getWeapon,restoreWeapons,weaponsOf,type WeaponHero,
} from './weapons.ts';

const withStorage=(t:test.TestContext)=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');restoreWeapons();});
 return data;
};

test('the catalogue is consistent: unique ids and samples, real rarities, real effects, Vietnamese and English names',()=>{
 assert.equal(new Set(WEAPONS.map(w=>w.id)).size,WEAPONS.length);
 assert.equal(new Set(WEAPONS.map(w=>w.sample)).size,WEAPONS.length);
 for(const w of WEAPONS){
  assert.ok(w.rarity in RARITIES,w.id);
  assert.ok(w.fx in PFX,`${w.id} uses a pixelfx sheet that is not in the repo: ${w.fx}`);
  assert.ok(w.vi&&w.en,w.id);
 }
});

test('each hero starts with exactly one common weapon, usable with nothing owned',()=>{
 for(const hero of ['mage','swordsman'] as WeaponHero[]){
  const mine=weaponsOf(hero),start=mine.find(w=>w.id===DEFAULT_WEAPON[hero]);
  assert.ok(start&&start.rarity==='common'&&start.trait==='none');
  assert.ok(mine.length>=7);
  assert.equal(canUseWeapon(hero,start.id,[]),true);
  for(const w of mine.filter(w=>w!==start))assert.equal(canUseWeapon(hero,w.id,[]),false,w.id);
 }
});

test('a weapon needs ownership and the right hero; unknown ids are refused',()=>{
 assert.equal(canUseWeapon('mage','staff-frost',['staff-frost']),true);
 assert.equal(canUseWeapon('swordsman','staff-frost',['staff-frost']),false);
 assert.equal(canUseWeapon('mage','forged',['forged']),false);
 assert.equal(canUseWeapon('mage',42,[]),false);
});

test('saved data is cleaned: duplicates, defaults, unknown ids and non-arrays drop out',()=>{
 assert.deepEqual(cleanOwnedWeapons(['staff-frost','staff-frost','wand-novice','nope',7]),['staff-frost']);
 assert.deepEqual(cleanOwnedWeapons('staff-frost'),[]);
 assert.deepEqual(cleanWeapons({mage:'sword-rusted',swordsman:'katana-frost'}),{mage:'wand-novice',swordsman:'katana-frost'});
 assert.deepEqual(cleanWeapons(null),{...DEFAULT_WEAPON});
});

test('equipping is saved and restored, and refuses weapons the hero cannot use',t=>{
 const data=withStorage(t);
 assert.equal(equipWeapon('mage','staff-frost',[]),false);
 assert.equal(getWeapon('mage').id,DEFAULT_WEAPON.mage);
 assert.equal(equipWeapon('mage','staff-frost',['staff-frost']),true);
 assert.equal(getWeapon('mage').id,'staff-frost');
 assert.equal(JSON.parse(data.get(WEAPON_KEY)!).mage,'staff-frost');
 assert.equal(restoreWeapons().mage,'staff-frost');
 data.set(WEAPON_KEY,'{broken');
 assert.deepEqual(restoreWeapons(),{...DEFAULT_WEAPON});
});

test('owned weapons are saved with the campaign, and cleaned on load',t=>{
 const data=withStorage(t);
 const c=new Campaign();c.ownedWeapons=['staff-frost','blade-flame'];c.save();
 const saved=JSON.parse(data.get('second-me-campaign-v3')!);saved.ownedWeapons=['staff-frost','staff-frost','wand-novice','forged'];data.set('second-me-campaign-v3',JSON.stringify(saved));
 const loaded=new Campaign();loaded.load();assert.deepEqual(loaded.ownedWeapons,['staff-frost']);
});

test('the engine only changes weapons on the hero screens and only to owned ones; developer unlock grants them all',t=>{
 withStorage(t);
 const e=new GameEngine();e.campaign.ownedWeapons=['staff-frost'];
 e.screen='playing';assert.equal(e.setCharacterWeapon('mage','staff-frost'),false);
 e.screen='characters';
 assert.equal(e.setCharacterWeapon('mage','staff-lightning'),false);
 assert.equal(e.setCharacterWeapon('swordsman','staff-frost'),false);
 assert.equal(e.setCharacterWeapon('mage','staff-frost'),true);
 e.unlockDevMode();
 assert.equal(canUseWeapon('swordsman','sword-caliburn',e.campaign.ownedWeapons),true);
 assert.equal(canUseWeapon('mage','staff-archmage',e.campaign.ownedWeapons),true);
});
