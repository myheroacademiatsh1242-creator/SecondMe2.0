import { LAVA_RIVER, WIND_BRIDGE } from '../logic/frostLevels.ts';
import { GATE_PASSABLE_PROGRESS } from '../logic/collision.ts';
import { pulseWindow } from '../logic/puzzle.ts';
import type { LevelData, Rect, SecurityDoor, PressurePlate } from '../logic/types.ts';

// ============================================================================
// VOLCANO V2 ASSET MANAGER
// Assets extracted from user's volcanic dungeon tileset
// ============================================================================

const imageCache = new Map<string, HTMLImageElement>();
let v2Preloaded = false;
let atlasImage: HTMLImageElement | undefined;
let bridgeReference: HTMLImageElement | undefined;

export function windBridgeReference() {
  if (typeof Image === 'undefined') return null;
  if (!bridgeReference) {
    bridgeReference = new Image();
    bridgeReference.src = `${import.meta.env.BASE_URL}assets/volcano/v2/wind-bridge-reference.png`;
  }
  return bridgeReference.complete && bridgeReference.naturalWidth ? bridgeReference : null;
}
const floorImages = new Map<number, HTMLImageElement>();

export function icefireFloor(levelId: number) {
  if (typeof Image === 'undefined') return null;
  let image = floorImages.get(levelId);
  if (!image) {
    image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/volcano/v2/icefire-${levelId}.png`;
    floorImages.set(levelId, image);
  }
  return image.complete && image.naturalWidth ? image : null;
}

export function basaltAtlas() {
  if (typeof Image === 'undefined') return null;
  if (!atlasImage) {
    atlasImage = new Image();
    atlasImage.src = `${import.meta.env.BASE_URL}assets/volcano/v2/basalt-atlas.png`;
  }
  return atlasImage.complete && atlasImage.naturalWidth ? atlasImage : null;
}

type AtlasRect = [x: number, y: number, width: number, height: number];
const basaltTiles: AtlasRect[] = [
  [26, 23, 86, 86], [140, 23, 86, 86], [26, 137, 86, 86],
  [256, 138, 88, 86], [256, 24, 87, 85],
];
const basaltWall: Record<'horizontal' | 'vertical' | 'lava', AtlasRect> = {
  horizontal: [622, 28, 178, 58],
  vertical: [619, 319, 47, 109],
  lava: [734, 253, 291, 45],
};
const basaltProps = {
  shrub: [616, 476, 119, 92],
  branch: [742, 483, 90, 85],
  log: [929, 493, 155, 84],
  rock: [1095, 497, 72, 64],
  boulders: [613, 669, 122, 82],
  crystal: [1088, 661, 78, 85],
  coal: [1270, 589, 87, 64],
} satisfies Record<string, AtlasRect>;
type PropPlacement = [kind: keyof typeof basaltProps, x: number, y: number, width: number];
const courtyardProps: PropPlacement[] = [
  ['rock', 87, 270, 42], ['shrub', 495, 126, 65], ['log', 218, 330, 78],
  ['boulders', 460, 330, 64], ['branch', 695, 150, 52], ['shrub', 1192, 177, 68],
  ['crystal', 1105, 327, 34], ['rock', 528, 546, 42], ['log', 660, 649, 85],
  ['shrub', 96, 450, 64], ['crystal', 811, 472, 40], ['boulders', 1184, 656, 66],
];
const valleyProps: PropPlacement[] = [
  ['crystal', 96, 299, 42], ['boulders', 338, 285, 61], ['log', 215, 651, 81],
  ['branch', 348, 480, 53], ['coal', 460, 285, 53], ['crystal', 744, 298, 51],
  ['crystal', 684, 470, 41], ['boulders', 499, 655, 68], ['coal', 852, 478, 48],
  ['log', 1061, 644, 80], ['shrub', 1189, 490, 65], ['boulders', 1200, 227, 57],
  ['crystal', 915, 280, 41], ['branch', 865, 135, 49],
];

function loadV2(category: string, name: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const key = `${category}/${name}`;
  let img = imageCache.get(key);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/volcano/v2/${category}/${name}.png`;
    imageCache.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function getV2Gate(name: string) { return loadV2('gates', name); }
function getV2Plate(name: string) { return loadV2('plates', name); }
function getV2Portal(name: string) { return loadV2('portals', name); }
function getV2Prop(name: string) { return loadV2('props', name); }

export function preloadVolcanoV2Assets() {
  if (v2Preloaded || typeof Image === 'undefined') return;
  v2Preloaded = true;

  basaltAtlas();
  ['gate_arch_open', 'gate_bars_closed', 'gate_bars_broken_glow'].forEach(getV2Gate);
  ['plate_flame_dormant', 'plate_flame_active'].forEach(getV2Plate);
  ['portal_lava_vortex', 'portal_void_vortex'].forEach(getV2Portal);
  getV2Prop('pillar_tall_intact');
}

// ============================================================================
// LEVEL 11 & 12: GROUND TILEMAP RENDERING
// ============================================================================

export function drawVolcanoV2Floor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: LevelData,
  _time: number
): boolean {
  const atlas = basaltAtlas();
  const floor = icefireFloor(level.id);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#252328';
  ctx.fillRect(0, 0, w, h);

  if (floor) {
    ctx.drawImage(floor, 0, 0, w, h);
    ctx.fillStyle = '#10121b25';
    ctx.fillRect(0, 0, w, h);
  } else if (atlas) {
    const tileSize = 64;
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const row = y / tileSize, column = x / tileSize;
        const variant = (row * 17 + column * 11 + row * column * 3) % 13;
        const nearRiver = level.id === 12 && Math.abs(y + tileSize / 2 - LAVA_RIVER.y - LAVA_RIVER.height / 2) < 125;
        const fissure = variant === 0 || (nearRiver && variant <= 2);
        const source = fissure ? basaltTiles[4] : basaltTiles[variant % 4];
        ctx.drawImage(atlas, ...source, x, y, tileSize, tileSize);
      }
    }
  }

  if (level.id === 12) {
    const {x, y, width, height} = LAVA_RIVER;
    ctx.fillStyle = '#b63813';
    ctx.fillRect(x, y, width, height);
    if (atlas) {
      for (let dx = x; dx < x + width; dx += 60) {
        const dy = ((dx - x) / 60) % 2 === 0 ? 20 : 135;
        ctx.drawImage(atlas, 370, dy + 2, 86, 88, dx, y, 60, height / 2);
        ctx.save();
        ctx.translate(dx + 60, y + height);
        ctx.rotate(Math.PI);
        ctx.drawImage(atlas, 370, dy + 2, 86, 88, 0, 0, 60, height / 2);
        ctx.restore();
      }
    }
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, w * .69);
  vignette.addColorStop(0, '#10080b00');
  vignette.addColorStop(1, '#10080b88');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  return true;
}

export function drawWindBridgeFloor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const {x, y, width, height} = WIND_BRIDGE;
  const reference = windBridgeReference();
  if (reference) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const bankWidth = w - x - width;
    ctx.drawImage(reference, 8, 30, 294, 747, 0, 0, x, h);
    const hotBank = x + width;
    ctx.drawImage(reference, 952, 30, 123, 747, hotBank, 0, 120, h);
    ctx.drawImage(reference, 1119, 30, 225, 747, hotBank + 120, 0, bankWidth - 120, h);
    // Replace the reference's baked portal, rune and gate with nearby terrain.
    for (const [sx, sy, sw, sh, dx, dy] of [
      [72, 545, 96, 108, 72, 132], [147, 547, 65, 66, 180, 413],
      [1140, 198, 118, 116, 1124, 353],
    ]) ctx.drawImage(reference, sx, sy, sw, sh, dx, dy, sw, sh);
    ctx.drawImage(reference, 344, 75, 608, 203, x, 0, width, y);
    ctx.drawImage(reference, 344, 562, 608, 184, x, y + height, width, h - y - height);
    ctx.drawImage(reference, 344, 75, 608, 203, x, y, width, height / 2);
    ctx.drawImage(reference, 344, 562, 608, 184, x, y + height / 2, width, height / 2);
    ctx.restore();
    return true;
  }
  const atlas = basaltAtlas();
  const canyon = ctx.createLinearGradient(x, 0, x + width, 0);
  canyon.addColorStop(0, '#3e7986');
  canyon.addColorStop(.55, '#204853');
  canyon.addColorStop(.78, '#37616a');
  canyon.addColorStop(.89, '#65514a');
  canyon.addColorStop(1, '#392421');
  ctx.fillStyle = canyon;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const bank of [{start: 0, end: x, snow: true}, {start: x + width, end: w, snow: false}]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bank.start, 0, bank.end - bank.start, h);
    ctx.clip();
    for (let ty = 0; ty < h; ty += 64) {
      for (let tx = bank.start; tx < bank.end; tx += 64) {
        const variant = (Math.floor(tx / 64) * 7 + ty / 64 * 11) % 5;
        if (atlas) ctx.drawImage(atlas, ...basaltTiles[variant], tx, ty, 64, 64);
        ctx.fillStyle = bank.snow ? ['#d9f2f6e8','#e4f8fbea','#b2dce9e8','#d3eef4e8','#c7e6f0e8'][variant]
          : ['#4f292866','#7a3b2955','#43232055','#a34a2933','#662a2444'][variant];
        ctx.fillRect(tx, ty, 64, 64);
      }
    }
    ctx.restore();
  }

  // The stepped rock faces sit outside the deck and mark the drop.
  for (const edge of [x, x + width]) {
    const cold = edge === x;
    for (let row = 0; row < h; row += 12) {
      const depth = 14 + (row * 7 % 19);
      ctx.fillStyle = cold ? '#527386' : '#754335';
      ctx.fillRect(cold ? edge : edge - depth, row, depth, 12);
      ctx.fillStyle = cold ? '#a3c4d2' : '#a45a3e';
      ctx.fillRect(cold ? edge : edge - 4, row, 4, 9);
    }
  }
  if (atlas) {
    for (let row = 0; row < h; row += 48) {
      ctx.drawImage(atlas, 370, 22, 86, 88, x + width - 43, row, 43, 48);
    }
  }
  ctx.restore();
  return true;
}

const riverRocks = [
  {x:386,y:106,r:24}, {x:492,y:149,r:15}, {x:618,y:88,r:21}, {x:730,y:130,r:29},
  {x:413,y:615,r:22}, {x:529,y:653,r:26}, {x:663,y:598,r:18}, {x:770,y:653,r:19},
];

export function drawWindBridgeRiver(ctx: CanvasRenderingContext2D, time: number, height: number) {
  const {x, width} = WIND_BRIDGE;
  const atlas = basaltAtlas();
  const reference = windBridgeReference();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 14, 0, width - 83, height);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 66; i++) {
    const y = ((i * 79 + time * (26 + i % 5 * 7)) % (height + 100)) - 50;
    const lane = x + 25 + (i * 83) % (width - 98);
    const rock = riverRocks.find(r => y > r.y - r.r * 3 && y < r.y + r.r * 4 && Math.abs(lane - r.x) < r.r + 10);
    const bend = rock ? (lane < rock.x ? -1 : 1) * rock.r * Math.max(0, 1 - Math.abs(y - rock.y) / (rock.r * 3)) : 0;
    const px = lane + Math.sin(y * .018 + i) * 7 + bend;
    const length = 12 + i % 6 * 7;
    ctx.strokeStyle = i % 5 === 0 ? '#d4f6eeb0' : '#85c6cd45';
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 8, y - length);
    ctx.quadraticCurveTo(px + 3, y - length * .4, px, y);
    ctx.stroke();
  }
  for (const rock of riverRocks) {
    const {x, y, r} = rock;
    for (let wave = 0; wave < 3; wave++) {
      const phase = (time * .65 + wave / 3) % 1;
      ctx.strokeStyle = `rgba(212,247,239,${.52 * (1 - phase)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + phase * r * 2, r * (1 + phase * .7), r * .55, 0, .18, Math.PI - .18);
      ctx.stroke();
    }
    if (reference) continue;
    ctx.fillStyle = '#213d46';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, r, r * .62, 0, 0, Math.PI * 2);
    ctx.fill();
    if (atlas) ctx.drawImage(atlas, ...basaltProps.rock, x - r, y - r, r * 2, r * 1.8);
  }
  ctx.restore();
}

export function drawWindBridgeDeck(ctx: CanvasRenderingContext2D, progress: number, reducedMotion?: boolean) {
  if (progress <= 0 || (reducedMotion && progress < 1)) return;
  const {x, y, width, height} = WIND_BRIDGE;
  const depth = (1 - progress) ** 1.4;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + 92 * depth);
  ctx.scale(1 - .22 * depth, 1 - .38 * depth);
  ctx.translate(-x - width / 2, -y - height / 2);
  ctx.globalAlpha = Math.min(1, progress * 2);
  const reference = windBridgeReference();
  if (reference) {
    ctx.imageSmoothingEnabled = false;
    // Keep the painted ice and scorch marks while replacing the two baked gate columns.
    const bands = [[344, 202], [522, 52], [599, 188], [752, 44], [831, 121]];
    let destination = x;
    for (const [sourceX, sourceWidth] of bands) {
      const bandWidth = width * sourceWidth / 607;
      ctx.drawImage(reference, sourceX, 278, sourceWidth, 284, destination, y - 5, bandWidth, height + 10);
      destination += bandWidth;
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#0a1019aa';
  ctx.fillRect(x, y + 10, width, height + 9);
  const deck = ctx.createLinearGradient(x, 0, x + width, 0);
  deck.addColorStop(0, '#627b86');
  deck.addColorStop(.45, '#635449');
  deck.addColorStop(1, '#854e3b');
  ctx.fillStyle = deck;
  ctx.fillRect(x, y, width, height);
  for (let plank = x + 4; plank < x + width; plank += 19) {
    const seamHeight = 3 + (plank % 5);
    ctx.fillStyle = '#1b171a99';
    ctx.fillRect(plank, y, 3, height);
    ctx.fillStyle = '#c3a68b55';
    ctx.fillRect(plank + 3, y + seamHeight, 2, height - seamHeight * 2);
  }
  for (const rail of [y + 2, y + height - 7]) {
    ctx.fillStyle = '#25202a';
    ctx.fillRect(x, rail, width, 5);
    for (let post = x + 12; post < x + width; post += 64) {
      ctx.fillStyle = post < x + width / 2 ? '#b0d7df' : '#ce885e';
      ctx.fillRect(post, rail - 3, 7, 10);
    }
    for (let offset = 0; offset < width * .48; offset += 5) {
      const crust = 4 + (offset * 19 % 13);
      ctx.fillStyle = offset % 3 === 0 ? '#f0fcff' : '#b5e3ee';
      ctx.fillRect(x + offset, rail - 2, 5, crust);
    }
    for (let offset = Math.floor(width * .67); offset < width; offset += 6) {
      ctx.fillStyle = '#291e1b';
      ctx.fillRect(x + offset, rail - 1, 6, 4 + (offset * 11 % 12));
    }
  }
  ctx.restore();
}

export function drawVolcanoV2Wall(ctx: CanvasRenderingContext2D, wall: Rect, levelId: number) {
  const { x, y, width, height } = wall;
  if (levelId === 12 && isLavaBank(wall)) return;
  const atlas = basaltAtlas();
  const horizontal = width >= height;
  const length = horizontal ? width : height;
  const segments = Math.ceil(length / 112);
  const step = length / segments;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#110e13';
  ctx.fillRect(x + 2, y + 4, width, height);
  ctx.fillStyle = '#29252a';
  ctx.fillRect(x, y, width, height);

  if (atlas) {
    for (let segment = 0; segment < segments; segment++) {
      if (horizontal) {
        const source = levelId === 12 ? basaltWall.lava : basaltWall.horizontal;
        ctx.drawImage(atlas, ...source, x + segment * step, y, step, height);
      } else {
        ctx.drawImage(atlas, ...basaltWall.vertical, x, y + segment * step, width, step);
      }
    }
  }
  // Rime gathers on the cold side of the same walls that contain the lava.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  const edgeLength = horizontal ? width : height;
  for (let offset = 0; offset < edgeLength; offset += 4) {
    const frostX = horizontal ? x + offset : x;
    const frostY = horizontal ? y : y + offset;
    const edgeVariation = ((Math.floor(frostX / 4) * 13 + Math.floor(frostY / 4) * 7) % 23);
    if (frostX * .55 + frostY > 445 + edgeVariation * 5) continue;
    const depth = 2 + edgeVariation % 6;
    ctx.fillStyle = '#7697ae';
    ctx.fillRect(frostX, frostY, horizontal ? 4 : depth, horizontal ? depth : 4);
    if (edgeVariation % 3 === 0) {
      ctx.fillStyle = '#bcdae7';
      ctx.fillRect(frostX, frostY, horizontal ? 4 : 2, horizontal ? 2 : 4);
    }
  }
  ctx.restore();
  ctx.restore();
}

function isLavaBank(rect: Rect) {
  return rect.y === LAVA_RIVER.y && rect.height === LAVA_RIVER.height;
}

function drawIcefireBridge(ctx: CanvasRenderingContext2D, door: SecurityDoor, time: number, levelId: number) {
  const {x, y, width, height, openProgress} = door;
  const atlas = basaltAtlas();
  const floor = icefireFloor(levelId);
  ctx.fillStyle = '#231f24';
  ctx.fillRect(x, y, width, height);
  if (floor) {
    ctx.drawImage(floor, 120, 150, floor.naturalWidth - 240, floor.naturalHeight - 300, x, y, width, height);
  } else if (atlas) {
    ctx.drawImage(atlas, ...basaltTiles[1], x, y, width, height);
  }
  const deckLight = ctx.createLinearGradient(x, y, x + width, y + height);
  deckLight.addColorStop(0, '#92d5f26b');
  deckLight.addColorStop(.48, '#152a360a');
  deckLight.addColorStop(1, '#e66b2b68');
  ctx.fillStyle = deckLight;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#b4e6fa';
  ctx.fillRect(x + 10, y + 2, width - 20, 2);
  ctx.fillStyle = '#e98846';
  ctx.fillRect(x + 10, y + height - 4, width - 20, 2);
  if (atlas) {
    ctx.drawImage(atlas, ...basaltWall.vertical, x, y, 10, height);
    ctx.drawImage(atlas, ...basaltWall.vertical, x + width - 10, y, 10, height);
  }
  ctx.strokeStyle = '#504148';
  for (let seam = y + 16; seam < y + height; seam += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 10, seam);
    ctx.lineTo(x + width - 10, seam);
    ctx.stroke();
  }
  const passable = openProgress >= GATE_PASSABLE_PROGRESS;
  if (!passable) {
    const barWidth = (width - 20) * (1 - openProgress);
    const barX = x + (width - barWidth) / 2;
    const barY = y + height / 2 - 8;
    ctx.fillStyle = '#180f12';
    ctx.fillRect(barX, barY, barWidth, 16);
    if (atlas) ctx.drawImage(atlas, ...basaltWall.lava, barX, barY, barWidth, 16);
  }
  drawGateStatus(ctx, door, time, x + width / 2, y + height / 2, '#ff7430');
}

function drawGateStatus(ctx: CanvasRenderingContext2D, door: SecurityDoor, time: number, x: number, y: number, closedColor: string) {
  const passable = door.openProgress >= GATE_PASSABLE_PROGRESS;
  const color = passable ? '#45ef90' : closedColor;
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 3, 6, 6);
  if (door.pulse) {
    const window = pulseWindow(door, time);
    const duration = window.open ? door.pulse.openSeconds : door.pulse.period - door.pulse.openSeconds;
    ctx.fillStyle = '#170e13';
    ctx.fillRect(x - 16, y + 7, 32, 4);
    ctx.fillStyle = window.open ? '#45ef90' : closedColor;
    ctx.fillRect(x - 16, y + 7, 32 * window.remaining / duration, 4);
  }
}
// ============================================================================
// LEVEL 11 & 12: GATES / DOORS RENDERING
// ============================================================================

export function drawVolcanoV2Door(
  ctx: CanvasRenderingContext2D,
  door: SecurityDoor,
  time: number,
  levelId: number
) {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const { x, y, width: w, height: h, orientation, openProgress } = door;
  const isVertical = orientation === 'vertical';

  if ((levelId === 12 && isLavaBank(door)) || (levelId === 11 && door.id === 'crypt_back')) {
    drawIcefireBridge(ctx, door, time, levelId);
    ctx.restore();
    return;
  }

  // Ground threshold underneath gate
  ctx.fillStyle = levelId === 12 ? '#3a1208' : '#232025';
  ctx.fillRect(x, y, w, h);

  // Soft indicator glow along threshold
  const isOpen = openProgress >= 0.85;
  const glowColor = isOpen ? '#45ffaa' : (levelId === 12 ? '#ff5500' : '#ffa200');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `${glowColor}22`;
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.restore();

  // Portcullis bars & stone archway
  const archOpenImg = getV2Gate('gate_arch_open');
  const barsClosedImg = getV2Gate(levelId === 12 ? 'gate_bars_broken_glow' : 'gate_bars_closed');

  if (isVertical) {
    // ---------------- Vertical Portcullis Gate ----------------
    // As openProgress increases from 0 to 1, the portcullis bars slide UP
    const archW = Math.max(w + 24, 52);
    const archH = h + 24;
    const archX = x + w / 2 - archW / 2;
    const archY = y - 14;

    // Draw bars (clipped inside doorway aperture, lifted up by openProgress)
    if (openProgress < 1.0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 2, y, w + 4, h);
      ctx.clip();

      const liftY = openProgress * h;
      if (barsClosedImg) {
        ctx.drawImage(barsClosedImg, x - 2, y - liftY, w + 4, h);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y - liftY, w, h);
      }
      ctx.restore();
    }

    // Draw Stone Archway Frame over doorway
    if (archOpenImg) {
      ctx.drawImage(archOpenImg, archX, archY, archW, archH);
    } else {
      ctx.strokeStyle = '#5a4648';
      ctx.lineWidth = 6;
      ctx.strokeRect(x - 2, y - 6, w + 4, h + 12);
    }

  } else {
    // ---------------- Horizontal Gate ----------------
    const archW = w + 16;
    const archH = Math.max(h + 24, 52);
    const archX = x - 8;
    const archY = y + h / 2 - archH / 2;

    if (openProgress < 1.0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y - 2, w, h + 4);
      ctx.clip();

      const slideX = openProgress * w;
      if (barsClosedImg) {
        ctx.drawImage(barsClosedImg, x - slideX, y - 2, w, h + 4);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(x - slideX, y, w, h);
      }
      ctx.restore();
    }

    // Horizontal arch/frame
    ctx.strokeStyle = '#4e4044';
    ctx.lineWidth = 5;
    ctx.strokeRect(archX, archY, archW, archH);

    // Stone posts on left and right
    const postImg = getV2Prop('pillar_tall_intact');
    if (postImg) {
      ctx.drawImage(postImg, x - 14, y - 16, 22, h + 32);
      ctx.drawImage(postImg, x + w - 8, y - 16, 22, h + 32);
    }
  }

  drawGateStatus(ctx, door, time, x + w / 2, y - 6, levelId === 12 ? '#ff7430' : '#ffaa40');

  ctx.restore();
}

// ============================================================================
// LEVEL 11 & 12: PRESSURE PLATE RENDERING
// ============================================================================

export function drawVolcanoV2Plate(
  ctx: CanvasRenderingContext2D,
  plate: PressurePlate,
  levelTime: number,
  time: number
) {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const cx = plate.x + plate.width / 2;
  const cy = plate.y + plate.height / 2;
  const size = Math.max(plate.width, plate.height) * 1.25; // ~64px
  const drawX = cx - size / 2;
  const drawY = cy - size / 2;

  const dormantImg = getV2Plate('plate_flame_dormant');
  const activeImg = getV2Plate('plate_flame_active');

  if (plate.isPressed) {
    // ---------------- Active Pressed Flame Plate ----------------
    // Pulsating ambient fire aura
    const pulse = 0.7 + 0.3 * Math.sin(time * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45);
    aura.addColorStop(0, `rgba(255, 190, 60, ${0.6 * pulse})`);
    aura.addColorStop(0.6, `rgba(255, 90, 0, ${0.35 * pulse})`);
    aura.addColorStop(1, 'rgba(255, 40, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Active Plate Sprite
    if (activeImg) {
      ctx.drawImage(activeImg, drawX, drawY, size, size);
    } else {
      ctx.fillStyle = '#ff6a00';
      ctx.fillRect(plate.x, plate.y, plate.width, plate.height);
    }

    // Core flare
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + Math.sin(time * 6) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else {
    // ---------------- Dormant Unpressed Plate ----------------
    if (dormantImg) {
      ctx.drawImage(dormantImg, drawX, drawY, size, size);
    } else {
      ctx.fillStyle = '#3a3134';
      ctx.fillRect(plate.x, plate.y, plate.width, plate.height);
    }

    // Gentle breathing ember glow inside rune glyph
    const breath = 0.4 + 0.3 * Math.sin(time * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 120, 20, ${breath})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// LEVEL 11 & 12: EXIT PORTAL RENDERING
// ============================================================================

export function drawVolcanoV2ExitPortal(
  ctx: CanvasRenderingContext2D,
  exit: Rect,
  exitOpen: boolean,
  time: number,
  levelId: number
) {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const cx = exit.x + exit.width / 2;
  const cy = exit.y + exit.height / 2;
  const pw = 112;
  const ph = 113;

  const vortexImg = getV2Portal('portal_lava_vortex');
  const voidImg = getV2Portal('portal_void_vortex');

  if (!exitOpen) {
    // ---------------- Dormant Portal Well ----------------
    if (voidImg) {
      ctx.drawImage(voidImg, cx - pw / 2, cy - ph / 2, pw, ph);
    } else {
      ctx.fillStyle = '#1c1518';
      ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
    }

    // Faint outer rim glow
    const rimPulse = 0.3 + 0.2 * Math.sin(time * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255, 90, 0, ${rimPulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

  } else {
    // ---------------- Open Molten Lava Vortex ----------------
    // 1. Swirling fire spiral in well center
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#220404';
    ctx.fillRect(cx - 45, cy - 45, 90, 90);

    ctx.translate(cx, cy);
    ctx.rotate(time * 1.8);

    for (let arm = 0; arm < 3; arm++) {
      const angle = (arm * Math.PI * 2) / 3;
      const spiral = ctx.createRadialGradient(0, 0, 3, 0, 0, 38);
      spiral.addColorStop(0, '#ffffff');
      spiral.addColorStop(0.3, '#ffdf5d');
      spiral.addColorStop(0.7, '#ff5e00');
      spiral.addColorStop(1, 'rgba(180, 20, 0, 0)');

      ctx.fillStyle = spiral;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 38, angle, angle + Math.PI * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    // Blazing core
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath();
    ctx.arc(0, 0, 8 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Stone Well Rim
    if (vortexImg) {
      ctx.drawImage(vortexImg, cx - pw / 2, cy - ph / 2, pw, ph);
    }

    // 3. Ambient radiance & rising sparks
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 65);
    rad.addColorStop(0, 'rgba(255, 170, 50, 0.45)');
    rad.addColorStop(0.7, 'rgba(255, 70, 0, 0.2)');
    rad.addColorStop(1, 'rgba(255, 30, 0, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.fill();

    // Rising sparks
    for (let i = 0; i < 6; i++) {
      const sparkAge = (time * 1.4 + i * 0.4) % 1.5;
      const sparkY = cy - sparkAge * 32;
      const sparkX = cx + Math.sin(time * 3 + i * 2) * (8 + sparkAge * 8);
      const alpha = 1 - sparkAge / 1.5;
      ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// LEVEL 11 & 12: STAGE DECORATION SYSTEM (PROPS ON WALLS & MARGINS)
// ============================================================================

export function drawVolcanoV2StageDecor(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  lvl: LevelData,
  clear: Rect[]
) {
  const atlas = basaltAtlas();
  if (!atlas) return;
  const layout = lvl.id === 12 ? valleyProps : courtyardProps;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const [kind, x, y, width] of layout) {
    const source = basaltProps[kind];
    const height = width * source[3] / source[2];
    const rect = {x: x - width / 2, y: y - height, width, height};
    if ([...clear, ...lvl.walls].some(area =>
      rect.x < area.x + area.width && rect.x + rect.width > area.x &&
      rect.y < area.y + area.height && rect.y + rect.height > area.y
    )) continue;
    ctx.drawImage(atlas, ...source, rect.x, rect.y, width, height);
  }
  ctx.restore();
}

// ============================================================================
// LEVEL 11 & 12: REAL-TIME DYNAMIC EFFECTS (LAVA BUBBLES, ASH, FISSURES)
// ============================================================================

export function drawVolcanoDynamicEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: LevelData,
  time: number
) {
  if (level.id !== 11 && level.id !== 12) return;

  ctx.save();

  // Animated bubbles follow the unbridged river sections.
  if (level.id === 12) {
    const bubbleSpots = level.walls.filter(isLavaBank).flatMap(wall => [
      {x: wall.x + wall.width * .3, y: wall.y + 29},
      {x: wall.x + wall.width * .7, y: wall.y + 64},
    ]);

    for (let i = 0; i < bubbleSpots.length; i++) {
      const b = bubbleSpots[i];
      const cycle = (time * 1.8 + i * 1.3) % 2.5;
      if (cycle < 1.8) {
        const swell = cycle / 1.8;
        const r = 2 + swell * 5;
        ctx.fillStyle = swell > 0.6 ? '#fff176' : swell > 0.3 ? '#ff8f00' : '#d84315';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (swell > 0.4) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const popAge = (cycle - 1.8) / 0.7;
        const alpha = 1 - popAge;
        ctx.fillStyle = `rgba(255, 170, 50, ${alpha})`;
        for (let k = 0; k < 3; k++) {
          const ang = (k * Math.PI * 2) / 3 + i;
          const dist = 4 + popAge * 10;
          ctx.beginPath();
          ctx.arc(b.x + Math.cos(ang) * dist, b.y + Math.sin(ang) * dist, 1.2 * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 2. Fissure breathing pulse
  const fPulse = 0.5 + 0.5 * Math.sin(time * 2.6);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const fGlow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 380);
  fGlow.addColorStop(0, `rgba(255, 90, 0, ${level.id === 12 ? 0.12 * fPulse : 0.06 * fPulse})`);
  fGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fGlow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 3. Floating embers
  const emberCount = level.id === 12 ? 32 : 18;
  for (let i = 0; i < emberCount; i++) {
    const ex = ((i * 137.3 + Math.sin(time * 0.8 + i) * 24 + time * 14) % w + w) % w;
    const ey = ((i * 91.7 - time * (20 + (i % 3) * 12)) % h + h) % h;
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 3.5 + i * 1.7));
    const r = 1.0 + (i % 3) * 0.5;

    ctx.globalAlpha = 0.3 + 0.5 * pulse;
    ctx.fillStyle = i % 3 === 0 ? '#ffea75' : i % 2 === 0 ? '#ff9100' : '#ff3d00';
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
