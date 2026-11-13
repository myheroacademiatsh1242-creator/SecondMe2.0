const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ==========================================
// 1. PURE PIXEL ART CANVAS & PNG ENCODER
// ==========================================
class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4, 0);
  }

  set(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255 || this.buf[i + 3] === 0) {
      this.buf[i] = Math.max(0, Math.min(255, Math.round(r)));
      this.buf[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      this.buf[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      this.buf[i + 3] = Math.max(0, Math.min(255, Math.round(a)));
    } else {
      const alpha = a / 255;
      const inv = 1 - alpha;
      this.buf[i] = Math.round(r * alpha + this.buf[i] * inv);
      this.buf[i + 1] = Math.round(g * alpha + this.buf[i + 1] * inv);
      this.buf[i + 2] = Math.round(b * alpha + this.buf[i + 2] * inv);
      this.buf[i + 3] = Math.min(255, this.buf[i + 3] + a);
    }
  }

  get(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.buf[i], this.buf[i + 1], this.buf[i + 2], this.buf[i + 3]];
  }

  fillPixelCluster(cx, cy, radius, [r, g, b], a = 255) {
    const rSq = radius * radius;
    const iR = Math.ceil(radius);
    for (let dy = -iR; dy <= iR; dy++) {
      for (let dx = -iR; dx <= iR; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          this.set(cx + dx, cy + dy, r, g, b, a);
        }
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, [r, g, b], a = 255) {
    const rxSq = rx * rx;
    const rySq = ry * ry;
    const iY = Math.ceil(ry);
    for (let dy = -iY; dy <= iY; dy++) {
      const yNorm = (dy * dy) / rySq;
      if (yNorm > 1) continue;
      const xMax = Math.round(Math.sqrt(1 - yNorm) * rx);
      for (let dx = -xMax; dx <= xMax; dx++) {
        this.set(cx + dx, cy + dy, r, g, b, a);
      }
    }
  }

  drawEllipse(cx, cy, rx, ry, [r, g, b], thickness = 1, a = 255) {
    const rxOuterSq = rx * rx;
    const ryOuterSq = ry * ry;
    const innerRx = Math.max(0, rx - thickness);
    const innerRy = Math.max(0, ry - thickness);
    const rxInnerSq = innerRx * innerRx;
    const ryInnerSq = innerRy * innerRy;
    const iY = Math.ceil(ry);
    for (let dy = -iY; dy <= iY; dy++) {
      const yNormOuter = (dy * dy) / ryOuterSq;
      if (yNormOuter > 1) continue;
      const xOuterMax = Math.round(Math.sqrt(1 - yNormOuter) * rx);
      const yNormInner = innerRy > 0 ? (dy * dy) / ryInnerSq : 2;
      const xInnerMax = yNormInner <= 1 ? Math.round(Math.sqrt(1 - yNormInner) * innerRx) : -1;
      for (let dx = -xOuterMax; dx <= xOuterMax; dx++) {
        if (Math.abs(dx) > xInnerMax) {
          this.set(cx + dx, cy + dy, r, g, b, a);
        }
      }
    }
  }

  drawCircle(cx, cy, radius, [r, g, b], thickness = 1, a = 255) {
    const outerSq = radius * radius;
    const innerR = Math.max(0, radius - thickness);
    const innerSq = innerR * innerR;
    const iR = Math.ceil(radius);
    for (let dy = -iR; dy <= iR; dy++) {
      for (let dx = -iR; dx <= iR; dx++) {
        const dSq = dx * dx + dy * dy;
        if (dSq <= outerSq && dSq >= innerSq) {
          this.set(cx + dx, cy + dy, r, g, b, a);
        }
      }
    }
  }

  drawArc(cx, cy, radius, startAngle, endAngle, [r, g, b], thickness = 2, a = 255) {
    const step = 0.5 / radius;
    for (let t = 0; t < thickness; t++) {
      const rad = radius - t;
      for (let ang = startAngle; ang <= endAngle; ang += step) {
        this.set(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, r, g, b, a);
      }
    }
  }

  drawLine(x0, y0, x1, y1, [r, g, b], thickness = 1, a = 255) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (thickness <= 1) {
        this.set(x0, y0, r, g, b, a);
      } else {
        this.fillPixelCluster(x0, y0, thickness / 2, [r, g, b], a);
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  blit(src, dstX, dstY) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const [r, g, b, a] = src.get(x, y);
        if (a > 0) {
          this.set(dstX + x, dstY + y, r, g, b, a);
        }
      }
    }
  }

  toPng() {
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    const crc32 = buf => {
      let c = 0xffffffff;
      for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
      const t = Buffer.from(type);
      const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
      return Buffer.concat([len, t, data, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc(this.h * (1 + this.w * 4));
    for (let y = 0; y < this.h; y++) {
      raw[y * (1 + this.w * 4)] = 0;
      this.buf.copy(raw, y * (1 + this.w * 4) + 1, y * this.w * 4, (y + 1) * this.w * 4);
    }
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  }
}

// ==========================================
// 2. RETRO MAGMA COLOR PALETTES
// ==========================================
const PALETTE = {
  BLACK_CRUST: [60, 31, 35],      // #3c1f23 Deepest outline & crust
  CRIMSON_DARK: [108, 30, 18],    // #6c1e12 Dark crimson flesh/fire base
  ORANGE_MAGMA: [193, 87, 29],    // #c1571d Fiery orange midtone
  YELLOW_GOLD: [228, 200, 23],    // #e4c817 Hot amber yellow core
  YELLOW_BRIGHT: [239, 247, 19],  // #eff713 Blazing solar yellow highlight
  WHITE_HOT: [255, 255, 255],
  ORANGE_BLAZE: [255, 122, 24],
  DEEP_ASH: [26, 12, 14],
};

function getPhaseColors(phase) {
  if (phase === 1) {
    return {
      core: PALETTE.YELLOW_GOLD,
      mid: PALETTE.ORANGE_MAGMA,
      rim: PALETTE.CRIMSON_DARK,
      smoke: PALETTE.BLACK_CRUST,
      sparks: PALETTE.YELLOW_BRIGHT,
      power: 1.0,
    };
  } else if (phase === 2) {
    return {
      core: PALETTE.YELLOW_BRIGHT,
      mid: PALETTE.ORANGE_BLAZE,
      rim: PALETTE.ORANGE_MAGMA,
      smoke: PALETTE.CRIMSON_DARK,
      sparks: PALETTE.WHITE_HOT,
      power: 1.25,
    };
  } else {
    return {
      core: PALETTE.WHITE_HOT,
      mid: PALETTE.YELLOW_BRIGHT,
      rim: PALETTE.ORANGE_BLAZE,
      smoke: PALETTE.CRIMSON_DARK,
      sparks: PALETTE.WHITE_HOT,
      power: 1.5,
    };
  }
}

function saveVfxSet(outDir, baseName, frames, fps, tags = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const framesDir = path.join(outDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const frameW = frames[0].w;
  const frameH = frames[0].h;
  const count = frames.length;

  frames.forEach((f, idx) => {
    const num = String(idx).padStart(2, '0');
    fs.writeFileSync(path.join(framesDir, `${baseName}_${num}.png`), f.toPng());
  });

  const sheet = new PixelCanvas(frameW * count, frameH);
  frames.forEach((f, idx) => {
    sheet.blit(f, idx * frameW, 0);
  });
  fs.writeFileSync(path.join(outDir, `${baseName}_sheet.png`), sheet.toPng());

  const durationMs = Math.round(1000 / fps);
  const jsonMeta = {
    frames: frames.map((_, idx) => ({
      filename: `${baseName}_${String(idx).padStart(2, '0')}.png`,
      frame: { x: idx * frameW, y: 0, w: frameW, h: frameH },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
      sourceSize: { x: frameW, y: frameH },
      duration: durationMs,
    })),
    meta: {
      app: 'SecondMe Pixel Side-View VFX Engine',
      version: '2.0',
      image: `${baseName}_sheet.png`,
      format: 'RGBA8888',
      size: { w: frameW * count, h: frameH },
      scale: '1',
      frameTags: [
        {
          name: tags.name || baseName,
          from: 0,
          to: count - 1,
          direction: 'forward',
          fps: fps,
          durationTotalMs: count * durationMs,
          loop: tags.loop || false,
        },
      ],
      layers: tags.layers || ['VFX_Base', 'VFX_Core', 'VFX_Sparks'],
    },
  };
  fs.writeFileSync(path.join(outDir, `${baseName}.json`), JSON.stringify(jsonMeta, null, 2));
}

// ==========================================
// 3. SIDE-VIEW COMBAT VFX GENERATORS
// ==========================================

// --- SKILL 01: SIDE-VIEW CLEAVE SLASH & TRAIL (240x240, 10 frames @ 16 FPS) ---
// In 2D side-view: Cleaver sweeps overhead-to-front downward arc from top-right to bottom-left!
function generateCleaveSideView(phase = 1) {
  const W = 240, H = 240;
  // Pivot: (144, 150) matches the Boss waist/feet in side-view
  const pivotX = 144, pivotY = 140;
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 10;
  const radius = 95 * col.power;

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    if (f === 0) {
      // Frame 0: Flash of ignition high overhead-back behind the demon's head (x: 160, y: 55)
      c.fillPixelCluster(pivotX + 16, pivotY - 85, 4, col.core);
      c.fillPixelCluster(pivotX + 16, pivotY - 85, 8, col.mid, 180);
      c.set(pivotX + 16, pivotY - 85, 255, 255, 255);
      c.set(pivotX + 22, pivotY - 92, col.sparks[0], col.sparks[1], col.sparks[2]);
    } else if (f === 1) {
      // Frame 1: Slash begins swinging forward: arc from overhead to 45 deg front
      const startA = -Math.PI * 0.65;
      const endA = -Math.PI * 0.25;
      c.drawArc(pivotX, pivotY, radius, startA, endA, col.rim, 5);
      c.drawArc(pivotX, pivotY, radius - 2, startA, endA, col.mid, 3);
      c.drawArc(pivotX, pivotY, radius - 4, startA + 0.1, endA, col.core, 2);
    } else if (f === 2) {
      // Frame 2: Max velocity downward slash: full overhead-to-ground vertical crescent!
      const startA = -Math.PI * 0.75;
      const endA = Math.PI * 0.15;
      c.drawArc(pivotX, pivotY, radius + 4, startA, endA, col.rim, 6);
      c.drawArc(pivotX, pivotY, radius, startA, endA, col.mid, 5);
      c.drawArc(pivotX, pivotY, radius - 3, startA, endA, col.core, 3);
      c.drawArc(pivotX, pivotY, radius - 1, startA + 0.3, endA, PALETTE.WHITE_HOT, 2);

      // Trailing fiery sparks
      for (let s = 0; s < 8; s++) {
        const ang = startA + (endA - startA) * (s / 8);
        const dist = radius + 6 + (s % 3) * 5;
        c.fillPixelCluster(pivotX + Math.cos(ang) * dist, pivotY + Math.sin(ang) * dist, 1.5, col.sparks);
      }
    } else if (f === 3 || f === 4) {
      // Frame 3 & 4: Ground Impact Slam! (Blade crashes into floor at bottom-left: x ~ 50, y ~ 155)
      const impactX = pivotX - 85;
      const impactY = pivotY + 15; // Ground plane line

      // Residual slash trail dissipating in air
      const fade = (f === 3 ? 0.75 : 0.4);
      c.drawArc(pivotX, pivotY, radius, -Math.PI * 0.3, Math.PI * 0.15, col.mid, 3, Math.round(255 * fade));

      // Side-view horizontal ground shockwave blasting LEFT and RIGHT along floor
      const shockLen = (f === 3 ? 32 : 54);
      c.drawLine(impactX - shockLen, impactY, impactX + shockLen * 0.5, impactY, col.core, 3);
      c.drawLine(impactX - shockLen * 1.1, impactY + 1, impactX + shockLen * 0.6, impactY + 1, col.mid, 2);

      // Upward rock/lava geyser sparks
      for (let i = 0; i < 10; i++) {
        const sx = impactX - 20 + i * 4;
        const sy = impactY - 10 - ((i * 7) % 24) - (f - 3) * 12;
        c.fillPixelCluster(sx, sy, (i % 2 === 0 ? 2 : 1), col.sparks);
      }
    } else {
      // Frames 5..9: Dissipating ground smoke and floating ash
      const fadeT = (f - 4) / 5;
      const alpha = Math.max(0, Math.round(255 * (1 - fadeT)));
      const impactX = pivotX - 85;
      const impactY = pivotY + 15;

      // Residual crater on ground
      c.drawLine(impactX - 25, impactY, impactX + 15, impactY, col.rim, 2, alpha);
      c.set(impactX - 5, impactY - 1, col.core[0], col.core[1], col.core[2], alpha);

      // Rising vertical smoke plumes
      for (let m = 0; m < 6; m++) {
        const mx = impactX - 20 + m * 7 + Math.sin(f + m) * 4;
        const my = impactY - 8 - (f - 4) * 8 - m * 3;
        c.fillPixelCluster(mx, my, (m % 2 === 0 ? 2 : 1), col.smoke, Math.round(alpha * 0.75));
      }
    }

    frames.push(c);
  }
  return frames;
}

// --- SIDE-VIEW IMPACT BURST (128x128, 8 frames @ 20 FPS) ---
function generateImpactSideView(phase = 1) {
  const W = 128, H = 128;
  const groundY = 96; // Horizontal ground floor line
  const cx = 64;
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 8;

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    if (f === 0) {
      // Ground contact point flash
      c.fillPixelCluster(cx, groundY, 6, PALETTE.WHITE_HOT);
      c.fillPixelCluster(cx, groundY - 4, 10, col.core, 200);
    } else if (f <= 3) {
      // Horizontal ground shockwave spreading left & right along ground line
      const spreadX = 14 + f * 15;
      c.drawLine(cx - spreadX, groundY, cx + spreadX, groundY, col.core, 3);
      c.drawLine(cx - spreadX * 0.9, groundY + 2, cx + spreadX * 0.9, groundY + 2, col.rim, 2);

      // Upward blasting fiery spikes (semi-circle fountain)
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI + (i + 0.5) * (Math.PI / 7);
        const len = 16 + f * 11;
        const x2 = cx + Math.cos(ang) * len;
        const y2 = groundY + Math.sin(ang) * len * 0.8;
        c.drawLine(cx, groundY - 2, x2, y2, col.sparks, 2);
      }
    } else {
      // Smoke clouds billowing up, cinders falling back down
      const fade = 1 - (f - 3) / 5;
      const alpha = Math.round(255 * fade);
      const spreadX = 45 + (f - 3) * 6;

      c.drawLine(cx - spreadX, groundY, cx + spreadX, groundY, col.smoke, 2, alpha);

      // Smoke puffs
      for (let i = 0; i < 5; i++) {
        const sx = cx - 25 + i * 12 + Math.sin(f + i) * 3;
        const sy = groundY - 15 - (f - 3) * 9;
        c.fillPixelCluster(sx, sy, 3, col.smoke, Math.round(alpha * 0.6));
      }
      // Falling sparks
      for (let i = 0; i < 6; i++) {
        const px = cx - 35 + i * 14;
        const py = groundY - 25 + (f - 3) * 6;
        if (py < groundY) c.set(px, py, col.sparks[0], col.sparks[1], col.sparks[2], alpha);
      }
    }

    frames.push(c);
  }
  return frames;
}

// --- SIDE-VIEW MAGMA POOL (128x48, 12 frames LOOP @ 10 FPS) ---
// Flat horizontal molten pool resting on ground line with vertically rising bubbles & embers
function generateMagmaPoolSideView(phase = 1) {
  const W = 128, H = 48;
  const groundY = 36; // Floor level
  const cx = 64;
  const poolW = 56; // Half width
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 12;

  const bubbles = [
    { bx: cx - 24, offset: 0, r: 4 },
    { bx: cx + 18, offset: 4, r: 5 },
    { bx: cx - 4, offset: 8, r: 3 },
    { bx: cx + 32, offset: 2, r: 4 },
  ];

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    // 1. Basalt crust bed under pool
    for (let x = cx - poolW - 4; x <= cx + poolW + 4; x++) {
      const edgeFactor = Math.abs(x - cx) / poolW;
      if (edgeFactor <= 1.08) {
        c.set(x, groundY + 1, PALETTE.BLACK_CRUST[0], PALETTE.BLACK_CRUST[1], PALETTE.BLACK_CRUST[2]);
        c.set(x, groundY + 2, PALETTE.BLACK_CRUST[0], PALETTE.BLACK_CRUST[1], PALETTE.BLACK_CRUST[2]);
      }
    }

    // 2. Molten lava liquid layer (flat horizontal strip)
    for (let x = cx - poolW; x <= cx + poolW; x++) {
      const edge = Math.abs(x - cx) / poolW;
      const wave = Math.sin((x + f * 4) * 0.25) * 1.2;
      const yTop = Math.round(groundY - 3 + wave);
      for (let y = yTop; y <= groundY; y++) {
        if (y === yTop) {
          c.set(x, y, col.core[0], col.core[1], col.core[2]);
        } else if (y === yTop + 1) {
          c.set(x, y, col.mid[0], col.mid[1], col.mid[2]);
        } else {
          c.set(x, y, col.rim[0], col.rim[1], col.rim[2]);
        }
      }
    }

    // 3. Bubbling blisters (pop and shoot micro droplets)
    bubbles.forEach(b => {
      const cycle = (f + b.offset) % totalFrames;
      const prog = cycle / totalFrames;
      const by = groundY - 3;

      if (prog < 0.6) {
        // Dome rising
        const curR = Math.round(b.r * (0.3 + 0.7 * (prog / 0.6)));
        c.fillPixelCluster(b.bx, by - curR * 0.7, curR, col.mid);
        c.set(b.bx, by - curR * 0.7 - 1, 255, 255, 255);
      } else if (prog < 0.85) {
        // Pop droplets
        c.set(b.bx - 3, by - 5, col.sparks[0], col.sparks[1], col.sparks[2]);
        c.set(b.bx + 3, by - 6, col.sparks[0], col.sparks[1], col.sparks[2]);
      }
    });

    // 4. Rising ember sparks drifting vertically UP into the air
    for (let s = 0; s < 6; s++) {
      const sx = cx - poolW * 0.8 + s * 16 + Math.sin(f * 0.5 + s) * 2;
      const sy = groundY - 6 - ((f * 3 + s * 7) % 28);
      c.set(sx, sy, col.sparks[0], col.sparks[1], col.sparks[2]);
      c.set(sx, sy + 1, col.mid[0], col.mid[1], col.mid[2], 180);
    }

    frames.push(c);
  }
  return frames;
}

// --- SIDE-VIEW PROJECTILE & IMPACT BURST (32x32 loop & 48x48 burst) ---
function generateProjectileSideView(phase = 1) {
  const W = 32, H = 32;
  const cx = 18, cy = 16;
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 6;

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    // Horizontal tail trailing to the LEFT (projectile flies towards +X)
    const tailLen = 12 + Math.sin(f * 1.5) * 3;
    for (let tx = 0; tx <= tailLen; tx++) {
      const spread = (tx / tailLen) * 3.5;
      const ty = Math.sin(f * 2 + tx * 0.9) * spread;
      const px = cx - 4 - tx;
      const py = cy + ty;
      const tailCol = (tx < 4) ? col.core : (tx < 8 ? col.mid : col.rim);
      c.fillPixelCluster(px, py, (tx < 5 ? 2 : 1), tailCol);
    }

    // Leading fire skull / bullet head
    c.fillPixelCluster(cx, cy, 6 * col.power, col.rim);
    c.fillPixelCluster(cx + 1, cy, 4 * col.power, col.mid);
    c.fillPixelCluster(cx + 2, cy, 2, col.core);
    c.set(cx + 3, cy, 255, 255, 255);

    // Trailing sparks
    c.set(cx - 15, cy - 2 + (f % 3), col.sparks[0], col.sparks[1], col.sparks[2]);
    c.set(cx - 17, cy + 2 - (f % 2), col.rim[0], col.rim[1], col.rim[2], 180);

    frames.push(c);
  }
  return frames;
}

function generateProjectileBurstSideView(phase = 1) {
  const W = 48, H = 48;
  const cx = 24, cy = 24;
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 6;

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    if (f === 0) {
      c.fillPixelCluster(cx, cy, 5, PALETTE.WHITE_HOT);
      c.fillPixelCluster(cx, cy, 8, col.core, 200);
    } else if (f <= 2) {
      const r = 6 + f * 5;
      c.drawCircle(cx, cy, r, col.mid, 2);
      c.fillPixelCluster(cx, cy, 3, col.core);
      c.set(cx + r + 2, cy, col.sparks[0], col.sparks[1], col.sparks[2]);
      c.set(cx - r - 2, cy, col.sparks[0], col.sparks[1], col.sparks[2]);
      c.set(cx, cy - r - 2, col.sparks[0], col.sparks[1], col.sparks[2]);
      c.set(cx, cy + r + 2, col.sparks[0], col.sparks[1], col.sparks[2]);
    } else {
      const fade = 1 - (f - 2) / 4;
      const alpha = Math.round(255 * fade);
      const r = 16 + (f - 2) * 4;
      c.drawCircle(cx, cy, r, col.rim, 1, alpha);
      c.fillPixelCluster(cx - 3, cy - 3, 2, col.smoke, Math.round(alpha * 0.7));
      c.fillPixelCluster(cx + 4, cy - 5, 2, col.smoke, Math.round(alpha * 0.7));
    }

    frames.push(c);
  }
  return frames;
}

// --- SIDE-VIEW TRIPLE ERUPTION & FIRE PILLAR (96x160, 14 frames @ 12 FPS) ---
// Fire pillar surges straight UPWARDS from the horizontal floor line at bottom
function generateEruptionSideView(phase = 1) {
  const W = 96, H = 160;
  const groundY = 145; // Floor plane near bottom
  const cx = 48;
  const frames = [];
  const col = getPhaseColors(phase);
  const totalFrames = 14;

  for (let f = 0; f < totalFrames; f++) {
    const c = new PixelCanvas(W, H);

    if (f === 0) {
      // Frame 0: Horizontal ground fissure on floor line
      c.drawLine(cx - 32, groundY, cx + 32, groundY, col.rim, 3);
      c.drawLine(cx - 20, groundY, cx + 18, groundY, col.core, 2);
      c.set(cx, groundY - 1, 255, 255, 255);
    } else if (f === 1) {
      // Frame 1: Fissure cracks widen, subterranean heat pulses upwards
      c.drawLine(cx - 36, groundY, cx + 36, groundY, col.mid, 4);
      c.drawLine(cx - 24, groundY, cx + 24, groundY, col.core, 3);
      c.drawLine(cx - 15, groundY - 1, cx + 15, groundY - 1, PALETTE.WHITE_HOT, 2);
      // Pre-eruption heat sparks
      c.set(cx - 6, groundY - 6, col.sparks[0], col.sparks[1], col.sparks[2]);
      c.set(cx + 8, groundY - 9, col.sparks[0], col.sparks[1], col.sparks[2]);
    } else if (f >= 2 && f <= 6) {
      // Eruption Pillar surging straight UPWARDS into the sky!
      const surgeH = (f === 2) ? 65 : (f === 3 ? 128 : 142);
      const topY = groundY - surgeH;
      const pillarW = 16 * col.power;

      // Base volcanic crater on ground
      c.fillEllipse(cx, groundY, 34, 7, col.rim);
      c.fillEllipse(cx, groundY, 22, 4, col.core);

      // Vertical Fire Column
      for (let y = topY; y <= groundY; y += 2) {
        const hNorm = (groundY - y) / surgeH;
        const widthAtY = Math.round(pillarW * (0.8 + 0.35 * Math.sin(y * 0.18 + f * 2.2)));

        c.fillPixelCluster(cx, y, widthAtY + 4, col.rim);
        c.fillPixelCluster(cx, y, widthAtY, col.mid);
        if (hNorm < 0.85) {
          c.fillPixelCluster(cx, y, Math.max(1, widthAtY * 0.45), col.core);
        }
      }

      // Pillar Eruption Crown at top
      c.fillPixelCluster(cx, topY, 13, col.mid);
      c.fillPixelCluster(cx, topY, 7, col.core);
      c.set(cx, topY, 255, 255, 255);

      // Molten lava bombs flying upward and arcing
      for (let d = 0; d < 8; d++) {
        const ang = -Math.PI / 2 + (d - 3.5) * 0.26;
        const dist = surgeH + 10 + (d % 3) * 10;
        const bx = cx + Math.cos(ang) * dist * 0.45;
        const by = groundY + Math.sin(ang) * dist;
        c.fillPixelCluster(bx, by, (d % 2 === 0 ? 2 : 3), col.sparks);
      }
    } else if (f >= 7 && f <= 9) {
      // Pillar descending into ground pool
      const remH = Math.max(18, 95 - (f - 6) * 32);
      const topY = groundY - remH;

      c.fillEllipse(cx, groundY, 32, 6, col.mid);
      c.fillEllipse(cx, groundY, 20, 3, col.core);

      for (let y = topY; y <= groundY; y += 2) {
        const widthAtY = Math.round(12 * (1 - (groundY - y) / remH));
        c.fillPixelCluster(cx, y, widthAtY, col.mid);
      }

      // Vertical smoke plumes rising up
      c.fillPixelCluster(cx - 8, topY - 12, 7, col.smoke, 200);
      c.fillPixelCluster(cx + 6, topY - 18, 8, col.smoke, 200);
    } else {
      // Solidify into cooling basalt on floor plane
      const coolT = (f - 10) / 3;
      const alpha = Math.round(255 * (1 - coolT * 0.6));

      c.fillEllipse(cx, groundY, 30, 6, PALETTE.BLACK_CRUST, alpha);
      if (f < 13) {
        c.drawLine(cx - 14, groundY - 1, cx + 12, groundY + 1, col.rim, 2, alpha);
      }

      const smokeY = groundY - 22 - (f - 10) * 14;
      c.fillPixelCluster(cx - 4, smokeY, 6, col.smoke, Math.round(alpha * 0.5));
      c.fillPixelCluster(cx + 5, smokeY - 10, 5, col.smoke, Math.round(alpha * 0.4));
    }

    frames.push(c);
  }
  return frames;
}

// --- SIDE-VIEW TELEGRAPHS ---
function generateTelegraphsSideView() {
  const dir = 'public/assets/demon-boss/vfx/telegraphs';
  fs.mkdirSync(dir, { recursive: true });

  // 1. Cleave Warning Arc in Side-View (240x240):
  // Shows overhead-to-front downward chopping arc trajectory
  const arcC = new PixelCanvas(240, 240);
  const cx = 144, cy = 140;
  const R = 95;
  const startA = -Math.PI * 0.75;
  const endA = Math.PI * 0.15;

  arcC.drawArc(cx, cy, R, startA, endA, PALETTE.YELLOW_BRIGHT, 3);
  arcC.drawArc(cx, cy, R - 2, startA, endA, PALETTE.ORANGE_BLAZE, 2);
  // Sector line indicators
  arcC.drawLine(cx, cy, cx + Math.cos(startA) * R, cy + Math.sin(startA) * R, PALETTE.YELLOW_GOLD, 2);
  arcC.drawLine(cx, cy, cx + Math.cos(endA) * R, cy + Math.sin(endA) * R, PALETTE.YELLOW_GOLD, 2);
  fs.writeFileSync(path.join(dir, 'warning_arc_120.png'), arcC.toPng());

  // 2. Eruption Warning on Floor (96x32 flat horizontal strip)
  const circC = new PixelCanvas(96, 32);
  const fcx = 48, fcy = 16;
  circC.drawEllipse(fcx, fcy, 42, 10, PALETTE.YELLOW_BRIGHT, 2);
  circC.drawEllipse(fcx, fcy, 40, 8, PALETTE.ORANGE_BLAZE, 2);
  circC.drawLine(fcx - 44, fcy, fcx + 44, fcy, PALETTE.WHITE_HOT, 2);
  fs.writeFileSync(path.join(dir, 'warning_circle_96.png'), circC.toPng());

  // 3. Aim Ray Indicator (Horizontal dashed beam, 256x16)
  const rayC = new PixelCanvas(256, 16);
  for (let x = 0; x < 256; x += 12) {
    for (let seg = 0; seg < 7 && x + seg < 256; seg++) {
      rayC.set(x + seg, 8, PALETTE.YELLOW_BRIGHT[0], PALETTE.YELLOW_BRIGHT[1], PALETTE.YELLOW_BRIGHT[2]);
      rayC.set(x + seg, 7, PALETTE.ORANGE_BLAZE[0], PALETTE.ORANGE_BLAZE[1], PALETTE.ORANGE_BLAZE[2], 200);
      rayC.set(x + seg, 9, PALETTE.ORANGE_BLAZE[0], PALETTE.ORANGE_BLAZE[1], PALETTE.ORANGE_BLAZE[2], 200);
    }
  }
  fs.writeFileSync(path.join(dir, 'aim_ray_indicator.png'), rayC.toPng());
}

// ==========================================
// 4. MAIN BUILD PROCESS
// ==========================================
console.log('--- GENERATING 2D SIDE-VIEW PIXEL COMBAT VFX ---');
const baseDir = path.join('public', 'assets', 'demon-boss', 'vfx');

// 1. Cleave Slash (Side-View, P1..P3)
[1, 2, 3].forEach(phase => {
  const frames = generateCleaveSideView(phase);
  const outDir = path.join(baseDir, 'cleave');
  saveVfxSet(outDir, `cleave_slash_p${phase}`, frames, 16, { name: `CleaveSlash_P${phase}`, loop: false });
  if (phase === 1) saveVfxSet(outDir, 'cleave_slash', frames, 16, { name: 'CleaveSlash', loop: false });
});

// 2. Impact Burst (Side-View, P1..P3)
[1, 2, 3].forEach(phase => {
  const frames = generateImpactSideView(phase);
  const outDir = path.join(baseDir, 'impact');
  saveVfxSet(outDir, `impact_burst_p${phase}`, frames, 20, { name: `ImpactBurst_P${phase}`, loop: false });
  if (phase === 1) saveVfxSet(outDir, 'impact_burst', frames, 20, { name: 'ImpactBurst', loop: false });
});

// 3. Magma Pool (Side-View, P1..P3)
[1, 2, 3].forEach(phase => {
  const frames = generateMagmaPoolSideView(phase);
  const outDir = path.join(baseDir, 'magma_pool');
  saveVfxSet(outDir, `magma_pool_p${phase}`, frames, 10, { name: `MagmaPool_P${phase}`, loop: true });
  if (phase === 1) saveVfxSet(outDir, 'magma_pool', frames, 10, { name: 'MagmaPool', loop: true });
});

// 4. Fire Fan Projectile & Burst (Side-View, P1..P3)
[1, 2, 3].forEach(phase => {
  const framesProj = generateProjectileSideView(phase);
  const framesBurst = generateProjectileBurstSideView(phase);
  const outDir = path.join(baseDir, 'fire_fan');
  saveVfxSet(outDir, `projectile_p${phase}`, framesProj, 12, { name: `FireProjectile_P${phase}`, loop: true });
  saveVfxSet(outDir, `projectile_burst_p${phase}`, framesBurst, 20, { name: `ProjectileBurst_P${phase}`, loop: false });
  if (phase === 1) {
    saveVfxSet(outDir, 'projectile', framesProj, 12, { name: 'FireProjectile', loop: true });
    saveVfxSet(outDir, 'projectile_burst', framesBurst, 20, { name: 'ProjectileBurst', loop: false });
  }
});

// 5. Triple Eruption (Side-View, P1..P3)
[1, 2, 3].forEach(phase => {
  const frames = generateEruptionSideView(phase);
  const outDir = path.join(baseDir, 'eruption');
  saveVfxSet(outDir, `eruption_p${phase}`, frames, 12, { name: `TripleEruption_P${phase}`, loop: false });
  if (phase === 1) saveVfxSet(outDir, 'eruption', frames, 12, { name: 'TripleEruption', loop: false });
});

// 6. Telegraphs (Side-View)
generateTelegraphsSideView();

console.log('--- ALL SIDE-VIEW ASSETS GENERATED SUCCESSFULLY ---');
