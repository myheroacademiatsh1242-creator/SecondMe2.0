import {useEffect,useRef} from 'react';
import {Play,Pause,ClipboardList} from 'lucide-react';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {PausedQuests} from './PausedQuests.tsx';
import {translate} from '../i18n.ts';
import './MissionBriefing.css';
export function MissionBriefing({engine,hud,touch}:{engine:GameEngine;hud:HUDState;touch:boolean}){
 const button=useRef<HTMLButtonElement>(null);const vi=hud.language==='vi';
 useEffect(()=>{button.current?.focus({preventScroll:true});},[]);
 return <div className="mission-briefing-backdrop"><section className="mission-briefing" role="dialog" aria-modal="true" aria-labelledby="mission-briefing-title" onKeyDown={event=>{event.stopPropagation();if(event.key==='Tab'){event.preventDefault();button.current?.focus();}}}>
  <span className="mission-eyebrow"><ClipboardList size={17} aria-hidden="true"/>{vi?'TRƯỚC KHI LÊN ĐƯỜNG':'BEFORE YOU BEGIN'}</span>
  <h2 id="mission-briefing-title">{vi?'Nhiệm vụ màn này':'Your mission'}</h2>
  <p className="mission-level">{hud.levelName} · {translate(hud.levelSubtitle,hud.language)}</p>
  <PausedQuests hud={hud} levelId={engine.currentLevel.id}/>
  {engine.usesExplorationFog && <p>{vi?'Đi tới đâu, sương tan tới đó. Vùng đã khám phá vẫn sáng. Một số góc khuất có rương bí mật, hãy bước lại gần để mở.':'Move to clear the fog. Explored areas stay visible. Some corners hide a chest. Walk up to open it.'}</p>}
  <p className="mission-review"><Pause size={18} aria-hidden="true"/><span>{vi?(touch?'Muốn xem lại nhiệm vụ, chạm nút Tạm dừng ở góc màn hình.':'Muốn xem lại nhiệm vụ, bấm Tạm dừng hoặc nhấn Esc / P.'):(touch?'To review your quests, tap Pause in the corner.':'Review your quests with Pause or Esc / P.')}</span></p>
  <p className="mission-safe">{vi?'Trận đấu và đồng hồ chỉ bắt đầu khi bạn sẵn sàng.':'The action and timer wait until you are ready.'}</p>
  <button ref={button} type="button" onClick={()=>engine.continueMission()}><Play size={17} aria-hidden="true"/>{vi?'TIẾP TỤC':'CONTINUE'}</button>
 </section></div>;
}
