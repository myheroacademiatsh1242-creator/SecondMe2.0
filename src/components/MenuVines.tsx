import { useEffect, useRef } from 'react';

const VINE_FRAMES = 18;
const GROW_FPS = 54, SHRINK_FPS = 72;

/** The vines over one slab: grows while `active`, draws back when not (instantly with reduced motion). */
export function MenuVines({ active, reducedMotion = false }: { active: boolean; reducedMotion?: boolean }) {
  const el = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    node.style.backgroundImage = `url(${import.meta.env.BASE_URL}assets/menu/vines-strip.webp)`;
    const target = active ? VINE_FRAMES - 1 : 0;
    const paint = () => {
      const f = Math.round(frame.current);
      node.style.backgroundPositionX = `${(f / (VINE_FRAMES - 1)) * 100}%`;
      node.style.visibility = f === 0 ? 'hidden' : 'visible';
    };
    if (reducedMotion) { frame.current = target; paint(); return; }
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frame.current = active ? Math.min(target, frame.current + dt * GROW_FPS) : Math.max(target, frame.current - dt * SHRINK_FPS);
      paint();
      if (frame.current !== target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion]);
  return <span ref={el} className="intro-menu-vines" aria-hidden="true"/>;
}
