import { HERO_MAX_HP } from './balance.ts';

export type UpgradeHero = 'mage' | 'swordsman';
export const HERO_UPGRADE_STATS = ['health', 'attack', 'specialty'] as const;
export type HeroUpgradeStat = typeof HERO_UPGRADE_STATS[number];
type StatRanks = Record<HeroUpgradeStat, number>;
export type HeroRanks = Record<UpgradeHero, StatRanks>;

export const HERO_UPGRADE_PRICES = [96, 180, 300, 360, 420, 490, 560, 640, 740, 860] as const;
export const HERO_MAX_RANK = HERO_UPGRADE_PRICES.length;
export const HERO_RESET_FEE_PERCENT = 20;

export function heroResetQuote(spent: number) {
  const fee = Math.ceil(spent * HERO_RESET_FEE_PERCENT / 100);
  return { fee, refund: spent - fee };
}

export function heroUpgradeCost(rank: number) {
  return HERO_UPGRADE_PRICES.slice(0, rank).reduce((total, price) => total + price, 0);
}

const HEALTH_BONUS = {
  mage: [0, 7, 14, 21, 30, 43, 52, 62, 75, 88, 108],
  swordsman: [0, 12, 24, 36, 50, 68, 82, 98, 117, 138, 165],
};
const ATTACK_BONUS = {
  mage: [0, 8, 16, 24, 38, 55, 70, 85, 105, 125, 150],
  swordsman: [0, 10, 20, 30, 48, 70, 88, 108, 132, 156, 185],
};
const ICE_MP_DISCOUNT = [0, 2, 4, 6, 8, 11, 13, 15, 18, 21, 24];
const DAMAGE_REDUCTION = [0, 4, 8, 12, 15, 20, 23, 26, 30, 33, 38];

export function isUpgradeHero(hero: string): hero is UpgradeHero {
  return hero === 'mage' || hero === 'swordsman';
}

function cleanRank(saved: unknown): number {
  return typeof saved === 'number' && Number.isInteger(saved)
    ? Math.max(0, Math.min(HERO_MAX_RANK, saved))
    : 0;
}

function cleanStatRanks(saved: number | Partial<StatRanks> | undefined): StatRanks {
  // Older saves purchased all three stats together.
  if (typeof saved === 'number') {
    const rank = cleanRank(saved);
    return { health: rank, attack: rank, specialty: rank };
  }
  return { health: cleanRank(saved?.health), attack: cleanRank(saved?.attack), specialty: cleanRank(saved?.specialty) };
}

export function cleanHeroRanks(value?: Partial<Record<UpgradeHero, number | Partial<StatRanks>>>): HeroRanks {
  return { mage: cleanStatRanks(value?.mage), swordsman: cleanStatRanks(value?.swordsman) };
}

export function heroStats(hero: keyof typeof HERO_MAX_HP, ranks: HeroRanks) {
  const rank = isUpgradeHero(hero) ? ranks[hero] : undefined;
  const specialty = rank?.specialty ?? 0;
  const attack = rank?.attack ?? 0;
  return {
    maxHealth: HERO_MAX_HP[hero] + (isUpgradeHero(hero) ? HEALTH_BONUS[hero][rank?.health ?? 0] : 0),
    attackBonus: isUpgradeHero(hero) ? ATTACK_BONUS[hero][attack] : 0,
    damageReduction: hero === 'swordsman' ? DAMAGE_REDUCTION[specialty] : 0,
    skillManaDiscount: hero === 'mage' ? ICE_MP_DISCOUNT[specialty] : 0,
    iceRadiusBonus: hero === 'mage' ? (specialty >= 10 ? 30 : specialty >= 5 ? 15 : 0) : 0,
    sanctuaryBonus: hero === 'swordsman' ? (specialty >= 10 ? 4 : specialty >= 5 ? 2 : 0) : 0,
    defeatsEarlyEnemies: attack === HERO_MAX_RANK,
  };
}
