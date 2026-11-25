import {useEffect,useRef,useState} from 'react';
import {ArrowRight,SkipForward} from 'lucide-react';
import {ECHO_RUNES,type EchoRuneId} from '../game/logic/echoRunes.ts';
import './RuneRewardRoll.css';

const SPIN_MS = 1450;
const PREVIEW_STEP_MS = 85;

export function RuneRewardRoll({choices,vi,reducedMotion,choose,renderRune,afterVictory=false}:{
 choices:EchoRuneId[];vi:boolean;reducedMotion:boolean;choose:(id:EchoRuneId)=>void;renderRune:(id:EchoRuneId)=>React.ReactNode;
 afterVictory?:boolean;
}){
 const [phase,setPhase]=useState<'spinning'|'revealed'>(()=>
  afterVictory&&!reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'spinning':'revealed');
 const [step,setStep]=useState(0);
 const suggestedButton=useRef<HTMLButtonElement>(null);
 const skipButton=useRef<HTMLButtonElement>(null);
 const focusReward=useRef(false);
 useEffect(()=>{
  if(phase!=='spinning')return;
  const preview=window.setInterval(()=>setStep(current=>current+1),PREVIEW_STEP_MS);
  const reveal=window.setTimeout(()=>{
   focusReward.current=document.activeElement===skipButton.current;
   setPhase('revealed');
  },SPIN_MS);
  return ()=>{window.clearInterval(preview);window.clearTimeout(reveal);};
 },[phase]);
 const revealed=phase==='revealed';
 useEffect(()=>{if(revealed&&focusReward.current)suggestedButton.current?.focus({preventScroll:true});},[revealed]);
 return <div className="rune-reward-roll" data-roll={phase}>
  <div className="rune-roll-heading">
   <h3 role="status">{revealed?(vi?'Chọn một ấn Echo':'Choose an Echo rune'):(vi?'Đang quay ấn Echo…':'Rolling Echo runes…')}</h3>
   {afterVictory&&<button type="button" ref={skipButton} className="rune-roll-action" style={{visibility:revealed?'hidden':undefined}} disabled={revealed} onClick={()=>{focusReward.current=true;setPhase('revealed');}}>
    <SkipForward size={15} aria-hidden="true"/>{vi?'Bỏ qua hiệu ứng':'Skip animation'}
   </button>}
  </div>
  <div className="rune-roll-slots" aria-hidden={!revealed}>
   {choices.map((id,index)=>{
    const rune=ECHO_RUNES.find(r=>r.id===id)!;
    const preview=ECHO_RUNES[(step+index*4)%ECHO_RUNES.length];
    const visible=revealed?rune:preview;
    if(!revealed)return <div className="rune-roll-slot" key={index} style={{'--rune-glow':visible.color} as React.CSSProperties}>
     <div className="reward-rune-icon">{renderRune(visible.id)}</div>
     <div className="rune-roll-detail"><strong>{vi?rune.vi:rune.en}</strong><p>{vi?rune.detailVi:rune.detailEn}</p></div>
     <span className="rune-roll-claim">{vi?'Nhận & đi tiếp':'Claim & continue'}<ArrowRight size={14} aria-hidden="true"/></span>
    </div>;
    return <button type="button" ref={index===0?suggestedButton:undefined} key={`${id}-${index}`} className={`rune-roll-slot${index===0?' is-suggested':''}`} onClick={()=>choose(id)} style={{'--rune-glow':rune.color} as React.CSSProperties}>
     <div className="reward-rune-icon">{renderRune(id)}</div>
     <div className="rune-roll-detail">
      <strong>{vi?rune.vi:rune.en}</strong>
      <p>{vi?rune.detailVi:rune.detailEn}</p>
     </div>
     <span className="rune-roll-claim">{afterVictory?(vi?'Nhận & đi tiếp':'Claim & continue'):(vi?'Chọn ấn':'Choose rune')}<ArrowRight size={14} aria-hidden="true"/></span>
    </button>;
   })}
  </div>
 </div>;
}
