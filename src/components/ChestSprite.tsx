import {useEffect, useState} from 'react';

export type ChestTier = 'gold'|'fire'|'aurora';
export type {ChestKind} from '../game/logic/chest.ts';
import type {ChestKind} from '../game/logic/chest.ts';

// The red atlas has three anticipation frames before the lid starts lifting.
const royalOpeningStarts = [0, .055, .12, .22, .36, .51, .68, .84, 1];
const customOpeningStarts = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];

/** Original red chest strips and normalized frames from the three supplied sprite packs. */
export function ChestSprite({tier=null, kind='royal', reducedMotion=false, openingDuration=0.8}: {tier?:ChestTier|null; kind?:ChestKind; reducedMotion?:boolean; openingDuration?:number}) {
  const [age, setAge] = useState(0);
  const duration = Math.max(0.2, openingDuration);
  const custom=kind!=='royal';
  const openingStarts = custom ? customOpeningStarts : royalOpeningStarts;
  useEffect(()=>{
    setAge(0);
    if(!tier || reducedMotion)return;
    const started=performance.now();
    let timer = 0;
    const advance = () => {
      const elapsed = (performance.now()-started)/1000;
      setAge(elapsed);
      // Wake at the next actual sprite frame instead of re-rendering between frames.
      const next = elapsed < duration
        ? (openingStarts.find(start => start * duration > elapsed) ?? 1) * duration
        : duration + (Math.floor((elapsed - duration) * 8) + 1) / 8;
      timer = window.setTimeout(advance, Math.max(1, (next - elapsed) * 1000 + 1));
    };
    timer = window.setTimeout(advance, duration * openingStarts[1] * 1000);
    return ()=>window.clearTimeout(timer);
  },[tier,reducedMotion,duration,openingStarts]);
  const opening=!!tier && age<duration && !reducedMotion;
  const count=opening?openingStarts.length-1:(custom?2:12);
  const frame=opening?openingStarts.findIndex(start=>start * duration>age)-1:reducedMotion?0:Math.floor(Math.max(0,age-duration)*8)%count;
  const file=custom?`chest_${kind}_${tier?(opening?'opening':'open_loop'):'closed'}.png`:tier?`chest_${tier}_${opening?'opening':'open_loop'}.png`:'chest_closed.png';
  return <span aria-hidden="true" className="reward-chest-sprite" style={{display:'block',width:'100%',aspectRatio:'1',imageRendering:'pixelated',backgroundImage:`url(${import.meta.env.BASE_URL}assets/chest/${file})`,backgroundRepeat:'no-repeat',backgroundSize:tier?`${count*100}% 100%`:'100% 100%',backgroundPosition:tier?`${frame*100/(count-1)}% 0`:'0 0'}}/>;
}
