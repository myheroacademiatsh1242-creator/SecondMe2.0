import { layout } from './placement.ts';

export type TitleLanguage = 'en' | 'vi';

const VI = { sub: 'HOÀI NIỆM LỐI CỔ', lines: ['NHỮNG LỐI ĐI', 'BẮT ĐẦU LỘ DIỆN'] };
const FAMILY = '"Second Me Pixel", monospace';
const PIXEL = 3;

let vi: HTMLCanvasElement | null = null;
let pending = false;

/** The Vietnamese title is cached once the game's Vietnamese pixel font loads. */
export function vietnameseTitle(): HTMLCanvasElement | null {
  if (vi || pending || typeof document === 'undefined') return vi;
  pending = true;
  document.fonts.load(`36px ${FAMILY}`, [VI.sub, ...VI.lines].join(' '))
    .then(() => { vi = drawTitle(); })
    .catch(() => { pending = false; });
  return null;
}

function drawTitle() {
  const { w } = layout.title;
  const h = layout.title.h + 65;
  const pixels = document.createElement('canvas');
  pixels.width = Math.ceil(w / PIXEL);
  pixels.height = Math.ceil(h / PIXEL);
  const ctx = pixels.getContext('2d')!;
  const center = Math.floor(pixels.width / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;

  ctx.font = `15px ${FAMILY}`;
  ctx.letterSpacing = '1px';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0b1610';
  ctx.strokeText(VI.sub, center, 17);
  ctx.fillStyle = '#f4e6bf';
  ctx.fillText(VI.sub, center, 17);

  const size = 30;
  ctx.font = `${size}px ${FAMILY}`;
  ctx.letterSpacing = '0px';
  const widest = Math.max(...VI.lines.map(line => ctx.measureText(line).width));
  ctx.font = `${Math.floor(size * Math.min(1, (pixels.width - 14) / widest))}px ${FAMILY}`;
  VI.lines.forEach((line, i) => {
    const y = 53 + i * 36;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#160d09';
    ctx.strokeText(line, center + 1, y + 2);
    ctx.strokeStyle = '#51311a';
    ctx.strokeText(line, center, y);
    const gold = ctx.createLinearGradient(0, y - 22, 0, y);
    gold.addColorStop(0, '#fff0a9');
    gold.addColorStop(.55, '#ffdb68');
    gold.addColorStop(.55, '#efb14a');
    gold.addColorStop(1, '#efb14a');
    ctx.fillStyle = gold;
    ctx.fillText(line, center, y);
  });

  const bitmap = ctx.getImageData(0, 0, pixels.width, pixels.height);
  for (let i = 3; i < bitmap.data.length; i += 4) {
    bitmap.data[i] = bitmap.data[i] >= 128 ? 255 : 0;
  }
  ctx.putImageData(bitmap, 0, 0);

  const title = document.createElement('canvas');
  title.width = w;
  title.height = h;
  const output = title.getContext('2d')!;
  output.imageSmoothingEnabled = false;
  output.drawImage(pixels, 0, 0, pixels.width * PIXEL, pixels.height * PIXEL);
  return title;
}
