import test from 'node:test';
import assert from 'node:assert/strict';
import {sortShopCatalogue} from './rarity.ts';
import {SHOP_ITEMS} from './shopItems.ts';
import {orderedShopOutfits,SHOP_OUTFITS} from './outfits.ts';

test('sort groups rarity low to high and sorts prices ascending within each rarity, without mutation',()=>{
 const source=[{id:'rare-cheap',rarity:'refined',price:1},{id:'common-cheap',rarity:'common',price:1},{id:'rare-expensive',rarity:'refined',price:100},{id:'common-expensive',rarity:'common',price:30},{id:'ultimate',rarity:'ultimate',price:0}] as const;
 assert.deepEqual(sortShopCatalogue(source).map(x=>x.id),['common-cheap','common-expensive','rare-cheap','rare-expensive','ultimate']);
 assert.equal(source[0].id,'rare-cheap');
});
test('current item and outfit catalogues follow the requested ordering',()=>{
 assert.deepEqual(sortShopCatalogue(SHOP_ITEMS.filter(x=>x.id!=='aid')).map(x=>x.id),['manaSmall','time','healSmall','healLarge','manaLarge','ring','revive','chances']);
 const expected=SHOP_OUTFITS.map(x=>x.id);
 assert.deepEqual(orderedShopOutfits(['mage-ember']).map(x=>x.id),expected);
});
