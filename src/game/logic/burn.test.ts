import test from 'node:test';
import assert from 'node:assert/strict';
import { BURN, ignite, newBurn, stepBurn } from './burn.ts';

const run = (b: ReturnType<typeof newBurn>, seconds: number, dt = 1 / 60) => {
  let total = 0;
  for (let t = 0; t < seconds - 1e-9; t += dt) total += stepBurn(b, dt);
  return total;
};

test('a fresh burn ticks every half second and ends after its time', () => {
  const b = newBurn();
  assert.equal(stepBurn(b, 1), 0, 'not alight, no damage');
  assert.equal(ignite(b), true);
  assert.equal(run(b, 10), BURN.DAMAGE * Math.floor(BURN.TIME / BURN.TICK));
  assert.equal(b.remaining, 0);
});

test('a second hit refreshes the burn instead of stacking it', () => {
  const b = newBurn();
  ignite(b);
  run(b, 2);
  assert.equal(ignite(b), false, 'already burning');
  assert.equal(b.remaining, BURN.TIME);
  assert.equal(run(b, 10), BURN.DAMAGE * (Math.floor(BURN.TIME / BURN.TICK)), 'at most one tick every half second');
});
