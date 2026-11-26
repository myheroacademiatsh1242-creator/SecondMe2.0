import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './StudioSplash.css';

const LOAD_WAIT = 2500;   // a slow network: give up on the logo and go on rather than sit on black
const LOGO = `${import.meta.env.BASE_URL}assets/ui/studio-8hands.jpg`;

/** Pixel sparks thrown out of the gear when it locks in: cyan on the left, gold on the right, like the logo's lightning. */
const SPARKS = [
  [-26, -20], [-31, 4], [-22, 26], [-14, -32], [-34, -10], [-18, 14],
  [26, -22], [32, 2], [21, 28], [14, -34], [35, 14], [19, -8],
].map(([dx, dy]) => ({ dx, dy, gold: dx > 0 }));

/**
 * The 8HANDS studio card before the intro, played as a short pixel sequence:
 * a CRT line powers on, the gear spins in and locks with a flash and sparks, the lightning and glow come up,
 * "8HANDS" wipes in, "GAME STUDIO" types out, a light sweeps the name, then it fades out.
 * A tap, click, Enter, Space or Esc skips it.
 */
export function StudioSplash({ onDone, paused = false, reducedMotion = false }: {
  onDone: () => void; paused?: boolean; reducedMotion?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const done = useRef(onDone); done.current = onDone;
  const finished = useRef(false);
  const finish = () => { if (!finished.current) { finished.current = true; done.current(); } };

  // Starts once the image is in (or the wait runs out), and not while "rotate your phone" covers the screen.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setTimedOut(true), LOAD_WAIT); return () => window.clearTimeout(t); }, []);
  useEffect(() => {
    if (timedOut && !loaded && !paused) finish();
  }, [timedOut, loaded, paused]);

  // Keys go to the splash only: Enter / Space would otherwise open the lobby underneath (GameEngine).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('.player-guide-backdrop')) return;   // the player guide, opened over the intro, owns the keys
      e.preventDefault(); e.stopImmediatePropagation();
      if (['Enter', 'Space', 'Escape'].includes(e.code)) finish();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);

  return <div className={`studio-splash${loaded ? ' is-ready' : ''}${paused ? ' is-paused' : ''}${reducedMotion ? ' studio-still' : ''}`}
    onPointerDown={finish} role="img" aria-label="8HANDS Game Studio">
    <div className="studio-boot" aria-hidden="true"/>
    <div className="studio-card" onAnimationEnd={event => {
      if (event.target === event.currentTarget) finish();
    }}>
      <div className="studio-stage">
        <div className="studio-glow" aria-hidden="true"/>
        <img className="studio-bg" src={LOGO} alt="" draggable={false} onLoad={() => setLoaded(true)} onError={finish}/>
        <img className="studio-emblem" src={LOGO} alt="" draggable={false}/>
        <img className="studio-wordmark" src={LOGO} alt="" draggable={false}/>
        <img className="studio-tagline" src={LOGO} alt="" draggable={false}/>
        <div className="studio-light-sweep" aria-hidden="true"/>
        <div className="studio-sparks" aria-hidden="true">
          {SPARKS.map((s, i) => <i key={i} className={s.gold ? 'is-gold' : ''}
            style={{ '--dx': `${s.dx * 0.6}cqw`, '--dy': `${s.dy * 0.6}cqw`, animationDelay: `${1.3 + (i % 3) * 0.04}s` } as CSSProperties}/>)}
        </div>
      </div>
      <div className="studio-flash" aria-hidden="true"/>
      <div className="studio-scanlines" aria-hidden="true"/>
    </div>
  </div>;
}
