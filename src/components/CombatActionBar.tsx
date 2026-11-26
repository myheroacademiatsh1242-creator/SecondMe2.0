import {bindingLabel,controls,keyLabel,type ControlAction} from '../game/logic/controlSettings.ts';
import {CombatPixelIcon} from './CombatPixelIcon.tsx';
import { Circle, Square, Zap } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import './CombatActionBar.css';
import { MAX_RECORDING_DURATION_MS } from '../game/logic/recorder.ts';
import { TouchSkills } from './TouchControls.tsx';

const keyActions: Record<string,ControlAction> = {attack:'attack',skill:'skill',ultimate:'ultimate',dodge:'dodge',record:'record',recall:'recall',echo:'summon'};

const MOUSE_CAPS: Record<string,string> = {Mouse0:'LMB',Mouse1:'MMB',Mouse2:'RMB',ShiftLeft:'SHIFT',ShiftRight:'SHIFT'};
const shortCap = (binding:string) => MOUSE_CAPS[binding] ?? keyLabel(binding, 'en');

export function CombatActionBar({engine,hud,touch=false}:{engine:GameEngine|null;hud:HUDState;touch?:boolean}){
 const vi=hud.language==='vi',mage=hud.characterClass==='mage',mechanical=hud.characterClass==='mechanical',assassin=hud.characterClass==='assassin';
 const skill=mage?(vi?'Gai băng':'Ice Spikes'):assassin?(vi?'Bóng Ma Đỏ':'Crimson Phantom'):mechanical?(vi?'Quá tải':'Overdrive'):(vi?'Thánh vực':'Sanctuary');
 const actions=[
  {id:'attack',name:vi?(mage?'Bắn phép':'Tấn công'):(mage?'Cast':'Attack'),key:vi?'CHUỘT TRÁI':'LMB',icon:<CombatPixelIcon kind={mage?'cast':'sword'}/>,cooldown:hud.attackCooldown,max:.55,disabled:false,detail:vi?'Bấm liên tiếp để nối combo 3 hoặc 4 đòn.':'Press repeatedly to chain a combo.',run:()=>{const before=engine?.attackCooldown;engine?.attack();if(engine&&engine.attackCooldown!==before)engine.onboarding.event('hud-action');}},
  {id:'skill',name:skill,key:vi?'SPACE / CHUỘT PHẢI':'SPACE / RMB',icon:<CombatPixelIcon kind={mage?'ice':assassin?'dodge':mechanical?'overdrive':'shield'}/>,cooldown:hud.skillCooldown,max:mage?6:assassin?4.5:mechanical?10:9,disabled:hud.skillCooldown>0||(hud.mana??100)<(hud.skillManaCost??25),detail:mage?(vi?'Vùng gai băng: ưu tiên boss, rồi quái gần nhất, cuối cùng vị trí chuột.':'Ice eruption: boss first, then nearest enemy, otherwise the cursor.'):(vi?'Kích hoạt kỹ năng riêng của nhân vật.':'Activate your hero’s special skill.'),run:()=>{const before=engine?.skillCooldown;engine?.useSkill();if(engine&&engine.skillCooldown!==before)engine.onboarding.event('hud-action');}},
  // Ultimate: its track is the rage bar; it lights up when full (GameEngine.useUltimate).
  ...(hud.hasUltimate?[{id:'ultimate',name:vi?'Tuyệt kỹ':'Ultimate',key:vi?'V / CHUỘT GIỮA':'V / MMB',icon:<Zap/>,cooldown:0,max:1,fill:(hud.rage??0)/(hud.maxRage??100),badge:Math.floor(hud.rage??0),disabled:(hud.rage??0)<(hud.maxRage??100),detail:vi?'Cần đầy Nộ (đánh trúng, bị đánh). Đứng yên: Mưa băng · Đi về phía mục tiêu: Tia bí thuật · Đi lùi: Ngưng đọng thời gian.':'Needs full Rage (land hits, take hits). Still: Icicle Rain · Moving at the target: Arcane Beam · Moving away: Time Stop.',run:()=>engine?.useUltimate()}]:[]),
  {id:'dodge',name:vi?'Né tránh':'Dodge',key:'SHIFT',icon:<CombatPixelIcon kind="dodge"/>,cooldown:hud.dodgeCooldown,max:1.2,disabled:hud.dodgeCooldown>0,detail:vi?'Né đòn theo hướng di chuyển.':'Evade in your movement direction.',run:()=>engine?.dodge()},
  {id:'record',name:hud.recordingStatus==='recording'?(vi?'Dừng ghi':'Stop'):(vi?'Ghi hình':'Record'),key:'E',icon:hud.recordingStatus==='recording'?<Square fill="currentColor"/>:<Circle fill="currentColor"/>,cooldown:0,max:1,disabled:false,detail:vi?'Ghi đường đi để Echo lặp lại.':'Record a path for an Echo to replay.',run:()=>engine?.toggleRecording()},
  {id:'recall',name:vi?'Thu Echo':'Recall Echo',key:'X',icon:<CombatPixelIcon kind="recall"/>,cooldown:0,max:1,disabled:hud.echoCount<=0,detail:vi?'Thu hồi Echo được gọi đầu tiên để sắp xếp lại đội hình.':'Recall the oldest Echo to rearrange your formation.',run:()=>engine?.dismissEcho()},
  {id:'echo',name:vi?'Gọi Echo':'Summon Echo',key:'Q',icon:<CombatPixelIcon kind="echo"/>,cooldown:0,max:1,disabled:hud.echoCharges<=0,detail:vi?'Gọi Echo từ ký ức đã ghi bằng E.':'Summon an Echo from the memory recorded with E.',run:()=>engine?.spawnEcho()},
 ];
 for(const action of actions)action.key=bindingLabel(keyActions[action.id], hud.language);
 if(touch)return <TouchSkills actions={actions} mana={hud.mana??100} maxMana={hud.maxMana??100} manaCost={hud.skillManaCost??25} charges={hud.echoCharges} recording={hud.recordingStatus==='recording'} vi={vi}/>;
 const recording=hud.recordingStatus==='recording';
 const maxSeconds=MAX_RECORDING_DURATION_MS/1000;
 const recorded=recording?Math.min(maxSeconds,Math.floor((MAX_RECORDING_DURATION_MS-hud.recordingTimeRemaining)/1000)):0;
 const echoes=hud.echoList??[];
 const button=(id:string)=>{
  const a=actions.find(action=>action.id===id);
  if(!a)return null;
  const keys=controls.value.keys[keyActions[a.id]];
  // Left/right mouse is the cap when bound (RMB rather than Space); every binding stays in the tooltip.
  const cap=shortCap(keys.find(key=>key==='Mouse0'||key==='Mouse2')??keys[0]);
  const fill='fill' in a&&a.fill!==undefined?a.fill:Math.max(0,1-a.cooldown/a.max);
  return <button key={a.id} className={`nh-action action-${a.id}${a.cooldown>0?' is-recovering':''}${'fill' in a&&!a.disabled?' is-ready':''}${a.id==='record'&&recording?' is-recording':''}`} disabled={a.disabled} title={`${a.name} · ${a.key}\n${a.detail}`} aria-label={`${a.name} · ${a.key}${a.cooldown>0?` · ${a.cooldown.toFixed(1)}s`:''}`} style={{'--fill':fill} as React.CSSProperties} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();a.run();}}>
   <span className="nh-icon">{a.icon}{a.cooldown>0&&<b className="nh-timer">{a.cooldown.toFixed(1)}s</b>}{a.id==='echo'&&<b className="nh-charges">{hud.echoCharges}</b>}</span>
   <kbd aria-hidden="true">{cap}</kbd><strong>{a.name}</strong>
   {a.id==='record'&&<small>{recorded} / {maxSeconds}s</small>}
   {a.id==='skill'&&<small className="nh-cost">{hud.skillManaCost??25} MP</small>}
  </button>;
 };
 return <div className="nh-bar" role="group" aria-label={vi?'Chiêu và điều khiển chiến đấu':'Combat abilities and controls'}>
  <div className="nh-echo">
   <ol className="nh-panel nh-echo-slots" aria-label={`Echo ${echoes.length} / ${hud.echoLimit}`}>{Array.from({length:hud.echoLimit},(_,i)=>{const echo=echoes[i];return <li key={i} className={echo?(i===(hud.selectedEcho??0)?'filled selected':'filled'):undefined}><b>{i+1}</b><span aria-hidden="true">{echo?<i style={{height:`${Math.max(0,Math.min(100,echo.stability))}%`}}/>:'+'}</span></li>;})}</ol>
   {['record','echo','recall'].map(button)}
  </div>
  <div className="nh-panel nh-skills">{['attack','skill','dodge','ultimate'].map(button)}</div>
 </div>;
}
