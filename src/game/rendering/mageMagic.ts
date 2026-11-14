/** Colours of Aeris's bolt: trail dark, trail mid, body, body light, core, spark. The default is the original blue. */
export const ORB_BLUE: string[] = ['#164a99', '#188de4', '#49d5ff', '#a6f5ff', '#f3ffff', '#6beaff'];
const ORB: Record<string, string[]> = {
  'wand-fire': ['#8a1d0c', '#e0561a', '#ff9a3c', '#ffd27a', '#fff6d6', '#ffb347'],
  'staff-frost': ['#2f5f8f', '#6cc3ec', '#b9ecff', '#e4faff', '#ffffff', '#d9f6ff'],
  'staff-lightning': ['#8a6a12', '#e6b422', '#ffe45c', '#fff6a8', '#ffffff', '#fff27a'],
  'staff-blizzard': ['#3b6fa0', '#8fd4f2', '#d9f6ff', '#f0fbff', '#ffffff', '#ffffff'],
  'staff-meteor': ['#5a1608', '#e8480f', '#ff8a2a', '#ffc46a', '#fff0c0', '#ffa13a'],
  'staff-archmage': ['#5a2a9a', '#a56bf0', '#d6b3ff', '#efe0ff', '#ffffff', '#ffd27a'],
  'grimoire-shield': ['#1c3d8f', '#3d7be8', '#8fc1ff', '#d4e7ff', '#ffffff', '#ffe08a'],
};
export const orbColors = (weaponId?: string) => (weaponId && ORB[weaponId]) || ORB_BLUE;

/** Aeris's weapon, upright with its hand at (0, 0), in the pixel style of the original staff. `weaponId` defaults to the novice wand. */
export { drawMageStaff, STAFF_K } from './mageStaff.ts';

/** Blue lightning bolt with a bright core and a pixelated, directional trail. */
export function drawLightningOrb(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, time: number, c: string[] = ORB_BLUE) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle); ctx.scale(size / 12, size / 12);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= .9;
  ctx.fillStyle = c[0]; ctx.fillRect(-20, -3, 12, 3); ctx.fillRect(-17, 3, 10, 3); ctx.fillRect(-14, -8, 6, 3);
  ctx.fillStyle = c[1]; ctx.fillRect(-17, -2, 12, 3); ctx.fillRect(-14, 4, 8, 2); ctx.fillRect(-11, -7, 6, 2);
  ctx.fillRect(-7, -8, 13, 16); ctx.fillRect(-10, -5, 19, 10); ctx.fillRect(-5, -10, 9, 20);
  ctx.fillStyle = c[2]; ctx.fillRect(-5, -7, 10, 14); ctx.fillRect(-8, -4, 16, 8); ctx.fillRect(-3, -9, 6, 18);
  ctx.fillStyle = c[3]; ctx.fillRect(-4, -5, 8, 10); ctx.fillRect(-6, -2, 12, 4);
  ctx.fillStyle = c[4]; ctx.fillRect(-2, -3, 5, 6); ctx.fillRect(-4, -1, 9, 2);
  ctx.fillStyle = c[5]; if (Math.floor(time * 12) % 2) { ctx.fillRect(-15, -10, 4, 2); ctx.fillRect(-18, 7, 5, 2); }
  ctx.restore();
}
