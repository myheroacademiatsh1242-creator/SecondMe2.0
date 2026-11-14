import {useEffect, useRef} from 'react';
import {drawMageStaff} from '../game/rendering/mageMagic.ts';

/** Aeris's weapon on the hero screen, drawn by the same code as in the match, with its idle motion. The canvas is sized in CSS so the staff is as tall as her portrait. */
export function WeaponPreview({id, reducedMotion = false}: {id: string; reducedMotion?: boolean}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const draw = (ms: number) => {
      ctx.clearRect(0, 0, 60, 90);
      drawMageStaff(ctx, 2, 80, 'right', id, ms / 1000);
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    draw(0);
    return () => cancelAnimationFrame(raf);
  }, [id, reducedMotion]);
  return <canvas ref={ref} className="weapon-preview" width={60} height={90} role="img" aria-label={id}/>;
}
