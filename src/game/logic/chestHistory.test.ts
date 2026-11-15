import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addChestHistory,
  calculateChestStats,
  clearChestHistory,
  loadChestHistory,
  saveChestHistory,
  getRewardTier,
  getRewardMeta,
  MAX_CHEST_HISTORY,
  type ChestHistoryItem,
} from './chestHistory.ts';

function mockLocalStorage() {
  let store: Record<string, string> = {};
  const mock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mock });
  return () => {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}

test('getRewardTier maps 5-star, 4-star, and 3-star correctly', () => {
  assert.equal(getRewardTier('coins100'), 'rare');
  assert.equal(getRewardTier('revive'), 'legendary');
  assert.equal(getRewardTier('healLarge'), 'epic');
  assert.equal(getRewardTier('time'), 'epic');
  assert.equal(getRewardTier('coins30'), 'rare');
  assert.equal(getRewardTier('healSmall'), 'rare');
  assert.equal(getRewardTier('coins15'), 'rare');
  assert.equal(getRewardTier('coins5'), 'rare');
});

test('getRewardMeta returns bilingual labels and icons', () => {
  const metaVi = getRewardMeta('coins100', true);
  assert.equal(metaVi.name, '100 Xu');
  assert.equal(metaVi.stars, 3);
  assert.equal(metaVi.tier, 'rare');

  const metaEn = getRewardMeta('revive', false);
  assert.equal(metaEn.name, 'Revival Scroll');
  assert.equal(metaEn.stars, 5);
});

test('chestHistory save, load, add, clear and cap', (t) => {
  const restore = mockLocalStorage();
  t.after(restore);

  clearChestHistory();
  assert.deepEqual(loadChestHistory(), []);

  // Add x1 pull
  const h1 = addChestHistory(['coins5'], 'royal');
  assert.equal(h1.length, 1);
  assert.equal(h1[0].rewardId, 'coins5');
  assert.equal(h1[0].kind, 'royal');

  // Add x10 pull
  const h2 = addChestHistory(
    ['coins15', 'healLarge', 'time', 'coins30', 'coins100', 'healSmall', 'coins5', 'coins5', 'coins15', 'revive'],
    'crystal'
  );
  assert.equal(h2.length, 11);
  // Verify persistence
  const reloaded = loadChestHistory();
  assert.equal(reloaded.length, 11);

  // Clear
  clearChestHistory();
  assert.deepEqual(loadChestHistory(), []);
});

test('calculateChestStats counts pity and rarity counts accurately', () => {
  const now = Date.now();
  // Items from newest to oldest:
  // [coins5, coins15, time, coins30, coins100, healSmall, revive]
  // The first fire item is revive at index 6, so pity is 6
  const history: ChestHistoryItem[] = [
    { id: '1', rewardId: 'coins5', kind: 'royal', timestamp: now + 6 },
    { id: '2', rewardId: 'coins15', kind: 'royal', timestamp: now + 5 },
    { id: '3', rewardId: 'time', kind: 'royal', timestamp: now + 4 },
    { id: '4', rewardId: 'coins30', kind: 'royal', timestamp: now + 3 },
    { id: '5', rewardId: 'coins100', kind: 'royal', timestamp: now + 2 }, // Common currency
    { id: '6', rewardId: 'healSmall', kind: 'royal', timestamp: now + 1 },
    { id: '7', rewardId: 'revive', kind: 'royal', timestamp: now }, // Fire (5★)
  ];

  const stats = calculateChestStats(history);
  assert.equal(stats.total, 7);
  assert.equal(stats.fireCount, 1); // revive
  assert.equal(stats.epicCount, 1); // time
  assert.equal(stats.rareCount, 5); // all coin rewards and healSmall
  assert.equal(stats.pityCount, 6); // 6 pulls since last fire item
});

test('calculateChestStats when no fire item has been pulled yet', () => {
  const history: ChestHistoryItem[] = [
    { id: '1', rewardId: 'coins5', kind: 'royal', timestamp: 1 },
    { id: '2', rewardId: 'coins15', kind: 'royal', timestamp: 2 },
    { id: '3', rewardId: 'time', kind: 'royal', timestamp: 3 },
  ];
  const stats = calculateChestStats(history);
  assert.equal(stats.pityCount, 3);
  assert.equal(stats.fireCount, 0);
});
