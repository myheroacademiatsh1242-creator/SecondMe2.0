export const WARP_FRAMES = 60;
export const WARP_CELL = 160;
export const WARP_COLS = 10;
/** Cell px per source px. */
export const WARP_SCALE = 0.5;
/** The body's centre in a source cell (the pivot of every frame). */
export const WARP_PIVOT = { x: 115, y: 130 };

// The authored 60-frame sequence is baked by tools/assets/portalWarpAtlas.ts.
let warp: HTMLImageElement | undefined;
export function prepareWarpSheet() {
  if (typeof Image === 'undefined') return false;
  if (!warp) {
    warp = new Image();
    warp.decoding = 'async';
    warp.src = import.meta.env.BASE_URL + 'assets/loading/portal-warp.webp';
  }
  return warp.complete && warp.naturalWidth > 0;
}

export function getWarpSheet() { return warp?.naturalWidth ? warp : null; }
