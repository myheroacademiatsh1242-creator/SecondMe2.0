import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { BIG_GEM, HUNT_COMBO_MP, HUNT_CARD, HUNT_CARDS, SnowHunt, enemyHaste, enemyHp, enemyPower, waveReward, waveSeconds, xpToNext } from './snowHunt.ts';
import { GameEngine } from '../GameEngine.ts';
import { HUNT_IDX } from './levels.ts';
import { comboManaCost } from './mana.ts';

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

test('potions and wave clears heal a share of the maximum; a cleared wave offers 1 of 3 cards', () => {
  const run = new SnowHunt();
  run.pickups.push({ kind: 'hp', x: 0, y: 0, value: 1, age: 0 }, { kind: 'mp', x: 0, y: 0, value: 1, age: 0 }, { kind: 'maxHp', x: 0, y: 0, value: 10, age: 0 });
  run.collect([{ x: 0, y: 0, r: 5 }]);
  assert.deepEqual(run.takeEffects(), { heal: 0.2, mana: 0.4, maxHp: 10, maxMp: 0 });
  run.update(waveSeconds(1) + 0.01, 0, () => 0.5);
  assert.equal(run.offerKind, 'wave');
  assert.equal(run.choices?.length, 3);
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

test('in the hunt auto-attack spends MP, yet the hero keeps attacking when it runs out', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void };
  const mp = game.mana.value;
  game.enemies.push({ id: 'hunt-test', kind: 'goblin', x: game.player.x + 80, y: game.player.y, homeX: 0, homeY: 0, hp: 9999, maxHp: 9999, mode: 'idle', timer: 99, targetX: 0, targetY: 0, facingLeft: false, hitFlash: 0, deathAge: 0, targetId: null, seesAll: true });
  for (let i = 0; i < 60; i++) internals.update(0.05);
  assert.ok(game.mana.value < mp, 'combo hits after the opener cost MP');
  const target = game.enemies.find(e => e.id === 'hunt-test')!;
  const hp = target.hp;
  for (let i = 0; i < 60; i++) { game.mana.value = 0; internals.update(0.05); }
  assert.ok(target.hp < hp, 'with no MP the free opening hit still lands');
});

test('the claw machine spends Noel tickets per play and banks each prize', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.campaign.noelTickets = 1; game.campaign.coins = 0;
  assert.equal(game.spendClawPlay(), true);
  assert.equal(game.campaign.noelTickets, 0);
  assert.equal(game.spendClawPlay(), false, 'not enough tickets: nothing spent');
  assert.equal(game.campaign.noelTickets, 0);
  const reward=game.campaign.claimClawPrize(0,()=>0)!;
  assert.deepEqual(reward,{type:'coins',quantity:10});
  assert.equal(game.campaign.coins,10);
  assert.deepEqual(game.campaign.claimClawPrize(1,()=>0),{type:'item',id:'manaSmall',quantity:1});
  assert.equal(game.campaign.supplies.manaSmall,1);
  assert.equal(game.claimClawPrize(7), null);
});

test('in dev mode the claw machine plays for free and shows unlimited tickets', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.campaign.noelTickets = 0;
  game.devUnlocked = true;
  assert.equal(game.spendClawPlay(), true);
  assert.equal(game.campaign.noelTickets, 0, 'no real tickets spent');
  assert.ok(game.clawTickets >= 9999);
  game.devUnlocked = false;
  assert.equal(game.spendClawPlay(), false);
});

test('pickups in reach fly to the hero and count only when they arrive; a lucky kill drops a bigger gem', () => {
  const run = new SnowHunt();
  run.onKill(100, 0, 'normal', () => BIG_GEM / 2);
  assert.equal(run.pickups.find(p => p.kind === 'xp')!.value, 3);
  run.pickups = [{ kind: 'xp', x: 100, y: 0, value: 1, age: 0 }, { kind: 'xp', x: 600, y: 0, value: 1, age: 0 }];
  // An Echo reaches the first gem; it flies to the hero rather than vanishing where the Echo stands.
  assert.deepEqual(run.attract([{ x: 100, y: 0, r: 20 }], { x: 0, y: 12 }, 0.01), []);
  assert.ok(run.pickups[0].homing && run.pickups[0].x < 100, 'it has started moving towards the hero');
  assert.ok(!run.pickups[1].homing, 'out of reach stays put');
  let arrived: ReturnType<SnowHunt['attract']> = [];
  for (let i = 0; i < 60 && !arrived.length; i++) arrived = run.attract([], { x: 0, y: 12 }, 0.05);
  assert.equal(arrived.length, 1);
  assert.equal(run.xp, 1);
  assert.equal(run.pickups.length, 1);
});

test('one reroll to start, one more per boss; each hero only sees its own cards', () => {
  const run = new SnowHunt('mage');
  run.choices = run.rollChoices(() => 0.3, 3);
  assert.ok(run.reroll());
  assert.equal(run.choices.length, 3);
  assert.equal(run.reroll(), false, 'the one reroll is spent');
  run.onKill(0, 0, 'boss');
  assert.equal(run.rerolls, 1);
  for (let i = 0; i < 40; i++) for (const id of run.rollChoices()) assert.ok(!HUNT_CARD[id].hero || HUNT_CARD[id].hero === 'mage', id);
  assert.ok(run.available(HUNT_CARD.iceShard) && !run.available(HUNT_CARD.waveSlash) && !run.available(HUNT_CARD.dartRain));
});

test('an evolution appears only once its cards are levelled, then is always on offer, and strengthens its weapon', () => {
  const run = new SnowHunt();
  assert.ok(!run.available(HUNT_CARD.blizzardEdge));
  run.stacks.blizzard = 1; run.stacks.sharp = 2;
  assert.ok(!run.available(HUNT_CARD.blizzardEdge));
  run.stacks.sharp = 3;
  for (let i = 0; i < 10; i++) assert.ok(run.rollChoices().includes('blizzardEdge'));
  const before = { every: run.blizzardEvery, damage: run.blizzardDamage };
  run.choices = ['blizzardEdge', 'tough', 'echoPower'];
  run.choose('blizzardEdge');
  assert.ok(run.blizzardEvery < before.every && run.blizzardDamage > before.damage);
  assert.ok(!run.rollChoices().includes('blizzardEdge'), 'taken once');
});

test('weapon cards grow each level: more snowballs, faster and more candy canes, bigger bells', () => {
  const run = new SnowHunt();
  assert.equal(run.snowballCount, 0);
  run.stacks.snowballs = 2; assert.equal(run.snowballCount, 2);
  run.stacks.snowballs = 3; run.stacks.snowGlobe = 1; assert.equal(run.snowballCount, 6);
  run.stacks.candy = 1; const slow = run.candyEvery; run.stacks.candy = 3;
  assert.ok(run.candyEvery < slow && run.candyCount === 2);
  run.stacks.bells = 1; const small = run.bellRadius; run.stacks.bells = 3; assert.ok(run.bellRadius > small);
});

test('in the arena, weapon cards hit enemies and arriving XP pops up and flashes the bar', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void };
  const run = game.hunt!;
  run.stacks.snowballs = 3;
  for (let i = 0; i < 80; i++) internals.update(0.05);
  game.enemies = game.enemies.slice(0, 1);
  const enemy = game.enemies[0];
  enemy.x = game.player.x + run.snowballRing; enemy.y = game.player.y;
  enemy.hp = enemy.maxHp = 9999;
  for (let i = 0; i < 40; i++) internals.update(0.05);
  assert.ok(enemy.hp < 9999, 'the circling snowballs struck the enemy');
  const pulse = game.huntXpPulse;
  run.pickups.push({ kind: 'xp', x: game.player.x + 30, y: game.player.y, value: 1, age: 0 });
  for (let i = 0; i < 20; i++) internals.update(0.05);
  assert.ok(game.huntXpPulse > pulse);
});

test('in the hunt, combo hits after the free opener cost half their MP; short of MP the combo starts over', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { startComboHit(step: number): void; mana: { value: number; max: number } };
  const hero = game.characterClass as 'swordsman' | 'mage' | 'assassin';
  const full = internals.mana.max;
  internals.startComboHit(0);
  assert.equal(internals.mana.value, full, 'the opening hit is free');
  internals.startComboHit(1);
  assert.equal(internals.mana.value, full - comboManaCost(hero, 1) * HUNT_COMBO_MP);
  internals.mana.value = 0;
  internals.startComboHit(2);
  assert.equal(internals.mana.value, 0, 'nothing is spent when MP is short');
  assert.equal(game.combo?.step ?? 0, 0, 'the combo is back at its free opener');
});

test('MP cards: Deep Mana raises max MP (and fills the new room), Mana Flow adds regeneration', t => {
  mockDocument(t);
  const game = new GameEngine();
  game.screen = 'playing';
  game.currentLevelIdx = HUNT_IDX;
  game.restartLevel();
  const internals = game as unknown as { update(dt: number): void };
  const max = game.mana.max;
  game.hunt!.choices = ['manaPool', 'sharp', 'echoPower'];
  assert.ok(game.chooseHuntCard('manaPool'));
  assert.equal(game.mana.max, max + 20);
  assert.equal(game.mana.value, max + 20);
  game.hunt!.choices = ['manaFlow', 'sharp', 'echoPower'];
  assert.ok(game.chooseHuntCard('manaFlow'));
  assert.equal(game.hunt!.manaRegen, 2);
  game.enemies = [];
  game.mana.value = 0;
  (game.mana as unknown as { delay: number }).delay = 99;   // hold the usual regeneration back
  internals.update(0.5);
  assert.ok(game.mana.value >= 1 - 1e-9, 'Mana Flow refills even while the usual regeneration waits');
});
