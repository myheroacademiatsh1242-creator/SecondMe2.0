import type {BossState} from './campaign.ts';

export type ElementalCoreType = 'frostfire' | 'magma' | 'shadow';

export interface DemonCore {
  id: ElementalCoreType;
  x: number;
  y: number;
  radius: number;
  sealed: boolean;
  sealProgress: number; // 0..1
}

export interface EmberZone {
  x: number;
  y: number;
  radius: number;
  age: number;
  delay: number;
  life: number;
  tick: number;
  element?: ElementalCoreType;
}

export interface DemonCombat {
  age: number;
  modeAge: number;
  facingRight: boolean;
  zones: EmberZone[];
  hurtTime: number;
  walking?: boolean;
  cores: DemonCore[];
  activeElement: ElementalCoreType | null;
  ventCore: ElementalCoreType | null;
  ritualStage: number; // 0: start, 1: after ritual 1, 2: after ritual 2
  overheated: boolean;
  heatShield: number; // 0..1
  heatGauge: number; // 0..100
  stunned: number; // seconds remaining
  meltdownOccurred: boolean;
  chargeAimX?: number;
  chargeAimY?: number;
  chargeAngle?: number;
  chargeSpeed?: number;
  leapStartX?: number;
  leapStartY?: number;
  leapDuration?: number;
  leapLanded?: boolean;

  // Fluid 2D Side-View Vertical & Horizontal Motion System:
  elevation: number;        // Height in pixels above the ground plane (visual Z-axis)
  crouch: number;           // Squash / crouch compression in pixels (>0 lowers body)
  verticalVel: number;      // Current vertical velocity for physics/hops
  stepCycle: number;        // Running accumulator for stride cadence
  hopActive: boolean;       // Active tactical jump / hop
  hopAge: number;           // Time into hop
  hopDuration: number;      // Total hop duration
  hopStartX: number;
  hopStartY: number;
  hopTargetX: number;
  hopTargetY: number;
  hopPeakElevation: number; // Peak height of hop
  hopType: 'pounce' | 'recoil' | 'slam' | 'dodge' | null;
  hopCooldown: number;      // Cooldown timer between tactical short hops
  landingImpact: number;    // Impact squash duration
  slamShake?: boolean;      // One-shot screen shake trigger for heavy slams
  summonPending?: number;   // Number of magma minions to spawn into arena
  summonCooldown?: number;  // Seconds until next minion swarm
}

export const INITIAL_CORES: DemonCore[] = [
  { id: 'frostfire', x: 360, y: 220, radius: 48, sealed: false, sealProgress: 0 },
  { id: 'magma', x: 920, y: 220, radius: 48, sealed: false, sealProgress: 0 },
  { id: 'shadow', x: 640, y: 520, radius: 48, sealed: false, sealProgress: 0 },
];

export function createDemonBoss(): BossState {
  return {
    kind: 'demon',
    x: 800,
    y: 300,
    hp: 600,
    maxHp: 600,
    phase: 1,
    mode: 'stalking',
    timer: 1.5,
    targetX: 640,
    targetY: 540,
    hitFlash: 0,
    projectiles: [],
    pillars: [],
    armor: 0,
    burstCooldown: 0,
    burstRemaining: 0,
    burstPulse: 0,
    iceRays: [],
    attackIndex: 0,
    demon: {
      age: 0,
      modeAge: 0,
      facingRight: false,
      zones: [],
      hurtTime: 0,
      cores: INITIAL_CORES.map((c) => ({ ...c })),
      activeElement: null,
      ventCore: null,
      ritualStage: 0,
      overheated: false,
      heatShield: 0,
      heatGauge: 0,
      stunned: 0,
      meltdownOccurred: false,
      elevation: 0,
      crouch: 0,
      verticalVel: 0,
      stepCycle: 0,
      hopActive: false,
      hopAge: 0,
      hopDuration: 0,
      hopStartX: 0,
      hopStartY: 0,
      hopTargetX: 0,
      hopTargetY: 0,
      hopPeakElevation: 0,
      hopType: null,
      hopCooldown: 1.5,
      landingImpact: 0,
      slamShake: false,
      summonPending: 0,
      summonCooldown: 8,
    },
  };
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function updateDemonBoss(
  b: BossState,
  target: { x: number; y: number },
  dt: number,
  player: { x: number; y: number },
  echoes: { x: number; y: number }[],
  hitEcho: ((i: number, n: number) => void) | undefined,
  hitPlayer: ((n: number) => void) | undefined,
  evading: boolean
) {
  if (b.hp <= 0) return false;
  const d = b.demon!;
  d.walking = false;
  d.age += dt;
  d.modeAge += dt;
  d.hurtTime = Math.max(0, d.hurtTime - dt);
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  b.phase = b.hp > b.maxHp * 0.66 ? 1 : b.hp > b.maxHp * 0.33 ? 2 : 3;
  b.timer -= dt;
  d.hopCooldown = Math.max(0, (d.hopCooldown ?? 0) - dt);
  d.summonCooldown = Math.max(0, (d.summonCooldown ?? 0) - dt);
  let hit = false;

  // 0. Update Hop / Jump arc and vertical motion physics
  if (d.hopActive) {
    d.hopAge += dt;
    const hopProgress = Math.min(1, d.hopAge / (d.hopDuration || 0.35));
    // Parabolic arc for elevation (peaks at progress = 0.5)
    d.elevation = Math.sin(hopProgress * Math.PI) * (d.hopPeakElevation || 35);

    // Smooth horizontal and vertical ground translation (ease-out)
    const easeT = hopProgress * (2 - hopProgress);
    b.x = (d.hopStartX ?? b.x) + ((d.hopTargetX ?? b.x) - (d.hopStartX ?? b.x)) * easeT;
    b.y = (d.hopStartY ?? b.y) + ((d.hopTargetY ?? b.y) - (d.hopStartY ?? b.y)) * easeT;

    // Preserve arena boundaries
    b.x = Math.max(160, Math.min(1120, b.x));
    b.y = Math.max(150, Math.min(580, b.y));

    if (hopProgress >= 1) {
      d.hopActive = false;
      d.elevation = 0;
      d.landingImpact = 0.22;
      d.crouch = d.hopType === 'slam' ? 16 : 10;
      if (d.hopType === 'slam') {
        d.slamShake = true;
      }
    }
  } else if (b.mode !== 'ritual') {
    d.elevation = Math.max(0, (d.elevation ?? 0) - dt * 180);
    if ((d.landingImpact ?? 0) > 0) {
      d.landingImpact = Math.max(0, d.landingImpact! - dt);
      d.crouch = (d.landingImpact / 0.22) * (d.crouch || 10);
    } else {
      d.crouch = Math.max(0, (d.crouch ?? 0) - dt * 35);
    }
  }

  const hurt = (x: number, y: number, r: number, n: number) => {
    if (!evading && Math.hypot(player.x - x, player.y - y) <= r) {
      hit = true;
      hitPlayer?.(n);
    }
    echoes.forEach((e, i) => {
      if (Math.hypot(e.x - x, e.y - y) <= r) hitEcho?.(i, n);
    });
  };

  // Update existing floor zones
  for (const z of d.zones) {
    z.age += dt;
    z.tick -= dt;
    if (z.age >= z.delay && z.tick <= 0) {
      hurt(z.x, z.y, z.radius, 20);
      z.tick = 0.8;
    }
  }
  d.zones = d.zones.filter((z) => z.age < z.delay + z.life);

  // Update projectiles
  for (const p of b.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    let connected = false;
    if (!evading && Math.hypot(player.x - p.x, player.y - p.y) < 23) {
      hit = true;
      hitPlayer?.(14);
      connected = true;
    }
    echoes.forEach((e, i) => {
      if (!connected && Math.hypot(e.x - p.x, e.y - p.y) < 23) {
        hitEcho?.(i, 14);
        connected = true;
      }
    });
    if (connected) p.life = 0;
  }
  b.projectiles = b.projectiles.filter((p) => p.life > 0 && p.x > 55 && p.x < 1225 && p.y > 65 && p.y < 655);

  const mode = (m: BossState['mode'], timer: number) => {
    b.mode = m;
    b.timer = timer;
    d.modeAge = 0;
  };

  // Phase transition checks into Ritual (triggered when recovering after crossing HP threshold)
  const shouldRitual =
    (b.hp <= b.maxHp * 0.66 && d.ritualStage === 0) ||
    (b.hp <= b.maxHp * 0.33 && d.ritualStage === 1);
  if (shouldRitual && b.mode === 'recover') {
    d.ritualStage++;
    d.summonPending = (d.summonPending ?? 0) + (d.ritualStage === 2 ? 4 : 3);
    d.cores.forEach((c) => {
      c.sealed = false;
      c.sealProgress = 0;
    });
    b.projectiles = [];
    d.zones = [];
    d.leapStartX = b.x;
    d.leapStartY = b.y;
    d.leapDuration = 0.65;
    d.leapLanded = false;
    d.facingRight = 640 >= b.x;
    mode('ritual', 5.5 + 0.65);
    return false;
  }

  // --- RITUAL MODE ---
  if (b.mode === 'ritual') {
    // Smooth dramatic leap towards the central altar (640, 300)
    const leapDur = d.leapDuration ?? 0.65;
    if (d.modeAge < leapDur) {
      const startX = d.leapStartX ?? b.x;
      const startY = d.leapStartY ?? b.y;
      const t = Math.min(1, d.modeAge / leapDur);
      const easeT = t * (2 - t);
      b.x = startX + (640 - startX) * easeT;
      b.y = startY + (300 - startY) * easeT;
      d.facingRight = 640 >= startX;
    } else {
      b.x = 640;
      b.y = 300;
    }

    // Player or echoes can stand on core plates to seal them
    const actors = [player, ...echoes];
    for (const c of d.cores) {
      const occupied = actors.some((a) => Math.hypot(a.x - c.x, a.y - c.y) <= c.radius + 15);
      if (occupied && !c.sealed) {
        c.sealProgress = Math.min(1, c.sealProgress + dt / 1.15);
        if (c.sealProgress >= 1) c.sealed = true;
      }
    }

    // When timer expires or a core is sealed
    const anySealed = d.cores.some((c) => c.sealed);
    if (b.timer <= 0 || (anySealed && d.modeAge > 1.2)) {
      // Pick sealed core as vent, and unsealed core as absorbed element
      const sealedCore = d.cores.find((c) => c.sealed) ?? d.cores[d.ritualStage % d.cores.length];
      const unsealedCores = d.cores.filter((c) => c.id !== sealedCore.id);
      const chosenCore = unsealedCores[Math.floor(Math.random() * unsealedCores.length)] ?? d.cores[0];

      d.activeElement = chosenCore.id;
      d.ventCore = sealedCore.id;
      d.overheated = true;
      d.heatShield = 1;
      d.heatGauge = 100;

      // Prepare Overheat Dash targeting the opponent / Echo
      b.targetX = target.x;
      b.targetY = target.y;
      d.chargeAngle = Math.atan2(b.targetY - b.y, b.targetX - b.x);
      d.chargeSpeed = 650;
      mode('charge_warning', 2.0);
    }
    return false;
  }

  // --- OVERHEAT CHARGE WARNING ---
  if (b.mode === 'charge_warning') {
    d.facingRight = b.targetX > b.x;
    d.chargeAngle = Math.atan2(b.targetY - b.y, b.targetX - b.x);
    if (b.timer <= 0) {
      mode('charge_dash', 0.9);
    }
    return false;
  }

  // --- OVERHEAT CHARGE DASH ---
  if (b.mode === 'charge_dash') {
    const angle = d.chargeAngle ?? 0;
    const speed = d.chargeSpeed ?? 650;
    b.x += Math.cos(angle) * speed * dt;
    b.y += Math.sin(angle) * speed * dt;
    d.facingRight = Math.cos(angle) > 0;

    // Hit damage to player / echoes in dash path
    hurt(b.x, b.y, 65, 26);

    // Check collision with the Cooling Vent (Trụ Tản Nhiệt)
    const vent = d.cores.find((c) => c.id === d.ventCore);
    const ventDist = vent ? Math.hypot(b.x - vent.x, b.y - vent.y) : 999;
    const ventEchoDist = vent
      ? echoes.some((e) => Math.hypot(e.x - vent.x, e.y - vent.y) <= vent.radius + 25 && Math.hypot(b.x - e.x, b.y - e.y) <= 75)
      : false;

    if (vent && (ventDist <= vent.radius + 50 || ventEchoDist)) {
      // 💥 THERMAL SHOCK MELTDOWN!
      d.heatShield = 0;
      d.overheated = false;
      d.meltdownOccurred = true;
      d.stunned = 4.5;
      b.hp = Math.max(1, b.hp - 80);
      d.hurtTime = 0.25;
      mode('stunned', 4.5);
      return hit;
    }

    // Reached boundary or timer ran out
    if (b.timer <= 0 || b.x < 120 || b.x > 1160 || b.y < 120 || b.y > 600) {
      b.x = Math.max(120, Math.min(1160, b.x));
      b.y = Math.max(120, Math.min(600, b.y));
      mode('recover', 1.5);
    }
    return hit;
  }

  // --- STUNNED STATE (WEAKPOINT WINDOW) ---
  if (b.mode === 'stunned') {
    d.stunned = Math.max(0, b.timer);
    if (b.timer <= 0) {
      mode('stalking', 0.8);
    }
    return false;
  }

  // --- STALKING MODE ---
  if (b.mode === 'stalking') {
    const dx = target.x - b.x,
      dy = target.y - b.y,
      dist = Math.hypot(dx, dy);
    d.facingRight = dx > 0;

    // Movement speed varies by element
    const baseSpeed = b.phase === 3 ? 105 : 80;
    const elemSpeed = d.activeElement === 'frostfire' ? baseSpeed * 1.35 : baseSpeed;

    // Dynamic tactical Short Hop / Pounce when stalking from a distance (> 270px)
    if (!d.hopActive && dist > 270 && (d.hopCooldown ?? 0) <= 0 && b.timer > 0.4) {
      d.hopActive = true;
      d.hopAge = 0;
      d.hopDuration = 0.44;
      d.hopStartX = b.x;
      d.hopStartY = b.y;
      const hopDist = Math.min(dist - 130, 115);
      d.hopTargetX = Math.max(160, Math.min(1120, b.x + (dx / dist) * hopDist));
      d.hopTargetY = Math.max(150, Math.min(580, b.y + (dy / dist) * hopDist));
      d.hopPeakElevation = 38;
      d.hopType = 'pounce';
      d.hopCooldown = 2.8;
    } else if (!d.hopActive) {
      if (dist > 118) {
        d.walking = true;
        d.stepCycle = (d.stepCycle ?? 0) + dt * 6.5;
        const step = Math.min(dist - 118, elemSpeed * dt);

        // Fluid diagonal & natural tracking with slight hunting weave
        const normX = dx / dist;
        const normY = dy / dist;
        const sway = Math.sin(d.age * 2.2) * 0.18;
        const dirX = normX - normY * sway;
        const dirY = normY + normX * sway;
        const dirLen = Math.hypot(dirX, dirY) || 1;

        b.x = Math.max(160, Math.min(1120, b.x + (dirX / dirLen) * step));
        b.y = Math.max(150, Math.min(580, b.y + (dirY / dirLen) * step));
      } else {
        // Close range dynamic micro-repositioning (circles subtly rather than freezing)
        d.walking = false;
        d.stepCycle = (d.stepCycle ?? 0) + dt * 2.5;
        const tangentX = -dy / dist;
        const tangentY = dx / dist;
        b.x = Math.max(160, Math.min(1120, b.x + tangentX * 22 * dt));
        b.y = Math.max(150, Math.min(580, b.y + tangentY * 22 * dt));
      }
    }

    if (b.timer <= 0 && (dist < 155 || b.timer < -0.8)) {
      const index = b.attackIndex ?? 0;
      // When overheated, boss regularly charges to let player/echo bait into cooling vent
      if (d.overheated && d.heatShield > 0 && index % 2 === 0) {
        b.targetX = target.x;
        b.targetY = target.y;
        d.chargeAngle = Math.atan2(b.targetY - b.y, b.targetX - b.x);
        d.chargeSpeed = 650;
        b.attackIndex = index + 1;
        mode('charge_warning', 1.5);
        return false;
      }

      // Minion Summon attack: triggers periodically and more aggressively in Phase 2 & 3
      const shouldSummon = (b.phase >= 2 || (d.summonCooldown ?? 0) <= 0) && (index % 4 === 3);
      if (shouldSummon) {
        b.attack = 'summon';
        d.summonCooldown = b.phase === 3 ? 11 : 16;
        d.summonPending = (d.summonPending ?? 0) + (b.phase === 3 ? 4 : 3);
      } else {
        b.attack = dist < 165 && index % 3 !== 2 ? 'melee' : b.phase >= 2 && index % 3 === 2 ? 'triple' : 'volley';
      }
      b.targetX = target.x;
      b.targetY = target.y;
      b.attackFacingRight = target.x > b.x;
      d.facingRight = target.x > b.x;
      b.attackIndex = index + 1;
      mode('warning', 0.9);

      // Pre-attack dynamic repositioning:
      if (b.attack === 'volley' && dist < 210) {
        // Recoil hop backward to gain comfortable projectile firing lane
        const away = Math.atan2(b.y - target.y, b.x - target.x);
        d.hopActive = true;
        d.hopAge = 0;
        d.hopDuration = 0.38;
        d.hopStartX = b.x;
        d.hopStartY = b.y;
        d.hopTargetX = Math.max(160, Math.min(1120, b.x + Math.cos(away) * 80));
        d.hopTargetY = Math.max(150, Math.min(580, b.y + Math.sin(away) * 80));
        d.hopPeakElevation = 32;
        d.hopType = 'recoil';
      } else if (b.attack === 'triple') {
        // High vertical hop anticipation for earth shattering eruption
        d.hopActive = true;
        d.hopAge = 0;
        d.hopDuration = 0.44;
        d.hopStartX = b.x;
        d.hopStartY = b.y;
        d.hopTargetX = b.x;
        d.hopTargetY = b.y;
        d.hopPeakElevation = 36;
        d.hopType = 'slam';
      } else if (b.attack === 'summon') {
        // Grand dual-arm roar anticipation for summoning the magma horde
        d.hopActive = true;
        d.hopAge = 0;
        d.hopDuration = 0.44;
        d.hopStartX = b.x;
        d.hopStartY = b.y;
        d.hopTargetX = b.x;
        d.hopTargetY = b.y;
        d.hopPeakElevation = 34;
        d.hopType = 'slam';
      }

      if (b.attack === 'triple') {
        const count = b.phase === 3 ? 5 : 3;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count;
          d.zones.push({
            x: Math.max(115, Math.min(1165, b.targetX + (i === 0 ? 0 : Math.cos(a) * 110))),
            y: Math.max(125, Math.min(600, b.targetY + (i === 0 ? 0 : Math.sin(a) * 110))),
            radius: 48,
            age: 0,
            delay: 1.15,
            life: 2.4,
            tick: 0,
            element: d.activeElement ?? undefined,
          });
        }
      }
    }
  } else if (b.mode === 'warning') {
    d.facingRight = b.targetX > b.x;
    if (b.timer <= 0) {
      if (b.attack === 'melee') {
        // Heavy forward leap slam towards target on cleave execution:
        const aim = Math.atan2(b.targetY - b.y, b.targetX - b.x);
        const lungeDist = d.activeElement === 'frostfire' ? 35 : 28;
        b.x = Math.max(160, Math.min(1120, b.x + Math.cos(aim) * lungeDist));
        b.y = Math.max(150, Math.min(580, b.y + Math.sin(aim) * lungeDist));

        d.landingImpact = 0.24;
        d.crouch = 14;
        d.slamShake = true;

        const within = (p: { x: number; y: number }) =>
          Math.hypot(p.x - b.x, p.y - b.y) <= 155 && Math.abs(angleDiff(Math.atan2(p.y - b.y, p.x - b.x), aim)) < 1.05;

        if (!evading && within(player)) {
          hit = true;
          hitPlayer?.(24);
        }
        echoes.forEach((e, i) => {
          if (within(e)) hitEcho?.(i, 24);
        });

        // Magma leaves lingering lava on melee
        if (d.activeElement === 'magma') {
          d.zones.push({
            x: b.targetX,
            y: b.targetY,
            radius: 60,
            age: 0,
            delay: 0.1,
            life: 3.5,
            tick: 0,
            element: 'magma',
          });
        }
      } else if (b.attack === 'volley') {
        const aim = Math.atan2(b.targetY - b.y, b.targetX - b.x);
        const count = b.phase === 3 ? (d.activeElement === 'magma' ? 9 : 7) : 5;
        const speed = d.activeElement === 'frostfire' ? 260 : b.phase === 3 ? 230 : 190;
        for (let i = 0; i < count; i++) {
          const a = aim + (i - (count - 1) / 2) * 0.22;
          b.projectiles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 5,
          });
        }
      } else if (b.attack === 'triple') {
        d.landingImpact = 0.3;
        d.crouch = 16;
        d.slamShake = true;
      } else if (b.attack === 'summon') {
        d.landingImpact = 0.38;
        d.crouch = 18;
        d.slamShake = true;
      }
      mode('strike', 0.6);
    }
  } else if (b.mode === 'strike') {
    d.facingRight = b.targetX > b.x;
    if (b.timer <= 0) {
      mode('recover', b.phase === 3 ? 0.85 : 1.25);
    }
  } else if (b.mode === 'recover') {
    d.facingRight = target.x > b.x;
    // Fluid recovery stance: if player is hugging the boss, boss eases back slightly
    const distToTarget = Math.hypot(target.x - b.x, target.y - b.y);
    if (distToTarget < 95 && distToTarget > 10) {
      const stepBackX = (b.x - target.x) / distToTarget;
      const stepBackY = (b.y - target.y) / distToTarget;
      b.x = Math.max(160, Math.min(1120, b.x + stepBackX * 30 * dt));
      b.y = Math.max(150, Math.min(580, b.y + stepBackY * 30 * dt));
    }
    if (b.timer <= 0) {
      mode('stalking', b.phase === 3 ? 0.5 : 0.9);
    }
  }

  return hit;
}
