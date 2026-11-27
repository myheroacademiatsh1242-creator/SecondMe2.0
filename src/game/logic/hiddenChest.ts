import { getCharacterBoundingBox, rectIntersects } from './collision.ts';
import { enemyRoute } from './enemyNavigation.ts';
import type { Point } from './combatGeometry.ts';
import type { LevelData } from './types.ts';

export function placeHiddenChest(level: LevelData, spawn: Point, random = Math.random) {
  if (random() >= .45) return null;
  const blocked = [...level.walls, ...level.plates, ...level.doors, ...(level.traps ?? []), level.exit];
  const candidates = [];
  for (let y = 64; y <= 656; y += 32) {
    for (let x = 64; x <= 1216; x += 32) {
      if (Math.hypot(x - spawn.x, y - spawn.y) < 245) continue;
      if (blocked.some(r => rectIntersects(getCharacterBoundingBox(x,y,40,40), r))) continue;
      if (level.hazards?.some(h => Math.hypot(x-h.x,y-h.y) < h.radius+20)) continue;
      const nearVertical = x < 105 || x > 1175 || level.walls.some(w => y >= w.y && y <= w.y+w.height && Math.min(Math.abs(x-w.x),Math.abs(x-w.x-w.width)) < 64);
      const nearHorizontal = y < 105 || y > 615 || level.walls.some(w => x >= w.x && x <= w.x+w.width && Math.min(Math.abs(y-w.y),Math.abs(y-w.y-w.height)) < 64);
      if (nearVertical || nearHorizontal) candidates.push({x,y,score: Number(nearVertical && nearHorizontal) + random()});
    }
  }
  candidates.sort((a,b) => b.score-a.score);
  for (const p of candidates.slice(0,24)) {
    if (enemyRoute(spawn,p,level.walls).length) return {x:p.x,y:p.y,openedAt:null as number|null};
  }
  return null;
}
