import type {Rarity} from './rarity.ts';
export type ChestKind='royal'|'wood'|'platinum'|'crystal';
export type ChestCurrency='coins'|'commonCrystals'|'whiteCrystals'|'mysticCrystals';
export const CURRENCY_RARITY:Record<ChestCurrency,Rarity>={coins:'common',commonCrystals:'common',whiteCrystals:'deluxe',mysticCrystals:'bespoke'};
export const CHEST_PRICES:Record<ChestKind,{currency:ChestCurrency;single:number}>={
  wood:{currency:'coins',single:20},
  royal:{currency:'commonCrystals',single:5},
  platinum:{currency:'whiteCrystals',single:5},
  crystal:{currency:'mysticCrystals',single:5},
};
export function chestBalance(currency:ChestCurrency,wallet:{coins:number;chestKeys:number;whiteCrystals:number;mysticCrystals:number}){
  return currency==='coins'?wallet.coins:currency==='whiteCrystals'?wallet.whiteCrystals:currency==='mysticCrystals'?wallet.mysticCrystals:wallet.chestKeys;
}
export function chestCurrencyName(currency:ChestCurrency,vi:boolean,short=false){
  if(currency==='coins')return vi?'xu':'coins';
  if(currency==='whiteCrystals')return vi?(short?'thanh tinh thể':'Tanuki thanh tinh thể'):(short?'white crystals':'Tanuki Azure Crystals');
  if(currency==='mysticCrystals')return vi?(short?'huyền tinh thể':'Tanuki huyền tinh thể'):(short?'mystic crystals':'Tanuki Mystic Crystals');
  return vi?(short?'phàm tinh thể':'Tanuki phàm tinh thể'):(short?'crystals':'Tanuki Common Crystals');
}
export const CHEST_POOL = [
  {id:'coins5', weight:30, tier:'gold', vi:'5 xu', en:'5 coins'},
  {id:'coins15', weight:21, tier:'gold', vi:'15 xu', en:'15 coins'},
  {id:'coins30', weight:12, tier:'gold', vi:'30 xu', en:'30 coins'},
  {id:'coins100', weight:2, tier:'gold', vi:'100 xu', en:'100 coins'},
  {id:'time', weight:9, tier:'gold', vi:'Bình thời gian', en:'Time potion'},
  {id:'healSmall', weight:8, tier:'gold', vi:'Bình hồi phục nhỏ', en:'Small healing potion'},
  {id:'healLarge', weight:5, tier:'gold', vi:'Bình hồi phục lớn', en:'Large healing potion'},
  {id:'manaSmall', weight:7, tier:'gold', vi:'Lọ năng lượng nhỏ', en:'Small energy vial'},
  {id:'manaLarge', weight:3, tier:'gold', vi:'Bình năng lượng lớn', en:'Large energy potion'},
  {id:'revive', weight:3, tier:'fire', vi:'Trục phục sinh', en:'Revival scroll'},
] as const;
export const COMMON_CHEST_POOL = [
 {id:'coins1',weight:23,tier:'gold',vi:'1 xu',en:'1 coin'},
 {id:'coins3',weight:20,tier:'gold',vi:'3 xu',en:'3 coins'},
 {id:'coins9',weight:15,tier:'gold',vi:'9 xu',en:'9 coins'},
 {id:'coins27',weight:8,tier:'gold',vi:'27 xu',en:'27 coins'},
 {id:'coins81',weight:3,tier:'gold',vi:'81 xu',en:'81 coins'},
 {id:'commonCrystals5',weight:10,tier:'gold',vi:'5 Tanuki phàm tinh thể',en:'5 Tanuki Common Crystals'},
 {id:'commonCrystals25',weight:4,tier:'gold',vi:'25 Tanuki phàm tinh thể',en:'25 Tanuki Common Crystals'},
 {id:'commonCrystals125',weight:1.5,tier:'gold',vi:'125 Tanuki phàm tinh thể',en:'125 Tanuki Common Crystals'},
 {id:'commonCrystals625',weight:0.5,tier:'gold',vi:'625 Tanuki phàm tinh thể',en:'625 Tanuki Common Crystals'},
 {id:'manaSmall',weight:10,tier:'gold',vi:'Lọ năng lượng nhỏ',en:'Small energy vial'},
 {id:'time',weight:5,tier:'gold',vi:'Bình thời gian',en:'Time potion'},
] as const;
export type ChestRewardId = typeof CHEST_POOL[number]['id'] | typeof COMMON_CHEST_POOL[number]['id'];
export const isChestAvailable=(kind:ChestKind)=>kind==='wood'||kind==='royal';
export function chestPool(kind:ChestKind){return kind==='wood'?COMMON_CHEST_POOL:kind==='royal'?CHEST_POOL:[];}
export function chestReward(id:ChestRewardId){return [...CHEST_POOL,...COMMON_CHEST_POOL].find(item=>item.id===id)!;}
export function rollChest(random:()=>number=Math.random,kind:ChestKind='royal'):ChestRewardId {
  const pool=chestPool(kind);
  if(!pool.length)throw new Error('Chest under development');
  const value=random();
  if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random value must be in [0, 1)');
  let total=0;
  for(const item of pool){total+=item.weight;if(value*100<total)return item.id;}
  return pool[pool.length-1].id;
}
