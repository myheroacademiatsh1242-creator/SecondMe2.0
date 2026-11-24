export const SANTA_HAT_URL = `${import.meta.env.BASE_URL}assets/ui/noel/santa-hat.png`;
const HAT = { x: 425, y: 300, width: 650, height: 465 };
let hat: HTMLImageElement | undefined;

export function readySantaHat() {
  if (!hat) {
    hat = new Image();
    hat.src = SANTA_HAT_URL;
  }
  return hat.complete && hat.naturalWidth > 0;
}

/** The anchor is at the crown of the head, in the same coordinates as the sprite. */
export function drawSantaHat(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, flip = false) {
  if (!readySantaHat() || !hat) return;
  const height = width * HAT.height / HAT.width;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hat, HAT.x, HAT.y, HAT.width, HAT.height,
    Math.round(-width * .57), Math.round(-height * .69), Math.round(width), Math.round(height));
  ctx.restore();
}
