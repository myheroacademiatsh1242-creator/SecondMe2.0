import { LEVELS } from '../../game/logic/levels.ts';
import { encounters } from '../../game/logic/enemies.ts';
import { puzzleBalance } from '../../game/logic/balance.ts';
import type { LevelData, Trap } from '../../game/logic/types.ts';

/** What a level guide shows, read straight from the level data, so the guide can never disagree with the map. */
export interface LevelFacts {
  id: number;
  index: number;
  subtitle: string;
  boss: 'guardian' | 'demon' | null;
  chapter: 1 | 2;
  runes: { numeral: string; x: number; y: number; w: number; h: number; guards: number }[];
  gates: { n: number; x: number; y: number; w: number; h: number; needs: string[]; empty: string | null; pulse: { open: number; period: number } | null; bridge: boolean }[];
  traps: Trap['kind'][];
  enemies: Record<string, number>;
  /** 'all': every enemy must fall before the exit opens; 'guards': only the sentries linked to runes. */
  exitClear: 'none' | 'all' | 'guards';
  legSeconds: number | null;
  exit: { x: number; y: number; w: number; h: number };
  spawn: { x: number; y: number };
}

export const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export function levelFacts(level: LevelData, index = LEVELS.indexOf(level)): LevelFacts {
  const numeral = (plateId: string) => NUMERALS[level.plates.findIndex(p => p.id === plateId)] ?? '?';
  const boss = level.id === 6 ? 'guardian' : level.id === 13 ? 'demon' : null;
  const enemies: Record<string, number> = {};
  for (const [kind] of encounters[level.id] ?? []) enemies[kind] = (enemies[kind] ?? 0) + 1;
  return {
    id: level.id, index, subtitle: level.subtitle, boss, chapter: level.id <= 6 ? 1 : 2,
    runes: level.plates.map((p, i) => ({ numeral: NUMERALS[i], x: p.x, y: p.y, w: p.width, h: p.height, guards: p.wardEnemyIds?.length ?? 0 })),
    gates: level.doors.map((d, i) => ({
      n: i + 1, x: d.x, y: d.y, w: d.width, h: d.height,
      needs: d.requiredPlates.map(numeral), empty: d.releasedPlate ? numeral(d.releasedPlate) : null,
      pulse: d.pulse ? { open: d.pulse.openSeconds, period: d.pulse.period } : null, bridge: !!d.liftBridge,
    })),
    traps: [...new Set((level.traps ?? []).map(t => t.kind))],
    enemies,
    exitClear: boss ? 'none' : level.id === 7 ? 'all' : level.id >= 8 && level.id <= 12 ? 'guards' : 'none',
    legSeconds: boss ? null : puzzleBalance(level.id).legSeconds,
    exit: { x: level.exit.x, y: level.exit.y, w: level.exit.width, h: level.exit.height },
    spawn: { x: level.playerSpawn.x, y: level.playerSpawn.y },
  };
}

export const ALL_LEVEL_FACTS = LEVELS.map((level, i) => levelFacts(level, i));
