/**
 * The Frost Guardian's ice pillars summon Frost Crystals: every standing pillar runs its own clock (staggered so they do not
 * all fire at once), faster in later phases, and the arena never holds more than MAX_ALIVE of them. A broken pillar
 * summons nothing, so breaking pillars also stops the slimes. Spawning and drawing live in GameEngine.
 */
export const PILLAR_SUMMON = {
  FIRST: 6, STAGGER: 2.5,          // first summon 6 s into the fight, then one pillar every 2.5 s after it
  EVERY: [12, 10, 8],              // seconds between two summons of one pillar, by boss phase 1-3
  RETRY: 1.5,                      // when the arena is full, try again this soon
  MAX_ALIVE: 4,
  HP: 40,
  HUE: 165,                        // picks the ice slime's traits (slow, long reach: enemies.ts); drawn as a Frost Crystal (rendering/frostCrystal.ts)
};

/** Level 6 opens with one Frost Crystal per pillar and no Guardian; shattering this many wakes it (the rest fuse into it). */
export const FROST_PRELUDE_KILLS = 2;

export const newPillarClocks = (n = 4) => Array.from({ length: n }, (_, i) => PILLAR_SUMMON.FIRST + i * PILLAR_SUMMON.STAGGER);

/** Advances the clocks by `dt` s; returns the indices of the pillars that summon a slime now. */
export function stepPillarSummons(clocks: number[], pillars: readonly { hp: number }[], phase: number, alive: number, dt: number): number[] {
  const every = PILLAR_SUMMON.EVERY[Math.min(2, Math.max(0, phase - 1))];
  const summon: number[] = [];
  pillars.forEach((pillar, i) => {
    if (pillar.hp <= 0) { clocks[i] = every; return; }   // when it rises again it waits a full round first
    clocks[i] -= dt;
    if (clocks[i] > 0) return;
    if (alive + summon.length < PILLAR_SUMMON.MAX_ALIVE) { summon.push(i); clocks[i] = every; }
    else clocks[i] = PILLAR_SUMMON.RETRY;
  });
  return summon;
}
