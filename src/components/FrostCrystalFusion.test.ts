import test from 'node:test';
import assert from 'node:assert/strict';
import DANCE from '../game/data/frostFusionDance.json';
import { TOUCH, dancePlacement } from './FrostCrystalFusion.tsx';

const K = 2, cx = 300;
/** Canvas x of the left dancer's fingertip right edge (and, mirrored, of the right one's left edge). */
const tipEdges = (t: number) => {
  const p = dancePlacement(t, cx), tip = DANCE.tip[p.frame];
  if (!tip) return null;
  const right = p.xL + (tip[0] + 1 - DANCE.centerX) * K;
  return { left: right, right: p.xR - (tip[0] + 1 - DANCE.centerX) * K };
};

test('the fusion dance: mirrored, the fingertips meet exactly at the centre, bodies never overlap, the touch is held', () => {
  assert.equal(DANCE.dx.length, DANCE.frames); assert.equal(DANCE.tip.length, DANCE.frames); assert.equal(DANCE.bodyRight.length, DANCE.frames);
  for (let t = 0; t < DANCE.frames / DANCE.fps; t += 1 / DANCE.fps) {
    const p = dancePlacement(t, cx);
    assert.equal(p.xL + p.xR, 2 * cx, `mirror images at ${t.toFixed(2)}`);
    assert.ok(p.bodyRightL < cx, `bodies apart at ${t.toFixed(2)}`);   // arms excluded; the right body mirrors this one
    const e = tipEdges(t);
    if (e) assert.ok(e.left <= cx && e.right >= cx, `fingers never cross at ${t.toFixed(2)}`);
  }
  const touch = tipEdges(TOUCH + .001)!;
  assert.deepEqual([touch.left, touch.right], [cx, cx], 'the two index fingertips touch at one point');
  assert.ok(tipEdges(TOUCH - .3)!.left < cx - 2, 'they are still apart just before');
  // Held: the same frame (same pose, same place) from the touch to the end of the dance, at least .6 s before the light.
  const end = DANCE.frames / DANCE.fps;
  assert.ok(end - TOUCH >= .6);
  for (let t = TOUCH + .001; t < end; t += .05) {
    const p = dancePlacement(t, cx), q = dancePlacement(TOUCH + .001, cx);
    assert.equal(p.xL, q.xL);
  }
  // They start on either side (~35% / 65% of a 16:9 frame 200 px high) and step out before coming in.
  const W = 356, c0 = W / 2, start = dancePlacement(0, c0);
  assert.ok(Math.abs(start.xL / W - .35) < .05, `starts near 35%: ${(start.xL / W).toFixed(2)}`);
  assert.ok(dancePlacement(1.6, cx).xL < dancePlacement(0, cx).xL - 10, 'the "Fuuu" steps go outward');
});
