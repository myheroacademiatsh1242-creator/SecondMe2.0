import {ChestCurrencyIcon} from './ChestCurrencyIcon.tsx';
import {useEffect,useRef,useState} from 'react';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import {chestPool,isChestAvailable,CHEST_PRICES,chestBalance,chestCurrencyName,type ChestRewardId} from '../game/logic/chest.ts';
import {ChestSprite,type ChestTier,type ChestKind} from './ChestSprite.tsx';
import {GachaRewardModal} from './GachaRewardModal.tsx';
import {GachaSummonScene} from './GachaSummonScene.tsx';
import {ChestHistoryModal} from './ChestHistoryModal.tsx';
import {addChestHistory} from '../game/logic/chestHistory.ts';
import './chestGacha.css';

const chestKinds: {id:ChestKind;vi:string;en:string}[]=[
  {id:'wood',vi:'PHÀM PHẨM',en:'COMMON'},
  {id:'royal',vi:'HOÀNG PHẨM',en:'ROYAL'},
  {id:'platinum',vi:'ĐẾ PHẨM',en:'IMPERIAL'},
  {id:'crystal',vi:'CHÂN PHẨM VÔ SONG',en:'PEERLESS'},
];

export function ChestGacha({engine,hud}:{engine:GameEngine|null;hud:HUDState}){
  const vi=hud.language==='vi';
  const [open,setOpen]=useState(false);
  const [opening,setOpening]=useState(false);
  const [tier,setTier]=useState<ChestTier|null>(null);
  const [kind,setKind]=useState<ChestKind>('royal');
  const price=CHEST_PRICES[kind];
  const pool=chestPool(kind),available=isChestAvailable(kind);
  const [notice,setNotice]=useState(false);
  const balance=chestBalance(price.currency,hud);
  const currencyName=chestCurrencyName(price.currency,vi);
  const costName=chestCurrencyName(price.currency,vi,true);
  const selectedChest=chestKinds.find(chest=>chest.id===kind)!;
  const selectChest=(next:ChestKind)=>{
    if(busy.current||next===kind)return;
    setNotice(false);setShowRates(false);setKind(next);setTier(null);setResults([]);setShowRewardModal(false);setShowSummonScene(false);
    setRun(n=>n+1);
  };
  const [results,setResults]=useState<ChestRewardId[]>([]);
  const [showRates,setShowRates]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [showRewardModal,setShowRewardModal]=useState(false);
  const [showSummonScene,setShowSummonScene]=useState(false);
  const [run,setRun]=useState(0);
  const trigger=useRef<HTMLButtonElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const busy=useRef(false);
  const close=()=>{
    setNotice(false);setOpen(false);setShowRates(false);setShowHistory(false);setShowSummonScene(false);setShowRewardModal(false);
    // Clear this visit's presentation only; rewards are already credited by the engine.
    setTier(null);setResults([]);setOpening(false);setRun(n=>n+1);
    busy.current=false;trigger.current?.blur();
  };
  const onSummonComplete=()=>{
    setShowSummonScene(false);
    setShowRewardModal(true);
    busy.current=false;
  };
  useEffect(()=>{
    if(!open)return;
    if(!showSummonScene&&!showRewardModal)closeButton.current?.focus();
    const key=(e:KeyboardEvent)=>{if(showSummonScene||showRewardModal||showHistory)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const buttons=Array.from(closeButton.current?.closest('section')?.querySelectorAll<HTMLButtonElement>('button:not(:disabled),summary')??[]);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    window.addEventListener('keydown',key,true);
    return ()=>window.removeEventListener('keydown',key,true);
  },[open,showSummonScene,showRewardModal,showHistory]);
  const draw=(count:1|10)=>{
    if(!available){setNotice(true);return;}
    if(busy.current||!engine)return;
    const rewards=engine.openChest(count,kind);if(!rewards)return;
    busy.current=true;
    addChestHistory(rewards, kind);
    setResults(rewards);
    const isFire=rewards.some(id=>pool.find(item=>item.id===id)?.tier==='fire');
    setTier(isFire?'fire':'gold');
    setShowRewardModal(false);
    if(kind==='wood'){ setShowRewardModal(true); setShowSummonScene(false); busy.current=false; }else{ setShowSummonScene(true); }
    setRun(n=>n+1);
  };
  return <>
    <button
      className={`shop-reward-chest ${hud.reducedMotion ? 'chest-still' : ''}`}
      ref={trigger}
      aria-label={vi ? 'Mở rương thưởng' : 'Open reward chest'}
      title={vi ? 'Nhấn để mở rương thưởng' : 'Click to open reward chest'}
      onClick={(e) => { (e.currentTarget as HTMLButtonElement)?.blur(); setOpen(true); }}
    >
      <ChestSprite kind={kind}/>
      <i className="chest-sparkle sparkle-1" aria-hidden="true" />
      <i className="chest-sparkle sparkle-2" aria-hidden="true" />
      <i className="chest-sparkle sparkle-3" aria-hidden="true" />
    </button>
    {open&&<div className="chest-backdrop" onClick={close}><section className="chest-panel" role="dialog" aria-modal="true" aria-label={vi?'Rương thưởng':'Reward chest'} onClick={e=>e.stopPropagation()}>
      <header className="chest-panel-header">
        <div className="chest-header-left">
          <button className="chest-rate-toggle" type="button" disabled={!available} aria-expanded={showRates} aria-controls="chest-rates" onClick={()=>setShowRates(value=>!value)}>{vi?(showRates?'Ẩn tỉ lệ':'Xem tỉ lệ'):(showRates?'Hide rates':'View rates')}</button>
          <button className="chest-history-toggle" type="button" aria-expanded={showHistory} onClick={()=>setShowHistory(true)}>📜 {vi?'Lịch sử':'History'}</button>
        </div>
        <button ref={closeButton} className="chest-close-btn" aria-label={vi?'Đóng rương':'Close chest'} onClick={close}>×</button>
      </header>
      <div className="chest-panel-scroll">
      <nav className="chest-kind-buttons" aria-label={vi?'Chọn loại rương':'Choose chest type'}>
        {chestKinds.map(chest=><button type="button" key={chest.id} aria-pressed={kind===chest.id} disabled={busy.current} onClick={()=>selectChest(chest.id)}>{vi?chest.vi:chest.en}</button>)}
      </nav>
      <h2 className="chest-kind-title" aria-live="polite">{vi?selectedChest.vi:selectedChest.en}</h2>
      <p className="chest-key-balance"><ChestCurrencyIcon currency={price.currency} size={28}/> {balance} {currencyName}</p>
      <div className={`chest-display ${opening ? 'is-opening' : ''}`}><ChestSprite key={run} kind={kind} tier={tier} reducedMotion={hud.reducedMotion}/></div>
      <div className="chest-results" aria-live="polite">{results.length?<div className="chest-summary-wrap"><p>{vi?'Đã nhận vào túi đồ:':'Added to your inventory:'}</p><ul>{pool.map(item=>{const count=results.filter(id=>id===item.id).length;return count?<li key={item.id} className={`chest-tier-${item.tier}`}>{vi?item.vi:item.en} ×{count}</li>:null;})}</ul><button type="button" className="chest-reopen-rewards-btn" onClick={()=>setShowRewardModal(true)}>✨ {vi?'Xem thẻ bài phần thưởng':'View card rewards'}</button></div>:<p>{vi?'Mỗi lượt nhận một phần thưởng.':'One reward per draw.'}</p>}</div>
      {!available&&<p role="status">{vi?'Rương đang trong quá trình hoàn thiện.':'This chest is under development.'}</p>}
      {notice&&<div className="chest-development-notice" role="status"><p>{vi?'Rương đang trong quá trình hoàn thiện, chưa có phần thưởng để quay. Vui lòng quay lại sau. Tinh thể của bạn được giữ nguyên.':'This chest is under development. Rewards are not available yet. Please return later. Your crystals are preserved.'}</p><button type="button" onClick={()=>setNotice(false)}>{vi?'Đã hiểu':'Got it'}</button></div>}
      <div className="chest-draw-buttons"><button disabled={busy.current||(available&&balance<price.single)} onClick={()=>draw(1)}><span className="chest-draw-title">{vi?'MỞ':'OPEN'} ×1</span><span className="chest-draw-cost"><ChestCurrencyIcon currency={price.currency} size={20}/>{price.single} {costName}</span></button><button disabled={busy.current||(available&&balance<price.single*10)} onClick={()=>draw(10)}><span className="chest-draw-title">{vi?'MỞ':'OPEN'} ×10</span><span className="chest-draw-cost"><ChestCurrencyIcon currency={price.currency} size={20}/>{price.single*10} {costName}</span></button></div>
      {available&&balance<price.single&&<p>{vi?`Chưa đủ ${currencyName} để mở rương.`:`Not enough ${currencyName} to open the chest.`}</p>}
      </div>
    </section>{showRates&&available&&<aside className="chest-rates" id="chest-rates" aria-label={vi?'Tỉ lệ phần thưởng':'Reward probabilities'} onClick={e=>e.stopPropagation()}>
        <strong>{vi?selectedChest.vi:selectedChest.en} · {vi?'Tỉ lệ thưởng':'Drop rates'}</strong>
        <ul>{pool.filter(item=>item.weight>0).map(item=><li key={item.id}><span>{vi?item.vi:item.en}</span><b>{item.weight}%</b></li>)}</ul>
        <small>{vi?'Mỗi lượt tính riêng, kể cả mở ×10.':'Each draw rolls separately, including ×10.'}</small>
      </aside>}
      {showSummonScene&&results.length>0&&kind!=='wood'&&<GachaSummonScene highestTier={results.some(id=>pool.find(item=>item.id===id)?.tier==='fire')?'fire':results.some(id=>['time','healLarge'].includes(id))?'gold':'rare'} isTenPull={results.length>=10} kind={kind} language={vi?'vi':'en'} onComplete={onSummonComplete} reducedMotion={hud.reducedMotion}/>}
      {showRewardModal&&results.length>0&&<GachaRewardModal rewards={results} language={vi?'vi':'en'} chestKeys={hud.chestKeys} coins={hud.coins} whiteCrystals={hud.whiteCrystals} mysticCrystals={hud.mysticCrystals} kind={kind} onClose={()=>setShowRewardModal(false)} onDrawAgain={(count)=>{ setShowRewardModal(false); draw(count); }} />}
      {showHistory&&<ChestHistoryModal vi={vi} onClose={()=>setShowHistory(false)}/>}
    </div>}
  </>;
}
