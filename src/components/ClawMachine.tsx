import {clawRewardText} from '../game/logic/clawRewards.ts';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameEngine } from '../game/GameEngine.ts';
import { CLAW_COST } from '../game/logic/campaign.ts';
import './ClawMachine.css';

/**
 * The Noel claw machine (public/minigames/claw-noel.html) in a full-screen frame. The machine asks
 * to spend a play and reports each prize collected; the game owns the Noel tickets and the rewards.
 */
export function ClawMachine({ engine, close, container }: { engine: GameEngine; close: () => void; container?: HTMLElement }) {
  const [rewards,setRewards]=useState<{id:number;text:string}[]>([]);
  const rewardSequence=useRef(0);
  useEffect(()=>{
    if(!rewards.length)return;
    const timer=window.setTimeout(()=>setRewards(current=>current.slice(1)),8000);
    return()=>window.clearTimeout(timer);
  },[rewards]);
  const [welcome,setWelcome] = useState(false);
  useEffect(() => {
    if (!welcome) return;
    const timer = window.setTimeout(() => setWelcome(false), 6000);
    return () => window.clearTimeout(timer);
  }, [welcome]);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const send = (ok?: boolean) => frame.current?.contentWindow?.postMessage(
      { type: 'claw:tickets', tickets: engine.clawTickets, cost: CLAW_COST, ok }, location.origin);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { type?: string; kind?: number };
      if (m.type === 'claw:ready') { if (engine.enterClawMachine()) setWelcome(true); send(); }
      else if (m.type === 'claw:spend') send(engine.spendClawPlay());
      else if (m.type === 'claw:prize' && typeof m.kind === 'number') { const prize=engine.claimClawPrize(m.kind);
        if(prize){
          const text=clawRewardText(prize,engine.language==='vi');
          setRewards(current=>[...current,{id:++rewardSequence.current,text}].slice(-4));
          frame.current?.contentWindow?.postMessage({type:'claw:reward',text},location.origin);
        }
        send(); }
      else if (m.type === 'claw:close') close();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [engine, close]);
  return createPortal(<div className="claw-machine-layer" role="dialog" aria-modal="true" aria-label="Máy gắp quà Noel">
    <iframe onLoad={() => frame.current?.focus()} ref={frame} title="Máy gắp quà Noel" src={`${import.meta.env.BASE_URL}minigames/claw-noel.html`}/>
    {rewards.length>0&&<section className="claw-rewards" aria-label={engine.language==='vi'?'Phần thưởng đã nhận':'Rewards received'}>
      <div role="status" aria-live="polite" aria-atomic="true">
        <strong>{engine.language==='vi'?'PHẦN THƯỞNG ĐÃ NHẬN':'REWARDS RECEIVED'}</strong>
        <ul>{rewards.map(reward=><li key={reward.id}>{reward.text}</li>)}</ul>
      </div>
      <button type="button" onClick={()=>{setRewards([]);frame.current?.focus();}} aria-label={engine.language==='vi'?'Đóng thông báo phần thưởng':'Dismiss reward notification'}>×</button>
    </section>}
    <div className="claw-welcome" role="status" aria-live="polite">{welcome && (engine.language === 'vi' ? 'Bạn được tặng 3 vé Noel!' : 'You received 3 Noel tickets!')}</div>
  </div>, container ?? document.body);
}
