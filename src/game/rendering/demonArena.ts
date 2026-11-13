import type { LevelData, Rect } from '../logic/types.ts';

// ============================================================================
// VOLCANIC DUNGEON ASSET MANAGER
// 32 Extracted Tiles (128x128) & 19 Extracted Transparent Props
// Source: User-provided Volcanic Dungeon Tileset
// ============================================================================

const tileImages = new Map<string, HTMLImageElement>();
const propImages = new Map<string, HTMLImageElement>();
let assetsPreloaded = false;

export function getVolcanoTile(row: number, col: number): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const key = `tile_${row}_${col}`;
  let img = tileImages.get(key);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/volcano/tiles/${key}.png`;
    tileImages.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function getVolcanoProp(name: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = propImages.get(name);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/volcano/props/${name}.png`;
    propImages.set(name, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadVolcanoAssets() {
  if (assetsPreloaded || typeof Image === 'undefined') return;
  assetsPreloaded = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      getVolcanoTile(r, c);
    }
  }
  const propList = [
    'altar_brazier', 'chest_treasure', 'crystal_cluster_gold', 'crystal_cluster_red',
    'fumarole_smoke', 'furnace_kiln', 'lava_rock_spring_1', 'lava_rock_spring_2',
    'lava_shore_corner', 'log_fungi_burnt', 'log_hollow_burnt', 'monument_runic',
    'pillar_broken', 'pillar_intact', 'portal_ancient', 'shrub_burnt_1',
    'shrub_burnt_2', 'tree_dead_1', 'tree_dead_2'
  ];
  for (const name of propList) {
    getVolcanoProp(name);
  }
}

// ============================================================================
// LEVEL 13: MAGMA BOSS ARENA TILEMAP (10 Columns x 6 Rows, 128x128 Tiles)
// Canvas: 1280 x 720
// Walkable Combat Floor: Center (Columns 2..7, Rows 1..4)
// Hazards & Perimeter: Left & Right Lava Rivers, Cliff Walls, Exit Portal
// ============================================================================

// Tile coordinates in the 4x8 extracted tileset: [row, col]
const ARENA_GRID_13: [number, number][][] = [
  // Row 0: North perimeter & Portal Dais (y: 0..128)
  [
    [0, 6], [0, 5], [1, 6], [0, 0], [0, 1], [0, 0], [0, 1], [1, 6], [0, 5], [0, 6]
  ],
  // Row 1: North arena with Frostfire & Magma core nodes (y: 128..256)
  [
    [0, 7], [3, 5], [0, 2], [0, 0], [2, 0], [0, 1], [3, 0], [1, 0], [3, 5], [0, 7]
  ],
  // Row 2: Central combat ring & ritual altar (y: 256..384)
  [
    [1, 7], [1, 6], [0, 0], [0, 3], [2, 0], [0, 1], [1, 1], [0, 0], [1, 6], [1, 7]
  ],
  // Row 3: South-central battlefield & Shadowflame core (y: 384..512)
  [
    [0, 7], [2, 5], [0, 1], [3, 0], [3, 1], [0, 2], [0, 0], [2, 0], [2, 5], [0, 7]
  ],
  // Row 4: South battlefield & Player spawn zone (y: 512..640)
  [
    [3, 7], [3, 5], [0, 0], [2, 0], [0, 1], [0, 0], [3, 0], [0, 1], [3, 5], [3, 7]
  ],
  // Row 5: South boundary wall & molten lava lakes (y: 640..768)
  [
    [3, 7], [2, 7], [0, 5], [0, 4], [0, 1], [0, 0], [0, 4], [0, 5], [3, 6], [3, 7]
  ]
];

// ============================================================================
// ENVIRONMENT PROPS CONFIGURATION (Y-SORTED)
// Strictly placed along non-walkable wall zones (x < 90, x > 1190, or 4 corners)
// ============================================================================

interface ArenaProp {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  glow?: string;
  smoke?: boolean;
}

const ARENA_PROPS_13: ArenaProp[] = [
  // --- North-West Wall Block (x: 85..275, y: 90..165) ---
  { name: 'tree_dead_1', x: 145, y: 110, w: 105, h: 150, glow: '#ff5500' },
  { name: 'fumarole_smoke', x: 100, y: 145, w: 68, h: 74, smoke: true },
  { name: 'crystal_cluster_red', x: 220, y: 140, w: 72, h: 72, glow: '#ff2200' },
  { name: 'pillar_broken', x: 180, y: 150, w: 55, h: 78 },

  // --- North-East Wall Block (x: 1005..1195, y: 90..165) ---
  { name: 'tree_dead_2', x: 1160, y: 110, w: 92, h: 158, flip: true },
  { name: 'pillar_intact', x: 1100, y: 125, w: 58, h: 115 },
  { name: 'fumarole_smoke', x: 1165, y: 150, w: 68, h: 74, smoke: true },
  { name: 'crystal_cluster_gold', x: 1045, y: 135, w: 72, h: 72, glow: '#ffaa00' },

  // --- West Flank Perimeter (x < 85, along lava river) ---
  { name: 'shrub_burnt_2', x: 42, y: 220, w: 65, h: 55 },
  { name: 'lava_shore_corner', x: 45, y: 340, w: 125, h: 118, glow: '#ff4400' },
  { name: 'lava_rock_spring_2', x: 40, y: 480, w: 75, h: 60, glow: '#ff6600' },

  // --- East Flank Perimeter (x > 1195, along lava river) ---
  { name: 'pillar_broken', x: 1225, y: 230, w: 55, h: 78 },
  { name: 'chest_treasure', x: 1230, y: 355, w: 56, h: 55 },
  { name: 'log_hollow_burnt', x: 1225, y: 475, w: 85, h: 54 },
  { name: 'shrub_burnt_1', x: 1228, y: 535, w: 60, h: 52 },

  // --- South-West Wall Block (x: 85..275, y: 570..650) ---
  { name: 'furnace_kiln', x: 135, y: 595, w: 85, h: 92, glow: '#ff7700' },
  { name: 'lava_rock_spring_1', x: 215, y: 605, w: 80, h: 70, glow: '#ff5500' },
  { name: 'shrub_burnt_1', x: 175, y: 625, w: 62, h: 55 },

  // --- South-East Wall Block (x: 1005..1195, y: 570..650) ---
  { name: 'monument_runic', x: 1125, y: 590, w: 68, h: 95, glow: '#ff3300' },
  { name: 'log_fungi_burnt', x: 1055, y: 610, w: 100, h: 65, glow: '#ff8800' },
  { name: 'crystal_cluster_red', x: 1165, y: 610, w: 68, h: 68, glow: '#ff2200' },
];

// ============================================================================
// ANIMATION SYSTEMS: BUBBLING LAVA, SMOKE PUFFS, SWIRLING PORTAL, EMBERS
// ============================================================================

// Deterministic lava bubble coordinates along molten lava edges
const LAVA_BUBBLES = [
  { x: 35, y: 170, rate: 1.8, seed: 1.1 },
  { x: 65, y: 280, rate: 2.2, seed: 2.4 },
  { x: 40, y: 410, rate: 1.9, seed: 3.7 },
  { x: 70, y: 530, rate: 2.4, seed: 4.2 },
  { x: 50, y: 660, rate: 1.7, seed: 5.9 },
  { x: 1210, y: 180, rate: 2.1, seed: 6.3 },
  { x: 1245, y: 290, rate: 1.8, seed: 7.8 },
  { x: 1220, y: 430, rate: 2.3, seed: 8.1 },
  { x: 1240, y: 550, rate: 1.9, seed: 9.4 },
  { x: 1215, y: 670, rate: 2.0, seed: 10.6 },
  { x: 215, y: 675, rate: 2.2, seed: 11.2 },
  { x: 1050, y: 675, rate: 1.9, seed: 12.8 },
];

function drawAnimatedLava(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  for (const b of LAVA_BUBBLES) {
    const cycle = (time * b.rate + b.seed) % 3.0;
    if (cycle > 2.2) continue; // dormant phase

    const progress = cycle / 2.2;
    if (progress < 0.75) {
      // Swelling bubble
      const swell = progress / 0.75;
      const r = 2 + swell * 5.5;
      ctx.fillStyle = swell > 0.6 ? '#ffea60' : swell > 0.3 ? '#ff7a00' : '#b32000';
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Bright center specular dot
      if (swell > 0.4) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Pop splatter
      const popAge = (progress - 0.75) / 0.25;
      const alpha = 1 - popAge;
      ctx.fillStyle = `rgba(255, 170, 50, ${alpha})`;
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + b.seed;
        const dist = 5 + popAge * 12;
        ctx.beginPath();
        ctx.arc(b.x + Math.cos(ang) * dist, b.y + Math.sin(ang) * dist, 1.5 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFumaroleSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed: number) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const age = (time * 0.7 + i * 0.55 + seed) % 2.2;
    const progress = age / 2.2;
    const puffY = y - progress * 48;
    const driftX = x + Math.sin(time * 1.5 + i + seed) * 10;
    const radius = 4 + progress * 14;
    const alpha = (1 - progress) * 0.45;

    const grad = ctx.createRadialGradient(driftX, puffY, 1, driftX, puffY, radius);
    grad.addColorStop(0, `rgba(75, 62, 65, ${alpha})`);
    grad.addColorStop(0.7, `rgba(45, 36, 38, ${alpha * 0.6})`);
    grad.addColorStop(1, 'rgba(30, 24, 25, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(driftX, puffY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAncientPortal(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const portalImg = getVolcanoProp('portal_ancient');
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const pw = 160, ph = 146;
  const px = x - pw / 2, py = y - ph / 2;

  // 1. Swirling flame vortex in the archway doorway
  const vortexX = x, vortexY = y + 8;
  const vRadius = 38;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(vortexX, vortexY, vRadius * 0.75, vRadius, 0, 0, Math.PI * 2);
  ctx.clip();

  // Dark fire background
  ctx.fillStyle = '#180404';
  ctx.fillRect(vortexX - 45, vortexY - 45, 90, 90);

  // Rotating flame spirals
  ctx.translate(vortexX, vortexY);
  ctx.rotate(time * 2.0);

  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm * Math.PI * 2) / 3;
    const spiralGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, vRadius);
    spiralGrad.addColorStop(0, '#ffffff');
    spiralGrad.addColorStop(0.25, '#ffe566');
    spiralGrad.addColorStop(0.6, '#ff6a00');
    spiralGrad.addColorStop(1, 'rgba(180, 20, 0, 0)');

    ctx.fillStyle = spiralGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, vRadius, angle, angle + Math.PI * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // Golden core flare
  ctx.fillStyle = '#fff4bd';
  ctx.beginPath();
  ctx.arc(0, 0, 9 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 2. Portal Stone Arch Frame
  if (portalImg) {
    ctx.drawImage(portalImg, px, py, pw, ph);
  } else {
    // Crisp fallback arch
    ctx.strokeStyle = '#5a4648';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(vortexX, vortexY, 44, Math.PI, 0);
    ctx.stroke();
  }

  // 3. Glowing runic glyph pulse
  const runeGlow = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(255, 190, 50, ${0.45 * runeGlow})`;
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 12 * runeGlow;
  ctx.beginPath();
  ctx.arc(vortexX, vortexY, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawSacrificialAltar(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  const altarImg = getVolcanoProp('altar_brazier');
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Concentric arena battle rings etched into volcanic basalt floor
  ctx.save();
  const ringColors = ['#ff5e0033', '#ff370022', '#ff220015'];
  const ringRadii = [110, 210, 310];

  for (let i = 0; i < ringRadii.length; i++) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 2 + i);
    ctx.strokeStyle = ringColors[i];
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    ctx.lineDashOffset = (i % 2 === 0 ? 1 : -1) * time * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadii[i], 0, Math.PI * 2);
    ctx.stroke();

    // 4 cardinal ritual markers
    for (let m = 0; m < 4; m++) {
      const ang = (m * Math.PI) / 2 + (i * Math.PI) / 4;
      const mx = cx + Math.cos(ang) * ringRadii[i];
      const my = cy + Math.sin(ang) * ringRadii[i];
      ctx.fillStyle = `rgba(255, 120, 20, ${0.4 * pulse})`;
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Embedded Central Altar Dais
  if (altarImg) {
    const aw = 170, ah = 145;
    ctx.drawImage(altarImg, cx - aw / 2, cy - ah / 2, aw, ah);
  }

  // Pulsating molten crack glow inside altar
  const altarPulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const aGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 60);
  aGrad.addColorStop(0, `rgba(255, 200, 80, ${0.5 * altarPulse})`);
  aGrad.addColorStop(0.5, `rgba(255, 80, 0, ${0.3 * altarPulse})`);
  aGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
  ctx.fillStyle = aGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawFloatingEmbers(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, count = 42) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = ((i * 127.3 + Math.sin(time * 0.8 + i) * 26 + time * 12) % w + w) % w;
    const y = ((i * 83.7 - time * (22 + (i % 3) * 14)) % h + h) % h;
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 3.5 + i * 1.7));
    const r = 1.2 + (i % 3) * 0.6;

    ctx.globalAlpha = 0.3 + 0.55 * pulse;
    ctx.fillStyle = i % 4 === 0 ? '#ffea75' : i % 2 === 0 ? '#ff9100' : '#ff3d00';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAtmosphericVignette(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.save();
  // Warm ambient glow along lava borders
  ctx.globalCompositeOperation = 'screen';
  const leftGlow = ctx.createLinearGradient(0, 0, 160, 0);
  leftGlow.addColorStop(0, `rgba(255, 70, 0, ${0.12 + 0.04 * Math.sin(time * 2)})`);
  leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, 160, h);

  const rightGlow = ctx.createLinearGradient(w, 0, w - 160, 0);
  rightGlow.addColorStop(0, `rgba(255, 70, 0, ${0.12 + 0.04 * Math.cos(time * 2)})`);
  rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(w - 160, 0, 160, h);

  // Cinematic dark dungeon edge vignette
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65);
  vignette.addColorStop(0, 'rgba(8, 4, 5, 0)');
  vignette.addColorStop(0.7, 'rgba(10, 5, 6, 0.28)');
  vignette.addColorStop(1, 'rgba(12, 6, 7, 0.75)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ============================================================================
// MAIN EXPORT: DRAW MAGMA BOSS ARENA (LEVEL 13: HANG TÂM HỎA)
// ============================================================================

export function drawDemonArena(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number
) {
  preloadVolcanoAssets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const tileSize = 128;
  const rows = 6;
  const cols = 10;

  // 1. Draw 10x6 Ground Tilemap
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [tileRow, tileCol] = ARENA_GRID_13[r][c];
      const img = getVolcanoTile(tileRow, tileCol);
      const dx = c * tileSize;
      const dy = r * tileSize;

      if (img) {
        ctx.drawImage(img, dx, dy, tileSize, tileSize);
      } else {
        // Fallback dark basalt
        ctx.fillStyle = (r === 0 || r === 5 || c === 0 || c === 9) ? '#1f1617' : '#2d2425';
        ctx.fillRect(dx, dy, tileSize, tileSize);
      }
    }
  }

  // 2. Animated Breathing Fissure Glow
  const fissurePulse = 0.5 + 0.5 * Math.sin(time * 2.5);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const fissureNodes = [
    { x: 360, y: 220, r: 75, color: 'rgba(255, 80, 0, ' },  // Near Frostfire
    { x: 920, y: 220, r: 75, color: 'rgba(255, 120, 0, ' }, // Near Magma
    { x: 640, y: 520, r: 85, color: 'rgba(255, 50, 0, ' },  // Near Shadowflame
    { x: 480, y: 340, r: 60, color: 'rgba(255, 90, 0, ' },
    { x: 800, y: 340, r: 60, color: 'rgba(255, 90, 0, ' },
  ];
  for (const fn of fissureNodes) {
    const fg = ctx.createRadialGradient(fn.x, fn.y, 5, fn.x, fn.y, fn.r);
    fg.addColorStop(0, `${fn.color}${0.35 * fissurePulse})`);
    fg.addColorStop(1, `${fn.color}0)`);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fn.x, fn.y, fn.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Central Sacrificial Altar & Arena Glyphs
  drawSacrificialAltar(ctx, 640, 300, time);

  // 4. Ancient Portal at Boss Entrance / Level Exit (x: 610, y: 90)
  drawAncientPortal(ctx, 610, 85, time);

  // 5. Animated Molten Lava Bubbles along the perimeter channels
  drawAnimatedLava(ctx, time);

  // 6. Perimeter Environment Props (Sorted by Y for correct isometric depth)
  const sortedProps = [...ARENA_PROPS_13].sort((a, b) => a.y - b.y);
  for (const p of sortedProps) {
    const pImg = getVolcanoProp(p.name);
    ctx.save();
    if (p.flip) {
      ctx.translate(p.x, p.y);
      ctx.scale(-1, 1);
      if (pImg) ctx.drawImage(pImg, -p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      if (pImg) ctx.drawImage(pImg, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    }

    // Optional ambient glow on crystals, kiln, and trees
    if (p.glow) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `${p.glow}33`;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.flip ? 0 : p.x, p.flip ? 0 : p.y, p.w * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Smoking fumaroles
    if (p.smoke) {
      drawFumaroleSmoke(ctx, p.x, p.y - p.h * 0.25, time, p.x);
    }
  }

  // 7. Floating Ash & Fire Embers
  drawFloatingEmbers(ctx, w, h, time, 42);

  // 8. Atmospheric Lighting & Dark Edge Vignette
  drawAtmosphericVignette(ctx, w, h, time);

  ctx.restore();
}

// ============================================================================
// LEVEL 11 & LEVEL 12: STAGE DECORATION SYSTEM
// Places non-obstructing volcanic props along walls and open pockets
// ============================================================================

export function drawVolcanoStageDecor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lvl: LevelData,
  clear: Rect[]
) {
  preloadVolcanoAssets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  let seed = lvl.id * 883 + 29;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const hits = (a: Rect, b: Rect, pad = 0) =>
    a.x < b.x + b.width + pad &&
    a.x + a.width > b.x - pad &&
    a.y < b.y + b.height + pad &&
    a.y + a.height > b.y - pad;

  const placed: Rect[] = [];

  const pool11 = [
    { name: 'pillar_intact', w: 45, h: 90 },
    { name: 'pillar_broken', w: 48, h: 68 },
    { name: 'monument_runic', w: 52, h: 72 },
    { name: 'tree_dead_1', w: 75, h: 108 },
    { name: 'tree_dead_2', w: 68, h: 115 },
    { name: 'log_fungi_burnt', w: 80, h: 52 },
    { name: 'shrub_burnt_1', w: 48, h: 42 }
  ];

  const pool12 = [
    { name: 'crystal_cluster_red', w: 58, h: 58 },
    { name: 'crystal_cluster_gold', w: 58, h: 58 },
    { name: 'fumarole_smoke', w: 55, h: 60 },
    { name: 'lava_rock_spring_1', w: 65, h: 56 },
    { name: 'log_fungi_burnt', w: 80, h: 52 },
    { name: 'shrub_burnt_2', w: 52, h: 44 }
  ];

  const pool = lvl.id === 12 ? pool12 : pool11;
  const targetCount = lvl.id === 12 ? 14 : 16;

  for (let attempt = 0; attempt < 400 && placed.length < targetCount; attempt++) {
    const item = pool[Math.floor(rand() * pool.length)];
    const flip = rand() > 0.5;

    let x: number, y: number;
    if (attempt % 2 === 0 && lvl.walls.length > 0) {
      // Place near wall edges
      const wall = lvl.walls[Math.floor(rand() * lvl.walls.length)];
      const side = rand() > 0.5 ? 1 : -1;
      x = side > 0 ? wall.x + wall.width + item.w * 0.6 : wall.x - item.w * 0.6;
      y = wall.y + rand() * wall.height;
    } else {
      // Near perimeter edges
      x = 85 + rand() * (w - 170);
      y = rand() > 0.5 ? 85 + rand() * 80 : h - 85 - rand() * 80;
    }

    const rect: Rect = {
      x: x - item.w / 2,
      y: y - item.h * 0.7,
      width: item.w,
      height: item.h
    };

    if (
      rect.x < 55 ||
      rect.y < 55 ||
      rect.x + rect.width > w - 55 ||
      rect.y + rect.height > h - 55
    ) {
      continue;
    }

    if (
      clear.some(c => hits(rect, c, 20)) ||
      lvl.walls.some(wall => hits(rect, wall, 8)) ||
      placed.some(p => hits(rect, p, 24))
    ) {
      continue;
    }

    placed.push(rect);
    const img = getVolcanoProp(item.name);
    if (img) {
      ctx.save();
      if (flip) {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -item.w / 2, -item.h * 0.7, item.w, item.h);
      } else {
        ctx.drawImage(img, rect.x, rect.y, item.w, item.h);
      }
      ctx.restore();
    }
  }

  ctx.restore();
}


export function drawVolcanoFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: LevelData,
  time: number
): boolean {
  preloadVolcanoAssets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const tileSize = 128;
  const cols = Math.ceil(w / tileSize);
  const rows = Math.ceil(h / tileSize);

  if (level.id === 11) {
    // Level 11: Ancient basalt stone courtyard with cracked floor
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        const tile = isBorder
          ? getVolcanoTile(0, 5)
          : (r + c) % 4 === 0
          ? getVolcanoTile(0, 1)
          : (r * 3 + c) % 5 === 0
          ? getVolcanoTile(2, 0)
          : getVolcanoTile(0, 0);

        if (tile) {
          ctx.drawImage(tile, c * tileSize, r * tileSize, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#222329';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }
  } else if (level.id === 12) {
    // Level 12: Molten canyon with ash pathways cutting through basalt
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLavaEdge = (r === 0 && (c < 3 || c > 6)) || (r === rows - 1 && (c < 3 || c > 6)) || c === 0 || c === cols - 1;
        const isPath = (r === 2 || r === 3) && c >= 1 && c <= 8;

        const tile = isLavaEdge
          ? getVolcanoTile(0, 7)
          : isPath
          ? getVolcanoTile(2, 3)
          : (r + c) % 3 === 0
          ? getVolcanoTile(0, 2)
          : getVolcanoTile(0, 0);

        if (tile) {
          ctx.drawImage(tile, c * tileSize, r * tileSize, tileSize, tileSize);
        } else {
          ctx.fillStyle = isLavaEdge ? '#801808' : '#2d2425';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }
    // Animated lava ripples on Level 12
    drawAnimatedLava(ctx, time);
  }

  // Floating embers for both volcanic levels
  drawFloatingEmbers(ctx, w, h, time, level.id === 12 ? 36 : 22);

  // Vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65);
  vignette.addColorStop(0, 'rgba(8, 4, 5, 0)');
  vignette.addColorStop(1, 'rgba(12, 6, 7, 0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
  return true;
}

export function drawVolcanoWallDecor(
  ctx: CanvasRenderingContext2D,
  wall: Rect,
  levelId: number
) {
  preloadVolcanoAssets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const { x, y, width: w, height: h } = wall;
  const isOuter = x <= 0 || y <= 0 || x + w >= 1280 || y + h >= 720;

  if (isOuter) {
    // Fill impassable outer boundary with deep basalt/obsidian
    ctx.fillStyle = levelId === 12 ? '#180c0d' : '#1b1c20';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }

  // Interior dividing obstacles: Carved volcanic basalt blocks & columns
  ctx.fillStyle = '#2a2224';
  ctx.shadowColor = '#0a0506';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Ledge highlight
  ctx.strokeStyle = levelId === 12 ? '#543b37' : '#454850';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw decor props on walls if size permits
  if (w >= 32 && h >= 32) {
    if (levelId === 11) {
      // Place pillar or runic monument on small walls
      const prop = h > w ? getVolcanoProp('pillar_broken') : getVolcanoProp('monument_runic');
      if (prop) {
        const size = Math.min(w, h);
        ctx.drawImage(prop, x + w / 2 - size / 2, y + h / 2 - size * 0.7, size, size);
      }
    } else if (levelId === 12) {
      // Place crystal or smoking vent on walls
      const prop = (x + y) % 2 === 0 ? getVolcanoProp('crystal_cluster_red') : getVolcanoProp('crystal_cluster_gold');
      if (prop) {
        const size = Math.min(w, h);
        ctx.drawImage(prop, x + w / 2 - size / 2, y + h / 2 - size * 0.7, size, size);
      }
    }
  }

  ctx.restore();
}
