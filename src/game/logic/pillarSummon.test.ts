import test from 'node:test';
import assert from 'node:assert/strict';
import { PILLAR_SUMMON, newPillarClocks, stepPillarSummons } from './pillarSummon.ts';

const standing = () => [{ hp: 60 }, { hp: 60 }, { hp: 60 }, { hp: 60 }];
/** Runs `seconds` of fight; returns every summon as [time, pillar]. */
const run = (seconds: number, pillars = standing(), phase = 1, alive = () => 0) => {
  const clocks = newPillarClocks(), out: [number, number][] = [];
  for (let t = 0; t < seconds; t += .05) for (const i of stepPillarSummons(clocks, pillars, phase, alive(), .05)) out.push([t, i]);
  return out;
};

test('pillars wait before the first summon and then take turns', () => {
  const s = run(PILLAR_SUMMON.FIRST + 3 * PILLAR_SUMMON.STAGGER + .2);
  assert.ok(s[0][0] >= PILLAR_SUMMON.FIRST - .1, 'nothing in the first seconds');
  assert.deepEqual(s.map(([, i]) => i), [0, 1, 2, 3], 'one pillar after another');
});

test('a broken pillar never summons, and later phases summon more often', () => {
  const broken = standing(); broken[1].hp = 0;
  assert.ok(run(60, broken).every(([, i]) => i !== 1));
  assert.ok(run(60, standing(), 3).length > run(60, standing(), 1).length);
});

test('the arena never holds more than MAX_ALIVE summoned slimes', () => {
  let alive = 0;
  const clocks = newPillarClocks();
  for (let t = 0; t < 120; t += .05) alive += stepPillarSummons(clocks, standing(), 3, alive, .05).length;
  assert.equal(alive, PILLAR_SUMMON.MAX_ALIVE);
});
