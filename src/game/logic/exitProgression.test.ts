import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../GameEngine.ts';
import { LEVELS } from './levels.ts';
import { sounds } from './sound.ts';
import { updateSecurityDoors } from './puzzle.ts';
import { createEnemies } from './enemies.ts';
import { trailObjective } from './trailObjective.ts';

sounds.setMuted(true);

function setup(t: TestContext, index: number) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'document', previous) : Reflect.deleteProperty(globalThis, 'document'));
  const game = new GameEngine();
  game.currentLevelIdx = index;
  game.restartLevel();
  // Isolate switches, gate collision and exit progression from combat and traps.
  game.enemies = [];
  game.currentLevel.traps = [];
  const control = game as unknown as { update(dt: number): void; heldKeys: Set<string> };
  return { game, control, tick: () => control.update(.02) };
}

for (const [index, level] of LEVELS.entries()) {
  if (!level.plates.length) continue;

  test(`trail ${level.id}: touching every rune out of order still completes the checkpoints`, t => {
    const { game, tick } = setup(t, index);
    for (const plate of [...game.currentLevel.plates].reverse()) {
      game.player.x = plate.x + plate.width / 2;
      game.player.y = plate.y + plate.height / 2;
      tick();
      assert.ok(game.discoveredRunes.has(plate.id));
    }
    assert.equal(game.checkpointIndex, level.plates.length);
    game.player.x = level.playerSpawn.x;
    game.player.y = level.playerSpawn.y;
    tick();
    assert.equal(game.checkpointIndex, level.plates.length, 'releasing a rune retains its checkpoint');
    game.restartLevel();
    assert.equal(game.checkpointIndex, 0, 'retry starts a fresh puzzle');
    assert.equal(game.discoveredRunes.size, 0);
  });

  test(`trail ${level.id}: an Echo activating a rune counts toward exit progression`, t => {
    const { game, tick } = setup(t, index);
    for (const plate of game.currentLevel.plates) {
      game.echoes = [];
      game.recorder.startRecording(plate.x + plate.width / 2, plate.y + plate.height / 2, 'right');
      game.recorder.stopRecording(plate.x + plate.width / 2, plate.y + plate.height / 2, 'right', false);
      game.spawnEcho();
      tick();
      assert.ok(plate.isPressed);
    }
    assert.equal(game.checkpointIndex, level.plates.length);
  });

  test(`trail ${level.id}: final gate still enforces its held, released and timed runes`, () => {
    const copy = structuredClone(level);
    const gate = copy.doors.at(-1)!;
    const openTime = (gate.pulse?.openSeconds ?? 1) / 2 - (gate.pulse?.offset ?? 0);
    const update = (elapsed = openTime) => updateSecurityDoors([gate], copy.plates, copy.playerSpawn, null, 1, 3.5, elapsed);
    update();
    assert.equal(gate.isOpen, false, 'visiting runes is not a substitute for holding them');
    copy.plates.forEach(plate => { plate.isPressed = gate.requiredPlates.includes(plate.id); });
    update();
    assert.equal(gate.openProgress, 1);
    for (const id of gate.requiredPlates) {
      const plate = copy.plates.find(p => p.id === id)!;
      plate.isPressed = false;
      update();
      assert.equal(gate.isOpen, false, `missing ${id} must block this gate`);
      plate.isPressed = true;
    }
    if (gate.releasedPlate) {
      copy.plates.find(p => p.id === gate.releasedPlate)!.isPressed = true;
      update();
      assert.equal(gate.isOpen, false, 'the marked relay rune must be released');
      copy.plates.find(p => p.id === gate.releasedPlate)!.isPressed = false;
    }
    if (gate.pulse) {
      update(gate.pulse.openSeconds + .1 - (gate.pulse.offset ?? 0));
      assert.equal(gate.isOpen, false, 'all held runes still require an open pulse window');
    }
  });

  test(`trail ${level.id}: crossing the last gate while it closes permanently unlocks the exit`, t => {
    const { game, control, tick } = setup(t, index);
    game.checkpointIndex = level.plates.length;
    const gate = game.currentLevel.doors.at(-1)!;
    gate.openProgress = .4;
    const horizontal = gate.orientation === 'horizontal';
    const axis = horizontal ? 'y' : 'x';
    const across = horizontal ? 'x' : 'y';
    const depth = horizontal ? 'height' : 'width';
    const span = horizontal ? 'width' : 'height';
    const direction = Math.sign(level.exit[axis] + level.exit[depth] / 2 - gate[axis] - gate[depth] / 2);
    const edge = gate[axis] + (direction > 0 ? gate[depth] : 0);
    game.player[axis] = edge - direction;
    // Horizontal gates retract to the left; vertical gates retract to both ends.
    game.player[across] = gate[across] + gate[span] * (horizontal ? .8 : .5);
    control.heldKeys.add(horizontal ? (direction > 0 ? 'KeyS' : 'KeyW') : (direction > 0 ? 'KeyD' : 'KeyA'));
    tick();
    control.heldKeys.clear();
    assert.ok((game.player[axis] - edge) * direction > 0, 'the player physically crossed the gate');
    assert.equal(game.finalGateCrossed, true);
    game.player[axis] = edge + direction * 40;
    for (let i = 0; i < 8; i++) tick();
    assert.equal(gate.openProgress, 0, 'gate closes after the player leaves');
    game.player.x = level.exit.x + level.exit.width / 2;
    game.player.y = level.exit.y + level.exit.height / 2;
    for (let i = 0; i < 50 && game.screen === 'playing'; i++) tick();
    assert.equal(game.screen, 'victory', 'closed gates behind the player cannot relock the exit');
  });
}

test('standing on the exit side of a wall is not the same as crossing its final doorway', t => {
  const { game, tick } = setup(t, 3);
  game.checkpointIndex = game.currentLevel.plates.length;
  game.currentLevel.doors.at(-1)!.openProgress = 1;
  tick();
  assert.equal(game.finalGateCrossed, false, 'the north-east spawn is outside the north-west exit chamber');
  assert.equal(game.exitOpen, false);
});

test('a warded rune counts only after its linked guards die, even if the player is already on it', t => {
  const { game, tick } = setup(t, 8);
  game.enemies = createEnemies(game.currentLevel);
  const plate = game.currentLevel.plates[0];
  game.player.x = plate.x + plate.width / 2;
  game.player.y = plate.y + plate.height / 2;
  tick();
  assert.equal(plate.isPressed, false);
  assert.equal(game.checkpointIndex, 0);
  assert.equal(game.discoveredRunes.has(plate.id), false);
  game.enemies.filter(enemy => plate.wardEnemyIds?.includes(enemy.id)).forEach(enemy => { enemy.hp = 0; });
  tick();
  assert.equal(plate.isPressed, true);
  assert.equal(game.checkpointIndex, 1);
});

test('swapping through an open final doorway records the crossing before the next frame', t => {
  const { game, tick } = setup(t, 0);
  game.checkpointIndex = 1;
  const gate = game.currentLevel.doors[0];
  gate.openProgress = 1;
  game.recorder.startRecording(gate.x + gate.width + 40, gate.y + gate.height / 2, 'right');
  game.recorder.stopRecording(gate.x + gate.width + 40, gate.y + gate.height / 2, 'right', false);
  game.spawnEcho();
  game.player.x = gate.x - 40;
  game.player.y = gate.y + gate.height / 2;
  game.swapEcho();
  assert.equal(game.finalGateCrossed, true);
  tick();
  assert.equal(game.exitOpen, true);
});

for (const [index, level] of LEVELS.entries()) {
  test(`level ${level.id}: exit and hints agree on the remaining combat requirement`, t => {
    const { game, tick } = setup(t, index);
    game.enemies = createEnemies(game.currentLevel);
    game.checkpointIndex = level.plates.length;
    game.finalGateCrossed = true;
    game.tutorialEnabled = true;
    if (level.id === 6 || level.id === 13) {
      assert.equal(game.exitOpen, false, 'boss encounters cannot be skipped via the exit');
      return;
    }
    if (level.id === 7) {
      assert.equal(game.exitOpen, false);
      assert.equal(trailObjective(game)?.action, 'fight');
      game.enemies.forEach(enemy => { enemy.hp = 0; });
    } else {
      game.enemies.filter(enemy => level.plates.some(plate => plate.wardEnemyIds?.includes(enemy.id)))
        .forEach(enemy => { enemy.hp = 0; });
    }
    assert.equal(game.exitOpen, true, 'unrelated enemies must not lock a solved exit');
    assert.equal(trailObjective(game)?.action, 'exit');
    game.player.x = level.exit.x + level.exit.width / 2;
    game.player.y = level.exit.y + level.exit.height / 2;
    tick();
    assert.ok(game.exitTravelRemaining > 0, 'the actual portal accepts the same condition');
  });
}
