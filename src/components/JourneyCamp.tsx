import {FrostChapter} from './FrostChapter.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronRight, Flame, Lock, Play, Snowflake, Users, Backpack } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { LEVELS } from '../game/logic/levels.ts';
import { RuneLoadoutEditor } from './EchoRunes.tsx';
import './JourneyCamp.css';
import './JourneyCampV2.css';
import './JourneyCampScene.css';
import './JourneyCampPixel.css';
import { JourneyAmbience, FxCanvas } from './JourneyAmbience.tsx';
import { translate } from '../i18n.ts';

// Traced in the painting's native 1536x1024 coordinates, including each bend.
const trailSegments = [
 'M215 725 C213 670 246 624 278 604 C310 580 365 580 382 548 C402 514 392 487 412 462 C428 436 439 425 434 410 L440 350',
 'M440 350 L434 420 C482 426 500 474 509 520 C517 569 523 586 575 599 C624 611 660 630 690 630',
 'M690 630 C744 620 749 584 757 552 C766 522 791 516 782 488 C776 465 760 454 765 424 C772 385 797 360 840 353 C877 350 900 315 920 310',
 'M920 310 C977 339 1006 352 1004 390 C999 429 1011 449 1050 464 C1101 483 1149 508 1200 515',
 'M1200 515 C1240 491 1271 448 1278 405 C1284 379 1327 362 1355 346 C1382 331 1377 303 1364 278 C1355 248 1355 225 1355 205',
];
// Centre of each clearing in the same native coordinates (= the trail ends above).
const stops = [[215,725],[440,350],[690,630],[920,310],[1200,515],[1355,205]];
const HERO_KEY = 'secondme.journeyHeroAt';
export function JourneyCamp({engine,hud,complete,next,traveler}:{engine:GameEngine|null;hud:HUDState;complete:boolean;next:number;traveler?:React.ReactNode;onNews?:()=>void}) {
  const vi=hud.language==='vi';
  const [frost,setFrost]=useState((engine?.currentLevel.id??1)>=7);
  const [runeEditor,setRuneEditor]=useState(false);
  const [inspect,setInspect]=useState<number|null>(null);
  const [touchInspect,setTouchInspect]=useState<number|null>(null);

  const count=hud.completed.filter(id=>id<=5).length+(complete?1:0);
  const here=complete?5:Math.min(next,5);
  const unlocked=(i:number)=>hud.devUnlocked||complete||i===0||hud.completed.includes(i);

  const readSavedStop=()=>{
    try{
      const saved=Number(localStorage.getItem(HERO_KEY)??-1);
      if(Number.isInteger(saved)&&saved>=0&&saved<stops.length&&unlocked(saved))return saved;
    }catch{}
    return here;
  };

  const [heroStop,setHeroStop]=useState<number>(readSavedStop);
  const [selected,setSelected]=useState<number>(readSavedStop);
  const trailRefs=useRef<(SVGPathElement|null)[]>([]);
  const walker=useRef<HTMLDivElement>(null);
  const posRef=useRef<number>(heroStop);
  const walkRafRef=useRef<number>(0);
  const walkTimerRef=useRef<number>(0);

  const putAtParam=(u:number)=>{
    const el=walker.current;
    if(!el)return;
    const clamped=Math.max(0,Math.min(stops.length-1,u));
    const segIdx=Math.min(stops.length-2,Math.max(0,Math.floor(clamped)));
    const localT=clamped-segIdx;
    const trail=trailRefs.current[segIdx];
    let x=stops[segIdx][0]+(stops[segIdx+1][0]-stops[segIdx][0])*localT;
    let y=stops[segIdx][1]+(stops[segIdx+1][1]-stops[segIdx][1])*localT;
    if(trail){
      try{
        const len=trail.getTotalLength();
        if(len>0){
          const pt=trail.getPointAtLength(localT*len);
          x=pt.x;y=pt.y;
        }
      }catch{}
    }
    el.style.left=`${x/15.36}%`;
    el.style.top=`${y/10.24}%`;
  };

  const walkToStop=(targetIdx:number,enterOnArrive:boolean)=>{
    const clampedTarget=Math.max(0,Math.min(stops.length-1,targetIdx));
    setSelected(clampedTarget);
    cancelAnimationFrame(walkRafRef.current);
    window.clearTimeout(walkTimerRef.current);

    const el=walker.current;
    const startU=posRef.current;
    const dist=Math.abs(clampedTarget-startU);

    if(!el||hud.reducedMotion||dist<0.02){
      posRef.current=clampedTarget;
      setHeroStop(clampedTarget);
      if(el){
        el.classList.remove('is-walking');
        el.style.left=`${stops[clampedTarget][0]/15.36}%`;
        el.style.top=`${stops[clampedTarget][1]/10.24}%`;
      }
      try{localStorage.setItem(HERO_KEY,String(clampedTarget));}catch{}
      if(enterOnArrive)engine?.selectLevel(clampedTarget);
      return;
    }

    const duration=Math.min(1800,Math.max(520,dist*520));
    const t0=performance.now();
    el.classList.add('is-walking');

    const step=(now:number)=>{
      const k=Math.min(1,(now-t0)/duration);
      const eased=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      const u=startU+(clampedTarget-startU)*eased;
      posRef.current=u;
      putAtParam(u);
      if(k<1){
        walkRafRef.current=requestAnimationFrame(step);
      }else{
        posRef.current=clampedTarget;
        setHeroStop(clampedTarget);
        el.classList.remove('is-walking');
        el.style.left=`${stops[clampedTarget][0]/15.36}%`;
        el.style.top=`${stops[clampedTarget][1]/10.24}%`;
        try{localStorage.setItem(HERO_KEY,String(clampedTarget));}catch{}
        if(enterOnArrive){
          walkTimerRef.current=window.setTimeout(()=>{
            engine?.selectLevel(clampedTarget);
          },140);
        }
      }
    };
    walkRafRef.current=requestAnimationFrame(step);
  };

  useEffect(()=>{
    const el=walker.current;
    if(el){
      const idx=Math.round(posRef.current);
      el.style.left=`${stops[idx][0]/15.36}%`;
      el.style.top=`${stops[idx][1]/10.24}%`;
    }
    return ()=>{
      cancelAnimationFrame(walkRafRef.current);
      window.clearTimeout(walkTimerRef.current);
    };
  },[frost]);

  const frostUnlocked=engine?.canSelectLevel(6)??false;
  if(frost&&frostUnlocked)return <FrostChapter engine={engine} hud={hud} back={()=>setFrost(false)} traveler={traveler}/>;
  const minLive=Math.min(heroStop,selected);
  const maxLive=Math.max(heroStop,selected);
  return <div className="journey-layout">{runeEditor&&<RuneLoadoutEditor hud={hud} engine={engine} close={()=>setRuneEditor(false)}/>}
    <aside className="journey-camp integrated-camp"><button className="frost-back frost-forward" disabled={!frostUnlocked} onClick={()=>setFrost(true)}><span>{frostUnlocked?(vi?'CHƯƠNG II · RỪNG HÀN HỎA':'CHAPTER II · FROSTFIRE WOODS'):(vi?'HẠ THỦ VỆ BĂNG ĐỂ MỞ CHƯƠNG 2':'DEFEAT THE FROST GUARDIAN TO UNLOCK CHAPTER 2')}</span>{frostUnlocked?<ChevronRight size={18}/>:<Lock size={16}/>}</button>
      <header className="rest-heading"><span><Flame size={17}/>{vi?'TRẠI NGHỈ ECHO':'ECHO CAMP'}</span><span>{count} / 6</span></header>
      <div className={`rest-scene${hud.reducedMotion?' rest-still':''}`}>
        <div className="rest-firelight" aria-hidden="true"/><FxCanvas name="campfire" still={hud.reducedMotion} className="rest-fx"/><div className="rest-embers" aria-hidden="true"><i/><i/><i/></div>
        <button className="rest-hero" onClick={()=>engine?.openCharacters()} aria-label={vi?'Đổi nhân vật':'Change character'}><span>{traveler??<Users size={50}/>}</span></button>
        <div className="rest-scene-caption"><strong>{hud.characterClass==='swordsman'?'Kael':hud.characterClass==='mechanical'?'Rivet':'Aeris'}</strong><button onClick={()=>engine?.openCharacters()}>{vi?'Đổi nhân vật':'Change hero'} <ArrowRight size={14}/></button></div>
      </div>
      <div className="rest-kit"><div><span>{vi?'BỘ RUNE':'RUNE LOADOUT'}</span><p>{hud.runeLoadout?.length??0} / 4 {vi?'ấn đã chọn':'equipped'}</p></div><button className="rest-prepare" onClick={()=>setRuneEditor(true)}><Backpack size={18}/>{vi?'Đổi rune':'Edit runes'}</button></div>
      <div className="rest-departure"><span>{complete?(vi?'HÀNH TRÌNH MỚI':'ANOTHER JOURNEY'):(vi?'ĐIỂM ĐẾN ĐÃ CHỌN':'SELECTED DESTINATION')}</span><div className="rest-destination"><b>{String(selected+1).padStart(2,'0')}</b><strong>{translate(LEVELS[selected].subtitle,hud.language)}</strong></div>
        <button className="camp-continue" disabled={!unlocked(selected)} onClick={()=>{if(unlocked(selected))walkToStop(selected,true);}}><Play size={19} fill="currentColor"/><span>{complete?(vi?'KHÁM PHÁ LẠI':'EXPLORE AGAIN'):hud.completed.includes(selected+1)?(vi?'CHƠI LẠI MÀN':'REPLAY TRAIL'):hud.completed.length?(vi?'TIẾP TỤC HÀNH TRÌNH':'CONTINUE JOURNEY'):(vi?'LÊN ĐƯỜNG':'BEGIN JOURNEY')}</span><ArrowRight size={18}/></button>
      </div>
      <footer className="rest-progress"><div role="progressbar" aria-label={vi?'Tiến độ hành trình':'Journey progress'} aria-valuenow={count} aria-valuemin={0} aria-valuemax={6}>{Array.from({length:6},(_,i)=><i key={i} className={i<count?'explored':i===selected?'next':''}/>)}</div></footer>
    </aside>
    <section className="journey-chart" aria-label={vi?'Bản đồ hành trình':'Journey map'}>
      <div className={`journey-world${hud.reducedMotion?' map-still':''}`}>
        <svg className="journey-path" viewBox="0 0 1536 1024" aria-hidden="true">
          {trailSegments.map((d,i)=>{
            const isLive=minLive!==maxLive?(i>=minLive&&i<maxLive):(i+1===selected);
            return <path key={i} ref={e=>{trailRefs.current[i]=e;}} d={d} className={`${unlocked(i+1)?'trail-open':'trail-locked'}${isLive?' trail-live':''}`}/>;
          })}
        </svg>
        <JourneyAmbience still={hud.reducedMotion}/>

        <div className="map-traveler" ref={walker} aria-hidden="true"><span>{traveler}</span></div>
        {LEVELS.slice(0,6).map((item,i)=>{
          const ready=unlocked(i),done=i<5?hud.completed.includes(i+1):complete,current=i===selected;
          return <button key={item.id} className={`journey-stop ${done?'is-done':''} ${current?'is-current':''} ${i===5?'is-boss':''} ${inspect===i?'is-inspected':''}`} style={{left:`${stops[i][0]/15.36}%`,top:`${stops[i][1]/10.24}%`}} aria-disabled={!ready} onMouseEnter={()=>setInspect(i)} onMouseLeave={()=>{if(touchInspect===null)setInspect(null);}} onFocus={()=>setInspect(i)} onBlur={()=>{setInspect(null);setTouchInspect(null);}} onClick={()=>{
              if(window.matchMedia('(hover: none)').matches&&touchInspect!==i){setTouchInspect(i);setInspect(i);return;}
              if(ready)walkToStop(i,true);
            }} aria-label={`${String(i+1).padStart(2,'0')} · ${translate(item.subtitle,hud.language)} · ${done?(vi?'Đã hoàn thành':'Cleared'):ready?(vi?'Sẵn sàng':'Ready'):(vi?'Chưa mở':'Locked')}`}>
            <span className="stop-medallion">{!ready?<Lock size={18}/>:i===5?<Snowflake size={23}/>:<span>{String(i+1).padStart(2,'0')}</span>}</span>
            <span className="stop-caption" data-idle={inspect===null} role="tooltip" hidden={inspect!==i}><small>{i===5?(vi?'THỦ VỆ BĂNG':'FROST GUARDIAN'):`0${i+1}`}</small><strong>{translate(item.subtitle,hud.language)}</strong>{done?<em>{'★'.repeat(hud.bestStars[item.id]??0)}{'☆'.repeat(3-(hud.bestStars[item.id]??0))}</em>:<em>{current&&ready?(vi?'Bắt đầu hành trình':'Begin your journey'):!ready?(vi?'CHƯA MỞ':'LOCKED'):(vi?'SẴN SÀNG':'READY')}</em>}</span>
          </button>;
        })}
      </div>

    </section>
  </div>;
}
