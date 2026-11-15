import test from 'node:test';
import assert from 'node:assert/strict';
import { PILLAR_SUMMON, newPillarClocks, stepPillarSummons } from './pillarSummon.ts';

const standing = () => [{ hp: 60 }, { hp: 60 }, { hp: 60 }, { hp: 60 }];
/** Runs `seconds` of fight; returns every summon as [time, pillar]. */
const run = (seconds: number, pillars = standing(), stage = 1, alive = () => 0) => {
  const clocks = newPillarClocks(), out: [number, number][] = [];
  for (let t = 0; t < seconds; t += .05) for (const i of stepPillarSummons(clocks, pillars, stage, alive(), .05)) out.push([t, i]);
  return out;
};
const waves = (s: [number, number][]) => [...new Set(s.map(([t]) => t))].map(t => s.filter(([u]) => u === t));

test('the first wave comes at once, every pillar at the same moment, then one wave every 15 s', () => {
  const w = waves(run(31));
  assert.equal(w.length, 3);
  assert.ok(w[0][0][0] < .1, 'right away');
  assert.ok(Math.abs(w[1][0][0] - w[0][0][0] - PILLAR_SUMMON.EVERY) < .1);
  assert.deepEqual(w.map(x => x.length), [8, 8, 8]);
});

test('each pillar releases 2, then 3 after the boss drops to 75%, then 6 after 50%', () => {
  for (const [stage, per] of [[1, 2], [2, 3], [3, 6]]) {
    const first = waves(run(1, standing(), stage))[0];
    for (let p = 0; p < 4; p++) assert.equal(first.filter(([, x]) => x === p).length, per);
  }
});

test('a broken pillar never summons, and pillars rising again summon at once', () => {
  const broken = standing(); broken[1].hp = 0;
  assert.ok(run(60, broken).every(([, i]) => i !== 1));
  const clocks = newPillarClocks(), down = standing().map(() => ({ hp: 0 }));
  for (let t = 0; t < 40; t += .05) assert.deepEqual(stepPillarSummons(clocks, down, 3, 0, .05), []);
  assert.equal(stepPillarSummons(clocks, standing(), 3, 0, .05).length, 24);
});

test('the arena never holds more than MAX_ALIVE summoned crystals', () => {
  let alive = 0;
  const clocks = newPillarClocks();
  for (let t = 0; t < 120; t += .05) alive += stepPillarSummons(clocks, standing(), 3, alive, .05).length;
  assert.equal(alive, PILLAR_SUMMON.MAX_ALIVE);
});
