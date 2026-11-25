/**
 * First-time help outside a match, replacing the long coach tracks for shop, chest, pack and runes:
 * the button of a feature the player has not met yet carries a glowing dot, and the panel shows
 * one line of explanation the first time it opens. Dismissing that line marks the feature seen
 * (both go away). Saved in the browser; never touches gameplay or currency.
 */
export type FeatureId = 'shop' | 'chest' | 'bag' | 'runes';

export const FEATURE_TIPS: Record<FeatureId, { vi: string; en: string }> = {
  shop: { vi: 'Đổi xu lấy vật phẩm và trang phục. Rương thưởng nằm ở tab Rương.', en: 'Spend coins on items and outfits. Reward chests are in the Chest tab.' },
  chest: { vi: 'Mỗi lượt mở tốn tinh thể. Bấm Xem tỉ lệ để biết xác suất trước khi mở.', en: 'Each draw costs crystals. Check the rates before you open one.' },
  bag: { vi: 'Chọn tối đa 3 loại vật phẩm mang vào trận, rồi dùng bằng phím 1–3.', en: 'Pick up to 3 item types to bring into battle, then use them with keys 1–3.' },
  runes: { vi: 'Lắp tối đa 4 ấn. Trong trận, bấm ấn ở thanh trái để kích hoạt (tốn 1 ấn).', en: 'Equip up to 4 runes. In battle, click a rune on the left rail to activate it (uses 1).' },
};

export const FEATURE_KEY = 'second-me-seen-features-v1';

export class FeatureIntro {
  private seen = new Set<FeatureId>();
  private listeners = new Set<() => void>();
  private version = 0;
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null =
    typeof localStorage === 'undefined' ? null : localStorage) {
    try {
      const saved = JSON.parse(storage?.getItem(FEATURE_KEY) ?? '[]');
      if (Array.isArray(saved)) for (const id of saved) if (Object.hasOwn(FEATURE_TIPS, id)) this.seen.add(id as FeatureId);
    } catch { /* Storage can be unavailable. */ }
  }
  isNew(id: FeatureId) { return !this.seen.has(id); }
  markSeen(id: FeatureId) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    try { this.storage?.setItem(FEATURE_KEY, JSON.stringify([...this.seen])); } catch { /* Storage can be unavailable. */ }
    this.version++;
    for (const listener of this.listeners) listener();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.version;
}

export const featureIntro = new FeatureIntro();
