import { Backpack, Minus, Plus, X } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { ITEM_LOADOUT_LIMIT, SHOP_ITEMS, type ShopItemId } from '../game/logic/shopItems.ts';
import { ShopItemIcon } from './ShopItemIcon.tsx';

export function CampSupplyKit({ hud, onOpen }: { hud: HUDState; onOpen: () => void }) {
  if(!hud.completed.includes(2)&&!hud.devUnlocked)return null;
  const vi = hud.language === 'vi';
  return <div className="rest-kit">
    <div><span>{vi ? 'VẬT PHẨM MANG THEO' : 'COMBAT ITEMS'}</span><p>{hud.itemLoadout?.length ?? 0} / {ITEM_LOADOUT_LIMIT}</p></div>
    <button className="rest-prepare" onClick={onOpen}><Backpack size={18}/>{vi ? 'Chọn vật phẩm' : 'Equip items'}</button>
  </div>;
}

export function CombatItemSlots({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  if(!hud.completed.includes(2)&&!hud.devUnlocked)return null;
  const vi = hud.language === 'vi';
  return <section className="combat-items" aria-label={vi ? 'Vật phẩm mang theo' : 'Combat items'}>
    <h3>{vi ? 'VẬT PHẨM' : 'ITEMS'}</h3>
    <div className="combat-item-slots">
      {Array.from({ length: ITEM_LOADOUT_LIMIT }, (_, slot) => {
        const stack = hud.carriedItems?.[slot];
        const item = SHOP_ITEMS.find(item => item.id === stack?.id);
        const name = item ? (vi ? item.vi : item.en) : (vi ? 'Ô trống' : 'Empty slot');
        return <button key={slot} type="button" data-slot={slot + 1} aria-keyshortcuts={String(slot + 1)}
          aria-label={stack ? `${slot + 1} · ${name} ×${stack.count}` : `${slot + 1} · ${name}`}
          title={item ? `${name} · ${vi ? item.detailVi : item.detailEn}` : name}
          disabled={!engine?.canUseCarriedItem(slot)} onClick={() => engine?.useCarriedItem(slot)}>
          <kbd>{slot + 1}</kbd>
          {item ? <ShopItemIcon id={item.id}/> : <span aria-hidden="true">—</span>}
          {stack && <span className="combat-item-count" aria-hidden="true">×{stack.count}</span>}
        </button>;
      })}
    </div>
  </section>;
}

function PackedQuantity({ count, max, name, vi, onChange }: {
  count: number; max: number; name: string; vi: boolean; onChange: (count: number) => void;
}) {
  return <div className="pack-quantity" role="group" aria-label={vi ? `Số lượng ${name}` : `${name} quantity`}>
    <button type="button" disabled={count <= 1} aria-label={vi ? `Giảm số lượng ${name}` : `Decrease ${name} quantity`}
      onClick={() => onChange(count - 1)}><Minus size={13} aria-hidden="true"/></button>
    <output aria-live="polite">{count}</output>
    <button type="button" disabled={count >= max} aria-label={vi ? `Tăng số lượng ${name}` : `Increase ${name} quantity`}
      onClick={() => onChange(count + 1)}><Plus size={13} aria-hidden="true"/></button>
  </div>;
}

export function InventoryPack({ engine, hud, playing = false }: { engine: GameEngine | null; hud: HUDState; playing?: boolean }) {
  const vi = hud.language === 'vi';
  const selected = (playing ? hud.carriedItems : hud.itemLoadout) ?? [];
  const selectedCount = selected.filter(item => item !== null).length;
  return <div className="inventory-pack">
    <div className="inventory-pack-heading">
      <strong>{vi ? 'Vật phẩm mang theo' : 'Combat items'}</strong>
      <span aria-live="polite">{selectedCount} / {ITEM_LOADOUT_LIMIT}{vi ? ' loại' : ' types'}</span>
    </div>
    {playing ? selectedCount === 0 && <p>{vi ? 'Không còn vật phẩm mang theo.' : 'No combat items left.'}</p> : <>
      <div className="inventory-pack-slots">
        {Array.from({ length: ITEM_LOADOUT_LIMIT }, (_, index) => {
          const stack = selected[index];
          const item = SHOP_ITEMS.find(item => item.id === stack?.id);
          if (!stack || !item) return <div className="inventory-empty-slot" key={index}><kbd>{index + 1}</kbd><Backpack size={24} aria-hidden="true"/><span>{vi ? 'Chưa chọn vật phẩm' : 'Choose an item'}</span></div>;
          const name = vi ? item.vi : item.en;
          return <div className="inventory-packed-item" key={item.id}>
            <kbd>{index + 1}</kbd><ShopItemIcon id={item.id}/><span className="inventory-packed-name">{name}</span>
            <PackedQuantity count={stack.count} max={engine?.campaign.packableCount(item.id) ?? stack.count}
              name={name} vi={vi}
              onChange={count => engine?.setPackedCount(index, count)}/>
            <button className="inventory-remove-item" type="button" aria-label={vi ? `Bỏ ${name} khỏi ô ${index + 1}` : `Remove ${name} from slot ${index + 1}`} onClick={() => engine?.unpackItem(index)}><X size={12} aria-hidden="true"/></button>
          </div>;
        })}
      </div>
      <p>{vi ? 'Mỗi ô chứa một loại. Bấm − hoặc + để chỉnh số lượng.' : 'Each slot holds one item type. Use − or + to adjust its quantity.'}</p>
    </>}
  </div>;
}

export function InventorySupplies({ engine, hud, preparing = false }: { engine: GameEngine | null; hud: HUDState; preparing?: boolean }) {
  const vi = hud.language === 'vi';
  const playing = hud.screen === 'playing' && !preparing;
  const planning = hud.screen === 'lobby' || preparing;
  const selected = (playing ? hud.carriedItems : hud.itemLoadout) ?? [];
  const number = (value: number) => value.toLocaleString(vi ? 'vi-VN' : 'en-US');
  const stock = (id: ShopItemId) => id === 'time' ? hud.timeItems : id === 'ring' ? hud.limitRings : hud.supplies?.[id] ?? 0;
  const items = SHOP_ITEMS.filter(({id}) => playing ? selected.some(item => item?.id === id) : !preparing ||
    (id !== 'aid' || hud.aidUnlocked) && (stock(id) > 0 || id === 'chances' && (hud.chanceCharges ?? 0) > 0));
  const canUse = (id: ShopItemId) => id === 'time' ? engine?.canUseTimeItem() : id === 'ring' ? engine?.canUseLimitRing() : engine?.canUseSupply(id);
  const use = (id: ShopItemId) => id === 'time' ? engine?.useTimeItem() : id === 'ring' ? engine?.useLimitRing() : engine?.useSupply(id);

  return <>
    {!preparing && (planning || playing) && <InventoryPack engine={engine} hud={hud} playing={playing}/>}
    {items.map(item => {
      const id = item.id;
      const name = vi ? item.vi : item.en;
      const packed = selected.find(item => item?.id === id);
      const count = playing ? packed?.count ?? 0 : stock(id);
      return <article key={id} data-inventory-item={id}>
        <span className="supply-icon"><ShopItemIcon id={id}/></span>
        <div>
          <h3>{name} <b>× {number(count)}</b></h3>
          <p>{vi ? item.detailVi : item.detailEn}</p>
          {id === 'chances' && <small>{vi ? 'Lượt hồi sinh còn lại' : 'Remaining revival charges'} {hud.chanceCharges ?? 0}</small>}
        </div>
        {planning && <button type="button" disabled={!engine?.canPackItem(id)} aria-label={vi ? `Mang ${name}` : `Pack ${name}`} onClick={() => engine?.packItem(id)}>{packed ? '+1' : vi ? 'MANG THEO' : 'PACK'}</button>}
        {playing && id !== 'chances' && id !== 'revive' && <button type="button" disabled={!canUse(id)} aria-label={vi ? `Dùng ${name}` : `Use ${name}`} onClick={() => use(id)}>{vi ? 'DÙNG' : 'USE'}</button>}
      </article>;
    })}
  </>;
}
