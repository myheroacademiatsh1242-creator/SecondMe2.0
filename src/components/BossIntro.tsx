import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Gem, Link, Move, Snowflake, Swords, Zap } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { sounds } from '../game/logic/sound.ts';
import './BossIntro.css';
import { DemonSlimeMerge } from './DemonSlimeMerge.tsx';

// Snowflakes: fixed spread (no randomness, so every showing looks the same and nothing re-rolls on render).
const SNOW = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100, size: 2 + (i % 3) * 2, delay: -((i * 0.61) % 6), duration: 5 + (i % 5) * 1.3, drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
}));

// Embers rising off the lava: fixed spread like the snow, so every showing looks the same.
const EMBERS = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 41) % 100, size: 2 + (i % 3) * 2, delay: -((i * 0.53) % 5), duration: 3.6 + (i % 5) * 1.1, drift: (i % 2 ? 1 : -1) * (10 + (i % 4) * 9),
}));

/**
 * Reveals the boss before the combat briefing. Ember Demon: many slimes merge and the demon rises from their lava first
 * (DemonSlimeMerge over .demon-intro.is-transforming), then the camera hands off (both scenes on screen: the merge's cave fades
 * out over the cinematic while the demon glides to its place) and the cinematic (.demon-cut) runs: it swings its burning blade,
 * the name slams in, the briefing follows. Skipping jumps straight to the cinematic.
 */
export function BossIntro({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const vi = hud.language === 'vi';
  const [skipped, setSkipped] = useState(false);
  const [phase, setPhase] = useState<'merge' | 'handoff' | 'cut'>('merge');
  const handedOff = useRef(false);
  const entering = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const demon = hud.bossKind === 'demon';
  const still = hud.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transforming = demon && !still && phase === 'merge';
  const enterFight = useCallback(() => {
    if (entering.current) return;
    entering.current = true;
    if (demon && !still) {
      sounds.playStoneClick();
      setLeaving(true);
    } else engine?.beginBossFight();
  }, [demon, still, engine]);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => engine?.beginBossFight(), 300);
    return () => window.clearTimeout(timer);
  }, [leaving, engine]);
  useEffect(() => {
    if (demon && !transforming) engine?.revealDemon();
  }, [demon, transforming, engine]);
  const dialog = useRef<HTMLDivElement>(null);
  const introRumblePlayed = useRef(false);
  useEffect(() => {
    if (!transforming || introRumblePlayed.current) return;
    introRumblePlayed.current = true;
    sounds.playGuardianLanding();
  }, [transforming]);
  const roarPlayed = useRef(false);
  const playRoar = useCallback(() => {
    if (roarPlayed.current) return;
    roarPlayed.current = true;
    sounds.playGuardianReveal();
  }, []);
  // The dialog element changes when the transformation hands over to the cinematic, so focus follows it.
  useEffect(() => { dialog.current?.focus(); }, [phase]);
  useEffect(() => {
    if (still) playRoar();
  }, [still, playRoar]);

  // Enter, Space or Escape: skip the transformation, or start the fight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        if (transforming) setPhase('cut');
        else enterFight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterFight, transforming]);

  if (demon) {
    const merging = !still && phase !== 'cut';
    return (<>
      {phase !== 'merge' || still ? <div
        className={`demon-cut${skipped || still ? ' is-skipped' : ''}${still ? ' is-reduced' : ''}${phase === 'handoff' ? ' is-handoff' : ''}${leaving ? ' is-leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demon-intro-title"
        ref={phase === 'merge' && !still ? undefined : dialog}
        tabIndex={0}
        onPointerDown={() => { setSkipped(true); setPhase('cut'); playRoar(); }}
      >
        <div className="demon-cut-cave" aria-hidden="true" />
        {!handedOff.current && <div className="demon-cut-open" aria-hidden="true" />}
        <div className="demon-cut-embers" aria-hidden="true">
          {EMBERS.map((e, i) => <i key={i} style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDelay: `${e.delay}s`, animationDuration: `${e.duration}s`, '--drift': `${e.drift}px` } as CSSProperties} />)}
        </div>
        <div className="demon-cut-glow" aria-hidden="true" />
        <div className="demon-cut-fissure" aria-hidden="true" />
        <div className="demon-cut-figure" aria-hidden="true">
          <div className="demon-cut-sprite" />
        </div>
        <div className="demon-cut-shockwave" aria-hidden="true" />
        <div className="demon-cut-burst" aria-hidden="true" onAnimationStart={event => {
          if (event.animationName === 'demon-burst') sounds.playGuardianLanding();
        }} />
        <div className="demon-cut-danger" aria-hidden="true" />
        <div className="demon-cut-bar demon-cut-bar-top" aria-hidden="true" />
        <div className="demon-cut-bar demon-cut-bar-bottom" aria-hidden="true" />
        <section className="demon-cut-content">
          <small className="demon-cut-kicker">
            {vi ? 'MÀN 13 · SÂU TRONG HANG' : 'TRAIL 13 · DEEP WITHIN THE CAVE'}
          </small>
          <span className="demon-cut-awakened">{vi ? 'QUÁI VẬT ĐÃ THỨC TỈNH' : 'THE BEAST AWAKENS'}</span>
          <h2 id="demon-intro-title" onAnimationStart={event => {
            if (event.animationName === 'demon-name-slam') playRoar();
          }}>{vi ? <>QUỶ<br />TÂM HỎA</> : <>EMBER<br />DEMON</>}</h2>
          <p className="demon-cut-desc">
            {vi
              ? 'Slime hút lửa từ lòng hang, rồi hóa thành Quỷ Tâm Hỏa.'
              : 'The slime draws fire from the cave and transforms into the Ember Demon.'}
          </p>
          <ol className="demon-cut-tips">
            <li>
              <Gem aria-hidden="true" /><b>{vi ? 'Phong ấn Lõi Nguyên Tố' : 'Seal Elemental Core'}</b>
              <span>
                {vi
                  ? 'Đứng lên bệ ấn dập tắt 1 Lõi; Boss nuốt lõi còn lại để tiến hóa.'
                  : 'Stand on core plate to seal it; Boss absorbs the other to evolve.'}
              </span>
            </li>
            <li>
              <Link aria-hidden="true" /><b>{vi ? 'Ép quá tải và nhử bằng Echo' : 'Overheat and bait with Echo'}</b>
              <span>
                {vi
                  ? 'Khi Boss bọc giáp nhiệt, dùng Echo đứng nhử tại Trụ Tản Nhiệt.'
                  : 'When Boss heat-shields, place an Echo decoy at the Cooling Vent.'}
              </span>
            </li>
            <li>
              <Zap aria-hidden="true" /><b>{vi ? 'Sốc nhiệt phá giáp · ×2,5 sát thương' : 'Thermal shock · 2.5× damage'}</b>
              <span>
                {vi
                  ? 'Boss húc trúng Trụ sẽ bị nổ giáp, choáng 4.5s lộ điểm yếu chí mạng!'
                  : 'Baiting charge into Vent shatters shield and stuns Boss for x2.5 crit!'}
              </span>
            </li>
          </ol>
          <button className="demon-cut-start-btn" onClick={enterFight} disabled={leaving}>
            <span>{vi ? 'VÀO TRẬN' : 'START BATTLE'}</span>
            <ArrowRight size={22} />
          </button>
        </section>
      </div> : null}
      {merging && <>
        <div className={`demon-intro is-transforming${phase === 'handoff' ? ' is-handing-off' : ''}`} role="dialog" aria-modal="true"
          aria-label={vi ? 'Quỷ Tâm Hỏa' : 'Ember Demon'} aria-hidden={phase === 'handoff'} ref={phase === 'merge' ? dialog : undefined} tabIndex={0}>
          <div className="demon-intro-smoke" aria-hidden="true" />
          <div className="demon-intro-band" aria-hidden="true" />
          {phase === 'merge' && <button type="button" className="demon-intro-skip" onClick={() => setPhase('cut')}>
            {vi ? 'Bỏ qua hoạt ảnh' : 'Skip animation'}
          </button>}
        </div>
        <DemonSlimeMerge onHandoff={() => { handedOff.current = true; setPhase('handoff'); }} onDone={() => setPhase('cut')} />
      </>}
    </>);
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
