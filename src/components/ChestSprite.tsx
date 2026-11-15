import {useEffect, useState} from 'react';

export type ChestTier = 'gold'|'fire'|'aurora';
export type {ChestKind} from '../game/logic/chest.ts';
import type {ChestKind} from '../game/logic/chest.ts';

/** Original red chest strips and normalized frames from the three supplied sprite packs. */
export function ChestSprite({tier=null, kind='royal', reducedMotion=false, openingDuration=0.8}: {tier?:ChestTier|null; kind?:ChestKind; reducedMotion?:boolean; openingDuration?:number}) {
  const [age, setAge] = useState(0);
  const duration = Math.max(0.2, openingDuration);
  useEffect(()=>{
    setAge(0);
    if(!tier || reducedMotion)return;
    const started=performance.now();
    let timer = 0;
    const advance = () => {
      const elapsed = (performance.now()-started)/1000;
      setAge(elapsed);
      // Wake at the next actual sprite frame instead of re-rendering between frames.
      const step = duration / 8;
      const next = elapsed < duration
        ? (Math.floor(elapsed / step) + 1) * step
        : duration + (Math.floor((elapsed - duration) * 8) + 1) / 8;
      timer = window.setTimeout(advance, Math.max(1, (next - elapsed) * 1000 + 1));
    };
    timer = window.setTimeout(advance, 40);
    return ()=>window.clearTimeout(timer);
  },[tier,reducedMotion,duration]);
  const opening=!!tier && age<duration && !reducedMotion;
  const custom=kind!=='royal';
  const count=opening?(custom?6:8):(custom?2:12);
  const frame=opening?Math.min(count-1,Math.floor(age/duration*count)):reducedMotion?0:Math.floor(Math.max(0,age-duration)*8)%count;
  const file=custom?`chest_${kind}_${tier?(opening?'opening':'open_loop'):'closed'}.png`:tier?`chest_${tier}_${opening?'opening':'open_loop'}.png`:'chest_closed.png';
  return <span aria-hidden="true" className="reward-chest-sprite" style={{display:'block',width:'100%',aspectRatio:'1',imageRendering:'pixelated',backgroundImage:`url(${import.meta.env.BASE_URL}assets/chest/${file})`,backgroundRepeat:'no-repeat',backgroundSize:tier?`${count*100}% 100%`:'100% 100%',backgroundPosition:tier?`${frame*100/(count-1)}% 0`:'0 0'}}/>;
}
