export const RARITIES = {
  common: {vi:'Đại Trà',en:'Common'},
  refined: {vi:'Tinh Chế',en:'Refined'},
  deluxe: {vi:'Thượng Hạng',en:'Deluxe'},
  bespoke: {vi:'Độc Bản',en:'Bespoke'},
  ultimate: {vi:'Tối Thượng',en:'Ultimate'},
} as const;

export type Rarity = keyof typeof RARITIES;
export const RARITY_ORDER: readonly Rarity[] = ['common','refined','deluxe','bespoke','ultimate'];
const ALIASES:Record<string,Rarity>={
 common:'common',daitra:'common',thuong:'common',normal:'common',
 refined:'refined',tinhche:'refined',rare:'refined',hiem:'refined',uncommon:'refined',
 deluxe:'deluxe',thuonghang:'deluxe',limited:'deluxe',gioihan:'deluxe',epic:'deluxe',suthi:'deluxe',
 bespoke:'bespoke',docban:'bespoke',
 ultimate:'ultimate',toithuong:'ultimate',legendary:'deluxe',huyenthoai:'deluxe',
};
export function normalizeRarity(value:unknown):Rarity{
 if(typeof value!=='string')return 'common';
 const key=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z]/g,'');
 const combined:Record<string,Rarity>={daitracommon:'common',tinhcherefined:'refined',thuonghangdeluxe:'deluxe',docbanbespoke:'bespoke',toithuongultimate:'ultimate'};
 return ALIASES[key]??combined[key]??'common';
}
export interface Acquisition {
 coinPurchase?:boolean;
 bulk?:boolean;
 eventOnly?:boolean;
 loginOnly?:boolean;
 /** Explicit tier authored by the team. Acquisition caps still apply. */
 manualRarity?:Rarity;
}
export function resolveRarity(value:unknown,source:Acquisition={}):Rarity{
 const requested=source.manualRarity??normalizeRarity(value);
 const rank=RARITY_ORDER.indexOf(requested);
 if(source.coinPurchase||source.bulk)return RARITY_ORDER[Math.min(rank,1)];
 if(source.eventOnly||source.loginOnly)return RARITY_ORDER[Math.max(1,Math.min(rank,2))];
 return source.manualRarity??RARITY_ORDER[Math.min(rank,2)];
}
/** Normalize labels and apply acquisition policy once for all catalogue consumers. */
type Canonical<T> = T extends {rarity:string} ? Omit<T,'rarity'>&{rarity:Rarity} : never;
export function normalizeCatalogue<T extends {rarity:string}>(items:readonly T[],source:Acquisition={}):Canonical<T>[]{
 return items.map(item=>{
  const metadata=item as T&Acquisition&{price?:number};
  return {...item,rarity:resolveRarity(item.rarity,{
   ...source,...metadata,
   coinPurchase:source.coinPurchase||metadata.coinPurchase||(typeof metadata.price==='number'&&metadata.price>0),
  })};
 }) as unknown as Canonical<T>[];
}
export function sortShopCatalogue<T extends {rarity:string;price:number}>(items:readonly T[]):T[]{
 return [...items].sort((a,b)=>RARITY_ORDER.indexOf(normalizeRarity(a.rarity))-RARITY_ORDER.indexOf(normalizeRarity(b.rarity))||a.price-b.price);
}
export function rarityName(rarity:unknown,vi:boolean){return RARITIES[normalizeRarity(rarity)][vi?'vi':'en'];}
export function rarityColor(rarity:unknown){return RARITY_COLORS[normalizeRarity(rarity)];}
export function rarityStars(rarity:unknown){return RARITY_ORDER.indexOf(normalizeRarity(rarity))+1;}
export const RARITY_COLORS:Record<Rarity,string> = {
  common:'#76c96b',
  refined:'#59adf4',
  deluxe:'#b579e8',
  bespoke:'#f0a154',
  ultimate:'#e75c5c',
};
