import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { PlayerGuide } from './guide/PlayerGuide.tsx';
import './MechanicGuide.css';

/**
 * The full player guide opened during play (the book button, or "Details" on a New card).
 * Play stays frozen while it is open (guides.blocking). The in-match hints themselves are the
 * key prompt by the hero (rendering/keyPrompt.ts) and the New card (KeyPromptLayer.tsx).
 */
export function MechanicGuide({ engine, hud }: { engine: GameEngine | null; hud: HUDState; touch: boolean }) {
  if (hud.guideLibrary !== true) return null;
  return <PlayerGuide progress={engine?.campaign} lang={hud.language === 'vi' ? 'vi' : 'en'} topic={hud.guideTopic}
    onClose={() => engine?.closeGuide()} onReplayTutorial={track => { engine?.onboarding.replay(track); engine?.closeGuide(); }}/>;
}
