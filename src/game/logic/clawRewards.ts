import {SHOP_ITEMS,type ShopItemId} from './shopItems.ts';
import {SHOP_OUTFITS,type ShopOutfitId} from './outfits.ts';

export const CLAW_COINS=[10,30,35,105,110,330,335] as const;
export const CLAW_COIN_WEIGHTS=[35,25,20,9,7,3,1] as const;
export const CLAW_QUANTITY_WEIGHTS=[40,23,14,8,5,4,2,2,1,1] as const;
export const CLAW_CANDY_WEIGHTS=[70,20,10] as const;
export const CLAW_PENGUIN_WEIGHTS=[30,20,25,10,5,10] as const;
const common: readonly typeof SHOP_ITEMS[number][]=SHOP_ITEMS.filter(i=>i.rarity==='common');
const refined: readonly typeof SHOP_ITEMS[number][]=SHOP_ITEMS.filter(i=>i.rarity==='refined');
function unit(random:()=>number){
 const n=random();
 if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Random value must be in [0, 1)');
 return n;
}
function pick<T>(values:readonly T[],random:()=>number):T{return values[Math.floor(unit(random)*values.length)];}
function weighted(weights:readonly number[],random:()=>number){
 const total=weights.reduce((a,b)=>a+b,0);
 let value=unit(random)*total;
 for(let i=0;i<weights.length;i++){value-=weights[i];if(value<0)return i;}
 return weights.length-1;
}
export type ClawReward=ClawRoll & {overflowCoins?:number};
type ClawRoll={type:'coins'|'crystals'|'tickets';quantity:number}|{type:'item';id:typeof SHOP_ITEMS[number]['id'];quantity:number}|{type:'outfit';id:ShopOutfitId;quantity:number};
export function rollClawReward(kind:number,owned:readonly ShopOutfitId[],random:()=>number=Math.random):ClawReward|null{
 if(!Number.isInteger(kind)||kind<0||kind>3)return null;
 if(kind===0)return{type:'coins',quantity:CLAW_COINS[weighted(CLAW_COIN_WEIGHTS,random)]};
 if(kind===1)return{type:'item',id:pick(common,random).id,quantity:1};
 const category=weighted(kind===2?CLAW_CANDY_WEIGHTS:CLAW_PENGUIN_WEIGHTS,random);
 const quantity=1+weighted(CLAW_QUANTITY_WEIGHTS,random);
 if(kind===2){
  if(category===2)return{type:'tickets',quantity};
  return{type:'item',id:pick(category===0?common:refined,random).id,quantity};
 }
 if(category===0)return{type:'coins',quantity:CLAW_COINS[weighted(CLAW_COIN_WEIGHTS,random)]};
 if(category===1)return{type:'crystals',quantity};
 if(category===5)return{type:'tickets',quantity};
 if(category===4){
  const remaining=SHOP_OUTFITS.filter(o=>!owned.includes(o.id));
  if(!remaining.length)return{type:'crystals',quantity:10};
  return{type:'outfit',id:pick(remaining,random).id,quantity:1};
 }
 return{type:'item',id:pick(category===2?common:refined,random).id,quantity};
}
export function clawRewardText(reward:ClawReward,vi:boolean){
 let name:string;
 if(reward.type==='item'){const item=SHOP_ITEMS.find(i=>i.id===reward.id)!;name=vi?item.vi:item.en;}
 else if(reward.type==='outfit'){const item=SHOP_OUTFITS.find(i=>i.id===reward.id)!;name=vi?item.vi:item.en;}
 else name=reward.type==='coins'?(vi?'xu':'coins'):reward.type==='tickets'?(vi?'vé gắp thú':'claw tickets'):(vi?'Tanuki Phàm Tinh Thể':'Tanuki Common Crystals');
 return '+'+reward.quantity+' '+name+(reward.overflowCoins?' · +'+reward.overflowCoins+(vi?' xu do kho đầy':' coins for excess stock'):'');
}
