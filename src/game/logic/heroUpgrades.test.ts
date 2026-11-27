import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from './campaign.ts';
import { cleanHeroRanks, HERO_MAX_RANK, HERO_UPGRADE_PRICES, heroStats } from './heroUpgrades.ts';
import { encounterBalance } from './balance.ts';
import { ICE_MAGIC } from './iceMagic.ts';
import { GameEngine } from '../GameEngine.ts';
import { sounds } from './sound.ts';

test('replays award coins and upgrades charge each rank once per hero, including after reload', t => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new Map([['second-me-campaign-v3', JSON.stringify({ coins: 44, completed: [1], heroRanks: { swordsman: 2 } })]]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value) },
  });
  t.after(() => old ? Object.defineProperty(globalThis, 'localStorage', old) : Reflect.deleteProperty(globalThis, 'localStorage'));

  const campaign = new Campaign();
  campaign.load();
  assert.deepEqual(campaign.heroRanks, { mage: { health: 0, attack: 0, specialty: 0 }, swordsman: { health: 2, attack: 2, specialty: 2 }, assassin: { health: 0, attack: 0, specialty: 0 } });
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 0), false);
  assert.equal(campaign.completeLevel(1, 100).coins, 4);
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 0), true);
  assert.equal(campaign.coins, 0);
  assert.equal(campaign.completeLevel(1, 10).coins, 12);
  campaign.coins += 300;
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 0), false);
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 1), true);
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 2), true);
  assert.equal(campaign.buyHeroUpgrade('mage', 'health', 3), false);
  assert.equal(campaign.buyHeroUpgrade('mechanical', 'health', 0), false);
  assert.equal(campaign.coins, 72);

  const restored = new Campaign();
  restored.load();
  assert.deepEqual(restored.heroRanks, { mage: { health: 3, attack: 0, specialty: 0 }, swordsman: { health: 2, attack: 2, specialty: 2 }, assassin: { health: 0, attack: 0, specialty: 0 } });
  assert.equal(restored.coins, 72);
  assert.deepEqual(restored.completed, [1]);
  assert.deepEqual(restored.heroUpgradeSpent, { mage: 288, swordsman: 138, assassin: 0 });
  assert.equal(restored.resetHeroUpgrades('swordsman', 137), false);
  assert.equal(restored.resetHeroUpgrades('swordsman', 138), true);
  assert.equal(restored.coins, 182);
  assert.equal(restored.resetHeroUpgrades('swordsman', 138), false);
  assert.deepEqual(restored.heroRanks.swordsman, { health: 0, attack: 0, specialty: 0 });
  assert.equal(restored.heroRanks.mage.health, 3);
  const afterReset = new Campaign();
  afterReset.load();
  assert.equal(afterReset.coins, 182);
  assert.equal(afterReset.heroUpgradeSpent.swordsman, 0);
  restored.reset();
  assert.deepEqual(restored.heroRanks, { mage: { health: 0, attack: 0, specialty: 0 }, swordsman: { health: 0, attack: 0, specialty: 0 }, assassin: { health: 0, attack: 0, specialty: 0 } });
});

test('upgrades affect hero health, attacks, skill MP and revival', t => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => old ? Object.defineProperty(globalThis, 'document', old) : Reflect.deleteProperty(globalThis, 'document'));
  sounds.setMuted(true);
  const game = new GameEngine();
  game.campaign.coins = 480;
  game.currentLevelIdx = 1;
  game.restartLevel();
  assert.equal(game.buyHeroUpgrade('mage', 'health', 0), false);
  assert.equal(game.resetHeroUpgrades('mage', 48), false);
  game.goToLobby();
  assert.equal(game.buyHeroUpgrade('swordsman', 'health', 0), false);
  game.openCharacters();
  assert.equal(game.buyHeroUpgrade('swordsman', 'health', 0), true);
  assert.equal(game.characterClass, 'mage');
  assert.equal(game.buyHeroUpgrade('mage', 'health', 0), true);
  assert.deepEqual(heroStats('mage', game.campaign.heroRanks), { maxHealth: 92, attackBonus: 0, damageReduction: 0, skillManaDiscount: 0, iceRadiusBonus: 0, sanctuaryBonus: 0, assassinCritBonus: 0, assassinSkillCooldownDiscount: 0, assassinDartMana: 8, assassinTwinFinisher: false, defeatsEarlyEnemies: false });
  assert.equal(game.buyHeroUpgrade('mage', 'attack', 0), true);
  assert.equal(game.buyHeroUpgrade('mage', 'specialty', 0), true);
  game.restartLevel();
  assert.equal(game.health, 92);
  const enemy = game.enemies[0];
  game['strike'](enemy, 25);
  assert.equal(enemy.maxHp - enemy.hp, 27);
  game['strike'](enemy, 25, false, {x: enemy.x, y: enemy.y});
  assert.equal(enemy.maxHp - enemy.hp, 52);
  game.useSkill(enemy);
  assert.equal(game.mana.value, 97);

  game.goToLobby();
  game.openCharacters();
  game.selectClass('swordsman');
  assert.equal(game.buyHeroUpgrade('swordsman', 'specialty', 0), true);
  game.campaign.supplies.chances = 1;
  assert.ok(game.campaign.packItem('chances'));
  game.restartLevel();
  const stats = heroStats('swordsman', game.campaign.heroRanks);
  assert.equal(game.health, 127);
  game['takeDamage'](25);
  assert.equal(game.health, stats.maxHealth - 25 * (1 - stats.damageReduction / 100));
  game.invulnerability = 0;
  game['takeDamage'](1000);
  assert.equal(game.health, stats.maxHealth);
  game.restartLevel();
  game['takeDamage'](1000);
  assert.equal(game.health, stats.maxHealth - 10);
  game.goToLobby();
  assert.equal(game.resetHeroUpgrades('mage', 143), false);
  assert.equal(game.resetHeroUpgrades('swordsman', 96), true);
  assert.equal(game.campaign.coins, 316);
  game.restartLevel();
  assert.equal(game.health, 115);
});

test('all ten ranks are purchasable in order and improve their own stats', () => {
  const campaign = new Campaign();
  campaign.coins = HERO_UPGRADE_PRICES.reduce((sum, price) => sum + price, 0);
  for (let rank = 0; rank < HERO_MAX_RANK; rank++) {
    const previous = heroStats('mage', campaign.heroRanks);
    assert.ok(campaign.buyHeroUpgrade('mage', 'attack', rank));
    const next = heroStats('mage', campaign.heroRanks);
    assert.ok(next.attackBonus > previous.attackBonus);
    assert.equal(next.maxHealth, previous.maxHealth);
    assert.equal(next.skillManaDiscount, previous.skillManaDiscount);
  }
  assert.equal(campaign.coins, 0);
  assert.equal(campaign.buyHeroUpgrade('mage', 'attack', HERO_MAX_RANK), false);
  assert.ok(heroStats('mage', campaign.heroRanks).defeatsEarlyEnemies);
  for (const tier of ['mage', 'swordsman'] as const) {
    for (let rank = 1; rank <= HERO_MAX_RANK; rank++) {
      const previous = heroStats(tier, cleanHeroRanks({[tier]: rank - 1}));
      const next = heroStats(tier, cleanHeroRanks({[tier]: rank}));
      assert.ok(next.maxHealth > previous.maxHealth);
      if (tier === 'mage') assert.ok(next.skillManaDiscount > previous.skillManaDiscount);
      else assert.ok(next.damageReduction > previous.damageReduction);
    }
  }
});

test('rank ten one-shots both level two enemy types with the opening attack, while higher levels survive', t => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => old ? Object.defineProperty(globalThis, 'document', old) : Reflect.deleteProperty(globalThis, 'document'));
  const game = new GameEngine();
  game.tutorialEnabled = false;
  for (const hero of ['mage', 'swordsman'] as const) {
    game.characterClass = hero;
    for (const [level, rank, kills] of [[2, 9, false], [2, 10, true], [3, 10, false]] as const) {
      game.campaign.heroRanks[hero].attack = rank;
      game.currentLevelIdx = level - 1;
      game.restartLevel();
      game.currentLevel.walls = [];
      game.currentLevel.doors = [];
      for (const enemy of game.enemies) {
        game.player.x = enemy.x - 48;
        game.player.y = enemy.y + 18;
        game.combo?.cancel();
        game.attack(enemy);
        for (let tick = 0; tick < 45; tick++) game['updateCombo'](1 / 120);
        assert.ok(enemy.hp < enemy.maxHp, `${hero} hit ${enemy.kind}`);
        assert.equal(enemy.hp === 0, kills, `${hero} rank ${rank} vs ${enemy.kind} at level ${level}`);
      }
    }
  }
});

test('defensive milestones modify the real skills and encounter scaling grows every level', t => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { dataset: {} } } });
  t.after(() => old ? Object.defineProperty(globalThis, 'document', old) : Reflect.deleteProperty(globalThis, 'document'));
  const game = new GameEngine();
  game.currentLevelIdx = 1;
  for (const [rank, radius, duration] of [[5, 15, 7], [10, 30, 9]] as const) {
    game.campaign.heroRanks = cleanHeroRanks({ mage: { specialty: rank }, swordsman: { specialty: rank } });
    game.characterClass = 'mage';
    game.restartLevel();
    game.useSkill();
    assert.equal(game.frostZones[0]?.radius, ICE_MAGIC.RADIUS + radius);
    game.characterClass = 'swordsman';
    game.restartLevel();
    game.useSkill();
    assert.equal(game.lightCircle?.life, duration);
  }
  const campaign = new Campaign();
  for (let level = 2; level <= 13; level++) {
    assert.ok(encounterBalance(level).health > encounterBalance(level - 1).health);
    assert.ok(encounterBalance(level).damage > encounterBalance(level - 1).damage);
    assert.ok(campaign.completeLevel(level, 0).coins > campaign.completeLevel(level - 1, 0).coins);
  }
});

test("Crimson's specialty: 2% crit per rank, richer dart pickups at rank 5 and a twin finisher at rank 10", () => {
  const at = (rank: number) => heroStats('assassin', cleanHeroRanks({ assassin: { specialty: rank } }));
  assert.equal(at(3).assassinCritBonus, .06);
  assert.equal(at(4).assassinDartMana, 8);
  assert.equal(at(5).assassinDartMana, 12);
  assert.equal(at(9).assassinTwinFinisher, false);
  assert.equal(at(10).assassinTwinFinisher, true);
  assert.equal(heroStats('swordsman', cleanHeroRanks({ swordsman: { specialty: 10 } })).damageReduction, 30);
});
