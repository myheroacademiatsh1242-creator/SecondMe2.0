import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Gem, Link, Move, Snowflake, Swords, Zap } from 'lucide-react';
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
  const [transformed, setTransformed] = useState(false);
  const transformCanvas = useRef<HTMLCanvasElement>(null);
  const idleCanvas = useRef<HTMLCanvasElement>(null);
  const entering = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [idleReady, setIdleReady] = useState(false);
  const demon = hud.bossKind === 'demon';
  const still = hud.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transforming = demon && !still && !transformed;
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
    if (!demon || transforming) return;
    engine?.revealDemon();
    if (still) return;
    const ctx = idleCanvas.current?.getContext('2d');
    if (!ctx) return;
    const sheet = new Image();
    let raf = 0;
    sheet.onload = () => {
      const start = performance.now();
      const draw = (now: number) => {
        const frame = Math.floor((now - start) / 118) % 6;
        ctx.clearRect(0, 0, 214, 200);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, frame * 288 + 98, 50, 96, 110, 21, 0, 180, 200);
        raf = requestAnimationFrame(draw);
      };
      draw(start);
      setIdleReady(true);
    };
    sheet.src = `${import.meta.env.BASE_URL}assets/demon-boss/sheet.png`;
    return () => { sheet.onload = null; cancelAnimationFrame(raf); };
  }, [demon, transforming, still, engine]);
  useEffect(() => {
    if (!transforming) return;
    const ctx = transformCanvas.current?.getContext('2d');
    if (!ctx) { setTransformed(true); return; }
    const strip = new Image();
    let raf = 0;
    strip.onload = () => {
      const start = performance.now();
      const draw = (now: number) => {
        const elapsed = now - start;
        const frame = Math.min(31, Math.floor(elapsed / 100));
        ctx.clearRect(0, 0, 214, 200);
        ctx.drawImage(strip, frame * 214, 0, 214, 200, 0, 0, 214, 200);
        if (elapsed < 3300) raf = requestAnimationFrame(draw);
        else setTransformed(true);
      };
      draw(start);
    };
    strip.onerror = () => setTransformed(true);
    strip.src = `${import.meta.env.BASE_URL}assets/demon-boss/slime-transform-strip.png`;
    return () => { strip.onload = null; strip.onerror = null; cancelAnimationFrame(raf); };
  }, [transforming]);
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
  useEffect(() => { dialog.current?.focus(); }, []);
  useEffect(() => {
    if (hud.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) playRoar();
  }, [hud.reducedMotion, playRoar]);

  // Global key listener to start boss fight immediately with Enter, Space, or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        if (transforming) setTransformed(true);
        else enterFight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterFight, transforming]);

  if (hud.bossKind === 'demon') {
    return (
      <div
        className={`demon-intro${transforming ? ' is-transforming' : ' is-revealed'}${still ? ' is-still' : ''}${idleReady && !still ? ' is-idle-ready' : ''}${leaving ? ' is-leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={vi ? 'Quỷ Tâm Hỏa' : 'Ember Demon'}
        ref={dialog}
        tabIndex={0}
      >
        <div className="demon-intro-smoke" aria-hidden="true" />
        <div className="demon-intro-band" aria-hidden="true" />
        <div className="demon-intro-flash" aria-hidden="true" />
        <div className="demon-intro-portrait" aria-hidden="true">
          <div className="demon-intro-shockwave" />
          <div className="demon-intro-embers">
            {Array.from({length: 18}, (_, i) => <i key={i} style={{
              '--ember-x': `${(i % 9 - 4) * 27 + (i >= 9 ? 11 : 0)}px`,
              '--ember-y': `${-45 - (i * 29 % 120)}px`,
              animationDelay: `${(i % 5) * .028}s`,
            } as CSSProperties}/>)}
          </div>
          <div className="demon-intro-impact" onAnimationStart={event => {
            if (event.animationName === 'demon-impact') {
              sounds.playGuardianLanding();
              playRoar();
            }
          }} />
          <img className="demon-intro-animation demon-intro-final" alt="" src={`${import.meta.env.BASE_URL}assets/demon-boss/slime-transform-final.png`}/>
          {transforming && <canvas ref={transformCanvas} className="demon-intro-animation demon-intro-animated"
            width={214} height={200} />}
          {!transforming && !still && <canvas ref={idleCanvas} className="demon-intro-animation demon-intro-idle"
            width={214} height={200} />}
        </div>
        {transforming && <button type="button" className="demon-intro-skip" onClick={() => setTransformed(true)}>
          {vi ? 'Bỏ qua hoạt ảnh' : 'Skip animation'}
        </button>}
        <section className="demon-intro-content" inert={transforming} aria-hidden={transforming}>
          <small className="demon-intro-kicker">
            {vi ? 'MÀN 13 · SÂU TRONG HANG' : 'TRAIL 13 · DEEP WITHIN THE CAVE'}
          </small>
          <span className="demon-intro-awakened">{vi ? 'QUÁI VẬT ĐÃ THỨC TỈNH' : 'THE BEAST AWAKENS'}</span>
          <h2>{vi ? <>QUỶ<br/>TÂM HỎA</> : <>EMBER<br/>DEMON</>}</h2>
          <p className="demon-intro-desc">
            {vi
              ? 'Slime hút lửa từ lòng hang, rồi hóa thành Quỷ Tâm Hỏa.'
              : 'The slime draws fire from the cave and transforms into the Ember Demon.'}
          </p>
          <ol className="demon-intro-tips">
            <li>
              <Gem aria-hidden="true"/><b>{vi ? 'Phong ấn Lõi Nguyên Tố' : 'Seal Elemental Core'}</b>
              <span>
                {vi
                  ? 'Đứng lên bệ ấn dập tắt 1 Lõi; Boss nuốt lõi còn lại để tiến hóa.'
                  : 'Stand on core plate to seal it; Boss absorbs the other to evolve.'}
              </span>
            </li>
            <li>
              <Link aria-hidden="true"/><b>{vi ? 'Ép quá tải và nhử bằng Echo' : 'Overheat and bait with Echo'}</b>
              <span>
                {vi
                  ? 'Khi Boss bọc giáp nhiệt, dùng Echo đứng nhử tại Trụ Tản Nhiệt.'
                  : 'When Boss heat-shields, place an Echo decoy at the Cooling Vent.'}
              </span>
            </li>
            <li>
              <Zap aria-hidden="true"/><b>{vi ? 'Sốc nhiệt phá giáp · ×2,5 sát thương' : 'Thermal shock · 2.5× damage'}</b>
              <span>
                {vi
                  ? 'Boss húc trúng Trụ sẽ bị nổ giáp, choáng 4.5s lộ điểm yếu chí mạng!'
                  : 'Baiting charge into Vent shatters shield and stuns Boss for x2.5 crit!'}
              </span>
            </li>
          </ol>
          <button
            className="demon-intro-start-btn"
            onClick={enterFight}
            disabled={leaving}
          >
            <span>{vi ? 'VÀO TRẬN' : 'START BATTLE'}</span>
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
