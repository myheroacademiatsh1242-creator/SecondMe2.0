import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HUNT_CARD, HUNT_CARDS, SnowHunt, enemyHaste, enemyHp, enemyPower, waveReward, waveSeconds, xpToNext } from './snowHunt.ts';
import { GameEngine } from '../GameEngine.ts';
import { HUNT_IDX } from './levels.ts';

function mockDocument(t: TestContext) {
  const doc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => doc ? Object.defineProperty(globalThis, 'document', doc) : Reflect.deleteProperty(globalThis, 'document'));
}

test('waves never end: each one is longer (to a cap) and pays more than the last', () => {
  assert.equal(waveSeconds(1), 30);
  assert.ok(waveSeconds(5) > waveSeconds(1));
  assert.equal(waveSeconds(20), 60);
  for (let w = 1; w < 10; w++) {
    assert.ok(waveReward(w + 1).tickets >= waveReward(w).tickets);
    assert.ok(waveReward(w + 1).coins > waveReward(w).coins);
  }
  const run = new SnowHunt();
  run.update(waveSeconds(1) + 0.01, 0, () => 0.5);
  assert.equal(run.wave, 2);
  run.choices = null;
  assert.equal(run.tickets, waveReward(1).tickets);
  assert.equal(run.coins, waveReward(1).coins);
  assert.equal(run.state, 'fighting');
});

test('kills drop XP always; tickets, coins, potions and shards by chance; elites and bosses drop more', () => {
  const run = new SnowHunt();
  run.onKill(100, 100, 'normal', () => 0.99);
  assert.deepEqual(run.pickups.map(p => p.kind), ['xp']);
  run.pickups = []; run.onKill(100, 100, 'normal', () => 0);
  assert.deepEqual(run.pickups.map(p => p.kind), ['xp', 'ticket', 'coin', 'hp', 'mp', 'maxHp', 'maxMp']);
  run.pickups = []; run.onKill(100, 100, 'elite', () => 0.99);
  assert.deepEqual(run.pickups.map(p => p.kind), ['xp', 'ticket', 'coin']);
  assert.equal(run.pickups[0].value, 8);
  run.pickups = []; run.onKill(100, 100, 'boss');
  assert.ok(run.pickups.some(p => p.kind === 'maxHp') && run.pickups.find(p => p.kind === 'ticket')!.value >= 20);
});

test('potions and wave clears heal a share of the maximum; a cleared wave offers 1 of 2 cards', () => {
  const run = new SnowHunt();
  run.pickups.push({ kind: 'hp', x: 0, y: 0, value: 1, age: 0 }, { kind: 'mp', x: 0, y: 0, value: 1, age: 0 }, { kind: 'maxHp', x: 0, y: 0, value: 10, age: 0 });
  run.collect([{ x: 0, y: 0, r: 5 }]);
  assert.deepEqual(run.takeEffects(), { heal: 0.2, mana: 0.4, maxHp: 10, maxMp: 0 });
  run.update(waveSeconds(1) + 0.01, 0, () => 0.5);
  assert.equal(run.offerKind, 'wave');
  assert.equal(run.choices?.length, 2);
  assert.deepEqual(run.takeEffects(), { heal: 0.25, mana: 0.5, maxHp: 0, maxMp: 0 });
});

test('every 10th wave brings a troll boss and holds until it falls; enemies grow tougher, harder-hitting and faster', () => {
  const run = new SnowHunt();
  for (let w = 1; w < 10; w++) { run.update(waveSeconds(w) + 0.01, 0, () => 0.5); run.choices = null; }
  assert.equal(run.wave, 10);
  const spawns = run.update(0.01, 0, () => 0.5);
  assert.ok(spawns.some(s => s.boss && s.kind === 'troll'));
  run.update(waveSeconds(10) + 5, 1, () => 0.5, true);
  assert.equal(run.wave, 10, 'the boss wave waits for the boss');
  run.update(0.01, 0, () => 0.5, false);
  assert.equal(run.wave, 11);
  assert.ok(enemyHp(10) > enemyHp(1) * 2 && enemyPower(10) > 1.4 && enemyHaste(10) > 1.2);
});

test('collecting XP levels up and offers three cards with a hero and an Echo card; choosing applies it', () => {
  const run = new SnowHunt();
  for (let i = 0; i < xpToNext(1); i++) run.onKill(50, 50, 'normal', () => 0.99);
  assert.equal(run.collect([{ x: 50, y: 50, r: 10 }]), true);
  assert.equal(run.level, 2);
  for (let i = 0; i < 30; i++) {
    const offer = run.rollChoices();
    assert.equal(new Set(offer).size, 3);
    assert.ok(offer.some(id => HUNT_CARD[id].side === 'hero'));
    assert.ok(offer.some(id => HUNT_CARD[id].side === 'echo'));
  }
  const pick = run.choices![0];
  assert.ok(run.choose(pick));
  assert.equal(run.stack(pick), 1);
  assert.equal(run.choices, null);
  assert.equal(run.choose('sharp'), null, 'only an offered card can be taken');
});

test('maxed cards stop appearing, and pickups out of reach stay on the ground', () => {
  const run = new SnowHunt();
  for (const c of HUNT_CARDS) if (c.id !== 'sharp' && c.id !== 'echoPower') run.stacks[c.id] = c.max;
  run.stacks.sharp = 4;
  assert.deepEqual(new Set(run.rollChoices()), new Set(['sharp', 'echoPower']));
  run.onKill(500, 500, 'normal', () => 0.99);
  run.collect([{ x: 0, y: 0, r: 10 }]);
  assert.equal(run.pickups.length, 1);
});

test('ending a run keeps every ticket and coin collected or still lying on the field', () => {
  const run = new SnowHunt();
  run.onKill(10, 10, 'elite', () => 0.9);
  run.finish();
  assert.equal(run.state, 'over');
  assert.equal(run.tickets, 4);
  assert.equal(run.coins, 5);
  assert.equal(run.update(5, 0).length, 0, 'nothing spawns after the end');
});

test('the engine runs a hunt in its arena: no clock, waves spawn, death banks the loot', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void; strike(target: unknown, n: number): boolean; onHealthZero(): void };
  assert.ok(game.hunt);
  assert.equal(game.legTimeRemaining, null);
  assert.equal(game.enemies.length, 0);
  for (let i = 0; i < 60; i++) internals.update(0.05);
  assert.ok(game.enemies.some(e => e.hp > 0 && e.seesAll), 'the first wave arrives and hunts the hero');
  const enemy = game.enemies.find(e => e.hp > 0)!;
  internals.strike(enemy, 9999);
  assert.equal(game.hunt!.kills, 1);
  const before = game.campaign.noelTickets;
  game.hunt!.pickups = []; game.hunt!.tickets = 7; game.hunt!.coins = 3;
  game.health = 0; internals.onHealthZero();
  assert.equal(game.hunt!.state, 'over');
  assert.equal(game.campaign.noelTickets, before + 7);
  assert.deepEqual(game.huntResult && { tickets: game.huntResult.tickets, coins: game.huntResult.coins }, { tickets: 7, coins: 3 });
});

test('Echo cards switch on their rune for the run, and Extra Shadow raises the Echo limit', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const limit = game.echoLimit;
  game.hunt!.choices = ['echoPower', 'echoSlot', 'sharp'];
  assert.ok(game.chooseHuntCard('echoPower'));
  assert.ok(game.activeEchoRunes.has('power'));
  game.hunt!.choices = ['echoSlot', 'sharp', 'tough'];
  assert.ok(game.chooseHuntCard('echoSlot'));
  assert.equal(game.echoLimit, limit + 1);
  game.goToLobby();
  assert.equal(game.hunt, null);
  assert.equal(game.echoLimit, limit);
});

test('in the hunt the hero attacks the nearest enemy in reach on its own', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void; cursorTarget: { x: number; y: number } | null };
  game.enemies.push({ id: 'hunt-test', kind: 'goblin', x: game.player.x + 80, y: game.player.y, homeX: 0, homeY: 0, hp: 50, maxHp: 50, mode: 'idle', timer: 5, targetX: 0, targetY: 0, facingLeft: false, hitFlash: 0, deathAge: 0, targetId: null, seesAll: true });
  internals.update(0.05);
  assert.ok(game.attackCooldown > 0, 'an attack fired with no input');
  assert.ok(internals.cursorTarget && Math.abs(internals.cursorTarget.x - (game.player.x + 80)) < 20, 'aimed at the enemy');
});

test('in the hunt basic attacks cost no MP, so auto-attack never drains it', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void };
  const mp = game.mana.value;
  game.enemies.push({ id: 'hunt-test', kind: 'goblin', x: game.player.x + 80, y: game.player.y, homeX: 0, homeY: 0, hp: 9999, maxHp: 9999, mode: 'idle', timer: 99, targetX: 0, targetY: 0, facingLeft: false, hitFlash: 0, deathAge: 0, targetId: null, seesAll: true });
  for (let i = 0; i < 60; i++) internals.update(0.05);
  assert.ok(game.mana.value >= mp);
});
