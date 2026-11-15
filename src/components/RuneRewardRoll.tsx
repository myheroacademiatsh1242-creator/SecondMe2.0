import {useEffect,useState} from 'react';
import {RotateCw} from 'lucide-react';
import {ECHO_RUNES,type EchoRuneId} from '../game/logic/echoRunes.ts';
import './RuneRewardRoll.css';

const SPIN_MS = 1450;
const PREVIEW_STEP_MS = 85;

export function RuneRewardRoll({choices,vi,reducedMotion,choose,renderRune}:{
 choices:EchoRuneId[];vi:boolean;reducedMotion:boolean;choose:(id:EchoRuneId)=>void;renderRune:(id:EchoRuneId)=>React.ReactNode;
}){
 const [phase,setPhase]=useState<'ready'|'spinning'|'revealed'>('ready');
 const [step,setStep]=useState(0);
 useEffect(()=>{
  if(phase!=='spinning')return;
  const preview=window.setInterval(()=>setStep(current=>current+1),PREVIEW_STEP_MS);
  const reveal=window.setTimeout(()=>setPhase('revealed'),SPIN_MS);
  return ()=>{window.clearInterval(preview);window.clearTimeout(reveal);};
 },[phase]);
 const revealed=phase==='revealed';
 const spin=()=>setPhase(reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'revealed':'spinning');
 return <div className="rune-reward-roll" data-roll={phase}>
  <p className="reward-intro" role="status">
   {phase==='ready'?(vi?'Quay để mở ba ấn thưởng.':'Spin to reveal three reward runes.'):
    phase==='spinning'?(vi?'Đang quay rune…':'Spinning runes…'):
    (vi?'Chọn 1 trong 3 ấn để thêm vào túi.':'Choose one of three runes for your inventory.')}
  </p>
  <div className="rune-roll-slots" aria-hidden={!revealed}>
   {choices.map((id,index)=>{
    const rune=ECHO_RUNES.find(r=>r.id===id)!;
    const preview=ECHO_RUNES[(step+index*4)%ECHO_RUNES.length];
    const visible=revealed?rune:preview;
    if(!revealed)return <div className="rune-roll-slot" key={index} style={{'--rune-glow':phase==='ready'?'#afaa7c':visible.color} as React.CSSProperties}>
     <div className="reward-pedestal">{phase==='ready'?<span className="rune-roll-question">?</span>:renderRune(visible.id)}</div>
    </div>;
    return <button type="button" key={id} className="rune-roll-slot" onClick={()=>choose(id)} style={{'--rune-glow':rune.color} as React.CSSProperties}>
     <div className="reward-pedestal">{renderRune(id)}</div>
     <strong>{vi?rune.vi:rune.en}</strong>
     <p>{vi?rune.detailVi:rune.detailEn}</p>
     <span>{vi?'CHỌN ẤN':'CHOOSE RUNE'}</span>
    </button>;
   })}
  </div>
  {!revealed&&<button type="button" className="rune-roll-action" disabled={phase==='spinning'} onClick={spin}>
   <RotateCw size={17} aria-hidden="true"/>{vi?'QUAY RUNE':'SPIN RUNES'}
  </button>}
 </div>;
}
