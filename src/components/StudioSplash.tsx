import { useEffect, useRef, useState } from 'react';
import './StudioSplash.css';

const LOAD_WAIT = 2500;   // a slow network: give up on the logo and go on rather than sit on black
const LOGO = `${import.meta.env.BASE_URL}assets/ui/studio-8hands.jpg`;

/** The 8HANDS studio card before the intro. A tap, click, Enter, Space or Esc skips it. */
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
    <div className="studio-card" onAnimationEnd={event => {
      if (event.target === event.currentTarget) finish();
    }}>
      <img className="studio-emblem" src={LOGO} alt="" draggable={false} onLoad={() => setLoaded(true)} onError={finish}/>
      <img className="studio-wordmark" src={LOGO} alt="" draggable={false}/>
      <div className="studio-light-sweep" aria-hidden="true"/>
    </div>
  </div>;
}
