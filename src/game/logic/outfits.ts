import {normalizeCatalogue,resolveRarity} from './rarity.ts';
import {sortShopCatalogue,type Rarity} from './rarity.ts';

export type OutfitHero='mage'|'swordsman'|'assassin';
export type OutfitId='default'|'frost'|'woodland'|'ember'|'reindeer'|'snowman'|'amethyst'|'rose'|'sand'|'turquoise'|'slate';
export const OUTFITS=[
 {id:'default',vi:'Nguyên bản',en:'Original',color:'#e2c585'},
 {id:'frost',vi:'Băng giá',en:'Frostbound',color:'#8cdef1'},
 {id:'woodland',vi:'Rừng xanh',en:'Woodland',color:'#9bd18a'},
 {id:'ember',vi:'Than hồng',en:'Ember',color:'#edaa7e'},
 {id:'amethyst',vi:'Thạch anh tím',en:'Amethyst',color:'#b38ae0'},
 {id:'rose',vi:'Hồng ngọc',en:'Rose',color:'#e68aa7'},
 {id:'sand',vi:'Cát vàng',en:'Golden Sand',color:'#d9bd78'},
 {id:'turquoise',vi:'Ngọc lam',en:'Turquoise',color:'#6cd1bd'},
 {id:'slate',vi:'Đá xám',en:'Slate',color:'#9aaabd'},
] as const;
export const CHRISTMAS_DELUXE = {
 swordsman:{id:'reindeer',vi:'Tuần lộc Giáng Sinh',en:'Christmas Reindeer',color:'#b579e8'},
 mage:{id:'snowman',vi:'Người tuyết may mắn',en:'Lucky Snowman',color:'#b579e8'},
} as const;
export const NOEL_SKINS = ['mage','swordsman','assassin'] as const;
export const NOEL_SKIN_NAMES: Record<OutfitHero,string> = {
 mage: CHRISTMAS_DELUXE.mage.vi, swordsman: CHRISTMAS_DELUXE.swordsman.vi, assassin: 'Crimson Veil Giáng sinh',
};
export function isDeluxe(id:unknown){return id==='reindeer'||id==='snowman';}
export function supportsOutfit(hero:OutfitHero,id:OutfitId){
 if(hero==='assassin')return id==='default'||id==='frost';
 if(id==='snowman')return hero==='mage';
 if(id==='reindeer')return hero==='swordsman';
 return OUTFITS.some(o=>o.id===id)&&!(hero==='mage'&&id==='slate')&&!(hero==='swordsman'&&(id==='rose'||id==='turquoise'));
}
export function aerisCombatOutfit(id:OutfitId){
 return ['amethyst','rose','sand','turquoise'].includes(id)?'default':id;
}
export const OUTFIT_KEY='second-me-outfits-v1';
export function cleanOutfits(value:unknown):Record<OutfitHero,OutfitId>{
 const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const valid=(hero:OutfitHero,id:unknown):OutfitId=>typeof id==='string'&&supportsOutfit(hero,id as OutfitId)?id as OutfitId:'default';
 return{mage:valid('mage',raw.mage),swordsman:valid('swordsman',raw.swordsman),assassin:raw.assassin==='frost'?'frost':'default'};
}
let equipped:Record<OutfitHero,OutfitId>={mage:'default',swordsman:'default',assassin:'default'};
export function restoreOutfits(){try{equipped=cleanOutfits(JSON.parse(localStorage.getItem(OUTFIT_KEY)??'{}'));}catch{equipped=cleanOutfits(null);}try{localStorage.setItem(OUTFIT_KEY,JSON.stringify(equipped));}catch{}return{...equipped};}
export const getOutfit=(hero:OutfitHero)=>equipped[hero];
export const getOutfits=()=>({...equipped});
export function equipOutfit(hero:OutfitHero,id:OutfitId){if(!['mage','swordsman','assassin'].includes(hero)||!supportsOutfit(hero,id))return false;equipped={...equipped,[hero]:id};try{localStorage.setItem(OUTFIT_KEY,JSON.stringify(equipped));}catch{/* Cosmetics still work without storage. */}return true;}
/** Recolor cloth and cold metal only; preserve skin, hair, outlines and alpha. */
export function outfitPixel(r:number,g:number,b:number,hero:OutfitHero,id:OutfitId):[number,number,number]{
 if(id==='default'||isDeluxe(id))return[r,g,b];
 const blue=b>r*1.22&&b>g*1.12&&b>40;
 const red=hero==='swordsman'&&r>g*1.45&&r>b*1.35&&r<210&&g<110&&b>=g*.95;
 if(!blue&&!red)return[r,g,b];
 const light=Math.max(r,g,b)/255;
 const palettes:Partial<Record<OutfitId,[number,number,number]>>={
  frost:[115,218,239],woodland:[100,165,86],ember:[203,98,63],
  amethyst:[166,110,220],rose:[224,113,153],sand:[211,177,103],
  turquoise:[72,196,166],slate:[136,157,181],
 };
 const palette=palettes[id];
 if(!palette)return[r,g,b];
 return palette.map(c=>Math.round(c*light)) as [number,number,number];
}

export const SHOP_OUTFITS = normalizeCatalogue([
 {id:'mage-frost',outfit:'frost',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Băng giá',en:'Mage Frostbound',color:'#8cdef1',detailVi:'Trang phục Băng giá dành cho Pháp sư.',detailEn:'Frostbound outfit for the Mage.'},
 {id:'swordsman-frost',outfit:'frost',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Băng giá',en:'Swordsman Frostbound',color:'#8cdef1',detailVi:'Trang phục Băng giá dành cho Kiếm sĩ.',detailEn:'Frostbound outfit for the Swordsman.'},
 {id:'mage-ember',outfit:'ember',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Than hồng',en:'Mage Ember',color:'#edaa7e',detailVi:'Trang phục Than hồng dành cho Pháp sư.',detailEn:'Ember outfit for the Mage.'},
 {id:'swordsman-ember',outfit:'ember',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Than hồng',en:'Swordsman Ember',color:'#edaa7e',detailVi:'Trang phục Than hồng dành cho Kiếm sĩ.',detailEn:'Ember outfit for the Swordsman.'},
 {id:'mage-amethyst',outfit:'amethyst',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Thạch anh tím',en:'Mage Amethyst',color:'#b38ae0',detailVi:'Trang phục đổi màu dành cho Aeris.',detailEn:'Color variant for Aeris.'},
 {id:'mage-rose',outfit:'rose',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Hồng ngọc',en:'Mage Rose',color:'#e68aa7',detailVi:'Trang phục đổi màu dành cho Aeris.',detailEn:'Color variant for Aeris.'},
 {id:'mage-sand',outfit:'sand',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Cát vàng',en:'Mage Golden Sand',color:'#d9bd78',detailVi:'Trang phục đổi màu dành cho Aeris.',detailEn:'Color variant for Aeris.'},
 {id:'mage-turquoise',outfit:'turquoise',hero:'mage',price:60,cap:1,rarity:'common',vi:'Pháp sư Ngọc lam',en:'Mage Turquoise',color:'#6cd1bd',detailVi:'Trang phục đổi màu dành cho Aeris.',detailEn:'Color variant for Aeris.'},
 {id:'swordsman-amethyst',outfit:'amethyst',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Thạch anh tím',en:'Swordsman Amethyst',color:'#b38ae0',detailVi:'Trang phục đổi màu dành cho Kael.',detailEn:'Color variant for Kael.'},
 {id:'swordsman-sand',outfit:'sand',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Cát vàng',en:'Swordsman Golden Sand',color:'#d9bd78',detailVi:'Trang phục đổi màu dành cho Kael.',detailEn:'Color variant for Kael.'},
 {id:'swordsman-slate',outfit:'slate',hero:'swordsman',price:60,cap:1,rarity:'common',vi:'Kiếm sĩ Đá xám',en:'Swordsman Slate',color:'#9aaabd',detailVi:'Trang phục đổi màu dành cho Kael.',detailEn:'Color variant for Kael.'},
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
 if(!supportsOutfit(hero,id))return false;
 if(isDeluxe(id))return christmas&&deluxeUnlocked&&hero!=='assassin'&&CHRISTMAS_DELUXE[hero].id===id;
 if(!OUTFITS.some(o=>o.id===id))return false;
 if(hero==='assassin')return id==='default'||(id==='frost'&&christmas&&deluxeUnlocked);
 if(id==='default'||id==='woodland')return true;
 return SHOP_OUTFITS.some(o=>o.hero===hero&&o.outfit===id&&owned.includes(o.id));
}
export function orderedCharacterOutfits(hero:OutfitHero,owned:readonly ShopOutfitId[],deluxeUnlocked=false,christmas=false){
 const choices=hero==='assassin'?[...OUTFITS]:[...OUTFITS.filter(o=>supportsOutfit(hero,o.id)),CHRISTMAS_DELUXE[hero]];
 const wearable=(option:typeof choices[number])=>canWearOutfit(hero,option.id,owned,christmas,deluxeUnlocked);
 return [...choices.filter(wearable),...choices.filter(o=>!wearable(o))];
}
