import {useState} from 'react';
import {ArrowRight,Home,Backpack} from 'lucide-react';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {ECHO_RUNES} from '../game/logic/echoRunes.ts';
import {RuneStone,RUNE_SHORT} from './EchoRunes.tsx';
import {VictoryStars} from './CampaignUI.tsx';
import {TrailInventory} from './TrailInventory.tsx';
import {translate} from '../i18n.ts';
import './RuneRewardFlow.css';
export function RuneRewardFlow({engine,hud}:{engine:GameEngine|null;hud:HUDState}){
 const vi=hud.language==='vi',pending=!!hud.pendingRuneChoices?.length;
 const [bag,setBag]=useState(false);
 const claimed=ECHO_RUNES.find(r=>r.id===hud.lastRuneReward);
 return <div className="modal-backdrop reward-flow-backdrop"><section className={`reward-flow ${pending?'is-choosing':'is-claimed'}`} role="dialog" aria-modal="true" aria-labelledby="reward-flow-title" data-reduced-motion={hud.reducedMotion}>
  <header><h2 id="reward-flow-title">{vi?'HOÀN THÀNH MÀN':'TRAIL COMPLETE'}</h2></header>
  <div className="reward-flow-body">{pending?<>
   <p className="reward-intro" role="status">{vi?'Chọn 1 trong 3 ấn để thêm vào túi.':'Choose one of three runes for your inventory.'}</p>
   <div className="reward-three">{hud.pendingRuneChoices!.map(id=>{const rune=ECHO_RUNES.find(r=>r.id===id)!;return <button key={id} onClick={()=>engine?.chooseRune(id)} aria-label={`${vi?'Chọn':'Choose'} ${vi?rune.vi:rune.en}`} style={{'--rune-glow':rune.color} as React.CSSProperties}><div className="reward-pedestal"><RuneStone id={id}/></div><strong>{vi?rune.vi:rune.en}</strong><p>{RUNE_SHORT[id][vi?0:1]}</p><span>{vi?'CHỌN':'CHOOSE'} <ArrowRight size={16}/></span></button>;})}</div>
   <small className="reward-rule">{vi?'Nhận 1 ấn · Dùng cho Echo ở màn 2–12 · Kích hoạt trong túi đồ':'Keep 1 rune · Use for Echoes in levels 2–12 · Activate from inventory'}</small>
  </>:<>
   <p className="reward-intro">{translate(hud.levelName,hud.language)} · {translate(hud.levelSubtitle,hud.language)}</p>
   <VictoryStars count={hud.lastRating?.stars??0} vi={vi}/>
   {claimed&&<div className="reward-chosen" role="status" style={{'--rune-glow':claimed.color} as React.CSSProperties}><div className="reward-pedestal"><RuneStone id={claimed.id}/></div><small>{vi?'ẤN ĐÃ NHẬN':'RUNE RECEIVED'}</small><h3>{vi?claimed.vi:claimed.en}</h3><p>{RUNE_SHORT[claimed.id][vi?0:1]}</p></div>}
   <div className="reward-totals"><span>+{hud.lastRating?.keys??0} {vi?'CHÌA KHÓA':'KEYS'}</span><span>+{hud.lastRating?.coins??0} {vi?'XU':'COINS'}</span><span>{hud.elapsedLevelTime.toFixed(1)}s</span></div>
   <button className="reward-next" onClick={()=>engine?.nextLevel()}>{engine?.currentLevelIdx===4?(vi?'ĐẾN ĐẤU TRƯỜNG':'ENTER THE ARENA'):(vi?'ĐI TIẾP':'NEXT')} <ArrowRight size={20}/></button>
  </>}</div>
  <footer>{pending?<><button onClick={()=>engine?.goToLobby()}><Home size={17}/>{vi?'VỀ TRẠI':'BACK TO CAMP'}</button></>:<><button onClick={()=>engine?.goToLobby()}><Home size={17}/>{vi?'VỀ TRẠI':'BACK TO CAMP'}</button><button onClick={()=>setBag(true)}><Backpack size={17}/>{vi?'TÚI ĐỒ':'INVENTORY'}</button></>}</footer>
 </section>{bag&&<div className="modal-backdrop inventory-backdrop"><div className="panel inventory-modal forest-dialog"><TrailInventory engine={engine} hud={hud} close={()=>setBag(false)}/></div></div>}</div>;
}
