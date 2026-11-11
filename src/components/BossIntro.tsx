import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Move, Snowflake, Swords } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { sounds } from '../game/logic/sound.ts';
import './BossIntro.css';

// Snowflakes: fixed spread (no randomness, so every showing looks the same and nothing re-rolls on render).
const SNOW = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100, size: 2 + (i % 3) * 2, delay: -((i * 0.61) % 6), duration: 5 + (i % 5) * 1.3, drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
}));

/** Reveals the Guardian's name before the combat briefing. */
export function BossIntro({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const vi = hud.language === 'vi';
  const [skipped, setSkipped] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const roarPlayed = useRef(false);
  const playRoar = useCallback(() => {
    if (roarPlayed.current) return;
    roarPlayed.current = true;
    sounds.playGuardianReveal();
  }, []);
  useEffect(() => { dialog.current?.focus(); }, []);
  useEffect(() => {
    if (hud.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) playRoar();
  }, [hud.reducedMotion, playRoar]);
  return <div ref={dialog} tabIndex={-1} className={`boss-cut${skipped || hud.reducedMotion ? ' is-skipped' : ''}`} role="dialog" aria-modal="true" aria-labelledby="boss-intro-name"
    onPointerDown={() => { setSkipped(true); playRoar(); }}>
    <div className="boss-cut-snow" aria-hidden="true">
      {SNOW.map((f, i) => <i key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s`, '--drift': `${f.drift}px` } as CSSProperties}/>)}
    </div>
    <div className="boss-cut-band" aria-hidden="true"><i/><i/></div>
    <div className="boss-cut-guardian" aria-hidden="true"><div className="boss-cut-shockwave" />
      <div className="boss-cut-sprite" />
      <div className="boss-cut-burst" onAnimationStart={event => {
        if (event.animationName === 'boss-burst') sounds.playGuardianLanding();
      }} /></div>
    <div className="boss-cut-danger" aria-hidden="true" />

    <section className="boss-cut-copy">
      <h2 id="boss-intro-name" onAnimationStart={event => {
        if (event.animationName === 'boss-name-enter') playRoar();
      }}>{vi ? <>THỦ VỆ<br/>BĂNG</> : <>FROST<br/>GUARDIAN</>}</h2>
      <div className="boss-cut-brief">
        <ol>
          <li><Snowflake aria-hidden="true"/><b>{vi ? 'Phá 4 trụ · Khiên hồi theo pha' : 'Break 4 pillars · Shield returns by phase'}</b></li>
          <li><Move aria-hidden="true"/><b>{vi ? 'Lướt khỏi vùng báo đòn' : 'Dash out of marked zones'}</b></li>
          <li><Swords aria-hidden="true"/><b>{vi ? 'Đánh khi hiện “Sơ hở”' : 'Strike when “Opening” appears'}</b></li>
        </ol>
        <button className="boss-cut-start" onClick={() => engine?.beginBossFight()}>{vi ? 'Vào trận' : 'Start fight'} <ArrowRight size={20}/></button>
      </div>
    </section>
  </div>;
}
