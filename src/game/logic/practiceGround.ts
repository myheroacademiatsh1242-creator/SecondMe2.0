/**
 * Level 1 is the practice ground: a row of stations, left to right, each teaching one control.
 * No clock and no death there (GameEngine). This module only tracks what the player has done;
 * keyPrompts.ts turns it into the prompt shown by the hero.
 */
export const PRACTICE_LEVEL_ID = 1;

export type PracticeTask = 'move' | 'attack' | 'skill' | 'dodge';

/** Stations by x range on the level 1 map (levels.ts). Past the last one is the Echo station, taught by the trail objective. */
export const PRACTICE_STATIONS: { x0: number; x1: number; tasks: PracticeTask[] }[] = [
  { x0: 0, x1: 320, tasks: ['move'] },
  { x0: 320, x1: 600, tasks: ['attack', 'skill'] },
  { x0: 600, x1: 840, tasks: ['dodge'] },
];
/** How much of each task counts as learned. */
export const PRACTICE_GOAL: Record<PracticeTask, number> = { move: 160, attack: 4, skill: 1, dodge: 1 };

export class PracticeProgress {
  moved = 0;
  attack = 0;
  skill = 0;
  dodge = 0;
  done(task: PracticeTask) {
    return (task === 'move' ? this.moved : this[task]) >= PRACTICE_GOAL[task];
  }
  reset() { this.moved = 0; this.attack = 0; this.skill = 0; this.dodge = 0; }
}

/**
 * The task to prompt at the hero's x: the first unfinished task of the station they stand in,
 * 'next' once that station is finished, or null at the Echo station (handled by the trail objective).
 */
export function practiceTask(x: number, progress: PracticeProgress): PracticeTask | 'next' | null {
  const station = PRACTICE_STATIONS.find(s => x >= s.x0 && x < s.x1);
  if (!station) return null;
  return station.tasks.find(t => !progress.done(t)) ?? 'next';
}
