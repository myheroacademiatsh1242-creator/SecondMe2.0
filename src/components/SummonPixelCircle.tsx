import { useEffect, useRef } from 'react';
import type { SummonStage } from './GachaSummonScene.tsx';

const WIDTH = 144;
const HEIGHT = 54;
const TAU = Math.PI * 2;
const speedByStage: Record<SummonStage, number> = {
  descending: 1, resonating: 2, shattering: 1, opening: 4, burst: 8,
};

function ring(ctx: CanvasRenderingContext2D, radius: number, width: number, gap = 0) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.lineWidth = width;
  ctx.setLineDash(gap ? [gap, gap] : []);
  ctx.stroke();
}

function glyph(ctx: CanvasRenderingContext2D, points: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = i * TAU / points - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
}

function paint(ctx: CanvasRenderingContext2D, angle: number, color: string) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(1, HEIGHT / WIDTH);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.save();
  ctx.rotate(angle);
  ring(ctx, 66, 3.8);
  ring(ctx, 59, 3, 3.5);
  ring(ctx, 50, 3);
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(-2, -64, 4, 12);
    ctx.fillRect(-3, -56, 6, 6);
    ctx.rotate(TAU / 8);
  }
  glyph(ctx, 8, 50, 28);
  ctx.restore();

  ctx.save();
  ctx.rotate(-angle * 4 / 3);
  ring(ctx, 34, 3.2);
  glyph(ctx, 8, 33, 15);
  ring(ctx, 13, 3);
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  ctx.restore();

  // Quantize the projected strokes before CSS enlarges the bitmap.
  const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  for (let i = 3; i < pixels.data.length; i += 4) {
    pixels.data[i] = pixels.data[i] < 84 ? 0 : pixels.data[i] < 185 ? 155 : 255;
  }
  ctx.putImageData(pixels, 0, 0);
}

export function SummonPixelCircle({ stage, still }: { stage: SummonStage; still: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const angle = useRef(0);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d', { willReadFrequently: true });
    if (!element || !ctx) return;
    const color = getComputedStyle(element).color;
    paint(ctx, angle.current, color);
    if (still) return;

    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      angle.current = (angle.current + TAU * speedByStage[stage] * (now - previous) / 24000) % (3 * TAU);
      previous = now;
      paint(ctx, angle.current, color);
    }, 64);
    return () => window.clearInterval(timer);
  }, [stage, still]);

  return <canvas ref={canvas} className="summon-pixel-circle" width={WIDTH} height={HEIGHT} />;
}
