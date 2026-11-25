import {PANEL_ART,usePanelArt} from './panelArt.ts';
import {useState} from 'react';
import {ArrowRight,Home,Backpack,Clock3} from 'lucide-react';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {ECHO_RUNES} from '../game/logic/echoRunes.ts';
import {RuneStone,RUNE_SHORT} from './EchoRunes.tsx';
import {VictoryStars} from './CampaignUI.tsx';
import {TrailInventory} from './TrailInventory.tsx';
import {translate} from '../i18n.ts';
import './RuneRewardFlow.css';
import {RuneRewardRoll} from './RuneRewardRoll.tsx';
import {ChestKeyIcon} from './ChestKeyIcon.tsx';
export function RuneRewardFlow({engine,hud}:{engine:GameEngine|null;hud:HUDState}){
 const vi=hud.language==='vi',pending=!!hud.pendingRuneChoices?.length;
 const [bag,setBag]=useState(false);
 const panelArt=usePanelArt(PANEL_ART.reward);
 const claimed=ECHO_RUNES.find(r=>r.id===hud.lastRuneReward);
 const crystals=hud.lastRating?.commonCrystals??0,coins=hud.lastRating?.coins??0;
 const time=hud.elapsedLevelTime.toLocaleString(vi?'vi-VN':'en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
 return <div className="modal-backdrop reward-flow-backdrop"><section className={`reward-flow ${pending?'is-choosing':'is-claimed'}`} data-panel-art={panelArt} role="dialog" aria-modal="true" aria-labelledby="reward-flow-title" data-reduced-motion={hud.reducedMotion}>
  <header className="reward-flow-header">
   <div>
    <h2 id="reward-flow-title">{engine?.isChristmasTrail?(vi?'Hoàn thành Đường mòn Noel':'Christmas Trail complete'):(vi?'Hoàn thành màn':'Trail complete')}</h2>
    <p>{translate(hud.levelSubtitle,hud.language)}</p>
   </div>
   {!engine?.isChristmasTrail&&<div className="reward-results">
    <VictoryStars count={hud.lastRating?.stars??0} vi={vi}/>
    <ul className="reward-earnings" aria-label={vi?'Kết quả màn chơi':'Trail results'}>
     <li title={vi?'Tanuki phàm tinh thể':'Tanuki Common Crystals'} aria-label={vi?`+${crystals} Tanuki phàm tinh thể`:`+${crystals} Tanuki Common Crystals`}><ChestKeyIcon size={17}/>+{crystals}</li>
     <li title={vi?'Xu':'Coins'} aria-label={vi?`+${coins} xu`:`+${coins} coins`}><img src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`} alt=""/>+{coins}</li>
     <li title={vi?'Thời gian':'Time'} aria-label={vi?`${time} giây`:`${time} seconds`}><Clock3 size={14} aria-hidden="true"/>{time}s</li>
    </ul>
   </div>}
  </header>
  <div className="reward-flow-body">{pending?
   <RuneRewardRoll choices={hud.pendingRuneChoices!} vi={vi} reducedMotion={hud.reducedMotion} afterVictory
    choose={id=>{if(engine?.chooseRune(id))engine.requestNextBattle();}} renderRune={id=><RuneStone id={id}/>}/>
   :claimed&&<div className="reward-chosen" role="status" style={{'--rune-glow':claimed.color} as React.CSSProperties}>
    <div className="reward-rune-icon"><RuneStone id={claimed.id}/></div>
    <div><small>{vi?'Ấn đã nhận':'Rune received'}</small><h3>{vi?claimed.vi:claimed.en}</h3><p>{RUNE_SHORT[claimed.id][vi?0:1]}</p></div>
   </div>}</div>
  <footer>
   <button type="button" onClick={()=>engine?.goToLobby()}><Home size={17} aria-hidden="true"/>{vi?'Về trại':'Back to camp'}</button>
   {!pending&&!engine?.isChristmasTrail&&<>
    <button type="button" onClick={()=>setBag(true)}><Backpack size={17} aria-hidden="true"/>{vi?'Túi đồ':'Inventory'}</button>
    <button type="button" className="reward-next" onClick={()=>engine?.requestNextBattle()}>
     {engine?.currentLevelIdx===4?(vi?'Đến đấu trường':'Enter the arena'):(vi?'Đi tiếp':'Next')}<ArrowRight size={17} aria-hidden="true"/>
    </button>
   </>}
  </footer>
 </section>{bag&&<div className="modal-backdrop inventory-backdrop"><div className="panel inventory-modal forest-dialog"><TrailInventory engine={engine} hud={hud} close={()=>setBag(false)}/></div></div>}</div>;
}
