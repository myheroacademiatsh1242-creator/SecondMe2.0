/**
 * The Frost Guardian's ice pillars summon Frost Crystals in waves: all standing pillars release at the same moment, each one
 * PER_PILLAR[stage] crystals, where stage 1 is the start of the fight, 2 after the boss drops to 75% and 3 after it drops to 50%
 * (below that the pillars are gone). A wave comes the moment the pillars appear, then every EVERY seconds. A broken pillar
 * summons nothing. Spawning and drawing live in GameEngine.
 */
export const PILLAR_SUMMON = {
  EVERY: 15,                       // seconds between two waves
  PER_PILLAR: [2, 3, 6],           // crystals each standing pillar releases in stage 1, 2, 3
  RETRY: 1.5,                      // when the arena is full, try again this soon
  MAX_ALIVE: 24,
  HP: 40,
  HUE: 165,                        // picks the ice slime's traits (slow, long reach: enemies.ts); drawn as a Frost Crystal (rendering/frostCrystal.ts)
};

/** Level 6 opens with one Frost Crystal per pillar and no Guardian; shattering this many wakes it (the rest fuse into it). */
export const FROST_PRELUDE_KILLS = 2;

export const newPillarClocks = () => ({ clock: 0 });   // 0: the first wave comes as soon as the fight starts

/** Advances the wave clock by `dt` s; returns the pillar index once per crystal to spawn (a pillar appears 2, 3 or 6 times). */
export function stepPillarSummons(state: ReturnType<typeof newPillarClocks>, pillars: readonly { hp: number }[], stage: number, alive: number, dt: number): number[] {
  const standing = pillars.flatMap((p, i) => p.hp > 0 ? [i] : []);
  if (!standing.length) { state.clock = 0; return []; }   // when they rise again, their wave comes at once
  state.clock -= dt;
  if (state.clock > 0) return [];
  const perPillar = PILLAR_SUMMON.PER_PILLAR[Math.min(PILLAR_SUMMON.PER_PILLAR.length, Math.max(1, stage)) - 1];
  const summon: number[] = [];
  for (const i of standing) for (let k = 0; k < perPillar; k++) if (alive + summon.length < PILLAR_SUMMON.MAX_ALIVE) summon.push(i);
  state.clock = summon.length ? PILLAR_SUMMON.EVERY : PILLAR_SUMMON.RETRY;
  return summon;
}
