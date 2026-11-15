import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './GameEngine.ts';
import { sounds } from './logic/sound.ts';

sounds.setMuted(true);
type Internals = {
  update(dt: number): void;
  canvas: unknown;
  pingTarget: { x: number; y: number; life: number } | null;
  handleCanvasMouseDown(e: Partial<MouseEvent>): void;
};
function setup(t: TestContext) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => old ? Object.defineProperty(globalThis, 'document', old) : Reflect.deleteProperty(globalThis, 'document'));
  const game = new GameEngine(); game.currentLevelIdx = 1; game.restartLevel(); game.legTimeRemaining = null;
  const inner = game as unknown as Internals;
  inner.canvas = { width: 1280, height: 720, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) };
  const tap = (x: number, y: number, shiftKey = false) => inner.handleCanvasMouseDown({ button: 0, shiftKey, clientX: x, clientY: y, preventDefault() {} });
  const summon = () => { game.recorder.startRecording(game.player.x, game.player.y, 'right'); game.spawnEcho(); };
  return { game, inner, tap, summon };
}

test('mark mode needs an Echo; with one, the next tap marks the target instead of attacking', t => {
  const { game, inner, tap, summon } = setup(t);
  let attacks = 0; game.attack = () => { attacks++; };
  game.armTargetMark();
  tap(500, 300);
  assert.equal(inner.pingTarget, null, 'no Echo: mark mode stays off and the tap attacks');
  assert.equal(attacks, 1);
  summon();
  game.armTargetMark();
  tap(500, 300);
  const ping = (): Internals['pingTarget'] => inner.pingTarget;
  assert.deepEqual({ x: ping()?.x, y: ping()?.y }, { x: 500, y: 300 });
  assert.equal(attacks, 1, 'the marking tap does not attack');
  tap(600, 300);
  assert.equal(attacks, 2, 'mark mode is spent after one tap');
});

test('mark mode toggles off when pressed again and expires after 4 s; Shift + click still marks', t => {
  const { game, inner, tap, summon } = setup(t);
  summon();
  game.armTargetMark(); game.armTargetMark();
  let attacks = 0; game.attack = () => { attacks++; };
  tap(500, 300); assert.equal(attacks, 1);
  game.armTargetMark();
  for (let i = 0; i < 90; i++) inner.update(.05);
  tap(500, 300); assert.equal(attacks, 2, 'expired');
  tap(700, 200, true);
  assert.equal(inner.pingTarget?.x, 700);
  assert.equal(attacks, 2);
});

test('the touch Echo strip has what it needs in the HUD: every Echo, the selection and the swap cooldown', t => {
  const { game, summon } = setup(t);
  let hud: Parameters<NonNullable<GameEngine['onHUDChange']>>[0] | null = null;
  game.onHUDChange = s => { hud = s; };
  summon(); summon();
  game.selectEcho(0); game.pauseEcho();
  const h = hud!;
  assert.equal(h.echoList?.length, 2);
  assert.equal(h.selectedEcho, 0);
  assert.equal(h.echoList?.[0].status, 'paused');
  assert.equal(h.swapCooldown, 0);
});
