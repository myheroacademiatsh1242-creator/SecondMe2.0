import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionPose } from './FrostCrystalFusion.tsx';

test('the fusion dance is mirrored, swaps sides in the leap and meets in the air', () => {
  const cx = 300;
  for (let t = 0; t < 5.6; t += .05) {
    const L = fusionPose(t, -1, cx), R = fusionPose(t, 1, cx);
    assert.ok(Math.abs(L.x + R.x - 2 * cx) < 1e-6, `mirrored at ${t.toFixed(2)}`);
    assert.ok(Math.abs(L.rot + R.rot) < 1e-6 && L.lift === R.lift && L.frame === R.frame && L.faceRight !== R.faceRight);
    assert.ok(L.frame < [6, 8, 8][L.row], `frame inside its row at ${t.toFixed(2)}`);
  }
  assert.equal(fusionPose(.2, -1, cx).scale, 2);
  assert.ok(fusionPose(2.1, -1, cx).scale > 3.3, 'swollen before the dance');
  assert.ok(fusionPose(4, -1, cx).x < cx, 'left one still on the left while pointing');
  assert.ok(fusionPose(5, -1, cx).x > cx, 'and on the right once they have circled round');
  const L = fusionPose(5.5, -1, cx), R = fusionPose(5.5, 1, cx);
  assert.ok(Math.abs(L.x - R.x) < 20 && L.lift > 70, 'they meet high in the air');
  assert.ok(L.faceRight && !R.faceRight, 'facing each other for the final pose');
});
