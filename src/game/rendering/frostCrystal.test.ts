import test from 'node:test';
import assert from 'node:assert/strict';
import { frostCrystalFrame } from './frostCrystal.ts';

test('Frost Crystal maps the AI states onto its sheet rows', () => {
  const e = { hp: 40, mode: 'idle' as const, timer: 0, hitFlash: 0, attackFx: 0, deathAge: 0, homeX: 0 };
  assert.equal(frostCrystalFrame(e, 0).row, 0);
  assert.equal(frostCrystalFrame({ ...e, mode: 'chase' }, 0).row, 1);
  assert.deepEqual(frostCrystalFrame({ ...e, mode: 'warning', timer: .48 }, 0), { row: 2, frame: 0 });   // wind-up starts
  assert.deepEqual(frostCrystalFrame({ ...e, mode: 'warning', timer: .18 }, 0), { row: 2, frame: 3 });   // last wind-up frame
  assert.deepEqual(frostCrystalFrame({ ...e, mode: 'warning', timer: .17 }, 0), { row: 2, frame: 4 });   // leap
  assert.deepEqual(frostCrystalFrame({ ...e, mode: 'warning', timer: 0 }, 0), { row: 2, frame: 5 });
  assert.deepEqual(frostCrystalFrame({ ...e, attackFx: .32 }, 0), { row: 2, frame: 6 });                 // slam
  assert.deepEqual(frostCrystalFrame({ ...e, hitFlash: .35 }, 0), { row: 3, frame: 0 });
  assert.deepEqual(frostCrystalFrame({ ...e, hp: 0, deathAge: 9 }, 0), { row: 4, frame: 7 });
  for (let t = 0; t < 2; t += .07) {   // every frame stays inside the sheet's rows (6, 8, 8, 3, 8 frames)
    for (const s of [e, { ...e, mode: 'chase' as const }]) { const f = frostCrystalFrame(s, t); assert.ok(f.frame < [6, 8][f.row]); }
  }
});
