import type { LevelData, Rect, SecurityDoor, PressurePlate } from '../logic/types.ts';

// ============================================================================
// VOLCANO V2 ASSET MANAGER
// Assets extracted from user's volcanic dungeon tileset
// ============================================================================

const imageCache = new Map<string, HTMLImageElement>();
let v2Preloaded = false;

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

export function getV2Tile(name: string) { return loadV2('tiles', name); }
export function getV2Wall(name: string) { return loadV2('walls', name); }
export function getV2Gate(name: string) { return loadV2('gates', name); }
export function getV2Plate(name: string) { return loadV2('plates', name); }
export function getV2Portal(name: string) { return loadV2('portals', name); }
export function getV2Grate(name: string) { return loadV2('grates', name); }
export function getV2Prop(name: string) { return loadV2('props', name); }

export function preloadVolcanoV2Assets() {
  if (v2Preloaded || typeof Image === 'undefined') return;
  v2Preloaded = true;

  const tiles = [
    'floor_basalt_plain', 'floor_basalt_smooth', 'floor_basalt_cracked',
    'floor_lava_fissure', 'floor_lava_shore_corner', 'floor_lava_shore_straight',
    'floor_lava_shore_variant', 'floor_lava_shore_inner', 'floor_lava_pool'
  ];
  tiles.forEach(t => getV2Tile(t));

  const walls = [
    'wall_basalt_plain_h', 'wall_basalt_vein_h', 'wall_basalt_slab_v',
    'wall_basalt_cap_sq', 'wall_basalt_corner_tl', 'wall_basalt_t_junction',
    'wall_basalt_corner_curve', 'wall_basalt_horizontal', 'fence_iron_short_1',
    'fence_iron_short_2', 'fence_iron_long', 'wall_post_end'
  ];
  walls.forEach(w => getV2Wall(w));

  const gates = [
    'gate_arch_open', 'gate_arch_chain', 'gate_arch_broken_bars',
    'gate_bars_closed', 'gate_bars_broken_glow'
  ];
  gates.forEach(g => getV2Gate(g));

  const plates = ['plate_flame_dormant', 'plate_flame_active', 'plate_flame_ornate'];
  plates.forEach(p => getV2Plate(p));

  const portals = ['portal_lava_vortex', 'portal_void_vortex'];
  portals.forEach(p => getV2Portal(p));

  const grates = [
    'grate_bars_plain', 'grate_bars_lava', 'grate_mesh_iron',
    'pedestal_stepping_dormant', 'pedestal_stepping_glowing'
  ];
  grates.forEach(g => getV2Grate(g));

  const props = [
    'pillar_tall_intact', 'pillar_tall_cracked', 'pillar_base_small',
    'pillar_round_plain', 'pillar_round_cracked', 'pillar_broken_top',
    'pillar_pedestal', 'rock_boulder_dark', 'rock_coal_pile',
    'shrub_burnt_bramble', 'log_ember_burnt', 'crystal_lava_cluster',
    'coal_burning_mound'
  ];
  props.forEach(p => getV2Prop(p));
}

// ============================================================================
// LEVEL 11 & 12: GROUND TILEMAP RENDERING
// ============================================================================

export function drawVolcanoV2Floor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: LevelData,
  time: number
): boolean {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const tileSize = 64;
  const cols = Math.ceil(w / tileSize); // 20
  const rows = Math.ceil(h / tileSize); // 12

  if (level.id === 11) {
    // ------------------------------------------------------------------------
    // LEVEL 11: THÁP CANH CỔ THẠCH (Ancient Basalt Watchtower Courtyard)
    // ------------------------------------------------------------------------
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c * tileSize;
        const dy = r * tileSize;

        // Fault line glowing cracks along specific courtyard axes:
        // Connecting north crypt gate to south courtyard (c === 6 or c === 15)
        const isFissure = (c === 6 && r >= 3 && r <= 6) ||
                          (c === 15 && r >= 3 && r <= 7) ||
                          (r === 7 && c >= 6 && c <= 11);

        const isSmoothPath = (r === 2 || r === 5) || (c === 3 && r <= 3) || (c === 17 && r >= 4 && r <= 6);
        const isCracked = ((r * 7 + c * 13) % 5 === 0);

        const tile = isFissure
          ? getV2Tile('floor_lava_fissure')
          : isSmoothPath
          ? getV2Tile('floor_basalt_smooth')
          : isCracked
          ? getV2Tile('floor_basalt_cracked')
          : getV2Tile('floor_basalt_plain');

        if (tile) {
          ctx.drawImage(tile, dx, dy, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#222329';
          ctx.fillRect(dx, dy, tileSize, tileSize);
        }
      }
    }

    // Flagstone grid texture overlay for stone courtyard feel
    ctx.strokeStyle = '#15161b44';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, h); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(w, r * tileSize); ctx.stroke();
    }

  } else if (level.id === 12) {
    // ------------------------------------------------------------------------
    // LEVEL 12: THUNG LŨNG NHAM THẠCH (Molten Lava Valley / Canyon)
    // ------------------------------------------------------------------------
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c * tileSize;
        const dy = r * tileSize;

        // Row 0: Boiling molten lava lake
        // Row 1: Lava shore transitioning to basalt cliff
        // Row 10: Lava shore transitioning to southern lava lake
        // Row 11: Molten lava river
        let tileName = 'floor_basalt_cracked';

        if (r === 0) {
          tileName = 'floor_lava_pool';
        } else if (r === 1) {
          tileName = (c === 0) ? 'floor_lava_shore_corner' : (c === cols - 1) ? 'floor_lava_shore_variant' : 'floor_lava_shore_straight';
        } else if (r === rows - 2) {
          tileName = (c === 0) ? 'floor_lava_shore_inner' : 'floor_lava_shore_straight';
        } else if (r === rows - 1) {
          tileName = 'floor_lava_pool';
        } else {
          // Central canyon pathway
          const isFissure = ((r + c) % 4 === 0) || (r === 5 && c >= 4 && c <= 16);
          tileName = isFissure ? 'floor_lava_fissure' : ((r * 3 + c * 5) % 3 === 0 ? 'floor_basalt_cracked' : 'floor_basalt_plain');
        }

        const tile = getV2Tile(tileName);
        if (tile) {
          ctx.drawImage(tile, dx, dy, tileSize, tileSize);
        } else {
          ctx.fillStyle = (r === 0 || r === rows - 1) ? '#8b1800' : '#231d20';
          ctx.fillRect(dx, dy, tileSize, tileSize);
        }
      }
    }
  }

  // Soft atmospheric dungeon shadow along edges
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.68);
  vignette.addColorStop(0, 'rgba(10, 6, 8, 0)');
  vignette.addColorStop(0.7, 'rgba(12, 7, 9, 0.25)');
  vignette.addColorStop(1, 'rgba(14, 8, 10, 0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
  return true;
}

// ============================================================================
// LEVEL 11 & 12: WALL & FENCE RENDERING
// ============================================================================

export function drawVolcanoV2Wall(
  ctx: CanvasRenderingContext2D,
  wall: Rect,
  levelId: number
) {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const { x, y, width: w, height: h } = wall;
  const isOuter = x <= 0 || y <= 0 || x + w >= 1280 || y + h >= 720;

  if (isOuter) {
    // Outer perimeter: heavy obsidian basalt base
    ctx.fillStyle = levelId === 12 ? '#12080a' : '#18191e';
    ctx.fillRect(x, y, w, h);

    // Decorative wall cap along inner boundary
    ctx.strokeStyle = levelId === 12 ? '#4e2824' : '#3d404a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
    return;
  }

  // Interior dividing walls
  const isHorizontal = w >= h;

  if (levelId === 11) {
    // ------------------------------------------------------------------------
    // LEVEL 11 WALLS: Basalt stone walls with iron picket fences on top
    // ------------------------------------------------------------------------
    // Wall shadow
    ctx.fillStyle = '#08090d';
    ctx.fillRect(x + 2, y + 4, w, h);

    // Basalt foundation
    const basaltImg = getV2Wall('wall_basalt_plain_h');
    const veinImg = getV2Wall('wall_basalt_vein_h');
    const slabVImg = getV2Wall('wall_basalt_slab_v');
    const fenceImg = getV2Wall('fence_iron_long');
    const fenceShortImg = getV2Wall('fence_iron_short_1');
    const postImg = getV2Wall('wall_post_end');

    if (isHorizontal) {
      // Horizontal parapet wall (height ~32)
      for (let at = 0; at < w; at += 80) {
        const segW = Math.min(80, w - at);
        const useVein = (Math.floor(at / 80) % 2 === 1) && veinImg;
        const img = useVein ? veinImg : basaltImg;
        if (img) {
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x + at, y, segW, h);
        } else {
          ctx.fillStyle = '#2c272a';
          ctx.fillRect(x + at, y, segW, h);
        }
      }

      // Iron fence mounted along top ledge
      const fenceH = 24;
      const fenceY = y - fenceH + 8;
      for (let fx = 0; fx < w; fx += 64) {
        const fW = Math.min(64, w - fx);
        const fImg = fW >= 50 && fenceImg ? fenceImg : fenceShortImg;
        if (fImg) {
          ctx.drawImage(fImg, 0, 0, fImg.naturalWidth, fImg.naturalHeight, x + fx, fenceY, fW, fenceH);
        }
      }

      // End pillars
      if (postImg) {
        ctx.drawImage(postImg, x - 6, y - 8, 16, h + 12);
        ctx.drawImage(postImg, x + w - 10, y - 8, 16, h + 12);
      }
    } else {
      // Vertical barrier wall (e.g. x=720, x=1080)
      for (let at = 0; at < h; at += 80) {
        const segH = Math.min(80, h - at);
        if (slabVImg) {
          ctx.drawImage(slabVImg, 0, 0, slabVImg.naturalWidth, slabVImg.naturalHeight, x, y + at, w, segH);
        } else {
          ctx.fillStyle = '#2c272a';
          ctx.fillRect(x, y + at, w, segH);
        }
      }

      // Vertical wall pillar cap
      const pillarCap = getV2Prop('pillar_tall_intact');
      if (pillarCap) {
        ctx.drawImage(pillarCap, x - 6, y - 16, w + 12, 32);
      }
    }

  } else {
    // ------------------------------------------------------------------------
    // LEVEL 12 WALLS: Fiery basalt canyon crags and cracked cylindrical pillars
    // ------------------------------------------------------------------------
    // Wall shadow
    ctx.fillStyle = '#0a0405';
    ctx.fillRect(x + 2, y + 4, w, h);

    const veinImg = getV2Wall('wall_basalt_vein_h');
    const slabImg = getV2Wall('wall_basalt_slab_v');

    if (isHorizontal) {
      for (let at = 0; at < w; at += 80) {
        const segW = Math.min(80, w - at);
        if (veinImg) {
          ctx.drawImage(veinImg, 0, 0, veinImg.naturalWidth, veinImg.naturalHeight, x + at, y, segW, h);
        } else {
          ctx.fillStyle = '#321f21';
          ctx.fillRect(x + at, y, segW, h);
        }
      }
    } else {
      // Canyon monolith crags
      for (let at = 0; at < h; at += 80) {
        const segH = Math.min(80, h - at);
        if (slabImg) {
          ctx.drawImage(slabImg, 0, 0, slabImg.naturalWidth, slabImg.naturalHeight, x, y + at, w, segH);
        } else {
          ctx.fillStyle = '#321f21';
          ctx.fillRect(x, y + at, w, segH);
        }
      }

      // Crown top with cracked cylindrical pillar
      const pillar = (x % 3 === 0) ? getV2Prop('pillar_tall_cracked') : getV2Prop('pillar_round_cracked');
      if (pillar) {
        ctx.drawImage(pillar, x - 4, y - 20, w + 8, 38);
      }
    }

    // Glowing magma vein edge
    ctx.strokeStyle = '#ff4d0088';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  ctx.restore();
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

  // Rune status crystal / gem above gate
  const gemX = x + w / 2;
  const gemY = y - 6;
  const gemPulse = 0.6 + 0.4 * Math.sin(time * 3);

  ctx.save();
  ctx.fillStyle = isOpen ? '#38ef7d' : (levelId === 12 ? '#ff4d00' : '#ffaa00');
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = isOpen ? 12 : 6 * gemPulse;
  ctx.beginPath();
  ctx.arc(gemX, gemY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
  w: number,
  h: number,
  lvl: LevelData,
  clear: Rect[]
) {
  preloadVolcanoV2Assets();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  let seed = lvl.id * 929 + 41;
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

  // Pool of authentic props extracted from user sheet
  const pool11 = [
    { name: 'pillar_tall_intact', w: 38, h: 90 },
    { name: 'pillar_tall_cracked', w: 38, h: 90 },
    { name: 'pillar_broken_top', w: 45, h: 78 },
    { name: 'pillar_pedestal', w: 44, h: 66 },
    { name: 'rock_boulder_dark', w: 46, h: 50 },
    { name: 'rock_coal_pile', w: 54, h: 50 },
    { name: 'shrub_burnt_bramble', w: 56, h: 50 },
    { name: 'log_ember_burnt', w: 68, h: 44 },
    { name: 'grate_bars_plain', w: 48, h: 48 },
    { name: 'grate_mesh_iron', w: 46, h: 48 }
  ];

  const pool12 = [
    { name: 'crystal_lava_cluster', w: 48, h: 54 },
    { name: 'coal_burning_mound', w: 52, h: 42 },
    { name: 'grate_bars_lava', w: 52, h: 52 },
    { name: 'log_ember_burnt', w: 68, h: 44 },
    { name: 'shrub_burnt_bramble', w: 56, h: 50 },
    { name: 'rock_coal_pile', w: 54, h: 50 },
    { name: 'pedestal_stepping_glowing', w: 42, h: 68 },
    { name: 'pillar_tall_cracked', w: 38, h: 90 }
  ];

  const pool = lvl.id === 12 ? pool12 : pool11;
  const targetCount = lvl.id === 12 ? 18 : 20;

  for (let attempt = 0; attempt < 500 && placed.length < targetCount; attempt++) {
    const item = pool[Math.floor(rand() * pool.length)];
    const flip = rand() > 0.5;

    let x: number, y: number;
    if (attempt % 2 === 0 && lvl.walls.length > 0) {
      // Along interior walls
      const wall = lvl.walls[Math.floor(rand() * lvl.walls.length)];
      const side = rand() > 0.5 ? 1 : -1;
      x = side > 0 ? wall.x + wall.width + item.w * 0.6 : wall.x - item.w * 0.6;
      y = wall.y + rand() * wall.height;
    } else {
      // Near perimeter margins
      x = 85 + rand() * (w - 170);
      y = rand() > 0.5 ? 80 + rand() * 85 : h - 80 - rand() * 85;
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
      clear.some(c => hits(rect, c, 18)) ||
      lvl.walls.some(wall => hits(rect, wall, 6)) ||
      placed.some(p => hits(rect, p, 24))
    ) {
      continue;
    }

    placed.push(rect);
    const img = getV2Prop(item.name) || getV2Grate(item.name);
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

  // 1. Level 12: Animated bubbling lava in north and south lakes
  if (level.id === 12) {
    const bubbleSpots = [
      { x: 120, y: 35 }, { x: 380, y: 40 }, { x: 740, y: 32 }, { x: 1050, y: 38 },
      { x: 220, y: 680 }, { x: 540, y: 685 }, { x: 890, y: 678 }, { x: 1180, y: 682 }
    ];

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
