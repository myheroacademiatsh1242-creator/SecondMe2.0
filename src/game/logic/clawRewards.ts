import { SHOP_ITEMS, type ShopItemId } from './shopItems.ts';
import { SHOP_OUTFITS, NOEL_SKIN_NAMES, type OutfitHero, type ShopOutfitId } from './outfits.ts';
import { ECHO_RUNES, type EchoRuneId } from './echoRunes.ts';

export type ClawReward =
  | {type:'skin'; id:OutfitHero}
  | {type:'outfit'; id:ShopOutfitId}
  | {type:'item'; id:ShopItemId}
  | {type:'rune'; id:EchoRuneId}
  | {type:'crystals'|'tickets'|'coins'; quantity:number};

export function clawRewardText(reward:ClawReward, vi:boolean):string {
  switch(reward.type){
    case 'skin': return (vi?'Skin siêu hiếm · ':'Ultra-rare skin · ') + NOEL_SKIN_NAMES[reward.id];
    case 'coins': return '+' + reward.quantity + (vi?' xu':' coins');
    case 'tickets': return '+' + reward.quantity + (vi?' vé Noel':' Noel ticket');
    case 'crystals': return '+' + reward.quantity + (vi?' Tanuki Phàm Tinh Thể':' Tanuki Common Crystal');
    default: {
      const catalogue = reward.type==='item' ? SHOP_ITEMS : reward.type==='outfit' ? SHOP_OUTFITS : ECHO_RUNES;
      const entry = catalogue.find(entry=>entry.id===reward.id)!;
      return '+1 ' + (vi?entry.vi:entry.en);
    }
  }
}
