/**
 * Snow Hunt, the Christmas event mode: an endless wave-survival arena. Enemies pour in from the
 * edges in timed waves that keep getting longer and harder. Kills drop XP gems (levels up this run)
 * and sometimes Noel tickets and coins; every cleared wave pays a bonus that grows with the wave, so
 * the longer you hold out the more you take home. Every level-up pauses play and offers three power
 * cards, for the hero or for the Echoes. A run ends when the hero falls or retreats; everything
 * collected is kept. This module is pure state and rules; GameEngine wires it to combat and drawing.
 */
import type { EchoRuneId } from './echoRunes.ts';
import type { EnemyKind } from './enemies.ts';
import type { LevelData, Rect } from './types.ts';

/** Wave length: 30 s, +4 s per wave, capped at 60 s. */
export const waveSeconds = (wave: number) => Math.min(60, 26 + wave * 4);
/** Bonus for clearing a wave: grows with the wave, so long runs pay off. */
export const waveReward = (wave: number) => ({ tickets: 1 + Math.floor(wave * 1.5), coins: 2 + wave * 2 });

export type HuntSide = 'hero' | 'echo';
export type HuntRarity = 'common' | 'rare' | 'epic';
export type HuntHero = 'swordsman' | 'mage' | 'assassin' | 'mechanical';
export interface HuntCard {
  id: string; side: HuntSide; rarity: HuntRarity; max: number;
  vi: string; en: string; descVi: string; descEn: string;
  /** Echo cards that switch on an existing Echo rune for the run. */
  rune?: EchoRuneId;
  /** Offered only to this hero. */
  hero?: HuntHero;
  /** Evolution: offered (and always offered) once every listed card has reached the given level. */
  needs?: Record<string, number>;
}

const card = (side: HuntSide, rarity: HuntRarity, id: string, max: number, vi: string, en: string, descVi: string, descEn: string, rune?: EchoRuneId): HuntCard =>
  ({ id, side, rarity, max, vi, en, descVi, descEn, rune });
const heroCard = (hero: HuntHero, rarity: HuntRarity, id: string, max: number, vi: string, en: string, descVi: string, descEn: string): HuntCard =>
  ({ ...card('hero', rarity, id, max, vi, en, descVi, descEn), hero });
const evolution = (id: string, needs: Record<string, number>, vi: string, en: string, descVi: string, descEn: string): HuntCard =>
  ({ ...card('hero', 'epic', id, 1, vi, en, descVi, descEn), needs });

export const HUNT_CARDS: HuntCard[] = [
  // Hero, common: stackable stats.
  card('hero', 'common', 'sharp', 5, 'Lưỡi sắc', 'Keen Edge', '+10% sát thương', '+10% damage'),
  card('hero', 'common', 'tough', 5, 'Da dày', 'Thick Hide', '+15 máu tối đa', '+15 max HP'),
  card('hero', 'common', 'swift', 4, 'Bước nhanh', 'Quick Step', '+8% tốc chạy', '+8% move speed'),
  card('hero', 'common', 'quick', 4, 'Tay nhanh', 'Quick Hands', '+10% tốc đánh', '+10% attack speed'),
  card('hero', 'common', 'vigor', 3, 'Thể lực', 'Vigor', 'Hồi 0,6% máu tối đa mỗi giây', 'Regenerate 0.6% of max HP per second'),
  card('hero', 'common', 'manaPool', 3, 'Mana dồi dào', 'Deep Mana', '+20 MP tối đa', '+20 max MP'),
  card('hero', 'common', 'manaFlow', 3, 'Dòng mana', 'Mana Flow', 'Hồi thêm 2 MP mỗi giây', '+2 MP regenerated per second'),
  card('hero', 'common', 'magnet', 3, 'Nam châm', 'Magnet', '+35% tầm hút ngọc, vé và xu', '+35% pickup range'),
  card('hero', 'common', 'dash', 3, 'Né giỏi', 'Nimble', 'Hồi chiêu lướt né −15%', 'Dodge cooldown −15%'),
  card('hero', 'common', 'focus', 3, 'Tập trung', 'Focus', 'Hồi chiêu kỹ năng −12%', 'Skill cooldown −12%'),
  // Hero, rare.
  card('hero', 'rare', 'crit', 3, 'Chí mạng', 'Critical', '10% cơ hội gây gấp đôi sát thương', '10% chance to deal double damage'),
  card('hero', 'rare', 'leech', 3, 'Hút máu', 'Lifesteal', 'Mỗi đòn trúng hồi 1 máu', 'Each hit restores 1 HP'),
  card('hero', 'rare', 'splash', 2, 'Đòn lan', 'Cleave', 'Đòn đánh lan 40% sang 2 quái gần', 'Hits splash 40% to 2 nearby enemies'),
  card('hero', 'rare', 'finisher', 2, 'Kết liễu', 'Finisher', '+30% sát thương lên quái dưới 30% máu', '+30% damage to enemies under 30% HP'),
  // Hero, epic: once each.
  card('hero', 'epic', 'blizzard', 1, 'Bão tuyết', 'Blizzard', 'Mỗi 6 giây, vòng băng quanh bạn gây sát thương và làm chậm', 'Every 6s a frost ring around you deals damage and slows'),
  card('hero', 'epic', 'revive', 1, 'Hồi sinh Noel', 'Noel Revival', 'Khi gục, đứng dậy với 50% máu (1 lần)', 'When you fall, rise with 50% HP (once)'),
  card('hero', 'epic', 'fury', 1, 'Cơn giận', 'Fury', 'Dưới 30% máu: +40% sát thương và tốc đánh', 'Under 30% HP: +40% damage and attack speed'),
  card('hero', 'epic', 'greed', 1, 'Tham lam', 'Greed', 'Quái rơi thêm 50% vé và xu, −10% máu tối đa', '+50% tickets and coins from enemies, −10% max HP'),
  // Hero weapons: things you can see working, bigger or more of them each level.
  card('hero', 'common', 'snowballs', 3, 'Cầu tuyết xoay', 'Orbiting Snowballs', 'Thêm 1 quả cầu tuyết xoay quanh bạn, đập vào quái nào chạm phải', 'One more snowball circles you, hitting whatever it touches'),
  card('hero', 'rare', 'candy', 3, 'Kẹo gậy bay', 'Candy Cane Toss', 'Cứ 2,4 giây ném kẹo gậy xuyên quái về phía quái gần nhất (nhanh và nhiều hơn mỗi cấp)', 'Every 2.4s throw a piercing candy cane at the nearest enemy (faster and more per level)'),
  card('hero', 'rare', 'bells', 3, 'Chuông Noel', 'Jingle Bell', 'Cứ 4 giây một quả chuông rơi xuống giữa đám quái rồi nổ (to hơn mỗi cấp)', 'Every 4s a bell drops among the enemies and bursts (bigger per level)'),
  // Each hero's own cards.
  heroCard('swordsman', 'rare', 'waveSlash', 2, 'Kiếm khí', 'Blade Wave', 'Mỗi nhát chém thứ 3 phóng ra một vệt kiếm bay xuyên quái (cấp 2: mỗi nhát thứ 2)', 'Every 3rd swing sends a piercing blade wave (level 2: every 2nd)'),
  heroCard('swordsman', 'epic', 'whirl', 1, 'Lốc kiếm', 'Whirlwind', 'Cứ 5 giây xoay kiếm một vòng, chém mọi quái quanh bạn', 'Every 5s spin your blade, cutting every enemy around you'),
  heroCard('mage', 'rare', 'iceShard', 2, 'Băng tiễn', 'Ice Shards', 'Mỗi đòn đánh bắn thêm 2 mũi băng chéo (cấp 2: 4 mũi)', 'Each attack fires 2 extra ice shards (level 2: 4)'),
  heroCard('mage', 'epic', 'frostOrb', 1, 'Cầu băng lớn', 'Frost Orb', 'Cứ 6 giây phóng một cầu băng lớn chậm rãi, xuyên và làm chậm mọi quái trên đường', 'Every 6s launch a slow, huge frost orb that pierces and chills'),
  heroCard('assassin', 'rare', 'dartRain', 2, 'Mưa phi tiêu', 'Dart Fan', 'Cứ 4 giây tung 5 phi tiêu toả hình quạt (cấp 2: 8 phi tiêu)', 'Every 4s throw a fan of 5 darts (level 2: 8)'),
  heroCard('assassin', 'common', 'shadowStep', 3, 'Bước bóng', 'Shadow Step', 'Lướt né để lại vết chém gây sát thương quanh chỗ cũ', 'Dodging leaves a slash that hurts enemies where you were'),
  // Evolutions: appear once their cards are levelled, and are always offered when they do.
  evolution('blizzardEdge', { blizzard: 1, sharp: 3 }, 'Bão tuyết sắc lẹm', 'Razor Blizzard', 'Tiến hoá Bão tuyết: cứ 3 giây, vòng băng rộng hơn, mạnh gấp 2,5 lần', 'Evolved Blizzard: every 3s, wider and 2.5x damage'),
  evolution('snowGlobe', { snowballs: 3, magnet: 1 }, 'Quả cầu pha lê', 'Snow Globe', 'Tiến hoá Cầu tuyết: 6 quả to, xoay rộng hơn và làm chậm quái', 'Evolved Snowballs: six big balls on a wider ring that chill'),
  evolution('candyStorm', { candy: 3, quick: 2 }, 'Bão kẹo', 'Candy Storm', 'Tiến hoá Kẹo gậy: mỗi 1,2 giây ném 3 kẹo cùng lúc', 'Evolved Candy Cane: 3 canes every 1.2s'),
  evolution('jingleAll', { bells: 3, focus: 1 }, 'Chuông vang khắp nơi', 'Jingle All the Way', 'Tiến hoá Chuông: mỗi lần rơi 3 quả chuông', 'Evolved Bell: three bells drop each time'),
  // Echo, common.
  card('echo', 'common', 'echoPower', 1, 'Echo mạnh', 'Strong Echo', 'Đòn của Echo +30% sát thương', 'Echo hits deal +30% damage', 'power'),
  card('echo', 'common', 'echoRapid', 1, 'Echo nhanh tay', 'Rapid Echo', 'Echo đánh nhanh hơn 20%', 'Echoes attack 20% faster', 'rapid'),
  card('echo', 'common', 'echoGuard', 1, 'Echo bền', 'Sturdy Echo', 'Echo mất ít hơn 35% ổn định khi trúng đòn', 'Echoes lose 35% less stability when hit', 'guard'),
  card('echo', 'common', 'echoChase', 1, 'Echo truy kích', 'Pursuing Echo', 'Echo đuổi quái nhanh hơn 25%', 'Echoes chase 25% faster', 'lure'),
  card('echo', 'common', 'echoCollect', 3, 'Echo gom đồ', 'Gathering Echo', 'Tầm nhặt đồ của Echo +50%', 'Echo pickup range +50%'),
  card('echo', 'common', 'echoCharge', 3, 'Hồi lượt', 'Recharge', 'Cứ 10 giây thêm 1 lượt gọi Echo (nhanh hơn mỗi cấp)', 'Gain an Echo charge every 10s (faster per level)'),
  // Echo, rare.
  card('echo', 'rare', 'echoSlot', 2, 'Thêm bóng', 'Extra Shadow', '+1 Echo tối đa trên sân', '+1 Echo on the field'),
  card('echo', 'rare', 'echoVamp', 1, 'Echo hút sinh lực', 'Siphon Echo', 'Mỗi đòn Echo trúng hồi 4 ổn định', 'Each Echo hit restores 4 stability', 'vamp'),
  card('echo', 'rare', 'echoCleave', 1, 'Echo lan truyền', 'Resonant Echo', 'Đòn Echo lan 40% sang 2 quái gần', 'Echo hits splash 40% to 2 nearby enemies', 'cleave'),
  card('echo', 'rare', 'echoExecute', 1, 'Echo kết liễu', 'Executing Echo', 'Echo +25% sát thương lên quái yếu', 'Echoes deal +25% to weakened enemies', 'execute'),
  card('echo', 'rare', 'echoSwap', 1, 'Hoán ảnh', 'Phasewalk', 'Đổi chỗ (Shift+Q) chỉ tốn 15 ổn định, hồi 4 giây', 'Swap (Shift+Q) costs 15 stability, 4s cooldown', 'swap'),
  card('echo', 'rare', 'echoResonance', 3, 'Hồi âm', 'Resonance', 'Mỗi Echo trên sân +5% sát thương cho bạn', '+5% of your damage per Echo on the field'),
  // Echo, epic.
  card('echo', 'epic', 'echoNova', 1, 'Nổ tuyết', 'Snow Nova', 'Echo vỡ thì nổ, gây sát thương và làm chậm xung quanh', 'A breaking Echo bursts, damaging and slowing around it'),
  card('echo', 'epic', 'echoRegen', 1, 'Ký ức bền bỉ', 'Enduring Memory', 'Echo tự hồi ổn định khi không giao chiến', 'Echoes regain stability out of combat', 'regen'),
];
export const HUNT_CARD = Object.fromEntries(HUNT_CARDS.map(c => [c.id, c])) as Record<string, HuntCard>;
const RARITY_WEIGHT: Record<HuntRarity, number> = { common: 10, rare: 5, epic: 2 };

export type HuntPickupKind = 'xp' | 'ticket' | 'coin' | 'hp' | 'mp' | 'maxHp' | 'maxMp';
export interface HuntPickup {
  kind: HuntPickupKind; x: number; y: number; value: number; age: number;
  /** Set once a collector is in reach: the pickup then flies to the hero (speed grows as it goes). */
  homing?: boolean; speed?: number;
}
/** Pickup speed when it starts flying, its acceleration, and how close it must get to count. */
const PICKUP_FLY = { start: 160, accel: 1400, max: 900, catch: 16 } as const;
/** Chance a regular kill drops a bigger XP gem worth 3. */
export const BIG_GEM = 0.12;
export interface HuntSpawn { kind: EnemyKind; elite: boolean; boss: boolean; hpScale: number; power: number; haste: number }
/** Effects the engine applies to the hero after a pickup or a cleared wave (fractions of the maximum, or flat raises). */
export interface HuntEffects { heal: number; mana: number; maxHp: number; maxMp: number }

// --- Balance (all in one place) ---
/** XP needed to go from `level` to the next. */
export const xpToNext = (level: number) => 4 + level * 3;
/** Every BOSS_EVERY-th wave a troll boss joins; the wave cannot end until it falls. */
export const BOSS_EVERY = 10;
/** Healing: potions and wave clears restore a share of the maximum, so they keep pace with max-HP cards. */
export const HP_POTION_HEAL = 0.2;
export const MP_POTION_RESTORE = 0.4;
export const WAVE_CLEAR_HEAL = 0.25;
export const WAVE_CLEAR_MANA = 0.5;
export const MAX_HP_SHARD = 10;
export const MAX_MP_SHARD = 15;
/** Share of the usual MP a combo hit costs in the hunt (the opening hit stays free). */
export const HUNT_COMBO_MP = 0.5;
/** Drop chances from a regular kill (elites and bosses drop more, below). */
export const DROP = { ticket: 0.22, coin: 0.28, hp: 0.05, mp: 0.08, maxHp: 0.012, maxMp: 0.012 } as const;
/** Enemy toughness, hit strength and tempo by wave: steady early, steeper later, so every run ends. */
export const enemyHp = (wave: number) => 0.55 * (1 + 0.18 * (wave - 1) + 0.012 * (wave - 1) ** 2);
export const enemyPower = (wave: number) => 1 + 0.06 * (wave - 1);
export const enemyHaste = (wave: number) => Math.min(1.6, 1 + 0.035 * (wave - 1));
/** Which kinds join from which wave, and how often they come once in (weight). */
const ROSTER: { kind: EnemyKind; from: number; weight: number }[] = [
  { kind: 'goblin', from: 1, weight: 5 }, { kind: 'thief', from: 2, weight: 3 }, { kind: 'skull', from: 3, weight: 4 },
  { kind: 'shaman', from: 4, weight: 2 }, { kind: 'turtle', from: 5, weight: 2 }, { kind: 'bear', from: 6, weight: 3 },
  { kind: 'bombfish', from: 7, weight: 2 }, { kind: 'troll', from: 12, weight: 1 },
];
export type HuntKill = 'normal' | 'elite' | 'boss';

export class SnowHunt {
  wave = 1;
  waveTime = waveSeconds(1);
  level = 1;
  xp = 0;
  tickets = 0;
  coins = 0;
  kills = 0;
  /** Seconds survived this run. */
  time = 0;
  stacks: Record<string, number> = {};
  /** Cards on offer while play is paused: three for a level-up, two for a cleared wave; null while fighting. */
  choices: string[] | null = null;
  offerKind: 'level' | 'wave' = 'level';
  pendingLevels = 0;
  private pendingWavePick = false;
  pickups: HuntPickup[] = [];
  state: 'fighting' | 'over' = 'fighting';
  /** Card offers that can be redrawn this run (one to start, one more per boss beaten). */
  rerolls = 1;
  /** Seconds left of the "Wave N" announcement. */
  waveBanner = 2.5;
  reviveUsed = false;
  blizzardTimer = 6;
  echoChargeTimer = 10;
  /** Healing and raises waiting for the engine (takeEffects). */
  private effects: HuntEffects = { heal: 0, mana: 0, maxHp: 0, maxMp: 0 };
  private spawnTimer = 1;
  private elitesLeft = 0;
  private eliteTimer = 0;
  private bossPending = false;

  constructor(readonly hero: HuntHero = 'swordsman') { this.startWave(1); }

  stack(id: string) { return this.stacks[id] ?? 0; }
  has(id: string) { return this.stack(id) > 0; }
  get bossWave() { return this.wave % BOSS_EVERY === 0; }

  // Modifiers the engine reads.
  get damageMul() { return 1 + 0.1 * this.stack('sharp'); }
  get maxHpBonus() { return 15 * this.stack('tough'); }
  get maxHpMul() { return this.has('greed') ? 0.9 : 1; }
  get speedMul() { return 1 + 0.08 * this.stack('swift'); }
  get attackCooldownMul() { return 1 / (1 + 0.1 * this.stack('quick')); }
  /** Vigor: 0.6% of max HP per second per level. */
  get regenFraction() { return 0.006 * this.stack('vigor'); }
  get maxMpBonus() { return 20 * this.stack('manaPool'); }
  /** Extra MP per second on top of the usual regeneration. */
  get manaRegen() { return 2 * this.stack('manaFlow'); }
  get pickupRadius() { return 70 * (1 + 0.35 * this.stack('magnet')); }
  get echoPickupRadius() { return 46 * (1 + 0.5 * this.stack('echoCollect')); }
  get dodgeCooldownMul() { return Math.pow(0.85, this.stack('dash')); }
  get skillCooldownMul() { return Math.pow(0.88, this.stack('focus')); }
  get critChance() { return 0.1 * this.stack('crit'); }
  get lifesteal() { return this.stack('leech'); }
  get echoChargeEvery() { return this.has('echoCharge') ? 10 / (1 + 0.35 * (this.stack('echoCharge') - 1)) : Infinity; }
  // Weapons.
  get blizzardEvery() { return this.has('blizzardEdge') ? 3 : 6; }
  get blizzardRadius() { return this.has('blizzardEdge') ? 190 : 150; }
  get blizzardDamage() { return this.has('blizzardEdge') ? 55 : 22; }
  get snowballCount() { return this.stack('snowballs') + (this.has('snowGlobe') ? 3 : 0); }
  get snowballRing() { return this.has('snowGlobe') ? 78 : 58; }
  get snowballSize() { return this.has('snowGlobe') ? 13 : 9; }
  get snowballDamage() { return 8 + 4 * this.stack('snowballs') + (this.has('snowGlobe') ? 10 : 0); }
  get candyEvery() { return this.has('candyStorm') ? 1.2 : 2.4 - 0.4 * (this.stack('candy') - 1); }
  get candyCount() { return this.has('candyStorm') ? 3 : this.stack('candy') >= 3 ? 2 : 1; }
  get candyDamage() { return 14 + 6 * this.stack('candy'); }
  get bellCount() { return this.has('jingleAll') ? 3 : 1; }
  get bellDamage() { return 16 + 8 * this.stack('bells'); }
  get bellRadius() { return 70 + 15 * this.stack('bells'); }

  maxAlive() { return Math.min(36, 4 + this.wave * 3); }
  private startWave(wave: number) {
    this.wave = wave;
    this.waveTime = waveSeconds(wave);
    this.waveBanner = 2.5;
    this.spawnTimer = 0.6;
    this.elitesLeft = wave >= 3 && wave % BOSS_EVERY !== 0 ? Math.min(4, Math.ceil((wave - 2) / 2)) : 0;
    this.eliteTimer = this.waveTime * 0.45;
    this.bossPending = wave % BOSS_EVERY === 0;
  }
  private pick(random: () => number): EnemyKind {
    const open = ROSTER.filter(r => r.from <= this.wave);
    let roll = random() * open.reduce((s, r) => s + r.weight, 0);
    for (const r of open) { roll -= r.weight; if (roll <= 0) return r.kind; }
    return open[0].kind;
  }

  /**
   * Advance the run. Returns the enemies to spawn this step (the engine places them).
   * `alive` is the number of living enemies; `bossAlive` holds the wave open until the boss falls.
   */
  update(dt: number, alive: number, random: () => number = Math.random, bossAlive = false): HuntSpawn[] {
    if (this.state !== 'fighting' || this.choices) return [];
    const spawns: HuntSpawn[] = [];
    const scale = { hpScale: enemyHp(this.wave), power: enemyPower(this.wave), haste: enemyHaste(this.wave) };
    this.time += dt;
    this.waveBanner = Math.max(0, this.waveBanner - dt);
    this.waveTime = Math.max(bossAlive || this.bossPending ? 0 : -Infinity, this.waveTime - dt);
    if (this.bossPending) {
      this.bossPending = false;
      spawns.push({ kind: 'troll', elite: true, boss: true, hpScale: scale.hpScale * 4, power: scale.power, haste: scale.haste });
    }
    this.spawnTimer -= dt;
    // Boss waves bring fewer adds, so the fight is about the boss.
    if (this.spawnTimer <= 0 && alive < (this.bossWave ? Math.ceil(this.maxAlive() / 2) : this.maxAlive())) {
      this.spawnTimer = Math.max(0.35, 2.1 - this.wave * 0.18);
      const batch = 1 + (random() < Math.min(0.85, this.wave * 0.1) ? 1 : 0);
      for (let i = 0; i < batch; i++) spawns.push({ kind: this.pick(random), elite: false, boss: false, ...scale });
    }
    if (this.elitesLeft > 0) {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.elitesLeft--;
        this.eliteTimer = 8;
        spawns.push({ kind: 'minotaur', elite: true, boss: false, hpScale: scale.hpScale * 2.6, power: scale.power, haste: scale.haste });
      }
    }
    if (this.waveTime <= 0 && !bossAlive && spawns.every(s => !s.boss)) this.clearWave();
    for (const p of this.pickups) p.age += dt;
    return spawns;
  }

  /** A wave held: loot flies in, the wave pays its bonus, the hero recovers a share, and picks 1 of 2 cards. */
  private clearWave() {
    for (const p of this.pickups) this.gain(p);
    this.pickups = [];
    const reward = waveReward(this.wave);
    this.tickets += reward.tickets;
    this.coins += reward.coins;
    this.effects.heal += WAVE_CLEAR_HEAL;
    this.effects.mana += WAVE_CLEAR_MANA;
    this.pendingWavePick = true;
    this.startWave(this.wave + 1);
    this.offerNext();
  }

  /** A kill: an XP gem always; tickets, coins, potions and rarely a max-HP or max-MP shard. */
  onKill(x: number, y: number, kind: HuntKill = 'normal', random: () => number = Math.random) {
    this.kills++;
    const drop = (k: HuntPickupKind, value: number, dx = 0, dy = 0) => this.pickups.push({ kind: k, x: x + dx, y: y + dy, value, age: 0 });
    const greed = this.has('greed') ? 1.5 : 1;
    if (kind === 'boss') {
      this.rerolls++;
      drop('xp', 30); drop('ticket', Math.round((20 + this.wave) * greed), 18, -8); drop('coin', Math.round((30 + 2 * this.wave) * greed), -18, 6);
      drop('maxHp', MAX_HP_SHARD, 0, 22); drop('maxMp', MAX_MP_SHARD, 22, 18); drop('hp', 1, -22, -18);
      return;
    }
    const elite = kind === 'elite';
    drop('xp', elite ? 8 : random() < BIG_GEM ? 3 : 1);
    const tickets = elite ? Math.round(4 * greed) : random() < DROP.ticket * greed ? 1 : 0;
    if (tickets) drop('ticket', tickets, 10, -6);
    const coins = elite ? Math.round(5 * greed) : random() < DROP.coin * greed ? 1 : 0;
    if (coins) drop('coin', coins, -10, 4);
    if (random() < (elite ? 0.5 : DROP.hp)) drop('hp', 1, -12, -12);
    if (random() < (elite ? 0.5 : DROP.mp)) drop('mp', 1, 12, 12);
    if (random() < (elite ? 0.15 : DROP.maxHp)) drop('maxHp', MAX_HP_SHARD, 0, 16);
    if (random() < (elite ? 0.15 : DROP.maxMp)) drop('maxMp', MAX_MP_SHARD, 16, 0);
  }

  /** Collect anything within reach of a collector. Returns true if a card offer is now waiting. */
  collect(collectors: { x: number; y: number; r: number }[], random: () => number = Math.random) {
    const before = this.pickups.length;
    this.pickups = this.pickups.filter(p => {
      if (!collectors.some(c => Math.hypot(c.x - p.x, c.y - p.y) <= c.r)) return true;
      this.gain(p);
      return false;
    });
    if (this.pickups.length !== before) this.offerNext(random);
    return !!this.choices;
  }

  /**
   * Draw pickups in: anything within a collector's reach (the hero's or an Echo's) starts flying to
   * the hero, faster as it goes, and counts once it arrives. Returns what arrived this step, so the
   * engine can show and sound it.
   */
  attract(collectors: { x: number; y: number; r: number }[], hero: { x: number; y: number }, dt: number, random: () => number = Math.random) {
    const arrived: HuntPickup[] = [];
    this.pickups = this.pickups.filter(p => {
      if (!p.homing && collectors.some(c => Math.hypot(c.x - p.x, c.y - p.y) <= c.r)) { p.homing = true; p.speed = PICKUP_FLY.start; }
      if (!p.homing) return true;
      p.speed = Math.min(PICKUP_FLY.max, (p.speed ?? PICKUP_FLY.start) + PICKUP_FLY.accel * dt);
      const dx = hero.x - p.x, dy = hero.y - 12 - p.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= PICKUP_FLY.catch + step) { this.gain(p); arrived.push(p); return false; }
      p.x += dx / d * step; p.y += dy / d * step;
      return true;
    });
    if (arrived.length) this.offerNext(random);
    return arrived;
  }

  /** Redraw the cards on offer (same count). Returns false when there is nothing to redraw or none left. */
  reroll(random: () => number = Math.random) {
    if (!this.choices || this.rerolls <= 0) return false;
    this.rerolls--;
    this.choices = this.rollChoices(random, this.choices.length);
    return true;
  }

  /** Healing and raises gathered since the last call; the engine applies them to the hero. */
  takeEffects(): HuntEffects {
    const out = this.effects;
    this.effects = { heal: 0, mana: 0, maxHp: 0, maxMp: 0 };
    return out;
  }

  /** End the run (fallen or retreated): tickets and coins still on the ground are picked up too. */
  finish() {
    if (this.state === 'over') return;
    for (const p of this.pickups) if (p.kind === 'ticket' || p.kind === 'coin') this.gain(p);
    this.pickups = [];
    this.choices = null;
    this.state = 'over';
  }

  private gain(p: HuntPickup) {
    switch (p.kind) {
      case 'ticket': this.tickets += p.value; return;
      case 'coin': this.coins += p.value; return;
      case 'hp': this.effects.heal += HP_POTION_HEAL * p.value; return;
      case 'mp': this.effects.mana += MP_POTION_RESTORE * p.value; return;
      case 'maxHp': this.effects.maxHp += p.value; return;
      case 'maxMp': this.effects.maxMp += p.value; return;
    }
    this.xp += p.value;
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.pendingLevels++;
    }
  }

  /** Open the next card offer: a cleared wave's 1-of-2 first, then any waiting level-ups (1 of 3). */
  private offerNext(random: () => number = Math.random) {
    if (this.choices || this.state !== 'fighting') return;
    if (this.pendingWavePick) { this.pendingWavePick = false; this.offerKind = 'wave'; this.choices = this.rollChoices(random, 3); return; }
    if (this.pendingLevels > 0) { this.offerKind = 'level'; this.choices = this.rollChoices(random, 3); }
  }

  /** Can this card be offered now: not maxed, for this hero, and (an evolution) its cards levelled. */
  available(c: HuntCard) {
    if (this.stack(c.id) >= c.max) return false;
    if (c.hero && c.hero !== this.hero) return false;
    return !c.needs || Object.entries(c.needs).every(([id, level]) => this.stack(id) >= level);
  }

  /**
   * `count` different cards that can be offered, weighted by rarity, with a hero and an Echo card when
   * both are left. A ready evolution always takes one of the places.
   */
  rollChoices(random: () => number = Math.random, count = 3): string[] {
    const open = HUNT_CARDS.filter(c => this.available(c));
    const picked: HuntCard[] = [];
    const evolution = open.find(c => c.needs);
    if (evolution) picked.push(evolution);
    const draw = (from: HuntCard[]) => {
      const pool = from.filter(c => !picked.includes(c));
      const total = pool.reduce((s, c) => s + RARITY_WEIGHT[c.rarity], 0);
      let roll = random() * total;
      for (const c of pool) { roll -= RARITY_WEIGHT[c.rarity]; if (roll <= 0) return c; }
      return pool[pool.length - 1];
    };
    for (const side of ['hero', 'echo'] as const) {
      const ofSide = open.filter(c => c.side === side && !picked.includes(c));
      if (ofSide.length && picked.length < count) picked.push(draw(ofSide));
    }
    while (picked.length < count && picked.length < open.length) picked.push(draw(open));
    for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
    return picked.map(c => c.id);
  }

  /** Take a card from the offer. Returns it, or null if it was not on offer. */
  choose(id: string, random: () => number = Math.random): HuntCard | null {
    if (!this.choices?.includes(id)) return null;
    this.stacks[id] = this.stack(id) + 1;
    if (this.offerKind === 'level') this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.choices = null;
    this.offerNext(random);
    return HUNT_CARD[id];
  }
}

// --- The arena: a snowy clearing with Christmas decorations (drawn by rendering/snowHunt.ts). ---

/** Solid decorations players walk around: the big tree in the middle, snowmen, gift piles. */
export const HUNT_DECOR: { kind: 'tree' | 'snowman' | 'gifts'; rect: Rect }[] = [
  { kind: 'tree', rect: { x: 610, y: 300, width: 60, height: 52 } },
  { kind: 'snowman', rect: { x: 300, y: 190, width: 34, height: 30 } },
  { kind: 'snowman', rect: { x: 946, y: 500, width: 34, height: 30 } },
  { kind: 'gifts', rect: { x: 940, y: 180, width: 56, height: 34 } },
  { kind: 'gifts', rect: { x: 286, y: 500, width: 56, height: 34 } },
];
const perimeter: Rect[] = [
  { x: 0, y: 0, width: 1280, height: 40 }, { x: 0, y: 680, width: 1280, height: 40 },
  { x: 0, y: 40, width: 40, height: 640 }, { x: 1240, y: 40, width: 40, height: 640 },
];
/** Uses the snowy-pass ground (level id 7 skin) but is its own map: open, no runes or gates. */
export const HUNT_LEVEL: LevelData = {
  id: 7, name: 'SNOW HUNT', subtitle: 'SĂN QUÁI ĐÊM NOEL', difficulty: 7,
  description: 'Survive as long as you can. Longer runs bring more coins and Noel tickets; every level-up offers a power card.',
  playerSpawn: { x: 640, y: 470, direction: 'up' },
  walls: [...perimeter.map(w => ({ ...w })), ...HUNT_DECOR.map(d => ({ ...d.rect }))],
  plates: [], doors: [], traps: [],
  exit: { x: -200, y: -200, width: 1, height: 1, radius: 1 },
};
