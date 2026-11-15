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
import {RuneLoadoutEditor,RuneStone} from './EchoRunes.tsx';
import './TrailInventory.css';
import './ForestInventory.css';
export function TrailInventory({engine,hud,close:onClose,preparing=false}:{engine:GameEngine|null;hud:HUDState;close:()=>void;preparing?:boolean}){
 const panelArt=usePanelArt(PANEL_ART.material);
 const {closing,close}=useDialogClose(onClose);
 const vi=hud.language==='vi',[inspect,setInspect]=useState(0),[editing,setEditing]=useState(false),root=useRef<HTMLDivElement>(null),closeRef=useRef(close);closeRef.current=close;
 const ids=hud.runeLoadout??[],rune=ECHO_RUNES.find(r=>r.id===ids[inspect]),active=rune&&hud.activeEchoRunes?.includes(rune.id),playing=hud.screen==='playing';
 const number=(n:number)=>n.toLocaleString(vi?'vi-VN':'en-US');
 useEffect(()=>{
  engine?.setInventoryOpen(true);const before=document.activeElement as HTMLElement|null;
  const key=(e:KeyboardEvent)=>{if(document.querySelector('.rune-loadout-editor'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRef.current();}else if(e.key==='Tab'){
   const controls=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')??[]).filter(control=>control.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }};
  const requestClose=()=>closeRef.current();document.addEventListener('close-trail-inventory',requestClose);
  window.addEventListener('keydown',key,true);return()=>{document.removeEventListener('close-trail-inventory',requestClose);engine?.setInventoryOpen(false);window.removeEventListener('keydown',key,true);if(before?.isConnected)before.focus();};
 },[engine]);
 useEffect(()=>{
  if(panelArt==='loading')return;
  const first = preparing ? '[data-inventory-item] button:not(:disabled), .inventory-done:not(:disabled)' : '.inventory-done';
  (root.current?.querySelector<HTMLButtonElement>(first) ?? root.current?.querySelector<HTMLButtonElement>('.inventory-cancel'))?.focus({preventScroll:true});
 },[panelArt,preparing]);
 const emptyStock = preparing && !engine?.campaign.hasPackableItems();
 return <div className={`trail-inventory ${closing?'is-leaving':''}`} ref={root} data-panel-art={panelArt} data-lobby-dialog role="dialog" aria-modal="true" aria-labelledby="inventory-heading">
  {editing&&<RuneLoadoutEditor engine={engine} hud={hud} close={()=>setEditing(false)}/>}
  <header className="inventory-heading"><span className="inventory-emblem"><Backpack size={25}/></span><div><small>{vi?'HÀNH TRANG ECHO':'ECHO TRAVEL KIT'}</small><h2 id="inventory-heading">{preparing?(vi?'CHỌN VẬT PHẨM VÀO TRẬN':'PACK ITEMS FOR BATTLE'):(vi?'KHO ĐỒ':'INVENTORY')}</h2></div>{!preparing&&<div className="inventory-wallet"><img src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`} alt=""/><b>{number(hud.coins)}</b><small>{vi?'XU · ĐẠI TRÀ':'COINS · COMMON'}</small></div>}</header>
  <p className="inventory-subtitle">{preparing
   ? (emptyStock ? (vi?'Kho chưa có vật phẩm. Bạn có thể vào màn tay không.':'Your inventory is empty. You can enter without items.') : (vi?'Chọn 1–3 loại vật phẩm. Trong trận, dùng phím 1–3 theo từng ô.':'Pack 1–3 item types. Use the corresponding keys 1–3 in battle.'))
   : (vi?'Quản lý vật phẩm và bộ rune mang theo':'Manage your supplies and equipped Echo runes')}</p>
  <div className="inventory-scroll"><section className="inventory-supply-column">
   {preparing && <InventoryPack engine={engine} hud={hud}/>}
   <h3 className="inventory-section-title">{vi?'VẬT PHẨM HỖ TRỢ':'TRAIL SUPPLIES'}</h3>
   <div className="inventory-supplies"><InventorySupplies engine={engine} hud={hud} preparing={preparing}/>{!playing&&!preparing&&<><article><span className="supply-icon"><ChestKeyIcon size={40}/></span><div><h3>{vi?'Tanuki phàm tinh thể':'Tanuki Common Crystal'} <b>× {number(hud.chestKeys)}</b></h3><p>{rarityName(CURRENCY_RARITY.commonCrystals,vi)} · {vi?'Mở rương Hoàng Phẩm · 5 tinh thể mỗi lượt':'Royal chest · 5 crystals per draw'}</p></div></article>
    <article><span className="supply-icon"><ChestCurrencyIcon currency="whiteCrystals" size={40}/></span><div><h3>{vi?'Tanuki thanh tinh thể':'Tanuki Azure Crystal'} <b>× {number(hud.whiteCrystals)}</b></h3><p>{rarityName(CURRENCY_RARITY.whiteCrystals,vi)} · {vi?'Chỉ mở rương Đế Phẩm · 5 viên mỗi lượt · Chưa có nguồn nhận trong game':'Imperial chest only · 5 per draw · Not obtainable in gameplay yet'}</p></div></article>
    <article><span className="supply-icon"><ChestCurrencyIcon currency="mysticCrystals" size={40}/></span><div><h3>{vi?'Tanuki huyền tinh thể':'Tanuki Mystic Crystal'} <b>× {number(hud.mysticCrystals)}</b></h3><p>{rarityName(CURRENCY_RARITY.mysticCrystals,vi)} · {vi?'Chỉ mở rương Chân Phẩm Vô Song · 5 viên mỗi lượt · Chưa có nguồn nhận trong game':'Peerless chest only · 5 per draw · Not obtainable in gameplay yet'}</p></div></article>
    </>}
   </div>
   </section>{!preparing&&<section className="inventory-rune-column"><div className="inventory-runes-title"><h3 className="inventory-section-title">{vi?'4 Ô RUNE ĐÃ CHỌN':'FOUR SELECTED RUNES'}</h3><button onClick={()=>setEditing(true)}>{vi?'ĐỔI RUNE':'CHANGE RUNES'}<ArrowRight size={12}/></button></div>
   <div className="inventory-rune-content"><div className="inventory-rune-slots">{Array.from({length:4},(_,i)=>{const r=ECHO_RUNES.find(r=>r.id===ids[i]);return <button key={i} className={inspect===i?'inspecting':''} aria-pressed={inspect===i} aria-label={r?(vi?r.vi:r.en):(vi?`Ô trống ${i+1}`:`Empty slot ${i+1}`)} onClick={()=>{setInspect(i);if(!r)setEditing(true);}}><small>{i+1}</small>{r?<span style={{color:r.color}}><RuneStone id={r.id}/></span>:<span className="inventory-empty">◇</span>}<strong title={r?(vi?r.vi:r.en):undefined}>{r?(vi?r.vi:({power:'Amplify',restore:'Restore',guard:'Endure'} as Record<string,string>)[r.id]??r.en):(vi?'Ô trống':'Empty')}</strong>{r&&<em>× {number(hud.echoRunes?.[r.id]??0)}</em>}</button>;})}</div>
   <section className="inventory-rune-description" aria-live="polite">{rune?<><div><span>{active?(vi?'ĐANG HIỆU LỰC':'ACTIVE THIS ATTEMPT'):(vi?'ẤN NÂNG ECHO':'ECHO UPGRADE RUNE')}</span><h3>{vi?rune.vi:rune.en}</h3><p>{vi?rune.detailVi:rune.detailEn}</p></div>{playing&&<button disabled={!engine?.canUseEchoRune(rune.id)} onClick={()=>engine?.useEchoRune(rune.id)}>{active?(vi?'ĐANG DÙNG':'ACTIVE'):(vi?'DÙNG ẤN':'USE RUNE')}</button>}</>:<div><h3>{vi?'Sẵn sàng cho một tiếng vọng mới':'Room for a new Echo'}</h3><p>{vi?'Thắng màn để nhận ấn. Chọn Đổi rune để xem kho và sắp xếp 4 ô mang theo.':'Clear trails to earn runes. Choose Change runes to browse your collection and arrange four slots.'}</p></div>}</section>
   <p className="inventory-usage-note">{playing?(vi?'Trận đấu đang tạm dừng khi mở túi. Dùng rune tiêu hao 1 ấn.':'Combat is paused while the bag is open. Activating a rune consumes one charge.'):(vi?'Rune dùng trong màn 2–6. Bạn có thể xem và đổi bộ rune tại đây.':'Runes are used in levels 2–6. Inspect and change your rune set here.')}</p>
  </div></section>}</div>
  <footer className="inventory-footer">{preparing ? <>
   <button type="button" className="inventory-cancel" onClick={close}>{vi?'QUAY LẠI':'BACK'}</button>
   <button type="button" className="inventory-done" disabled={!engine?.canConfirmBattleStart()} onClick={()=>engine?.confirmBattleStart()}>{emptyStock?(vi?'VÀO TAY KHÔNG':'ENTER EMPTY-HANDED'):(vi?'VÀO TRẬN':'START BATTLE')} <ArrowRight size={18}/></button>
  </> : <>
   <span><ShieldCheck size={15}/>{vi?'Vật phẩm lưu trên thiết bị':'Items saved on this device'}</span><button className="inventory-done" onClick={close}>{vi?'TIẾP TỤC':'CONTINUE'} <ArrowRight size={18}/></button><button className="inventory-back secondary" onClick={close}>{vi?'QUAY LẠI':'BACK'} <ArrowRight size={15}/></button>
  </>}</footer>
 </div>;
}
