import type {BossState} from '../logic/campaign.ts';
import type {ElementalCoreType} from '../logic/demonBoss.ts';
import { DEMON_CLEAVE_HALF_ANGLE, DEMON_CLEAVE_RADIUS, DEMON_SHOCKWAVE_DURATION, demonShockwaveRadius, DEMON_VOLLEY_SPREAD, demonVolleyCount, demonVolleyOrigin } from '../logic/demonBoss.ts';

let sheet: HTMLImageElement | null = null;
function image() {
  if (typeof Image === 'undefined') return null;
  if (!sheet) {
    sheet = new Image();
    sheet.src = `${import.meta.env.BASE_URL}assets/demon-boss/sheet-fire.png?v=6`;
  }
  return sheet.complete && sheet.naturalWidth ? sheet : null;
}

const vfxImages: Record<string, HTMLImageElement> = {};
function getVfx(relPath: string) {
  if (typeof Image === 'undefined') return null;
  if (!vfxImages[relPath]) {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/demon-boss/vfx/${relPath}`;
    vfxImages[relPath] = img;
  }
  const img = vfxImages[relPath];
  return img.complete && img.naturalWidth ? img : null;
}

export function loadDemonSprites() {
  image();
  getVfx('cleave/cleave_slash_p1_sheet.png');
  getVfx('cleave/cleave_slash_p2_sheet.png');
  getVfx('cleave/cleave_slash_p3_sheet.png');
  getVfx('impact/impact_burst_p1_sheet.png');
  getVfx('magma_pool/magma_pool_p1_sheet.png');
  getVfx('fire_fan/projectile_p1_sheet.png');
  getVfx('eruption/eruption_p1_sheet.png');
  getVfx('telegraphs/warning_arc_120.png');
  getVfx('telegraphs/warning_circle_96.png');
  getVfx('telegraphs/aim_ray_indicator.png');
}

export const DEMON_ANIMATIONS = {
  idle: { row: 0, count: 6 },
  walk: { row: 1, count: 12 },
  cleave: { row: 2, count: 15 },
  hit: { row: 3, count: 5 },
  death: { row: 4, count: 22 },
} as const;

export function demonFrame(b: BossState, deathAge: number) {
  const d = b.demon!;
  if (b.hp <= 0) return { animation: 'death' as const, frame: Math.min(21, Math.floor(deathAge * 10)) };

  // Ritual leap animation:
  if (b.mode === 'ritual' && d.leapDuration && d.modeAge < d.leapDuration + 0.35) {
    if (d.modeAge < d.leapDuration) {
      // In mid-air: cleave weapon raised high overhead
      const leapProgress = d.modeAge / d.leapDuration;
      return { animation: 'cleave' as const, frame: Math.min(4, Math.floor(leapProgress * 5)) };
    } else {
      // Ground slam on landing
      const slamProgress = (d.modeAge - d.leapDuration) / 0.35;
      return { animation: 'cleave' as const, frame: Math.min(13, 9 + Math.floor(slamProgress * 4)) };
    }
  }

  // Tactical short hops & recoils:
  if (d.hopActive) {
    const hopProgress = Math.min(1, d.hopAge / (d.hopDuration || 0.35));
    if (d.hopType === 'recoil') {
      return { animation: 'hit' as const, frame: hopProgress < 0.6 ? 2 : 4 };
    }
    if (d.hopType === 'pounce' || d.hopType === 'slam') {
      return { animation: 'cleave' as const, frame: hopProgress < 0.65 ? 4 : 10 };
    }
  }
  if ((d.landingImpact ?? 0) > 0.08 && b.mode === 'stalking') {
    return { animation: 'cleave' as const, frame: 10 };
  }

  // Stunned:
  if (b.mode === 'stunned') return { animation: 'hit' as const, frame: 4 };

  // Hurt flinch:
  if (d.hurtTime > 0) return { animation: 'hit' as const, frame: Math.min(4, Math.floor((0.25 - d.hurtTime) * 16)) };

  // Overheat charge warning & dash:
  if (b.mode === 'charge_warning') {
    return { animation: 'cleave' as const, frame: Math.min(3, Math.floor(d.modeAge * 4)) };
  }
  if (b.mode === 'charge_dash') {
    return { animation: 'cleave' as const, frame: 10 };
  }

  // Combat Attack: Cleave
  if (b.attack === 'melee') {
    if (b.mode === 'warning') {
      const age = d.modeAge;
      let frame = 0;
      if (age < 0.3) {
        frame = Math.min(2, Math.floor((age / 0.3) * 3));
      } else if (age < 0.65) {
        frame = 3 + Math.min(2, Math.floor(((age - 0.3) / 0.35) * 3));
      } else {
        frame = 6 + Math.min(2, Math.floor(((age - 0.65) / 0.25) * 3));
      }
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'strike') {
      const age = d.modeAge;
      let frame = 9;
      if (age < 0.08) frame = 9;
      else if (age < 0.22) frame = 10;
      else if (age < 0.38) frame = 11;
      else if (age < 0.50) frame = 12;
      else frame = 13;
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'recover' && d.modeAge < 0.25) {
      return { animation: 'cleave' as const, frame: 14 };
    }
  }

  // Combat Attack: Fire Fan (Volley Casting)
  if (b.attack === 'volley') {
    if (b.mode === 'warning') {
      const frame = d.modeAge < 0.4 ? Math.min(3, 2 + Math.floor((d.modeAge / 0.4) * 2)) : 4;
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'strike') {
      const frame = Math.min(7, 5 + Math.floor((d.modeAge / 0.6) * 3));
      return { animation: 'cleave' as const, frame };
    }
  }

  // Combat Attack: Triple Eruption (Earth Shaker)
  if (b.attack === 'triple') {
    if (b.mode === 'warning') {
      if (d.modeAge < 0.7) {
        const frame = 3 + Math.min(2, Math.floor((d.modeAge / 0.7) * 3));
        return { animation: 'cleave' as const, frame };
      } else {
        return { animation: 'cleave' as const, frame: 10 };
      }
    }
    if (b.mode === 'strike') {
      const frame = d.modeAge < 0.35 ? 10 : 11;
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'recover' && d.modeAge < 0.3) {
      return { animation: 'cleave' as const, frame: 13 };
    }
  }

  // Combat Attack: Minion Swarm Summon (Roar & Ground Slam)
  if (b.attack === 'summon') {
    if (b.mode === 'warning') {
      const frame = Math.min(5, 2 + Math.floor((d.modeAge / 0.9) * 4));
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'strike') {
      const frame = d.modeAge < 0.25 ? 10 : 11;
      return { animation: 'cleave' as const, frame };
    }
    if (b.mode === 'recover' && d.modeAge < 0.3) {
      return { animation: 'cleave' as const, frame: 13 };
    }
  }

  // Movement & Idle:
  const animation = b.mode === 'stalking' && d.walking ? ('walk' as const) : ('idle' as const);
  return { animation, frame: Math.floor(d.age * 10) % DEMON_ANIMATIONS[animation].count };
}

const CORE_COLORS: Record<ElementalCoreType, { primary: string; glow: string; text: string; vi: string; en: string }> = {
  frostfire: { primary: '#5de4ff', glow: '#2898b8', text: '#bbf4ff', vi: 'LAM DIỄM (LỬA LẠNH)', en: 'FROSTFIRE' },
  magma: { primary: '#ff6224', glow: '#b8340d', text: '#ffd4b8', vi: 'DUNG NHAM (HỎA NGỤC)', en: 'MAGMA' },
  shadow: { primary: '#c054ff', glow: '#6a1eb8', text: '#f0d4ff', vi: 'HẮC HỎA (BÓNG TỐI)', en: 'SHADOWFLAME' },
};

export function drawDemonBoss(ctx: CanvasRenderingContext2D, b: BossState, time: number, deathAge: number, vi: boolean) {
  const d = b.demon!;
  ctx.save();

  // 1. Draw Elemental Cores & Pedestals
  if (d.cores && b.hp > 0) {
    for (const c of d.cores) {
      const col = CORE_COLORS[c.id];
      const isVent = d.ventCore === c.id;
      const isAbsorbed = d.activeElement === c.id;
      const isRitual = b.mode === 'ritual';

      ctx.save();
      ctx.translate(c.x, c.y);

      // Pedestal base
      ctx.fillStyle = '#171c26';
      ctx.strokeStyle = isVent ? '#5de4ff' : isAbsorbed ? col.primary : '#3a4454';
      ctx.lineWidth = isVent ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rune glyph markings
      ctx.strokeStyle = isVent ? '#a8f2ff' : col.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing core crystal / flame
      const pulse = 0.8 + 0.2 * Math.sin(time * 3 + (c.id === 'frostfire' ? 0 : c.id === 'magma' ? 2 : 4));
      ctx.fillStyle = isVent ? '#e0faff' : col.primary;
      ctx.shadowColor = isVent ? '#5de4ff' : col.primary;
      ctx.shadowBlur = isRitual || isVent ? 15 * pulse : 6;
      ctx.beginPath();
      ctx.arc(0, 0, 16 * (isRitual ? pulse * 1.2 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sealing progress circle
      if (c.sealProgress > 0 && !c.sealed) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius + 4, -Math.PI / 2, -Math.PI / 2 + c.sealProgress * Math.PI * 2);
        ctx.stroke();
      }

      // Sealed runic chains
      if (c.sealed) {
        ctx.strokeStyle = '#7ee7ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, c.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Core label / status tag
      ctx.font = '14px "Second Me Pixel", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isVent ? '#7ee7ff' : col.text;
      const label = isVent
        ? vi
          ? 'TRỤ TẢN NHIỆT (DỤ BOSS VÀO ĐÂY)'
          : 'COOLING VENT (BAIT BOSS HERE)'
        : c.sealed
        ? vi
          ? 'ĐÃ PHONG ẤN'
          : 'SEALED'
        : vi
        ? col.vi
        : col.en;
      ctx.fillText(label, 0, c.radius + 20);

      // Light beam during ritual
      if (isRitual) {
        const grad = ctx.createLinearGradient(0, 0, 0, -180);
        grad.addColorStop(0, `${col.primary}88`);
        grad.addColorStop(1, `${col.primary}00`);
        ctx.fillStyle = grad;
        ctx.fillRect(-20, -180, 40, 180);
      }

      ctx.restore();
    }
  }

  // 2. Draw Ember & Magma Zones (Pixel Art VFX)
  for (const z of d.zones) {
    const active = z.age >= z.delay;
    const isMagma = z.element === 'magma';
    const phaseKey = `p${Math.min(3, Math.max(1, b.phase))}`;

    if (isMagma) {
      const poolImg = getVfx(`magma_pool/magma_pool_${phaseKey}_sheet.png`);
      if (poolImg) {
        const frame = Math.floor(z.age * 10) % 12;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(poolImg, frame * 128, 0, 128, 80, z.x - 64, z.y - 40, 128, 80);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#ff3e10aa' : '#ffcc331b';
        ctx.strokeStyle = active ? '#ffb555' : '#ffd58a';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Eruption Zone
      if (!active) {
        const warnImg = getVfx('telegraphs/warning_circle_96.png');
        if (warnImg) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          const pulse = 0.95 + 0.05 * Math.sin(time * 8);
          ctx.translate(z.x, z.y);
          ctx.scale(pulse, pulse);
          ctx.drawImage(warnImg, -56, -56, 112, 112);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 48, -Math.PI / 2, -Math.PI / 2 + Math.min(1, z.age / z.delay) * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffcc331b';
          ctx.strokeStyle = '#ffd58a';
          ctx.lineWidth = 3;
          ctx.fill();
          ctx.stroke();
        }
      } else {
        const eruptImg = getVfx(`eruption/eruption_${phaseKey}_sheet.png`);
        if (eruptImg) {
          const frame = Math.min(13, Math.floor((z.age - z.delay) * 12));
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(eruptImg, frame * 96, 0, 96, 160, z.x - 48, z.y - 135, 96, 160);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#fb5e20aa';
          ctx.strokeStyle = '#ffb555';
          ctx.lineWidth = 3;
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }

  // 3. Draw Attack Telegraphs
  if (b.mode === 'warning' && b.attack === 'melee') {
    const a = Math.atan2(b.targetY - b.y, b.targetX - b.x);
    const arcImg = getVfx('telegraphs/warning_arc_120.png');
    if (arcImg && d.activeElement !== 'frostfire') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      ctx.drawImage(arcImg, -160, -160, 320, 320);
      const p = Math.min(1, d.modeAge / 0.9);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, DEMON_CLEAVE_RADIUS, -DEMON_CLEAVE_HALF_ANGLE, DEMON_CLEAVE_HALF_ANGLE * (2 * p - 1));
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, DEMON_CLEAVE_RADIUS, a - DEMON_CLEAVE_HALF_ANGLE, a + DEMON_CLEAVE_HALF_ANGLE);
      ctx.closePath();
      ctx.fillStyle = d.activeElement === 'frostfire' ? '#5de4ff33' : '#fb923c40';
      ctx.strokeStyle = d.activeElement === 'frostfire' ? '#9beaff' : '#ffd58b';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
    }
  }

  if (b.attack === 'volley' && (b.mode === 'warning' || (b.mode === 'strike' && d.modeAge < .27))) {
    const origin = demonVolleyOrigin(b);
    const warning = b.mode === 'warning';
    const charge = warning ? Math.min(1, d.modeAge / .9) : 1;
    const fade = warning ? .35 + charge * .65 : 1 - d.modeAge / .27;
    const ice = d.activeElement === 'frostfire';
    const edge = ice ? '#78e2ff' : '#ff9d33';
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = edge;
    if (warning) {
      ctx.globalAlpha *= .42;
      ctx.setLineDash([5, 10]);
      for (let i = -(demonVolleyCount(b) - 1) / 2; i <= (demonVolleyCount(b) - 1) / 2; i++) {
        const ray = origin.angle + i * DEMON_VOLLEY_SPREAD;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + Math.cos(ray) * 190, origin.y + Math.sin(ray) * 190);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = fade;
    }
    ctx.translate(origin.x, origin.y);
    ctx.rotate(origin.angle);
    ctx.scale(1 + (warning ? 0 : d.modeAge * 1.5), 1);
    ctx.lineWidth = 2;
    ctx.shadowColor = edge;
    ctx.shadowBlur = 8;
    for (const radius of [1, .78]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * radius, 28 * radius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3 + time * 2;
      ctx.fillStyle = ice ? '#dffaff' : '#ffe593';
      ctx.fillRect(Math.cos(angle) * 9 - 1, Math.sin(angle) * 28 - 1, 3, 3);
    }
    ctx.restore();
  }

  if (b.mode === 'strike' && (b.attack === 'triple' || b.attack === 'summon') && d.modeAge < DEMON_SHOCKWAVE_DURATION) {
    const progress = d.modeAge / DEMON_SHOCKWAVE_DURATION;
    const radius = demonShockwaveRadius(d.modeAge);
    ctx.save();
    ctx.globalAlpha = (1 - progress) ** 2;
    ctx.strokeStyle = d.activeElement === 'frostfire' ? '#bdf6ff' : '#ffc17b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Overheat Charge Telegraph Line
  if (b.mode === 'charge_warning') {
    const angle = d.chargeAngle ?? Math.atan2(b.targetY - b.y, b.targetX - b.x);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255, 98, 36, 0.25)';
    ctx.strokeStyle = '#ff9142';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.rect(0, -45, 900, 90);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 4b. Minion Summon Telegraph (Magma Pentagram / Summoning Circles on Arena Floor)
  if (b.mode === 'warning' && b.attack === 'summon') {
    const p = Math.min(1, d.modeAge / 0.9);
    ctx.save();
    ctx.strokeStyle = '#ffad616e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, demonShockwaveRadius(DEMON_SHOCKWAVE_DURATION), 0, Math.PI * 2);
    ctx.stroke();
    ctx.translate(b.x, b.y + 24);
    // Pulsing magma rune circle
    const runeRadius = 78 + Math.sin(time * 12) * 5;
    ctx.strokeStyle = '#ff3700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, runeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffc13b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, runeRadius - 12, -time * 2.5, -time * 2.5 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing summoning runes
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + time * 1.5;
      const rx = Math.cos(a) * (runeRadius - 6);
      const ry = Math.sin(a) * (runeRadius - 6);
      ctx.fillStyle = '#ffe078';
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expanding shock ring
    ctx.strokeStyle = `rgba(255, 90, 20, ${1 - p})`;
    ctx.lineWidth = (1 - p) * 6;
    ctx.beginPath();
    ctx.arc(0, 0, p * 135, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Warm orbs use the compact silhouette and yellow cores of the reference.
  for (const [index, projectile] of b.projectiles.entries()) {
    const ice = d.activeElement === 'frostfire';
    const flicker = Math.floor(time * 20 + index) % 3;
    ctx.save();
    ctx.translate(Math.round(projectile.x), Math.round(projectile.y));
    ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
    ctx.fillStyle = ice ? '#2a8dcc' : '#be411d';
    ctx.fillRect(-21 - flicker * 2, -2, 17 + flicker * 2, 4);
    ctx.fillRect(-8, -6, 13, 12);
    ctx.fillStyle = ice ? '#73deff' : '#ff9b27';
    ctx.fillRect(-5, -8, 9, 16);
    ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = ice ? '#e8fbff' : '#fff187';
    ctx.fillRect(-2, -5, 7, 10);
    ctx.fillRect(-5, -2, 12, 4);
    ctx.globalAlpha *= .65;
    ctx.fillRect(-24 - flicker * 3, 3 - flicker * 2, 3, 2);
    ctx.restore();
  }

  // 6. Boss Shadow & Fluid Vertical Elevation System
  const isLeaping = b.mode === 'ritual' && d.leapDuration && d.modeAge < d.leapDuration;
  const leapProgress = isLeaping ? Math.min(1, d.modeAge / d.leapDuration!) : 1;
  const leapArc = isLeaping ? Math.sin(leapProgress * Math.PI) * 170 : 0;

  // Base elevation from physical hops / leaps
  let currentElevation = (d.elevation ?? 0) + leapArc;

  // Natural stride cadence & breathing bob
  const isWalking = b.mode === 'stalking' && d.walking;
  const walkBob = isWalking ? Math.abs(Math.sin((d.stepCycle ?? 0) * Math.PI)) * 5.5 : 0;
  const idleBreathe = b.mode === 'stalking' && !isWalking ? Math.sin((d.age ?? 0) * 3) * 2.2 : 0;

  // Combat procedural vertical dynamics (weapon lift, crouching, recoil, slams)
  let attackLift = 0;
  let attackCrouch = 0;

  if (b.attack === 'melee') {
    if (b.mode === 'warning') {
      if (d.modeAge < 0.45) {
        attackLift = (d.modeAge / 0.45) * 15; // Upward weapon lift anticipation
      } else {
        attackCrouch = ((d.modeAge - 0.45) / 0.45) * 16; // Coiling legs down before strike
      }
    } else if (b.mode === 'strike') {
      if (d.modeAge < 0.1) {
        attackLift = Math.sin((d.modeAge / 0.1) * Math.PI) * 18; // Upward leap into slash
      } else if (d.modeAge < 0.28) {
        attackCrouch = (1 - (d.modeAge - 0.1) / 0.18) * 16; // Heavy downward slam impact squash
      }
    }
  } else if (b.attack === 'volley') {
    if (b.mode === 'strike' && d.modeAge < 0.25) {
      attackLift = Math.sin((d.modeAge / 0.25) * Math.PI) * 8; // Upper-body volley kickback
    }
  } else if (b.attack === 'triple') {
    if (b.mode === 'warning') {
      attackLift = Math.min(1, d.modeAge / 0.8) * 24; // Earth shaker rise anticipation
    } else if (b.mode === 'strike' && d.modeAge < 0.32) {
      attackCrouch = (1 - d.modeAge / 0.32) * 18; // Heavy seismic impact compression
    }
  }

  const effectiveElevation = currentElevation + attackLift;
  const effectiveCrouch = (d.crouch ?? 0) + attackCrouch;
  const totalVerticalOffset = effectiveElevation - effectiveCrouch + walkBob + idleBreathe;

  // Ground Shadow: Always anchored firmly on the ground plane (b.x, b.y + 24)
  const shadowScale = Math.max(0.32, 1 - Math.min(1, effectiveElevation / 180) * 0.55);
  const shadowAlpha = Math.max(0.18, 0.65 - Math.min(1, effectiveElevation / 200) * 0.45);

  ctx.fillStyle = `rgba(9, 10, 16, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + 24, 47 * shadowScale, 15 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 6b. Landing Ground Shockwave (Short hops, slams & ritual)
  if (d.landingImpact && d.landingImpact > 0) {
    const prog = 1 - d.landingImpact / 0.25;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 150, 50, ${(1 - prog) * 0.8})`;
    ctx.lineWidth = Math.max(1, (1 - prog) * 4);
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 24, 25 + prog * 45, (25 + prog * 45) * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Ritual Landing Ground Shockwave
  if (b.mode === 'ritual' && d.leapDuration) {
    const impactAge = d.modeAge - d.leapDuration;
    if (impactAge >= 0 && impactAge < 0.45) {
      const shockProgress = impactAge / 0.45;
      const shockR = shockProgress * 150;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 170, 60, ${1 - shockProgress})`;
      ctx.lineWidth = (1 - shockProgress) * 6;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 24, shockR, shockR * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 80, 20, ${(1 - shockProgress) * 0.6})`;
      ctx.lineWidth = (1 - shockProgress) * 3;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 24, shockR * 1.35, shockR * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 7. Heat Shield Aura
  if (d.heatShield > 0 && b.hp > 0) {
    const col = d.activeElement ? CORE_COLORS[d.activeElement].primary : '#ff7a2e';
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - 20 - totalVerticalOffset, 65, 80, time * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 8. Boss Sprite
  const img = image(),
    { animation, frame } = demonFrame(b, deathAge),
    scale = 1.75;
  if (img) {
    ctx.save();
    ctx.translate(b.x, b.y + 24 - totalVerticalOffset);
    if (d.facingRight) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      frame * 288,
      DEMON_ANIMATIONS[animation].row * 160,
      288,
      160,
      -144 * scale,
      -150 * scale,
      288 * scale,
      160 * scale
    );
    ctx.restore();
  }

  // 8b. Cleave Slash & Impact Burst VFX (Front Layer, Side-View)
  if (b.mode === 'strike' && b.attack === 'melee') {
    const phaseKey = `p${Math.min(3, Math.max(1, b.phase))}`;
    const slashImg = getVfx(`cleave/cleave_slash_${phaseKey}_sheet.png`);
    const slashDuration = 0.6;
    const progress = Math.min(1, d.modeAge / slashDuration);

    if (slashImg) {
      const frame = Math.min(9, Math.floor(progress * 10));
      ctx.save();
      ctx.translate(b.x, b.y + 24 - (progress < 0.12 ? attackLift : 0));
      if (d.facingRight) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(slashImg, frame * 240, 0, 240, 240, -144 * scale, -140 * scale, 240 * scale, 240 * scale);
      ctx.restore();
    }

    // Impact burst at peak strike along the ground plane
    if (progress >= 0.15 && progress <= 0.75) {
      const impactImg = getVfx(`impact/impact_burst_${phaseKey}_sheet.png`);
      if (impactImg) {
        const impactProg = (progress - 0.15) / 0.6;
        const impFrame = Math.min(7, Math.floor(impactProg * 8));
        const impactX = b.x + (d.facingRight ? 85 : -85) * scale;
        const impactY = b.y + 24;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(impactX, impactY);
        if (d.facingRight) ctx.scale(-1, 1);
        ctx.drawImage(impactImg, impFrame * 128, 0, 128, 128, -64, -96, 128, 128);
        ctx.restore();
      }
    }
  }

  // 9. Stun Visuals (Stars over head)
  if (b.mode === 'stunned') {
    ctx.save();
    ctx.translate(b.x, b.y - 90);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + time * 4;
      const sx = Math.cos(a) * 35;
      const sy = Math.sin(a) * 12;
      ctx.fillStyle = '#ffe978';
      ctx.font = '22px sans-serif';
      ctx.fillText('★', sx, sy);
    }
    ctx.restore();
  }

  // 10. Boss Action / Warning Banners
  if (b.hp > 0) {
    let text = '';
    let color = '#ffdd9a';

    if (b.mode === 'ritual') {
      if (d.leapDuration && d.modeAge < d.leapDuration) {
        text = vi ? 'ĐẠI QUỶ ĐẠI NHẢY VỀ TẾ ĐÀN TỤ HỎA!' : 'DEMON LEAPS TO THE CENTRAL ALTAR!';
        color = '#ff9838';
      } else {
        text = vi ? 'NGHI THỨC TỤ HỎA · ĐỨNG LÊN BỆ ĐỂ PHONG ẤN LÕI' : 'CORE RITUAL · STAND ON CORE TO SEAL';
        color = '#7de3fa';
      }
    } else if (b.mode === 'charge_warning') {
      text = vi
        ? 'QUÁ TẢI NHIỆT · DÙNG ECHO DỤ BOSS VÀO TRỤ TẢN NHIỆT!'
        : 'OVERHEATED · BAIT BOSS INTO COOLING VENT WITH ECHO!';
      color = '#ff9142';
    } else if (b.mode === 'charge_dash') {
      text = vi ? 'LAO QUÁ TẢI · NÉ ĐƯỜNG LAO!' : 'OVERHEAT DASH · EVADE!';
      color = '#ff4d24';
    } else if (b.mode === 'stunned') {
      text = vi ? 'SỐC NHIỆT! BOSS BỊ CHOÁNG · TẤN CÔNG ĐIỂM YẾU x2.5!' : 'THERMAL SHOCK! STUNNED · HIT WEAKPOINT x2.5!';
      color = '#62f494';
    } else if (b.mode === 'recover') {
      text = vi ? 'SƠ HỞ · PHẢN CÔNG' : 'OPENING · COUNTERATTACK';
      color = '#baffcd';
    } else if (b.mode === 'warning') {
      text =
        b.attack === 'melee'
          ? vi
            ? 'BỔ ĐAO · NÉ KHỎI VÙNG CAM'
            : 'CLEAVE · LEAVE THE ORANGE ARC'
          : b.attack === 'volley'
          ? vi
            ? 'QUẠT LỬA · LÁCH QUA KHE'
            : 'FIRE FAN · FIND THE GAP'
          : b.attack === 'summon'
          ? vi
            ? 'LỆNH DUNG NHAM · QUỶ LỬA XUẤT THẾ!'
            : 'MAGMA SWARM · FIRE MINIONS SUMMONED!'
          : vi
          ? 'ĐỊA HỎA · RỜI VÒNG SÁNG'
          : 'ERUPTION · LEAVE THE CIRCLES';
      color = b.attack === 'summon' ? '#ff3700' : '#ffdd9a';
    }

    if (text) {
      ctx.font = '20px "Second Me Pixel",monospace';
      ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 24;
      const x = Math.max(w / 2 + 60, Math.min(1220 - w / 2, b.x));
      const y = Math.max(120, b.y - 170);
      ctx.fillStyle = '#0e141cee';
      ctx.fillRect(x - w / 2, y - 18, w, 32);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - w / 2, y - 18, w, 32);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y + 6);
    }
  }

  ctx.restore();
}
