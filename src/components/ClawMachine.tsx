import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameEngine } from '../game/GameEngine.ts';
import { CLAW_COST } from '../game/logic/campaign.ts';
import './ClawMachine.css';

/**
 * The Noel claw machine (public/minigames/claw-noel.html) in a full-screen frame. The machine asks
 * to spend a play and reports each prize collected; the game owns the Noel tickets and the rewards.
 */
export function ClawMachine({ engine, close }: { engine: GameEngine; close: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const send = (ok?: boolean) => frame.current?.contentWindow?.postMessage(
      { type: 'claw:tickets', tickets: engine.clawTickets, cost: CLAW_COST, ok }, location.origin);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { type?: string; kind?: number };
      if (m.type === 'claw:ready') send();
      else if (m.type === 'claw:spend') send(engine.spendClawPlay());
      else if (m.type === 'claw:prize' && typeof m.kind === 'number') { engine.claimClawPrize(m.kind); send(); }
      else if (m.type === 'claw:close') close();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [engine, close]);
  return createPortal(<div className="claw-machine-layer" role="dialog" aria-modal="true" aria-label="Máy gắp quà Noel">
    <iframe ref={frame} title="Máy gắp quà Noel" src={`${import.meta.env.BASE_URL}minigames/claw-noel.html`}/>
  </div>, document.body);
}
