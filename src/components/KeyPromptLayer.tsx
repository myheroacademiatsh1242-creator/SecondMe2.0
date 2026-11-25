import { Clock3, Footprints, Link, Shield, Snowflake, Sparkles, Swords, TriangleAlert, X } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { GUIDE_TOPICS, type GuideTopic } from '../game/logic/tutorials.ts';
import './KeyPromptLayer.css';

const icons: Record<GuideTopic, typeof Clock3> = {
  echo: Footprints, links: Link, enemies: Swords, vines: Footprints, crusher: TriangleAlert,
  spikes: TriangleAlert, rocks: TriangleAlert, time: Clock3, multi: Link, recycle: Footprints,
  upgradeRunes: Sparkles, shield: Snowflake, bossPatterns: TriangleAlert, skillPickups: Sparkles,
  shieldRestored: Shield, decoy: Footprints, vulnerable: Swords, ward: Shield, release: Footprints, rhythm: Clock3,
};

/**
 * In-match help outside the canvas. The key hint itself is drawn by the hero
 * (rendering/keyPrompt.ts); this layer shows the "New" card when the player meets a mechanic for
 * the first time — on entering a level that has it, or on walking up to it. One card at a time,
 * gone after a few seconds (TutorialDirector), never pausing play.
 */
export function KeyPromptLayer({ engine, hud }: { engine: GameEngine; hud: HUDState; touch: boolean }) {
  const topic = hud.guideTopic as GuideTopic | null | undefined;
  if (!topic || hud.guideLibrary || hud.bossIntroduction) return null;
  const vi = hud.language === 'vi';
  const [title, , short] = GUIDE_TOPICS[topic][vi ? 'vi' : 'en'];
  const Icon = icons[topic];
  return <aside key={topic} className="new-mechanic stone-frame" role="status" aria-live="polite">
    <span className="new-mechanic-badge">{vi ? 'MỚI' : 'NEW'}</span>
    <Icon className="new-mechanic-icon" size={22} aria-hidden="true"/>
    <div className="new-mechanic-text"><strong>{title}</strong><span>{short}</span></div>
    <button type="button" className="new-mechanic-more" onClick={() => { engine.openGuide(); engine.replayGuide(topic); }}>{vi ? 'Chi tiết' : 'Details'}</button>
    <button type="button" className="new-mechanic-close" aria-label={vi ? 'Đóng' : 'Close'} onClick={() => engine.dismissGuide()}><X size={16}/></button>
  </aside>;
}
