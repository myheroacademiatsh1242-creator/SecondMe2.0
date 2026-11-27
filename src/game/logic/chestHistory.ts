import {SHOP_ITEMS} from './shopItems.ts';
import {normalizeRarity,rarityStars,type Rarity} from './rarity.ts';
import {chestReward, type ChestRewardId } from './chest.ts';
import type { ChestKind } from '../../components/ChestSprite.tsx';

export interface ChestHistoryItem {
  id: string;
  rewardId: ChestRewardId;
  kind: ChestKind;
  timestamp: number;
}

export interface ChestHistoryStats {
  total: number;
  fireCount: number;
  epicCount: number;
  rareCount: number;
  pityCount: number; // Number of draws since the most recent 5-star (fire tier)
}

export const CHEST_HISTORY_STORAGE_KEY = 'second-me-chest-history-v1';
export const MAX_CHEST_HISTORY = 500;

export function getRewardTier(id:ChestRewardId):Rarity{
 return normalizeRarity(SHOP_ITEMS.find(item=>item.id===id)?.rarity);
}

export interface RewardMeta {
  name: string;
  category: string;
  stars: number;
  tier: Rarity;
  amountText: string;
  iconType: 'coin' | 'time' | 'atlas' | 'manaSmall' | 'manaLarge' | 'commonCrystal';
  atlasIndex?: number;
}

function legacyRewardMeta(id: ChestRewardId, vi: boolean): RewardMeta {
  if(id.startsWith('coins')||id.startsWith('commonCrystals')){
    const crystal=id.startsWith('commonCrystals'),amount=id.slice(crystal?'commonCrystals'.length:5),item=chestReward(id);
    return {name:crystal?(vi?item.vi:item.en):(vi?amount+' Xu':amount+' Coins'),category:vi?'TIỀN TỆ · ĐẠI TRÀ':'CURRENCY · COMMON',stars:3,tier:'common',amountText:'+'+amount,iconType:crystal?'commonCrystal':'coin'};
  }
  switch (id) {
    case 'manaSmall': case 'manaLarge': return {name:id==='manaSmall'?(vi?'Lọ năng lượng nhỏ':'Small energy vial'):(vi?'Bình năng lượng lớn':'Large energy potion'),category:vi?'DƯỢC PHẨM':'POTION',stars:3,tier:'common',amountText:'×1',iconType:id};
    case 'coins100':
      return {
        name: vi ? '100 Xu' : '100 Coins',
        category: vi ? 'TIỀN TỆ · ĐẠI TRÀ' : 'CURRENCY · COMMON',
        stars: 3,
        tier: 'common',
        amountText: '+100',
        iconType: 'coin',
      };
    case 'revive':
      return {
        name: vi ? 'Trục Phục Sinh' : 'Revival Scroll',
        category: vi ? 'BẢO VẬT' : 'RELIC',
        stars: 5,
        tier: 'refined',
        amountText: '×1',
        iconType: 'atlas',
        atlasIndex: 2,
      };
    case 'healLarge':
      return {
        name: vi ? 'Bình HP Lớn' : 'Large HP Potion',
        category: vi ? 'DƯỢC PHẨM' : 'POTION',
        stars: 4,
        tier: 'common',
        amountText: '×1',
        iconType: 'atlas',
        atlasIndex: 1,
      };
    case 'time':
      return {
        name: vi ? 'Bình Thời Gian' : 'Time Potion',
        category: vi ? 'MA THUẬT' : 'CHRONO',
        stars: 4,
        tier: 'common',
        amountText: '×1',
        iconType: 'time',
      };
    case 'coins30':
      return {
        name: vi ? '30 Xu' : '30 Coins',
        category: vi ? 'TIỀN TỆ · ĐẠI TRÀ' : 'CURRENCY · COMMON',
        stars: 3,
        tier: 'common',
        amountText: '+30',
        iconType: 'coin',
      };
    case 'healSmall':
      return {
        name: vi ? 'Bình HP Nhỏ' : 'Small HP Potion',
        category: vi ? 'DƯỢC PHẨM' : 'POTION',
        stars: 3,
        tier: 'common',
        amountText: '×1',
        iconType: 'atlas',
        atlasIndex: 0,
      };
    case 'coins15':
      return {
        name: vi ? '15 Xu' : '15 Coins',
        category: vi ? 'TIỀN TỆ · ĐẠI TRÀ' : 'CURRENCY · COMMON',
        stars: 3,
        tier: 'common',
        amountText: '+15',
        iconType: 'coin',
      };
    case 'coins5':
    default:
      return {
        name: vi ? '5 Xu' : '5 Coins',
        category: vi ? 'TIỀN TỆ · ĐẠI TRÀ' : 'CURRENCY · COMMON',
        stars: 3,
        tier: 'common',
        amountText: '+5',
        iconType: 'coin',
      };
  }
}

export function loadChestHistory(): ChestHistoryItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CHEST_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChestHistoryItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.rewardId === 'string' &&
        typeof item.kind === 'string' &&
        typeof item.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

export function saveChestHistory(items: ChestHistoryItem[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CHEST_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_CHEST_HISTORY)));
  } catch {
    // Storage unavailable or quota exceeded
  }
}

export function addChestHistory(rewards: ChestRewardId[], kind: ChestKind): ChestHistoryItem[] {
  const current = loadChestHistory();
  const now = Date.now();
  // Newest pulls first
  const newEntries: ChestHistoryItem[] = rewards.map((rewardId, idx) => ({
    id: `${now}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    rewardId,
    kind,
    timestamp: now + idx,
  }));
  const updated = [...newEntries, ...current].slice(0, MAX_CHEST_HISTORY);
  saveChestHistory(updated);
  return updated;
}

export function getRewardMeta(id:ChestRewardId,vi:boolean):RewardMeta{
 const meta=legacyRewardMeta(id,vi),tier=getRewardTier(id);
 return {...meta,tier,stars:rarityStars(tier)};
}

export function clearChestHistory(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CHEST_HISTORY_STORAGE_KEY);
    }
  } catch {}
}

export function calculateChestStats(history: ChestHistoryItem[]): ChestHistoryStats {
  let fireCount = 0;
  let epicCount = 0;
  let rareCount = 0;
  let pityCount = 0;
  let foundFire = false;

  for (let i = 0; i < history.length; i++) {
    const tier = getRewardTier(history[i].rewardId);
    if (tier === 'refined') {
      fireCount++;
      if (!foundFire) {
        foundFire = true;
      }
    } else if (tier === 'deluxe') {
      epicCount++;
    } else {
      rareCount++;
    }

    if (!foundFire) {
      pityCount++;
    }
  }

  return {
    total: history.length,
    fireCount,
    epicCount,
    rareCount,
    pityCount,
  };
}
