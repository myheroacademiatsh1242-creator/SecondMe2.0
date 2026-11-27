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
        if(prize)frame.current?.contentWindow?.postMessage({type:'claw:reward',text:clawRewardText(prize,engine.language==='vi')},location.origin);
        send(); }
      else if (m.type === 'claw:close') close();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [engine, close]);
  return createPortal(<div className="claw-machine-layer" role="dialog" aria-modal="true" aria-label="Máy gắp quà Noel">
    <iframe onLoad={() => frame.current?.focus()} ref={frame} title="Máy gắp quà Noel" src={`${import.meta.env.BASE_URL}minigames/claw-noel.html`}/>
    <div className="claw-welcome" role="status" aria-live="polite">{welcome && (engine.language === 'vi' ? 'Bạn được tặng 3 vé Noel!' : 'You received 3 Noel tickets!')}</div>
  </div>, container ?? document.body);
}
