import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../GameEngine.ts';
import { LEVELS } from './levels.ts';
import { currentKeyPrompt } from './keyPrompts.ts';
import { PracticeProgress, practiceTask } from './practiceGround.ts';
import { levelMechanicTopics } from './tutorials.ts';
import { createEnemies } from './enemies.ts';

/** The engine sets document.body.dataset.state when a level starts; give it a stub. */
function mockDocument(t: TestContext) {
  const doc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => doc ? Object.defineProperty(globalThis, 'document', doc) : Reflect.deleteProperty(globalThis, 'document'));
}
type Internals = { update(dt: number): void; heldKeys: Set<string>; takeDamage(n: number): void };

function practiceEngine(t: TestContext) {
  mockDocument(t);
  const game = new GameEngine();
  game.tutorialEnabled = true;
  game.restartLevel();
  game.screen = 'playing';
  return { game, internals: game as unknown as Internals };
}

test('each station prompts its first unfinished task, then "keep going", and the Echo station hands over to the objective', () => {
  const p = new PracticeProgress();
  assert.equal(practiceTask(200, p), 'move');
  p.moved = 200;
  assert.equal(practiceTask(200, p), 'next');
  assert.equal(practiceTask(450, p), 'attack');
  p.attack = 4;
  assert.equal(practiceTask(450, p), 'skill');
  p.skill = 1;
  assert.equal(practiceTask(450, p), 'next');
  assert.equal(practiceTask(700, p), 'dodge');
  assert.equal(practiceTask(900, p), null);
});

test('the practice ground has no clock and never kills, and counts real moves, attacks, skills and dashes', t => {
  const { game, internals } = practiceEngine(t);
  assert.equal(game.isPracticeGround, true);
  assert.equal(game.legTimeRemaining, null);
  internals.takeDamage(9999);
  assert.ok(game.health >= 1);
  assert.equal(game.screen, 'playing');

  internals.heldKeys.add('KeyD');
  for (let i = 0; i < 20; i++) internals.update(0.05);
  internals.heldKeys.clear();
  assert.ok(game.practice.moved >= 150);

  const before = game.practice.attack;
  game.attack({ x: game.player.x + 100, y: game.player.y });
  internals.update(0.01);
  assert.equal(game.practice.attack, before + 1);
  game.dodge();
  internals.update(0.01);
  assert.equal(game.practice.dodge, 1);
});

test('the prompt by the hero follows the station, uses the bound key, and is off without hints', t => {
  const { game } = practiceEngine(t);
  game.player.x = 200;
  assert.deepEqual(currentKeyPrompt(game)?.action, 'move');
  game.practice.moved = 999;
  game.player.x = 450;
  assert.equal(currentKeyPrompt(game)?.action, 'attack');
  game.player.x = 925; game.player.y = 360;
  assert.equal(currentKeyPrompt(game)?.action, 'record');
  game.setShowHints(false);
  assert.equal(currentKeyPrompt(game), null);
});

test('level 1 with tutorials off stays a timed trial', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.restartLevel();
  assert.equal(game.isPracticeGround, false);
  assert.ok(game.legTimeRemaining! > 0);
});

test('each level lists the mechanics it brings, so the New card introduces each one where it first appears', () => {
  const topics = LEVELS.slice(0, 5).map(level => levelMechanicTopics(level, createEnemies(level).some(e => e.kind !== 'dummy')));
  assert.ok(!topics[0].includes('enemies'));
  assert.ok(topics[1].includes('enemies'));
  assert.ok(topics[1].includes('spikes'));
  assert.ok(topics[2].includes('multi'));
  assert.ok(topics[4].includes('release'));
});

test('entering a level offers its unseen mechanics once; seen ones are not repeated', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.tutorialEnabled = true;
  game.currentLevelIdx = 1;
  game.restartLevel();
  assert.ok(game.guides.active !== null);
  const first = game.guides.active!;
  game.guides.dismiss();
  game.restartLevel();
  assert.notEqual(game.guides.active, first);
});
