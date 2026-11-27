import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRarity,normalizeCatalogue,rarityName,RARITIES,RARITY_ORDER} from './rarity.ts';
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
 assert.equal(normalizeRarity('Legendary'),'ultimate');
 assert.equal(normalizeRarity(null),'common');
 assert.equal(rarityName('limited',true),'Thượng Hạng');
});
test('catalogues normalize before sorting, display and reward selection',()=>{
 const input=[{id:'new-outfit',rarity:'Limited',price:20}];
 assert.equal(normalizeCatalogue(input)[0].rarity,'deluxe');
 assert.equal(input[0].rarity,'Limited');
 assert.equal(characterOutfitRarity('assassin','frost'),'deluxe');
 for(const id of ['revive','healLarge','time','manaSmall'] as const){
  assert.equal(getRewardTier(id),SHOP_ITEMS.find(item=>item.id===id)!.rarity);
  assert.equal(getRewardMeta(id,true).tier,getRewardTier(id));
 }
});
