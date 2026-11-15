import {OutfitShop} from './OutfitShop.tsx';
import {Shirt} from 'lucide-react';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ChestGacha} from './ChestGacha.tsx';
import {ShopItemIcon} from './ShopItemIcon.tsx';
import {SHOP_ITEMS,type ShopItemId} from '../game/logic/shopItems.ts';
import {rarityName,RARITY_COLORS,sortShopCatalogue} from '../game/logic/rarity.ts';
import type {GameEngine,HUDState} from '../game/GameEngine.ts';
import './tanukiTradingPost.css';
const displayItems=sortShopCatalogue(SHOP_ITEMS.filter(item=>item.id!=='aid'));
const shopGreetings={
 vi:[
  'Xin chào! Bạn muốn mua gì nào?',
  'Chào bạn! Hôm nay đi đường có thuận lợi không?',
  'Ồ, khách quen đây rồi! Mời bạn xem hàng nhé.',
  'Bạn khỏe chứ? Nghỉ chân một lát rồi hãy đi.',
  'Trong rừng có gì mới không? Kể tôi nghe với!',
  'Tanuki xin chào! Cần món gì cứ gọi tôi nhé.',
  'Túi còn chỗ chứ? Tôi hỏi trước cho chắc!',
  'Bộ trang phục này hợp bạn đấy. Tin tôi đi!',
  'Hết xu vẫn cứ ghé chơi, tôi thích trò chuyện!',
  'Đừng vội nhé, cứ chọn món bạn ưng ý.',
  'Chúc bạn gặp toàn điều lành trên đường đi!',
  'Nghe thấy tiếng rương gọi không? Tôi thì có!',
  'Nhớ giữ sức nhé. Tôi đợi bạn ở quầy!',
 ],
 en:[
  'Welcome! What would you like?',
  'Hello! How has your journey been today?',
  'A familiar face! Come and browse a while.',
  'Doing well? Rest a little before you go.',
  'Any news from the forest? Tell me!',
  'Hello from Tanuki! Just ask if you need help.',
  'Got room in your bag? Just checking!',
  'That outfit suits you. Trust my eye!',
  'No coins? Visit anyway. I like a good chat!',
  'No rush. Pick something you truly like.',
  'May your road be full of good surprises!',
  'Hear that chest calling? I sure do!',
  'Take care out there. I will be right here!',
 ],
};
const asset=(name:string)=>`${import.meta.env.BASE_URL}assets/ui/${name}`;
const TREE_FIREFLIES = [
  // Vùng Cây Cổ Thụ & Nấm Phát Sáng Bên Trái (Left Giant Tree & Mushroom Glade)
  { x: 95, y: 220, s: 4, d: 5.5, delay: 0 },
  { x: 140, y: 270, s: 5, d: 6.2, delay: -1.2 },
  { x: 80, y: 340, s: 3.5, d: 7.0, delay: -2.5 },
  { x: 175, y: 310, s: 4.5, d: 5.8, delay: -3.8 },
  { x: 120, y: 395, s: 3, d: 6.5, delay: -0.7 },
  { x: 165, y: 440, s: 5, d: 5.2, delay: -2.0 },
  { x: 215, y: 370, s: 3.5, d: 7.5, delay: -4.3 },
  { x: 65, y: 280, s: 3, d: 6.0, delay: -1.8 },

  // Vùng Rừng Thông Gần Cổng Torii (Midground Pines & Torii Canopy)
  { x: 275, y: 190, s: 4, d: 6.8, delay: -3.0 },
  { x: 335, y: 245, s: 4.5, d: 5.4, delay: -1.5 },
  { x: 300, y: 310, s: 3.5, d: 7.2, delay: -4.8 },
  { x: 365, y: 215, s: 4, d: 6.0, delay: -2.2 },
  { x: 245, y: 260, s: 3, d: 8.0, delay: -5.1 },

  // Vùng Tán Lá Xanh Rậm Rạp Phía Sau & Cạnh Quầy (Right Tree Canopy & Foliage)
  { x: 570, y: 155, s: 4, d: 6.4, delay: -0.9 },
  { x: 630, y: 120, s: 3.5, d: 7.1, delay: -3.4 },
  { x: 675, y: 175, s: 5, d: 5.6, delay: -2.7 },
  { x: 730, y: 135, s: 3.5, d: 6.7, delay: -4.5 },
  { x: 785, y: 200, s: 4, d: 5.9, delay: -1.1 },
  { x: 820, y: 160, s: 3, d: 7.6, delay: -3.7 },
  { x: 605, y: 220, s: 4.5, d: 6.3, delay: -2.1 },
];
const PIXEL_LEAF_PATHS = {
  outline: 'M11 0h1v1h-1z M10 1h1v1h-1z M12 1h1v1h-1z M9 2h1v1h-1z M13 2h1v1h-1z M8 3h1v1h-1z M14 3h1v1h-1z M7 4h1v1h-1z M15 4h1v1h-1z M6 5h1v1h-1z M15 5h1v1h-1z M5 6h1v1h-1z M15 6h1v1h-1z M4 7h1v1h-1z M15 7h1v1h-1z M3 8h1v1h-1z M14 8h1v1h-1z M2 9h1v1h-1z M13 9h1v1h-1z M1 10h1v1h-1z M11 10h1v1h-1z M12 10h1v1h-1z M1 11h1v1h-1z M9 11h1v1h-1z M10 11h1v1h-1z M2 12h1v1h-1z M7 12h1v1h-1z M8 12h1v1h-1z M3 13h1v1h-1z M5 13h1v1h-1z M6 13h1v1h-1z M3 14h1v1h-1z M4 14h1v1h-1z M3 15h1v1h-1z',
  highlight: 'M11 1h1v1h-1z M10 2h1v1h-1z M11 2h1v1h-1z M9 3h1v1h-1z M10 3h1v1h-1z M11 3h1v1h-1z M8 4h1v1h-1z M9 4h1v1h-1z M10 4h1v1h-1z M11 4h1v1h-1z M7 5h1v1h-1z M8 5h1v1h-1z M9 5h1v1h-1z M10 5h1v1h-1z M6 6h1v1h-1z M7 6h1v1h-1z M8 6h1v1h-1z M9 6h1v1h-1z M5 7h1v1h-1z M6 7h1v1h-1z M7 7h1v1h-1z M4 8h1v1h-1z M5 8h1v1h-1z M6 8h1v1h-1z M3 9h1v1h-1z M4 9h1v1h-1z M2 10h1v1h-1z M3 10h1v1h-1z M2 11h1v1h-1z',
  midtone: 'M12 2h1v1h-1z M12 3h1v1h-1z M13 3h1v1h-1z M13 4h1v1h-1z M14 4h1v1h-1z M12 5h1v1h-1z M13 5h1v1h-1z M14 5h1v1h-1z M12 6h1v1h-1z M13 6h1v1h-1z M14 6h1v1h-1z M11 7h1v1h-1z M12 7h1v1h-1z M13 7h1v1h-1z M14 7h1v1h-1z M10 8h1v1h-1z M11 8h1v1h-1z M12 8h1v1h-1z M13 8h1v1h-1z M9 9h1v1h-1z M10 9h1v1h-1z M11 9h1v1h-1z M12 9h1v1h-1z M7 10h1v1h-1z M8 10h1v1h-1z M9 10h1v1h-1z M10 10h1v1h-1z M6 11h1v1h-1z M7 11h1v1h-1z M8 11h1v1h-1z M4 12h1v1h-1z M5 12h1v1h-1z M6 12h1v1h-1z M4 13h1v1h-1z',
  vein: 'M12 4h1v1h-1z M11 5h1v1h-1z M10 6h1v1h-1z M11 6h1v1h-1z M8 7h1v1h-1z M9 7h1v1h-1z M10 7h1v1h-1z M7 8h1v1h-1z M8 8h1v1h-1z M9 8h1v1h-1z M5 9h1v1h-1z M6 9h1v1h-1z M7 9h1v1h-1z M8 9h1v1h-1z M4 10h1v1h-1z M5 10h1v1h-1z M6 10h1v1h-1z M3 11h1v1h-1z M4 11h1v1h-1z M5 11h1v1h-1z M3 12h1v1h-1z'
};

const PIXEL_LEAF_THEMES = {
  green: { outline: '#153617', highlight: '#7fd35e', midtone: '#4ca035', vein: '#2e6f23' },
  gold: { outline: '#3f2107', highlight: '#ffd859', midtone: '#e59a28', vein: '#a85c12' },
  russet: { outline: '#3d160f', highlight: '#f5934e', midtone: '#cc572a', vein: '#8f2f18' },
};

function PixelLeafSvg({ theme, size = 18 }: { theme: 'green' | 'gold' | 'russet'; size?: number }) {
  const c = PIXEL_LEAF_THEMES[theme] || PIXEL_LEAF_THEMES.green;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="shop-pixel-leaf-svg"
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
    >
      <path d={PIXEL_LEAF_PATHS.outline} fill={c.outline} />
      <path d={PIXEL_LEAF_PATHS.highlight} fill={c.highlight} />
      <path d={PIXEL_LEAF_PATHS.midtone} fill={c.midtone} />
      <path d={PIXEL_LEAF_PATHS.vein} fill={c.vein} />
    </svg>
  );
}

const FALLING_LEAF_TRACKS = [
  { id: 'leaf-track-1', theme: 'green' as const, size: 19, startX: 60, startY: -35, endX: 840, endY: 740, duration: 17, delay: 0 },
  { id: 'leaf-track-2', theme: 'gold' as const, size: 18, startX: 260, startY: -35, endX: 1050, endY: 740, duration: 20, delay: 5 },
  { id: 'leaf-track-3', theme: 'russet' as const, size: 17, startX: -20, startY: 120, endX: 780, endY: 740, duration: 22, delay: 11 },
  { id: 'leaf-track-4', theme: 'gold' as const, size: 19, startX: 420, startY: -35, endX: 1180, endY: 740, duration: 24, delay: 17 },
];
export function TanukiShop({engine,hud}:{engine:GameEngine|null;hud:HUDState}){
 const vi=hud.language==='vi',viewport=useRef<HTMLDivElement>(null),dialog=useRef<HTMLFormElement>(null),buyButton=useRef<HTMLButtonElement>(null),reactionUntil=useRef(0);
 const [ready,setReady]=useState(false),[greetingRun,setGreetingRun]=useState(0),[greetingIndex,setGreetingIndex]=useState(0),[scale,setScale]=useState(1),[selected,setSelected]=useState<ShopItemId>('time'),[tab,setTab]=useState<'items'|'outfits'>('items'),[confirm,setConfirm]=useState(false),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[pose,setPose]=useState(0),[speech,setSpeech]=useState(true);
 const [hovered,setHovered]=useState<ShopItemId|null>(null);
 const item=SHOP_ITEMS.find(i=>i.id===selected)!;
 const preview=SHOP_ITEMS.find(i=>i.id===(hovered??selected))!;
 const stock=(id:ShopItemId)=>id==='time'?hud.timeItems:id==='ring'?hud.limitRings:hud.supplies?.[id]??0;
 const unlocked=selected!=='aid'||!!hud.aidUnlocked,room=item.cap-stock(selected),affordable=item.price?Math.floor(hud.coins/item.price):room,maxQuantity=Math.max(0,Math.min(room,affordable));
 const close=()=>{setConfirm(false);buyButton.current?.focus();};
 useEffect(()=>{const element=viewport.current;if(!element)return;const resize=()=>setScale(Math.min(element.clientWidth/1280,element.clientHeight/720));resize();const observer=new ResizeObserver(resize);observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  let mounted=true;
  const load=(src:string)=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>resolve();image.src=src;if(image.complete)resolve();});
  void Promise.all([load(asset('tanuki-market-sunset.png')),load(asset('tanuki-merchant-expressions.png'))]).then(()=>{if(mounted)setReady(true);});
  return()=>{mounted=false;};
 },[]);
 useEffect(()=>{
  if(!ready)return;
  setSpeech(true);setGreetingRun(n=>n+1);reactionUntil.current=performance.now()+1800;
  setPose(hud.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:6);
 },[ready]);
 useEffect(()=>{
  if(!ready)return;
  const interval=window.setInterval(()=>{
   const idleMs=performance.now()-reactionUntil.current;
   if(idleMs<0)return;
   if(hud.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setPose(0);return;}
   const beat=Math.floor(idleMs/160)%170;
   setPose(beat<60?(beat%26===24?1:0):beat<100?(beat>=86&&beat<94?3:2):beat<130?4:beat<160?5:0);
  },160);
  return()=>window.clearInterval(interval);
 },[ready,hud.reducedMotion]);
 useEffect(()=>{if(!ready||!speech)return;const timeout=window.setTimeout(()=>setSpeech(false),7000);return()=>window.clearTimeout(timeout);},[ready,speech,message,greetingRun]);
 useEffect(()=>{if(!confirm)return;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input')??[]),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[confirm]);
 const select=(id:ShopItemId)=>{setSelected(id);setQuantity(1);setMessage('');};
 const purchase=()=>{
  if(selected==='aid'||!unlocked||quantity<1||quantity>maxQuantity||!engine?.buyShopItem(selected,quantity)){setMessage(vi?'Không thể mua. Kiểm tra xu và chỗ trống trong túi.':'Cannot purchase. Check your coins and inventory capacity.');setSpeech(true);setGreetingRun(n=>n+1);return;}
  setMessage(vi?`Đã nhận ${quantity} × ${item.vi}. Cảm ơn bạn!`:`Received ${quantity} × ${item.en}. Thank you!`);reactionUntil.current=performance.now()+1500;setPose(7);setSpeech(true);setGreetingRun(n=>n+1);close();
 };
 return <div className="tanuki-trading-shop" ref={viewport}><div className="trading-world" style={{transform:`translate(-50%,-50%) scale(${scale})`,'--trading-scale':scale} as CSSProperties}>
  <img className="trading-background" src={asset('tanuki-market-sunset.png')} alt=""/>
  {/* Atmospheric Sunrise / Dawn System behind Torii Gate */}
  <div className="trading-sunrise-ambient" aria-hidden="true">
    <div className="sunrise-sun-core" />
    <div className="sunrise-sun-rays">
      <span className="sun-ray ray-1" />
      <span className="sun-ray ray-2" />
      <span className="sun-ray ray-3" />
      <span className="sun-ray ray-4" />
    </div>
    <div className="sunrise-horizon-corona" />
  </div>
  {/* Magical Firefly Swarm Clustered in the Forest Trees */}
  <div className="trading-fireflies" aria-hidden="true">
    {TREE_FIREFLIES.map((f, i) => (
      <span
        key={`fly-${i}`}
        className={`shop-firefly fly-kind-${i % 3}`}
        style={{
          left: `${f.x}px`,
          top: `${f.y}px`,
          width: `${f.s}px`,
          height: `${f.s}px`,
          animationDuration: `${f.d}s, ${f.d * 0.7}s`,
          animationDelay: `${f.delay}s, ${f.delay}s`,
        }}
      />
    ))}
  </div>
  {/* Occasional 2D Pixel Art Falling Leaves */}
  <div className="trading-falling-leaves" aria-hidden="true">
    {FALLING_LEAF_TRACKS.map((t) => (
      <div
        key={t.id}
        className={`shop-leaf-track ${t.id}`}
        style={
          {
            '--leaf-start-x': `${t.startX}px`,
            '--leaf-start-y': `${t.startY}px`,
            '--leaf-end-x': `${t.endX}px`,
            '--leaf-end-y': `${t.endY}px`,
            animationDuration: `${t.duration}s`,
            animationDelay: `${t.delay}s`,
          } as React.CSSProperties
        }
      >
        <div className="shop-pixel-leaf-wrapper">
          <PixelLeafSvg theme={t.theme} size={t.size} />
        </div>
      </div>
    ))}
  </div>
  <button className={`trading-merchant ${hud.reducedMotion?'merchant-still':''}`} data-pose={pose} aria-label={vi?'Trò chuyện với Tanuki':'Talk to Tanuki'} onClick={()=>{setMessage('');setGreetingIndex(index=>(index+1+Math.floor(Math.random()*(shopGreetings.vi.length-1)))%shopGreetings.vi.length);setSpeech(true);setGreetingRun(n=>n+1);reactionUntil.current=performance.now()+1800;setPose(6);}}><span aria-hidden="true" style={{backgroundImage:`url(${asset('tanuki-merchant-expressions.png')})`,backgroundPosition:`${pose%4*100/3}% ${Math.floor(pose/4)*100}%`}}/></button>
  {/* The counter in front of Tanuki: the same painting, cut to the counter, so Tanuki stands behind it. */}
  <div className="trading-counter-front" aria-hidden="true" style={{backgroundImage:`url(${asset('tanuki-market-sunset.png')})`}}/>
  {ready&&speech&&<div className="trading-speech" role="status">{message||(vi?shopGreetings.vi[greetingIndex]:shopGreetings.en[greetingIndex])}</div>}
  <ChestGacha engine={engine} hud={hud}/>
  <div className="trading-wallet"><img src={asset('raccoon-coin.png')} alt=""/><span>{vi?'XU':'GOLD'}: <b>{hud.coins.toLocaleString(vi?'vi-VN':'en-US')}</b></span></div>
  <section className="trading-catalogue" aria-label={vi?'Quầy hàng Tanuki':'Tanuki’s shop'}>
   <div className="trading-tabs" role="tablist"><button role="tab" aria-selected={tab==='items'} onClick={()=>setTab('items')}>{vi?'VẬT PHẨM':'ITEMS'} <ShopItemIcon id="healSmall"/></button><button role="tab" aria-selected={tab==='outfits'} onClick={()=>setTab('outfits')}>{vi?'TRANG PHỤC':'OUTFITS'} <Shirt className="trading-tab-outfit-icon" size={26} strokeWidth={2.2} aria-hidden="true"/></button></div>

   <div className="trading-hint">{tab==='outfits'?(vi?'6 TRANG PHỤC · PHÁP SƯ & KIẾM SĨ':'6 OUTFITS · MAGE & SWORDSMAN'):vi?`${displayItems.length} VẬT PHẨM · CUỘN ĐỂ XEM TẤT CẢ`:`${displayItems.length} ITEMS · SCROLL TO SEE ALL`}</div>
   {tab==='items'?<><div className="trading-items" onMouseLeave={()=>setHovered(null)} role="tabpanel" aria-label={vi?'Vật phẩm':'Items'}>{displayItems.map(product=><button key={product.id} onMouseEnter={()=>setHovered(product.id)} onFocus={()=>setHovered(product.id)} onBlur={()=>setHovered(null)} aria-pressed={selected===product.id} onClick={()=>select(product.id)} className={selected===product.id?'selected':''}><ShopItemIcon id={product.id}/><span>{vi?product.vi:product.en}<small>{rarityName(product.rarity,vi)} · {vi?'Đang có':'Owned'}: {stock(product.id).toLocaleString(vi?'vi-VN':'en-US')}</small></span><b>{`${product.price} ${vi?'xu':'coins'}`}</b></button>)}</div>
   <div className="trading-product-info" aria-live="polite"><header><strong style={{color:RARITY_COLORS[preview.rarity]}}>{vi?preview.vi:preview.en}</strong><small>{vi?'Trong túi':'Owned'} {stock(preview.id).toLocaleString()} / {preview.cap.toLocaleString()}</small></header><p>{vi?preview.detailVi:preview.detailEn}</p>{selected==='chances'&&(hud.chanceCharges??0)>0&&<small>{vi?'Món đang dùng còn ':'Opened item has '}{hud.chanceCharges} {vi?'lượt':'charges left'}</small>}</div></>:<OutfitShop engine={engine} hud={hud}/>}
  </section>
  <div className="trading-actions"><button className="trading-buy" hidden={tab==='outfits'} ref={buyButton} disabled={tab!=='items'||selected==='aid'||!unlocked||maxQuantity<1} onClick={()=>{setQuantity(1);setConfirm(true);}}>{selected==='aid'?(vi?'PHẦN THƯỞNG HÀNH TRÌNH':'JOURNEY REWARD'):!unlocked?(vi?'CHƯA MỞ KHÓA':'LOCKED'):room<=0?(vi?'TÚI ĐÃ ĐẦY':'INVENTORY FULL'):affordable<1?(vi?'CHƯA ĐỦ XU':'NOT ENOUGH COINS'):vi?'MUA':'BUY'}</button><button className="trading-leave" onClick={()=>engine?.goToLobby()}>← {vi?'QUAY LẠI':'BACK'}</button></div>
  {confirm&&<div className="trading-confirm-backdrop" onClick={close}><form ref={dialog} className="trading-confirm purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="trading-confirm-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();purchase();}}>
   <header><h2 id="trading-confirm-title">{vi?'XÁC NHẬN MUA?':'CONFIRM PURCHASE?'}</h2><button type="button" aria-label={vi?'Đóng xác nhận':'Close confirmation'} onClick={close}>×</button></header>
   <div className="trading-confirm-item"><ShopItemIcon id={selected}/><div><strong>{vi?item.vi:item.en}</strong><p>{vi?item.detailVi:item.detailEn}</p></div></div>
   <label className="trading-quantity"><span>{vi?'SỐ LƯỢNG':'QUANTITY'}</span><button type="button" aria-label={vi?'Giảm số lượng':'Decrease quantity'} disabled={quantity<=1} onClick={()=>setQuantity(n=>Math.max(1,n-1))}>‹</button><input type="number" aria-label={vi?'Số lượng':'Quantity'} min={1} max={maxQuantity} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(maxQuantity,Number(e.target.value)||1)))}/><button type="button" aria-label={vi?'Tăng số lượng':'Increase quantity'} disabled={quantity>=maxQuantity} onClick={()=>setQuantity(n=>Math.min(maxQuantity,n+1))}>›</button></label>
   <div className="purchase-price"><span>{vi?'Đơn giá':'Unit price'} <b>{item.price} {vi?'xu':'coins'}</b></span><span className="trading-total" aria-live="polite">{vi?'Tổng cộng':'Total'} <b>{item.price*quantity} {vi?'xu':'coins'}</b></span></div>
   <footer><button type="submit" disabled={quantity<1||quantity>maxQuantity}>{vi?'XÁC NHẬN':'YES · BUY'}</button><button type="button" onClick={close}>{vi?'HỦY':'CANCEL'}</button></footer>
  </form></div>}
  {!ready&&<div className="trading-loading" role="status">{vi?'Tanuki đang mở quầy…':'Tanuki is opening the stall…'}</div>}
 </div></div>;
}
