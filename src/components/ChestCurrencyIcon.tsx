import {ChestKeyIcon} from './ChestKeyIcon.tsx';
import type {ChestCurrency} from '../game/logic/chest.ts';

export function ChestCurrencyIcon({currency,size=20}:{currency:ChestCurrency;size?:number}){
  if(currency==='commonCrystals')return <ChestKeyIcon size={size}/>;
  const file=currency==='whiteCrystals'?'chest/white-tanuki-crystal.png':currency==='mysticCrystals'?'chest/mystic-tanuki-crystal.png':'ui/raccoon-coin.png';
  return <img src={`${import.meta.env.BASE_URL}assets/${file}`} alt="" aria-hidden="true" width={size} height={size} style={{objectFit:'contain',imageRendering:'pixelated',flexShrink:0}}/>;
}
