import {liveKeyLabel} from '../game/logic/controlSettings.ts';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {TUTORIAL_STEPS} from '../game/logic/interactiveTutorial.ts';
import './InteractiveCoach.css';
export function InteractiveCoach({engine,hud,touch}:{engine:GameEngine;hud:HUDState;touch:boolean}){
 const tutorial=engine.onboarding;useSyncExternalStore(tutorial.subscribe,tutorial.snapshot);
 const active=tutorial.active;const [confirm,setConfirm]=useState(false);
 useEffect(()=>{if(!confirm)return;const playing=engine.screen==='playing';if(playing)engine.pauseGame();return()=>{if(playing&&engine.screen==='paused')engine.resumeGame();};},[confirm,engine]);
 const [spot,setSpot]=useState<{x:number;y:number;width:number;height:number}|null>(null);
 const [side,setSide]=useState('left');const card=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!active){setSpot(null);return;}
  const update=()=>{
   const target=Array.from(document.querySelectorAll<HTMLElement>(active.target)).find(e=>e.getClientRects().length&&!e.closest('[inert]'));
   let r=target?.getBoundingClientRect();
   const arena=document.querySelector('[data-testid="game-canvas"]')?.getBoundingClientRect();
   if(arena&&['echo.walk','echo.save','echo.hold'].includes(active.id)){
     const at=active.id==='echo.hold'?(engine.echo??engine.player):engine.player;
     const plate=active.id==='echo.walk'?engine.currentLevel.plates[Math.min(engine.checkpointIndex,engine.currentLevel.plates.length-1)]:[...engine.currentLevel.plates].sort((a,b)=>Math.hypot(a.x-at.x,a.y-at.y)-Math.hypot(b.x-at.x,b.y-at.y))[0];
     if(plate)r=new DOMRect(arena.left+plate.x/1280*arena.width,arena.top+plate.y/720*arena.height,plate.width/1280*arena.width,plate.height/720*arena.height);
   }
   const next = r&&r.width>0&&r.height>0?{x:r.left,y:r.top,width:r.width,height:r.height}:null;
   setSpot(previous => previous && next && previous.x===next.x && previous.y===next.y && previous.width===next.width && previous.height===next.height ? previous : next);
   const playerX=arena?arena.left+engine.player.x/1280*arena.width:innerWidth/2;
   setSide(r&&r.width<innerWidth*.55?(r.left+r.width/2>innerWidth/2?'left':'right'):(playerX<innerWidth/2?'right':'left'));
  };update();const timer=setInterval(update,200);return()=>clearInterval(timer);
 },[active?.id,engine]);
 if(!active&&!confirm)return null;
 const track=TUTORIAL_STEPS.filter(s=>s.track===active?.track);const progress=track.findIndex(s=>s.id===active?.id.replace(/\.recover$/,''))+1;
 const key=touch&&active?.id.endsWith('.recover')?({'record-start':'Chạm Ghi hình','record-save':'Chạm Dừng ghi','echo-summon':'Chạm Gọi Echo','inventory-open':'Chạm Túi đồ','rune-edit':'Chạm Đổi rune'} as Record<string,string>)[active.event]??active.key:touch?({'combat.move':'Kéo joystick','combat.aim':'Đổi hướng joystick','combat.attack':'Chạm Tấn công','combat.combo':'Giữ Tấn công','combat.skill':'Chạm Kỹ năng','combat.dodge':'Chạm Né','echo.record':'Chạm Ghi hình','echo.save':'Chạm Dừng ghi','echo.summon':'Chạm Gọi Echo','echo.pause':'Chạm Dừng / Phát','echo.swap':'Chạm Đổi chỗ','echo.recall':'Chạm Thu Echo','echo.mark':'Đánh dấu → chạm sân','pack.use':'Chạm ô vật phẩm','pack.time':'Chạm bình thời gian','ultimate.use':'Chạm Tuyệt kỹ','menu.pause':'Chạm Tạm dừng'} as Record<string,string>)[active?.id.replace(/\.recover$/,'')??'']??active?.key:active?.key;
 const content=<>
  {spot&&<div className={`tutorial-spotlight${touch?' tutorial-spotlight-touch':''}`} aria-hidden="true" style={{left:spot.x-4,top:spot.y-4,width:spot.width+8,height:spot.height+8}}/>}
  {active&&touch&&<aside className={`interactive-coach coach-${side} coach-touch coach-compact`} aria-label="Hướng dẫn tương tác" data-tutorial-step={active.id}>
   <div className="coach-progress"><span>HƯỚNG DẪN</span><span>{progress} / {track.length}</span></div>
   <h2>{active.title}</h2>
   <div className="coach-compact-action"><span aria-hidden="true">{spot?(side==='left'?'→':'←'):'›'}</span><kbd>{key}</kbd></div>
   <details key={active.id}>
    <summary>Chi tiết</summary>
    <p>{active.text}</p>
    {engine.tutorialClockPaused&&<small className="coach-clock-note">Đồng hồ chặng tạm dừng trong bước học này.</small>}
    <footer><button type="button" onClick={()=>tutorial.skip()}>Bỏ qua bước</button><button type="button" onClick={()=>setConfirm(true)}>Bỏ qua toàn bộ</button>{tutorial.replayTrack&&<button type="button" onClick={()=>tutorial.endReplay()}>Dừng xem lại</button>}</footer>
   </details>
  </aside>}
  {active&&!touch&&<aside ref={card} className={`interactive-coach coach-${side}`} aria-label="Hướng dẫn tương tác" data-tutorial-step={active.id}>
   <div className="coach-progress"><span>HƯỚNG DẪN · {active.track.toUpperCase()}</span><span>{progress} / {track.length}</span></div>
   <h2>{active.title}</h2><p aria-live="polite">{active.text}</p><kbd>{touch?key:liveKeyLabel(key??'')}</kbd>{engine.tutorialClockPaused&&<small className="coach-clock-note">Đồng hồ chặng tạm dừng trong bước học này.</small>}
   {spot&&<span className="coach-point" aria-hidden="true">↗ Thao tác ở vùng sáng</span>}
   <footer><button type="button" onClick={()=>tutorial.skip()}>Bỏ qua bước</button><button type="button" onClick={()=>setConfirm(true)}>Bỏ qua toàn bộ</button>{tutorial.replayTrack&&<button type="button" onClick={()=>tutorial.endReplay()}>Dừng xem lại</button>}</footer>
  </aside>}
  {confirm&&<div className="coach-confirm-backdrop" onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();setConfirm(false);}if(event.key==='Tab'){const controls=Array.from(event.currentTarget.querySelectorAll('button'));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}><section className="coach-confirm" role="alertdialog" aria-modal="true" aria-labelledby="coach-skip-title"><h2 id="coach-skip-title">Bỏ qua toàn bộ hướng dẫn?</h2><p>Không mua đồ, mở rương hay tiêu hao tài nguyên. Bạn vẫn chơi bình thường và có thể xem lại trong Sổ tay.</p><button autoFocus onClick={()=>setConfirm(false)}>Tiếp tục học</button><button onClick={()=>{tutorial.skipAll();setConfirm(false);}}>Xác nhận bỏ qua</button></section></div>}
 </>;
 const modal=document.querySelector('dialog[open]');return modal?createPortal(content,modal):content;
}
