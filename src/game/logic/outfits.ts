import {normalizeCatalogue,resolveRarity} from './rarity.ts';
import {sortShopCatalogue,type Rarity} from './rarity.ts';

export type OutfitHero='mage'|'swordsman'|'assassin';
export type OutfitId='default'|'frost'|'woodland'|'ember'|'reindeer'|'snowman';
export const OUTFITS=[
 {id:'default',vi:'Nguyên bản',en:'Original',color:'#e2c585'},
 {id:'frost',vi:'Băng giá',en:'Frostbound',color:'#8cdef1'},
 {id:'woodland',vi:'Rừng xanh',en:'Woodland',color:'#9bd18a'},
 {id:'ember',vi:'Than hồng',en:'Ember',color:'#edaa7e'},
] as const;
export const CHRISTMAS_DELUXE = {
 swordsman:{id:'reindeer',vi:'Tuần lộc Giáng Sinh',en:'Christmas Reindeer',color:'#b579e8'},
 mage:{id:'snowman',vi:'Người tuyết may mắn',en:'Lucky Snowman',color:'#b579e8'},
} as const;
export function isDeluxe(id:unknown){return id==='reindeer'||id==='snowman';}
export const OUTFIT_KEY='second-me-outfits-v1';
export function cleanOutfits(value:unknown):Record<OutfitHero,OutfitId>{
 const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const valid=(id:unknown):OutfitId=>OUTFITS.some(o=>o.id===id)?id as OutfitId:'default';
 return{mage:raw.mage==='snowman'?'snowman':valid(raw.mage),swordsman:raw.swordsman==='reindeer'?'reindeer':valid(raw.swordsman),assassin:raw.assassin==='frost'?'frost':'default'};
}
let equipped:Record<OutfitHero,OutfitId>={mage:'default',swordsman:'default',assassin:'default'};
export function restoreOutfits(){try{equipped=cleanOutfits(JSON.parse(localStorage.getItem(OUTFIT_KEY)??'{}'));}catch{equipped=cleanOutfits(null);}try{localStorage.setItem(OUTFIT_KEY,JSON.stringify(equipped));}catch{}return{...equipped};}
export const getOutfit=(hero:OutfitHero)=>equipped[hero];
export const getOutfits=()=>({...equipped});
export function equipOutfit(hero:OutfitHero,id:OutfitId){if(!['mage','swordsman','assassin'].includes(hero)||(!OUTFITS.some(o=>o.id===id)&&(hero==='assassin'||CHRISTMAS_DELUXE[hero].id!==id))||(hero==='assassin'&&id!=='default'&&id!=='frost'))return false;equipped={...equipped,[hero]:id};try{localStorage.setItem(OUTFIT_KEY,JSON.stringify(equipped));}catch{/* Cosmetics still work without storage. */}return true;}
/** Recolor cloth and cold metal only; preserve skin, hair, outlines and alpha. */
export function outfitPixel(r:number,g:number,b:number,hero:OutfitHero,id:OutfitId):[number,number,number]{
 if(id==='default'||isDeluxe(id))return[r,g,b];
 const blue=b>r*1.22&&b>g*1.12&&b>40;
 const red=hero==='swordsman'&&r>g*1.45&&r>b*1.35&&r<210&&g<110&&b>=g*.95;
 if(!blue&&!red)return[r,g,b];
 const light=Math.max(r,g,b)/255;
 const palette=id==='frost'?[115,218,239]:id==='woodland'?[100,165,86]:[203,98,63];
 return palette.map(c=>Math.round(c*light)) as [number,number,number];
}

export const SHOP_OUTFITS = normalizeCatalogue([
 {id:'mage-frost',outfit:'frost',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Băng giá',en:'Mage Frostbound',color:'#8cdef1',detailVi:'Trang phục Băng giá dành cho Pháp sư.',detailEn:'Frostbound outfit for the Mage.'},
 {id:'swordsman-frost',outfit:'frost',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Băng giá',en:'Swordsman Frostbound',color:'#8cdef1',detailVi:'Trang phục Băng giá dành cho Kiếm sĩ.',detailEn:'Frostbound outfit for the Swordsman.'},
 {id:'mage-ember',outfit:'ember',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Than hồng',en:'Mage Ember',color:'#edaa7e',detailVi:'Trang phục Than hồng dành cho Pháp sư.',detailEn:'Ember outfit for the Mage.'},
 {id:'swordsman-ember',outfit:'ember',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Than hồng',en:'Swordsman Ember',color:'#edaa7e',detailVi:'Trang phục Than hồng dành cho Kiếm sĩ.',detailEn:'Ember outfit for the Swordsman.'},
] as const);
export type ShopOutfitId=typeof SHOP_OUTFITS[number]['id'];
export function characterOutfitRarity(hero:OutfitHero,outfit:OutfitId):Rarity {
 if(isDeluxe(outfit))return resolveRarity('deluxe',{eventOnly:true});
 if(hero==='assassin'&&outfit==='frost')return resolveRarity('deluxe',{eventOnly:true});   // Crimson's Christmas outfit, an event item
 // Every regular outfit (Woodland, Frost, Ember) is Common (green); the original look has no tier.
 if(outfit==='default')return 'common';
 if(outfit==='woodland')return 'common';
 return SHOP_OUTFITS.find(product=>product.hero===hero&&product.outfit===outfit)?.rarity??'common';
}
export const cleanOwnedOutfits=(value:unknown):ShopOutfitId[]=>Array.isArray(value)?[...new Set(value.filter((id):id is ShopOutfitId=>SHOP_OUTFITS.some(o=>o.id===id)))]:[];
/** Ownership does not change the order in the shop. */
export function orderedShopOutfits(_owned:readonly ShopOutfitId[]){
 return sortShopCatalogue(SHOP_OUTFITS);
}
/** Crimson's `frost` look is her Christmas outfit: wearable only while the Christmas season is on. */
export function canWearOutfit(hero:OutfitHero,id:OutfitId,owned:readonly ShopOutfitId[],christmas=false,deluxeUnlocked=false){
 if(isDeluxe(id))return deluxeUnlocked&&hero!=='assassin'&&CHRISTMAS_DELUXE[hero].id===id;
 if(!OUTFITS.some(o=>o.id===id))return false;
 if(hero==='assassin')return id==='default'||(id==='frost'&&christmas);
 if(id==='default'||id==='woodland')return true;
 return SHOP_OUTFITS.some(o=>o.hero===hero&&o.outfit===id&&owned.includes(o.id));
}
export function orderedCharacterOutfits(hero:OutfitHero,owned:readonly ShopOutfitId[],deluxeUnlocked=false){
 const choices=hero==='assassin'?[...OUTFITS]:[...OUTFITS,CHRISTMAS_DELUXE[hero]];
 const wearable=(option:typeof choices[number])=>canWearOutfit(hero,option.id,owned,false,deluxeUnlocked);
 return [...choices.filter(wearable),...choices.filter(o=>!wearable(o))];
}
