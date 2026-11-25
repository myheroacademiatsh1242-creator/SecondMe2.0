import {CURRENCY_RARITY} from '../game/logic/chest.ts';
import {rarityName} from '../game/logic/rarity.ts';
import {ChestCurrencyIcon} from './ChestCurrencyIcon.tsx';
import {PANEL_ART,usePanelArt} from './panelArt.ts';

import {InventoryPack, InventorySupplies} from './InventorySupplies.tsx';
import {useDialogClose} from './useDialogClose.ts';
import {useEffect,useRef,useState} from 'react';
import {Backpack,ArrowRight,ShieldCheck} from 'lucide-react';
import {ChestKeyIcon} from './ChestKeyIcon.tsx';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {ECHO_RUNES} from '../game/logic/echoRunes.ts';
import {RUNE_SHORT,RuneLoadoutEditor,RuneStone} from './EchoRunes.tsx';
import {ChristmasPanelTrim,useChristmas} from './ChristmasEvent.tsx';
import './TrailInventory.css';
import './ForestInventory.css';
import { FirstTip } from './FeatureIntro.tsx';
export function TrailInventory({engine,hud,close:onClose,preparing=false}:{engine:GameEngine|null;hud:HUDState;close:()=>void;preparing?:boolean}){
 const winter = useChristmas(engine?.devSeasonPreview).active && !preparing;
 const panelArt=usePanelArt(PANEL_ART.material);
 const {closing,close}=useDialogClose(onClose);
 const vi=hud.language==='vi',[inspect,setInspect]=useState(0),[editing,setEditing]=useState(false),[section,setSection]=useState<'supplies'|'runes'>('supplies'),root=useRef<HTMLDivElement>(null),closeRef=useRef(close);closeRef.current=close;
 const ids=hud.runeLoadout??[],rune=ECHO_RUNES.find(r=>r.id===ids[inspect]);
 const equippedEffects=[...new Set(ids.slice(0,4))].flatMap(id=>{
  const equipped=ECHO_RUNES.find(r=>r.id===id);
  return equipped?[equipped]:[];
 });
 const spent=!!hud.spentRuneSlots?.includes(inspect),active=spent&&rune&&hud.activeEchoRunes?.includes(rune.id);
 const playing=hud.screen==='playing',editingAllowed=hud.screen==='lobby';
 const number=(n:number)=>n.toLocaleString(vi?'vi-VN':'en-US');
 useEffect(()=>{
  if(!preparing)engine?.markLootSeen('items');
  engine?.setInventoryOpen(true);const before=document.activeElement as HTMLElement|null;
  const key=(e:KeyboardEvent)=>{if(document.querySelector('.rune-loadout-editor'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRef.current();}else if(e.key==='Tab'){
   const controls=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')??[]).filter(control=>control.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }};
  const requestClose=()=>closeRef.current();document.addEventListener('close-trail-inventory',requestClose);
  window.addEventListener('keydown',key,true);return()=>{document.removeEventListener('close-trail-inventory',requestClose);engine?.setInventoryOpen(false);window.removeEventListener('keydown',key,true);if(before?.isConnected)before.focus();};
 },[engine,preparing]);
 useEffect(()=>{
  if(panelArt==='loading')return;
  const first = preparing ? '.inventory-done:not(:disabled), [data-inventory-item] button:not(:disabled)' : '.inventory-close';
  (root.current?.querySelector<HTMLButtonElement>(first) ?? root.current?.querySelector<HTMLButtonElement>('.inventory-cancel'))?.focus({preventScroll:true});
 },[panelArt,preparing]);
 const emptyStock = preparing && !engine?.campaign.hasPackableItems();
 const readyToStart = preparing && !!engine?.canConfirmBattleStart();
 const enteringEmpty = preparing && !hud.itemLoadout?.length;
 const showSection = (next: 'supplies'|'runes') => {
  setSection(next);
  if(next==='runes')engine?.markLootSeen('runes');
  root.current?.querySelector('.inventory-scroll')?.scrollTo(0, 0);
 };
 return <div className={`trail-inventory${winter?' christmas-inventory':''}${closing?' is-leaving':''}`} ref={root} data-panel-art={panelArt} data-lobby-dialog role="dialog" aria-modal="true" aria-labelledby="inventory-heading">
  {winter&&<ChristmasPanelTrim still={hud.reducedMotion}/>}
  {editingAllowed&&editing&&<RuneLoadoutEditor engine={engine} hud={hud} close={()=>setEditing(false)}/>}
  <header className="inventory-heading"><span className="inventory-emblem"><Backpack size={25}/></span><div><h2 id="inventory-heading">{preparing?(vi?'CHỌN VẬT PHẨM VÀO TRẬN':'PACK ITEMS FOR BATTLE'):(vi?'KHO ĐỒ':'INVENTORY')}</h2></div>{!preparing&&<><div className="inventory-wallet"><img src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`} alt=""/><b>{number(hud.coins)}</b><small>{vi?'XU':'COINS'}</small></div><button type="button" className="inventory-close" aria-label={vi?'Đóng kho đồ':'Close inventory'} onClick={close}>×</button></>}</header>
  {!preparing&&<FirstTip feature="bag" vi={vi}/>}
  <p className="inventory-subtitle">{preparing
   ? (emptyStock ? (vi?'Kho trống. Bạn có thể vào màn tay không.':'Your bag is empty. You can enter without items.') : (vi?'Mang tối đa 3 loại, tổng cộng 9 món. Bạn cũng có thể vào tay không.':'Pack up to 3 types and 9 items total, or enter empty-handed.'))
   : (playing ? (vi?'Trận đấu tạm dừng khi mở túi.':'Combat is paused while the bag is open.') : '')}</p>
  {!preparing&&<div className="inventory-pane-switch" role="group" aria-label={vi?'Mục kho đồ':'Inventory sections'}>
   <button type="button" aria-pressed={section==='supplies'} onClick={()=>showSection('supplies')}>{vi?'Vật phẩm':'Supplies'}</button>
   <button type="button" aria-pressed={section==='runes'} onClick={()=>showSection('runes')}>{vi?'Ấn Echo':'Echo runes'}{hud.newRunes&&<span className="new-dot" aria-hidden="true"/>}</button>
  </div>}
  <div className="inventory-scroll" data-inventory-pane={preparing?undefined:section}><section className="inventory-supply-column">
   {preparing && <InventoryPack engine={engine} hud={hud}/>}
   <h3 className="inventory-section-title">{vi?'VẬT PHẨM HỖ TRỢ':'TRAIL SUPPLIES'}</h3>
   <div className="inventory-supplies">{emptyStock&&<div className="preparation-empty-stock"><Backpack size={40} aria-hidden="true"/><h3>{vi?'Hành trang đang trống':'Your bag is empty'}</h3><p>{vi?'Ghé cửa hàng Tanuki để chuẩn bị vật phẩm cho chặng tiếp theo.':'Visit Tanuki’s shop to stock up for the next trail.'}</p></div>}<InventorySupplies engine={engine} hud={hud} preparing={preparing}/>{!playing&&!preparing&&<>{hud.chestKeys>0&&<article><span className="supply-icon"><ChestKeyIcon size={40}/></span><div><h3>{vi?'Tanuki phàm tinh thể':'Tanuki Common Crystal'} <b>× {number(hud.chestKeys)}</b></h3><p>{rarityName(CURRENCY_RARITY.commonCrystals,vi)} · {vi?'Mở rương Hoàng Phẩm · 5 tinh thể mỗi lượt':'Royal chest · 5 crystals per draw'}</p></div></article>}
    {hud.whiteCrystals>0&&<article><span className="supply-icon"><ChestCurrencyIcon currency="whiteCrystals" size={40}/></span><div><h3>{vi?'Tanuki thanh tinh thể':'Tanuki Azure Crystal'} <b>× {number(hud.whiteCrystals)}</b></h3><p>{rarityName(CURRENCY_RARITY.whiteCrystals,vi)} · {vi?'Chỉ mở rương Đế Phẩm · 5 viên mỗi lượt · Chưa có nguồn nhận trong game':'Imperial chest only · 5 per draw · Not obtainable in gameplay yet'}</p></div></article>}
    {hud.mysticCrystals>0&&<article><span className="supply-icon"><ChestCurrencyIcon currency="mysticCrystals" size={40}/></span><div><h3>{vi?'Tanuki huyền tinh thể':'Tanuki Mystic Crystal'} <b>× {number(hud.mysticCrystals)}</b></h3><p>{rarityName(CURRENCY_RARITY.mysticCrystals,vi)} · {vi?'Chỉ mở rương Chân Phẩm Vô Song · 5 viên mỗi lượt · Chưa có nguồn nhận trong game':'Peerless chest only · 5 per draw · Not obtainable in gameplay yet'}</p></div></article>}
    </>}
   </div>
   </section>{!preparing&&<section className="inventory-rune-column"><div className="inventory-runes-title"><h3 className="inventory-section-title">{vi?'4 Ô RUNE ĐÃ CHỌN':'FOUR SELECTED RUNES'}</h3>{editingAllowed&&<button onClick={()=>setEditing(true)}>{vi?'ĐỔI RUNE':'CHANGE RUNES'}<ArrowRight size={12}/>{hud.newRunes&&<span className="new-dot" aria-hidden="true"/>}</button>}</div>
   <div className="inventory-rune-content"><div className="inventory-rune-slots">{Array.from({length:4},(_,i)=>{const r=ECHO_RUNES.find(r=>r.id===ids[i]);return <button key={i} className={inspect===i?'inspecting':''} aria-pressed={inspect===i} aria-label={r?(vi?r.vi:r.en):(vi?`Ô trống ${i+1}`:`Empty slot ${i+1}`)} onClick={()=>{setInspect(i);if(r)engine?.onboarding.event('rune-inspect');if(!r&&editingAllowed)setEditing(true);}}><small>{i+1}</small>{r?<span style={{color:r.color}}><RuneStone id={r.id}/></span>:<span className="inventory-empty">◇</span>}<strong title={r?(vi?r.vi:r.en):undefined}>{r?(vi?r.vi:({power:'Amplify',restore:'Restore',guard:'Endure'} as Record<string,string>)[r.id]??r.en):(vi?'Ô trống':'Empty')}</strong>{r&&!editingAllowed&&hud.spentRuneSlots?.includes(i)&&<em>{vi?'Đã dùng':'Spent'}</em>}</button>;})}</div>
   <section className="inventory-rune-description" aria-live="polite">{rune?<><div><span>{active?(vi?'ĐANG HIỆU LỰC':'ACTIVE THIS ATTEMPT'):spent?(vi?'ĐÃ DÙNG':'SPENT'):(vi?'ẤN NÂNG ECHO':'ECHO UPGRADE RUNE')}</span><h3>{vi?rune.vi:rune.en}</h3><p>{vi?rune.detailVi:rune.detailEn}</p></div>{playing&&<button disabled={!engine?.canUseEchoRune(rune.id,inspect)} onClick={()=>engine?.useEchoRune(rune.id,inspect)}>{active?(vi?'ĐANG DÙNG':'ACTIVE'):spent?(vi?'ĐÃ DÙNG':'SPENT'):(vi?'DÙNG ẤN':'USE RUNE')}</button>}</>:<div><h3>{vi?'Sẵn sàng cho một tiếng vọng mới':'Room for a new Echo'}</h3><p>{editingAllowed?(vi?'Chọn Đổi rune để sắp xếp 4 ô mang theo.':'Choose Change runes to arrange your four slots.'):(vi?'Đổi ấn tại trại nghỉ trước khi vào trận.':'Change runes at camp before entering battle.')}</p></div>}</section>
   <section className="inventory-rune-overview" aria-labelledby="inventory-rune-overview-title" aria-live="polite">
    <h3 id="inventory-rune-overview-title">{vi?'TỔNG QUAN BỘ RUNE':'RUNE LOADOUT OVERVIEW'}</h3>
    {equippedEffects.length>0?<><dl>{equippedEffects.map(effect=>{
     const effectActive=hud.activeEchoRunes?.includes(effect.id);
     return <div key={effect.id}>
      <dt style={{color:effect.color}}>{vi?effect.vi:effect.en}</dt>
      <dd>{RUNE_SHORT[effect.id][vi?0:1]}{effectActive?<small>{vi?'Đang hiệu lực':'Active'}</small>:!(hud.echoRunes?.[effect.id]??0)&&<small>{vi?'Hết ấn':'Out of stock'}</small>}</dd>
     </div>;
    })}</dl><p>{vi?'Hiệu ứng áp dụng khi kích hoạt. Buff cùng loại không cộng dồn.':'Effects apply on activation. Buffs of the same type do not stack.'}</p></>:<p>{vi?'Chưa trang bị rune.':'No runes equipped.'}</p>}
   </section>
  </div></section>}</div>
  <footer className="inventory-footer">{preparing ? <>
   <button type="button" className="inventory-cancel" onClick={close}>{vi?'QUAY LẠI':'BACK'}</button>
   <button type="button" className="inventory-done" disabled={!readyToStart} onClick={()=>engine?.confirmBattleStart()}>{readyToStart&&enteringEmpty?(vi?'VÀO TAY KHÔNG':'ENTER EMPTY-HANDED'):(vi?'VÀO TRẬN':'START BATTLE')} <ArrowRight size={18}/></button>
  </> : <>
   <span><ShieldCheck size={15}/>{vi?'Vật phẩm lưu trên thiết bị':'Items saved on this device'}</span><button className="inventory-done" onClick={close}>{playing?(vi?'TIẾP TỤC':'CONTINUE'):(vi?'ĐÓNG KHO':'CLOSE BAG')} <ArrowRight size={18}/></button>
  </>}</footer>
 </div>;
}
