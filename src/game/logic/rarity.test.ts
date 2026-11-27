import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRarity,normalizeRarity,normalizeCatalogue,rarityName,RARITIES,RARITY_ORDER} from './rarity.ts';
import {characterOutfitRarity} from './outfits.ts';
import {getRewardMeta,getRewardTier} from './chestHistory.ts';
import {SHOP_ITEMS} from './shopItems.ts';
test('five canonical tiers accept English, Vietnamese and legacy labels',()=>{
 assert.equal(Object.keys(RARITIES).length,5);
 for(const tier of RARITY_ORDER){
  for(const label of [tier,RARITIES[tier].vi,RARITIES[tier].vi+' ('+RARITIES[tier].en+')'])
   assert.equal(normalizeRarity(label),tier);
 }
 for(const label of ['LIMITED',' limited ','Giới Hạn','Epic'])assert.equal(normalizeRarity(label),'deluxe');
 assert.equal(normalizeRarity('Rare'),'refined');
 assert.equal(normalizeRarity('Legendary'),'deluxe');
 assert.equal(normalizeRarity(null),'common');
 assert.equal(rarityName('limited',true),'Thượng Hạng');
});
test('catalogues normalize before sorting, display and reward selection',()=>{
 const input=[{id:'new-outfit',rarity:'Limited',price:20}];
 assert.equal(normalizeCatalogue(input)[0].rarity,'refined');
 assert.equal(input[0].rarity,'Limited');
 assert.equal(characterOutfitRarity('assassin','frost'),'deluxe');
 for(const id of ['revive','healLarge','time','manaSmall'] as const){
  assert.equal(getRewardTier(id),SHOP_ITEMS.find(item=>item.id===id)!.rarity);
  assert.equal(getRewardMeta(id,true).tier,getRewardTier(id));
 }
});

test('acquisition limits take priority over labels and premium tiers require team setup',()=>{
 for(const tier of RARITY_ORDER){
  const rank=RARITY_ORDER.indexOf(tier);
  assert.equal(resolveRarity(tier,{coinPurchase:true}),RARITY_ORDER[Math.min(rank,1)]);
  assert.equal(resolveRarity(tier,{bulk:true}),RARITY_ORDER[Math.min(rank,1)]);
  assert.equal(resolveRarity(tier,{eventOnly:true}),RARITY_ORDER[Math.max(1,Math.min(rank,2))]);
  assert.equal(resolveRarity(tier,{loginOnly:true}),RARITY_ORDER[Math.max(1,Math.min(rank,2))]);
 }
 assert.equal(resolveRarity('ultimate'),'deluxe');
 assert.equal(resolveRarity('ultimate',{manualRarity:'ultimate'}),'ultimate');
 assert.equal(resolveRarity('ultimate',{manualRarity:'ultimate',bulk:true}),'refined');
 assert.equal(normalizeCatalogue([{rarity:'Limited',price:60}])[0].rarity,'refined');
 assert.ok(SHOP_ITEMS.every(item=>['common','refined'].includes(item.rarity)));
});
