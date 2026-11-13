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

  // Global key listener to start boss fight immediately with Enter, Space, or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        engine?.beginBossFight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  if (hud.bossKind === 'demon') {
    return (
      <div
        className="demon-intro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demon-intro-title"
        ref={dialog}
        tabIndex={0}
      >
        <div className="demon-intro-portrait" aria-hidden="true" />
        <section className="demon-intro-content">
          <small className="demon-intro-kicker">
            {vi ? 'MÀN 13 · SÂU TRONG HANG' : 'TRAIL 13 · DEEP WITHIN THE CAVE'}
          </small>
          <h2 id="demon-intro-title">{vi ? 'QUỶ TÂM HỎA' : 'EMBER DEMON'}</h2>
          <p className="demon-intro-desc">
            {vi
              ? 'Ngọn lửa cổ đại dưới lòng đất đã thức tỉnh.'
              : 'The ancient flame beneath the earth has awakened.'}
          </p>
          <ol className="demon-intro-tips">
            <li>
              <b>{vi ? 'I. Phong ấn Lõi Nguyên Tố' : 'I. Seal Elemental Core'}</b>
              <span>
                {vi
                  ? 'Đứng lên bệ ấn dập tắt 1 Lõi; Boss nuốt lõi còn lại để tiến hóa.'
                  : 'Stand on core plate to seal it; Boss absorbs the other to evolve.'}
              </span>
            </li>
            <li>
              <b>{vi ? 'II. Ép Quá Tải & Nhử Bằng Echo' : 'II. Overheat & Echo Bait'}</b>
              <span>
                {vi
                  ? 'Khi Boss bọc giáp nhiệt, dùng Echo đứng nhử tại Trụ Tản Nhiệt.'
                  : 'When Boss heat-shields, place an Echo decoy at the Cooling Vent.'}
              </span>
            </li>
            <li>
              <b>{vi ? 'III. Sốc Nhiệt Phá Giáp x2.5 Sát Thương' : 'III. Thermal Shock x2.5 Dmg'}</b>
              <span>
                {vi
                  ? 'Boss húc trúng Trụ sẽ bị nổ giáp, choáng 4.5s lộ điểm yếu chí mạng!'
                  : 'Baiting charge into Vent shatters shield and stuns Boss for x2.5 crit!'}
              </span>
            </li>
          </ol>
          <button
            className="demon-intro-start-btn"
            onClick={() => engine?.beginBossFight()}
            autoFocus
          >
            <span>{vi ? 'VÀO TRẬN · QUYẾT CHIẾN' : 'START BATTLE · FIGHT'}</span>
            <ArrowRight size={22} />
          </button>
        </section>
      </div>
    );
  }
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
