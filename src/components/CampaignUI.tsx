import './ForestDefeat.css';
import {RuneRewardFlow} from './RuneRewardFlow.tsx';
import {OUTFITS,canWearOutfit,characterOutfitRarity,orderedCharacterOutfits,type OutfitId,type OutfitHero} from '../game/logic/outfits.ts';
import {RARITY_COLORS} from '../game/logic/rarity.ts';
import './CharacterOutfits.css';
import './JourneyFinale.css';
import './CombatActionBar.css';
import { CombatActionBar } from './CombatActionBar.tsx';
import { TouchJoystick } from './TouchControls.tsx';
import { FullscreenButton } from './FullscreenButton.tsx';
import { BossIntro } from './BossIntro.tsx';
import { isTouchDevice } from '../game/logic/orientation.ts';
import { TrailInventory } from './TrailInventory.tsx';
import { TanukiShop } from './TanukiShop.tsx';
import { ECHO_RUNES } from '../game/logic/echoRunes.ts';
import { RuneChoicePicker, RuneChoiceDialog } from './EchoRunes.tsx';
import { JourneyCamp } from './JourneyCamp.tsx';
import { MechanicalPortrait } from './MechanicalPortrait.tsx';
import { IntroEffects } from './IntroEffects.tsx';
import { MenuVines } from './MenuVines.tsx';
import credits from '../game/data/credits.json';
import { ComboPreview } from './ComboShowcase.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { drawWizardSprite } from '../game/rendering/wizardSprite.ts';
import { sounds } from '../game/logic/sound.ts';
import { drawSoldierSprite } from '../game/rendering/soldierSprite.ts';
import { localize } from '../localize.tsx';
import { translate } from '../i18n.ts';
import { BookOpen, ArrowRight, RotateCcw, Home, Pause, Volume2, VolumeX, Lock, Sword, Check, Shield, Backpack, Bell, Settings, Map, Play, X, SlidersHorizontal, ShoppingBasket, Music as MusicIcon, Zap } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { MECHANICAL_ENABLED } from '../game/logic/campaign.ts';
import { LEVELS } from '../game/logic/levels.ts';

function CoinIcon() { return <img className="raccoon-coin" src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`} alt="" aria-hidden="true"/>; }

function AerisPortrait({outfit}:{outfit?:OutfitId}={}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => { const ctx = ref.current?.getContext('2d'); if (ctx) { ctx.clearRect(0, 0, 70, 70); drawWizardSprite(ctx, 35, 55, 'down', false, false, 0,outfit); } };
    draw(); const timer = window.setInterval(draw, 250); return () => window.clearInterval(timer);
  }, [outfit]);
  return <canvas ref={ref} width={70} height={70} role="img" aria-label="Aeris"/>;
}
function WizardAvatar({className=''}:{className?:string}) { return <span className={`wizard-avatar ${className}`}><AerisPortrait/></span>; }
function KaelPortrait({outfit}:{outfit?:OutfitId}={}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => { const ctx = ref.current?.getContext('2d'); if (ctx) { ctx.clearRect(0, 0, 70, 70); drawSoldierSprite(ctx, 35, 55, 'down', false, false, 0,false,0,outfit); } };
    draw(); const timer = window.setInterval(draw, 250); return () => window.clearInterval(timer);
  }, [outfit]);
  return <canvas ref={ref} width={70} height={70} role="img" aria-label="Kael"/>;
}
function SelectedCharacterAvatar({hud}:{hud:HUDState}) {
  if(hud.characterClass==='mechanical')return <MechanicalPortrait/>;
  return hud.characterClass==='swordsman'
    ? <span className="selected-soldier-avatar"><KaelPortrait/></span>
    : <WizardAvatar/>;
}

export function Intro({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const [panel, setPanel] = useState<'none' | 'settings' | 'credits' | 'quit'>('none');
  const vi = hud.language === 'vi';
  const hasProgress = hud.completed.length > 0;
  // At most one highlighted item: the one under the mouse (none once it leaves), or the one
  // moved to with the arrow keys. -1 = none; Enter then falls through to "start".
  const items = [
    { label: vi ? 'BẮT ĐẦU' : 'START GAME', disabled: false, act: () => engine?.openLobby(true) },
    { label: vi ? 'TIẾP TỤC' : 'CONTINUE', disabled: !hasProgress, act: () => engine?.continueGame() },
    { label: vi ? 'CÀI ĐẶT' : 'SETTINGS', disabled: false, act: () => setPanel('settings') },
    { label: vi ? 'TÁC GIẢ' : 'CREDITS', disabled: false, act: () => setPanel('credits') },
    { label: vi ? 'THOÁT' : 'QUIT', disabled: false, act: () => setPanel('quit') },
  ];
  const [selected, setSelected] = useState(-1);
  // Stone tick whenever the highlight lands on a slab, by mouse or arrow keys.
  useEffect(() => { if (selected >= 0) sounds.playStoneHover(); }, [selected]);
  const press = (item: typeof items[number]) => { sounds.playStoneClick(); item.act(); };
  const menu = useRef({ items, selected, panel });
  menu.current = { items, selected, panel };
  useEffect(() => {
    // Capture phase, so Enter opens the chosen item instead of the engine's "Enter = start".
    const onKey = (event: KeyboardEvent) => {
      const m = menu.current;
      if (m.panel !== 'none' || document.querySelector('.cinematic-intro, .studio-splash')) return;
      const step = event.key === 'ArrowDown' || event.key === 's' ? 1 : event.key === 'ArrowUp' || event.key === 'w' ? -1 : 0;
      if (step) {
        event.preventDefault();
        let i = m.selected < 0 ? (step > 0 ? -1 : 0) : m.selected;
        do i = (i + step + m.items.length) % m.items.length; while (m.items[i].disabled);
        setSelected(i);
      } else if ((event.key === 'Enter' || event.key === ' ') && m.selected >= 0) {
        event.preventDefault(); event.stopPropagation();
        sounds.playStoneClick(); m.items[m.selected].act();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return <div className="intro-screen overlay" onKeyDown={event => {
    if (panel !== 'none' && ['Enter', ' ', 'Escape'].includes(event.key)) {
      event.stopPropagation();
      if (event.key === 'Escape') setPanel('none');
    }
  }}>
    <div className="intro-artwork">
    <IntroEffects/>
    <h1 className="intro-accessible-title">SECOND ME</h1>
    <div className="intro-localized-tagline tagline-above" lang={vi?'vi':'en'}>{vi?'LỐI MÒN XƯA VẪN NHỚ':'THE ANCIENT PATH REMEMBERS'}</div>
    <div className="intro-localized-tagline tagline-below" lang={vi?'vi':'en'}>{vi?'TIẾNG VỌNG RỪNG SÂU':'ECHOES OF THE WILD'}</div>
    <div className="intro-mobile-title" aria-hidden="true"><span>{vi?'LỐI MÒN XƯA VẪN NHỚ':'THE ANCIENT PATH REMEMBERS'}</span><strong>SECOND ME</strong><small>{vi?'TIẾNG VỌNG RỪNG SÂU':'ECHOES OF THE WILD'}</small></div>
    <div className="intro-language" role="group" aria-label={vi ? 'Ngôn ngữ' : 'Language'}>
      <button type="button" className={!vi ? 'selected' : ''} aria-pressed={!vi} onClick={() => engine?.setLanguage('en')}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" className={vi ? 'selected' : ''} aria-pressed={vi} onClick={() => engine?.setLanguage('vi')}>VI</button>
    </div>
    <nav className="intro-menu" aria-label={vi ? 'Menu chính' : 'Main menu'}>
      {items.map((item, i) => (
        // A stone slab (mainMenu.css): its face, carrying the label, rises when selected.
        <button key={i} type="button" className={`intro-menu-item${i === selected ? ' selected' : ''}`} disabled={item.disabled}
          style={{ '--slab': i } as React.CSSProperties}
          onMouseEnter={() => !item.disabled && setSelected(i)} onMouseLeave={() => setSelected(-1)} onClick={() => press(item)}>
          <span className="intro-menu-face"><span className="intro-menu-label">{item.label}</span><MenuVines active={i === selected && !item.disabled} reducedMotion={hud.reducedMotion}/></span>
        </button>
      ))}
    </nav>
    </div>
    {panel === 'settings' && <SettingsPanel engine={engine} hud={hud} close={() => setPanel('none')}/>}
    {panel === 'credits' && <CreditsPanel vi={vi} close={() => setPanel('none')}/>}
    {panel === 'quit' && <div className="modal-backdrop intro-dialog" onClick={() => setPanel('none')}><div className="panel" role="dialog" aria-modal="true" aria-label={vi ? 'Thoát trò chơi' : 'Quit game'} onClick={event => event.stopPropagation()}>
      <div className="panel-top"><span className="eyebrow gold">{vi ? 'THOÁT TRÒ CHƠI' : 'QUIT GAME'}</span><button className="icon-close" aria-label={vi ? 'Đóng' : 'Close'} onClick={() => setPanel('none')}><X size={18}/></button></div>
      <h2>SECOND ME</h2><p className="muted">{vi ? 'Bạn có thể đóng tab trình duyệt để thoát game. Tiến độ đã được lưu trên máy này.' : 'Close this browser tab to leave the game. Your progress is saved on this device.'}</p>
      <button className="primary" onClick={() => setPanel('none')}>{vi ? 'QUAY LẠI' : 'BACK TO MENU'}</button>
    </div></div>}
  </div>;
}

/**
 * Who made the game (src/game/data/credits.json: fill in the names and roles there; an empty
 * entry shows as "—"), and the third-party work it uses, credited as their licences ask.
 */
function CreditsPanel({ vi, close }: { vi: boolean; close: () => void }) {
  type Entry = { name: string; roleVi: string; roleEn: string; by?: string };
  const sections: [string, string, Entry[]][] = [
    ['ĐỘI PHÁT TRIỂN', 'DEVELOPMENT TEAM', credits.team],
    ['MỸ THUẬT', 'ART', credits.art],
    ['ÂM NHẠC', 'MUSIC', credits.music],
    ['TÀI NGUYÊN BÊN THỨ BA', 'THIRD-PARTY ASSETS', credits.thirdParty],
  ];
  return <div className="modal-backdrop intro-dialog" onClick={close}><div className="panel settings-panel credits-panel" role="dialog" aria-modal="true" aria-label={vi ? 'Tác giả' : 'Credits'} onClick={event => event.stopPropagation()}>
    <div className="panel-top"><span className="eyebrow gold">{vi ? 'TÁC GIẢ' : 'CREDITS'}</span><button className="icon-close" aria-label={vi ? 'Đóng' : 'Close'} onClick={close}><X size={18}/></button></div>
    <h2>SECOND ME</h2>
    <p className="credits-tagline">{vi ? 'Một chuyến phiêu lưu Echo trong khu rừng cổ.' : 'An Echo adventure in the ancient forest.'}</p>
    {sections.map(([titleVi, titleEn, list]) => <section key={titleEn} className="credits-section">
      <h3>{vi ? titleVi : titleEn}</h3>
      <ul>{list.map((entry, i) => <li key={i}><b>{entry.name || '—'}</b><span>{[entry.by, vi ? entry.roleVi : entry.roleEn].filter(Boolean).join(' · ') || '—'}</span></li>)}</ul>
    </section>)}
    <button className="primary" onClick={close}>{vi ? 'QUAY LẠI' : 'BACK TO MENU'}</button>
  </div></div>;
}

export function SettingsPanel({ engine, hud, close }: { engine: GameEngine | null; hud: HUDState; close: () => void }) {
  const [tab,setTab]=useState<'audio'|'display'>('audio');
  const vi=hud.language==='vi';
  return localize(<div className="modal-backdrop settings-backdrop"><div className="panel settings-panel settings-clean" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div className="panel-top"><span className="eyebrow gold">CÀI ĐẶT TRÒ CHƠI</span></div>
    <h2 id="settings-title">Điều chỉnh trải nghiệm</h2>
    <div className="settings-tabs" role="tablist" aria-label={vi?'Nhóm cài đặt':'Settings groups'}>
      {(['audio','display'] as const).map(id=><button key={id} id={`settings-tab-${id}`} type="button" role="tab" aria-selected={tab===id} aria-controls={`settings-${id}`} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'audio':e.key==='End'?'display':tab==='audio'?'display':'audio';setTab(next);document.getElementById(`settings-tab-${next}`)?.focus();}}}>{id==='audio'?(vi?'Âm thanh':'Audio'):(vi?'Hiển thị & điều khiển':'Display & controls')}</button>)}
    </div>
    <div className="settings-scroll" key={tab}>
      <div id={`settings-${tab}`} role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
      {tab==='audio'?<>
    <label className="setting-row"><span><Volume2 size={18}/><b>Âm lượng tổng</b><small>Toàn bộ âm thanh trò chơi</small></span><input aria-label="Âm lượng tổng" type="range" min="0" max="1" step="0.05" value={hud.volume} onChange={e=>engine?.setVolume(Number(e.target.value))}/><strong>{Math.round(hud.volume*100)}%</strong></label>
    <label className="setting-row"><span><MusicIcon size={18}/><b>Nhạc nền</b><small>Nhạc màn hình chính, nhạc boss và intro</small></span><input aria-label="Nhạc nền" type="range" min="0" max="1" step="0.05" value={hud.musicVolume} onChange={e=>engine?.setMusicVolume(Number(e.target.value))}/><strong>{Math.round(hud.musicVolume*100)}%</strong></label>
    <label className="setting-row"><span><Zap size={18}/><b>Hiệu ứng (SFX)</b><small>Đòn đánh, kỹ năng, bẫy và môi trường</small></span><input aria-label="Hiệu ứng (SFX)" type="range" min="0" max="1" step="0.05" value={hud.effectsVolume} onChange={e=>engine?.setEffectsVolume(Number(e.target.value))}/><strong>{Math.round(hud.effectsVolume*100)}%</strong></label>
    <label className="setting-row"><span><Volume2 size={18}/><b>Giọng nói</b><small>Lồng tiếng nhân vật và người kể chuyện</small></span><input aria-label="Giọng nói" type="range" min="0" max="1" step="0.05" value={hud.voiceVolume} onChange={e=>engine?.setVoiceVolume(Number(e.target.value))}/><strong>{Math.round(hud.voiceVolume*100)}%</strong></label>
    <label className="setting-row switch-row"><span><VolumeX size={18}/><b>Tắt âm</b><small>Tắt toàn bộ âm thanh trò chơi</small></span><input type="checkbox" checked={hud.isMuted} onChange={()=>engine?.toggleAudio()}/><i/></label>
      </>:<>
    <div className="setting-row"><span><Map size={18}/><b>{hud.language==='vi'?'Toàn màn hình':'Full screen'}</b><small>F</small></span><FullscreenButton vi={hud.language==='vi'}/></div>
    <label className="setting-row switch-row"><span><SlidersHorizontal size={18}/><b>Giảm chuyển động</b><small>Giảm sương, rung và hiệu ứng lặp</small></span><input type="checkbox" checked={hud.reducedMotion} onChange={e=>engine?.setReducedMotion(e.target.checked)}/><i/></label>
    <label className="setting-row switch-row"><span><Map size={18}/><b>Nhãn trong màn</b><small>Hiện gợi ý rune và nhãn mảnh thời gian</small></span><input type="checkbox" checked={hud.showHints} onChange={e=>engine?.setShowHints(e.target.checked)}/><i/></label>
    <label className="setting-row"><span><Map size={18}/><b>Language</b><small>Choose the game language</small></span><select aria-label="Language" value={hud.language} onChange={e=>engine?.setLanguage(e.target.value as 'en' | 'vi')}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
    <details className="setting-controls"><summary>{hud.language==='vi'?'Xem điều khiển':'View controls'}</summary><p>{hud.language==='vi'?'WASD / phím mũi tên: di chuyển · E: ghi đường đi · Q: gọi Echo · 1–6: chọn Echo · C: tạm dừng / tiếp tục Echo · Shift + Q: hoán đổi · X: thu hồi Echo lâu nhất · R: dùng vật phẩm thời gian · F: bật/tắt toàn màn hình · Chuột trái: tấn công · Chuột phải / Space: kỹ năng · Shift: lướt né · Esc: tạm dừng':'WASD / arrow keys: move · E: record path · Q: summon Echo · 1–6: select Echo · C: pause / resume Echo · Shift + Q: swap · X: recall oldest Echo · R: use time item · F: full screen · Left click: attack · Right click / Space: skill · Shift: dodge · Esc: pause'}</p></details>
    {hud.devUnlocked&&<div className="dev-supplies"><button className="secondary" onClick={()=>engine?.unlockDevMode()}>{hud.language==='vi'?'DEV · NẠP ĐẦY ĐỒ':'DEV · REFILL ALL ITEMS'}</button><p role="status">{hud.language==='vi'?'Đang sở hữu':'Owned'}: {ECHO_RUNES.filter(r=>(hud.echoRunes?.[r.id]??0)>0).length}/{ECHO_RUNES.length} rune · {hud.chestKeys.toLocaleString()} {hud.language==='vi'?'chìa khóa':'keys'} · {hud.limitRings.toLocaleString()} {hud.language==='vi'?'nhẫn':'rings'}</p></div>}
      </>}
      </div>
    </div><button className="primary" onClick={close}>LƯU & ĐÓNG</button>
  </div></div>);
}

const latestNews = { title: 'Diện mạo Tanuki mới', description: 'Chủ quầy có bộ lông nâu, mõm sáng và chiếc lá xanh trên đầu. Các động tác chào khách cũng được cập nhật đồng bộ.' };

export function Notifications({ close }: { close: () => void }) {
  return localize(<div className="modal-backdrop"><div className="panel news-panel"><div className="panel-top"><span className="eyebrow gold">THÔNG BÁO TRÒ CHƠI</span><button className="icon-close" aria-label="Đóng thông báo" onClick={close}><X size={18}/></button></div><h2>Tiếng vọng mới trong rừng</h2>
    <article className="news-feature"><span>MỚI · 09.11.2026</span><div><h3>{latestNews.title}</h3><p>{latestNews.description}</p></div></article><article><time>08.11.2026</time><div><h3>Cửa hàng Tanuki mới</h3><p>Ghé quầy Tanuki để mua vật phẩm và trò chuyện.</p></div></article><article><time>08.11.2026</time><div><h3>Diện mạo mới cho xu</h3><p>Xu gấu mèo pixel đã xuất hiện trong cửa hàng, túi đồ và phần thưởng của game.</p></div></article><article><time>08.11.2026</time><div><h3>Nhẫn tăng giới hạn</h3><p>Mua nhẫn trong cửa hàng với giá 30 xu để tăng giới hạn lên 6 Echo trong một màn. Hiệu ứng không cộng dồn.</p></div></article><article><time>08.11.2026</time><div><h3>Thứ tự thu hồi Echo</h3><p>Nhấn X để thu hồi Echo đã ở trên sân lâu nhất trước, theo thứ tự triệu hồi.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Chiêu gai băng của boss</h3><p>Vòng phép băng xuất hiện cảnh báo, sau đó gai băng trồi lên gây sát thương rồi tan biến.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Echo tự chiến đấu</h3><p>Echo thu hút kẻ địch, tự chiến đấu trong phạm vi gần và mất ổn định theo sát thương và chỉ bị thu hồi khi ổn định về 0.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Hiệu ứng nổ băng của boss</h3><p>Vòng băng xoay rồi nổ thành những mảnh xanh khi Thủ Vệ Băng tung chiêu.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Cửa hàng trên thanh menu</h3><p>Cửa hàng đã chuyển lên thanh trên cùng của sảnh, ngay cạnh nút về menu chính.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Hiệu ứng băng mới của boss</h3><p>Vòng băng xanh của Thủ Vệ Băng xoay trước khi gây sát thương rồi biến mất.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Điều chỉnh hướng nhìn nhân vật</h3><p>Nhân vật và Echo giờ quay theo hướng di chuyển, kể cả trong đấu trường boss.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Giao diện chọn nhân vật mới</h3><p>Màn chọn nhân vật có diện mạo rừng cổ mới. Xem trước Aeris hoặc Kael và nhấn Xác nhận để bắt đầu hành trình.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Trượng phép và cầu sét mới</h3><p>Trượng của Aeris có tinh thể xanh và kích thước cân đối hơn. Cầu phép và cầu sét được làm mới theo phong cách pixel xanh lam.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Diện mạo mới cho Aeris</h3><p>Pháp sư Aeris khoác áo choàng xanh viền vàng theo phong cách pixel chibi. Các hướng nhìn và chuyển động của Aeris cùng Echo đã được làm mới.</p></div></article>
    <article><time>08.11.2026</time><div><h3>Diện mạo mới cho Kael</h3><p>Kỵ sĩ Kael có diện mạo pixel chibi mới với tóc vàng, giáp bạc và áo choàng đỏ. Các hướng di chuyển và động tác chém cũng được làm mới.</p></div></article>
    <article><div><h3>Thử thách từng chặng</h3><p>Năm màn đầu có thời gian theo độ khó từng chặng. Mỗi chặng có một mảnh +3 giây; các rune cuối cần nhiều Echo giữ đồng thời. Bẫy dập và đá rơi giữ chân 0,25 giây; dây leo làm chậm cả một dải.</p></div></article>
    <article><time>06.11.2026</time><div><h3>Sảnh hành trình đã mở</h3><p>Chọn màn, xem tiến độ, điều chỉnh cài đặt và chơi lại bất kỳ màn nào sau khi hoàn thành chiến dịch.</p></div></article>
  </div></div>);
}

export function Lobby({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const [panel, setPanel] = useState<'none'|'news'|'settings'>('none');
  const [bag, setBag] = useState(false);
  const complete = engine?.campaign.bossDefeated === true;
  const next = Math.min(hud.completed.filter(id=>id<=5).length, 5);
  // Esc returns to the main menu, unless a lobby panel is open (Esc is for closing it then).
  useEffect(() => {
    if (panel !== 'none' || bag) return;
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape' && !document.querySelector('[data-lobby-dialog]')) { e.preventDefault(); engine?.goToMainMenu(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, bag, engine]);
  return localize(<div className="lobby-screen overlay journey-lobby"><div className="lobby-canopy"/><header className="lobby-header"><button className="camp-brand" onClick={()=>engine?.goToMainMenu()} aria-label={hud.language==='vi'?'Về menu chính':'Back to main menu'}><SelectedCharacterAvatar hud={hud}/><span><b>SECOND ME</b><small>ECHOES OF THE WILD</small></span></button><nav aria-label={hud.language==='vi'?'Tiện ích trại nghỉ':'Camp utilities'}><FullscreenButton vi={hud.language==='vi'}/><button onClick={()=>setBag(true)} aria-label={hud.language==='vi'?'Túi đồ':'Inventory'} title={hud.language==='vi'?'Túi đồ':'Inventory'}><Backpack size={22}/></button><button onClick={()=>engine?.openShop()} aria-label={hud.language==='vi'?'Cửa hàng':'Shop'} title={hud.language==='vi'?'Cửa hàng':'Shop'}><ShoppingBasket size={22}/></button><button onClick={()=>setPanel('settings')} aria-label={hud.language==='vi'?'Cài đặt':'Settings'} title={hud.language==='vi'?'Cài đặt':'Settings'}><Settings size={22}/></button></nav></header>
    <JourneyCamp engine={engine} hud={hud} complete={complete} next={next} traveler={<SelectedCharacterAvatar hud={hud}/>} onNews={()=>setPanel('news')}/>
    {bag&&<div className="modal-backdrop inventory-backdrop" onClick={()=>document.dispatchEvent(new Event('close-trail-inventory'))}><div className="panel inventory-modal forest-dialog" onClick={e=>e.stopPropagation()}><Inventory engine={engine} hud={hud} close={()=>setBag(false)}/></div></div>}
    <RuneChoiceDialog engine={engine} hud={hud}/>{panel==='news'&&<Notifications close={()=>setPanel('none')}/>} {panel==='settings'&&<SettingsPanel engine={engine} hud={hud} close={()=>setPanel('none')}/>}</div>);
}

export function Shop({engine, hud}: {engine: GameEngine | null; hud: HUDState}) { return <TanukiShop engine={engine} hud={hud}/>; }

export function Inventory({ hud, close,engine }: { hud: HUDState; close: () => void;engine?:GameEngine|null }) {
  return <TrailInventory hud={hud} engine={engine??null} close={close}/>;
}

type SelectableCharacter = 'mage' | 'swordsman' | 'mechanical';

export function Characters({engine, hud}: {engine: GameEngine | null; hud: HUDState}) {
  const vi = hud.language === 'vi';
  const [selected, setSelected] = useState<SelectableCharacter>(hud.characterClass);
  const grid = useRef<HTMLDivElement>(null);
  const [draftOutfits,setDraftOutfits]=useState<Record<OutfitHero,OutfitId>>(hud.outfits??{mage:'default',swordsman:'default'});
  // Start keyboard focus on the current hero, so focus and selection agree on open.
  useEffect(() => { grid.current?.querySelector<HTMLButtonElement>('.is-selected')?.focus({preventScroll: true}); }, []);
  const roster: {id: SelectableCharacter; name: string; roleVi: string; roleEn: string}[] = [
    {id:'mage', name:'Aeris', roleVi:'Pháp sư', roleEn:'Mage'},
    {id:'swordsman', name:'Kael', roleVi:'Kiếm sĩ', roleEn:'Swordsman'},
    ...(MECHANICAL_ENABLED && hud.mechanicalOwned ? [{id:'mechanical' as const, name:'Rivet-07', roleVi:'Cơ giới', roleEn:'Mechanic'}] : []),
  ];
  const choice = roster.find(c => c.id === selected) ?? roster[0];
  const portrait = (id: SelectableCharacter,outfit?:OutfitId) => id === 'mage' ? <AerisPortrait outfit={outfit}/> : id === 'swordsman' ? <KaelPortrait outfit={outfit}/> : <MechanicalPortrait/>;
  const outfit=choice.id==='mechanical'?'default':draftOutfits[choice.id];
  const outfitInfo=OUTFITS.find(o=>o.id===outfit)!;
  const outfitColor=RARITY_COLORS[characterOutfitRarity(choice.id==='mechanical'?'swordsman':choice.id,outfit)];
  const detail = choice.id === 'mage'
    ? (vi ? 'Chuột phải: ma pháp gai băng, ưu tiên boss, rồi quái gần nhất, cuối cùng là vị trí chuột. Hồi chiêu 6 giây.' : 'Right-click: Ice Spike magic targets the boss, then the nearest enemy, then the cursor. Cooldown: 6 seconds.')
    : choice.id === 'swordsman'
    ? (vi ? 'Kiếm sĩ cận chiến với Kiếm Echo. Pháp trận ánh sáng tăng sát thương và hồi máu trong 5 giây.' : 'A close-range fighter wielding the Echo sword. Light Sanctuary boosts damage and restores health for five seconds.')
    : (vi ? 'Chiến binh cơ giới dùng cưa máy. Kỹ năng Quá tải tăng tốc đánh trong 5 giây.' : 'A mechanical fighter wielding a chainblade. Overdrive boosts attack speed for five seconds.');
  const confirm = () => { if (!engine) return; if(choice.id!=='mechanical')engine.setCharacterOutfit(choice.id,outfit);engine.selectClass(choice.id); engine.goToLobby(); };
  return <div className="characters-screen overlay hero-select-screen">
    <div className="hero-select-scene has-outfit-selector" role="dialog" aria-modal="true" aria-labelledby="hero-select-title">
      <h1 id="hero-select-title" className="hero-select-title">{vi ? 'CHỌN NHÂN VẬT' : 'CHOOSE YOUR HERO'}</h1>
      <button className="hero-select-back" onClick={() => engine?.goToLobby()} aria-label={vi ? 'Về sảnh' : 'Back to lobby'}>{vi ? 'VỀ SẢNH' : 'BACK'}</button>
      <div className="hero-outfit-workspace">
       <div className="hero-roster" ref={grid} role="group" aria-label={vi?'Chọn nhân vật':'Choose character'}>{roster.map(c=><button key={c.id} className={`hero-slot${choice.id===c.id?' is-selected':''}`} aria-pressed={choice.id===c.id} aria-label={c.name} onClick={()=>setSelected(c.id)}><span className="roster-portrait">{portrait(c.id,c.id==='mechanical'?undefined:draftOutfits[c.id])}</span><strong>{c.name}</strong></button>)}</div>
       <div className="outfit-large-preview"><span>{choice.name}</span><div>{portrait(choice.id,outfit)}</div><strong style={{color:outfitColor}}>{vi?outfitInfo.vi:outfitInfo.en}</strong></div>
       <section className="outfit-collection" aria-label={vi?'Trang phục':'Outfits'}><header><strong>{vi?'TRANG PHỤC':'OUTFITS'}</strong><small>{vi?'Đổi ngoại hình · Giữ nguyên chỉ số':'Appearance only · Same stats'}</small></header><div className="outfit-options" role="group" aria-label={vi?'Chọn trang phục':'Choose outfit'}>{(choice.id==='mechanical'?OUTFITS:orderedCharacterOutfits(choice.id,hud.ownedOutfits??[])).map(o=><button key={choice.id+o.id} className={outfit===o.id?'outfit-selected':''} aria-pressed={outfit===o.id} aria-label={(vi?o.vi:o.en)+((choice.id!=='mechanical'&&!canWearOutfit(choice.id,o.id,hud.ownedOutfits??[]))?(vi?' · Mua trong cửa hàng':' · Available in shop'):'')} disabled={choice.id==='mechanical'?o.id!=='default':!canWearOutfit(choice.id,o.id,hud.ownedOutfits??[])} style={{'--outfit-color':RARITY_COLORS[characterOutfitRarity(choice.id==='mechanical'?'swordsman':choice.id,o.id)]} as React.CSSProperties} onClick={()=>{if(choice.id!=='mechanical')setDraftOutfits(old=>({...old,[choice.id]:o.id}));}}><span>{portrait(choice.id,o.id)}</span><strong>{vi?o.vi:o.en}</strong>{outfit===o.id&&<Check size={16}/>}</button>)}</div></section>
      </div>
      <section className="hero-select-info" aria-live="polite">
        <div className="hero-info-portrait">{choice.id === 'mage' || choice.id === 'swordsman' ? <ComboPreview key={choice.id} hero={choice.id} outfit={outfit}/> : portrait(choice.id)}</div>
        <div className="hero-info-copy"><h2>{choice.name} · {vi ? choice.roleVi : choice.roleEn}</h2><p>{detail}</p><small>{vi ? 'VŨ KHÍ' : 'WEAPON'} · {choice.id === 'mage' ? (vi ? 'Trượng phép' : 'Magic staff') : choice.id === 'swordsman' ? (vi ? 'Kiếm' : 'Sword') : (vi ? 'Cưa máy' : 'Chainblade')} · <span style={{color:outfitColor}}>{vi?outfitInfo.vi:outfitInfo.en}</span></small></div>
        <div className="hero-info-action"><span>{choice.id === hud.characterClass ? (vi ? 'ĐANG CHỌN' : 'CURRENT HERO') : (vi ? 'NHÂN VẬT SẴN SÀNG' : 'HERO READY')}</span><button type="button" onClick={confirm} disabled={!engine}>{vi ? 'TRANG BỊ & CHỌN' : 'EQUIP & CONFIRM'}</button></div>
      </section>
    </div>
  </div>;
}

export function Title({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const [tab, setTab] = useState<'none' | 'trails' | 'help'>('none');
  return localize(<div className="title-screen overlay">
    <div className="title-top"><span className="eyebrow">THE OVERGROWN RUINS / CHAPTER II</span><span className="version">ECHOES OF THE WILD</span></div>
    <div className="title-lockup"><span className="eyebrow gold">KÝ ỨC · LỬA THIÊNG · LƯỠI KIẾM</span><h1>SECOND ME</h1><p className="title-sub">ECHOES OF THE WILD</p><div className="title-rule"/><p className="title-description">Để quá khứ dẫn lối.<br/>Thu hồi năm di vật. Đánh thức khu rừng.</p>
      <div className="title-actions">{hud.completed.length > 0 && <button className="primary" onClick={() => engine?.continueGame()}>TIẾP TỤC HÀNH TRÌNH <ArrowRight size={18}/></button>}
        <button className={hud.completed.length ? 'secondary' : 'primary'} onClick={() => engine?.startGame()}>{hud.completed.length ? 'HÀNH TRÌNH MỚI' : 'BẮT ĐẦU HÀNH TRÌNH'} <ArrowRight size={18}/></button>
        <div className="button-row"><button className="text-button" onClick={() => setTab('trails')}>CÁC MÀN CHƠI</button><button className="text-button" onClick={() => setTab('help')}>CÁCH CHƠI</button></div>
      </div>
    </div><div className="title-footer">5 MÀN GIẢI ĐỐ <span>◇</span> 1 TRẬN BOSS</div>
    {tab !== 'none' && <div className="modal-backdrop"><div className="panel trail-panel"><div className="panel-top"><span className="eyebrow gold">{tab === 'trails' ? 'HÀNH TRÌNH CỦA BẠN' : 'DẤU VẾT CỦA QUÁ KHỨ'}</span><button className="text-button" onClick={() => setTab('none')}>ĐÓNG ×</button></div>
      {tab === 'trails' ? <><h2>Những lối mòn</h2><div className="trail-list">{LEVELS.map((level, index) => {
        const unlocked = hud.devUnlocked || (index>=6?(index===6||hud.completed.includes(index)):index<=hud.completed.filter(id=>id<=5).length);
        return <button key={level.id} disabled={!unlocked} onClick={() => engine?.selectLevel(index)} className="trail-item"><span className="trail-number">0{level.id}</span><span><strong>{level.subtitle}</strong><small>{level.description}</small></span>{!unlocked ? <Lock size={17}/> : hud.completed.includes(level.id) ? <Check size={18}/> : <ArrowRight size={18}/>}</button>;
      })}</div></> : <><h2>Hợp tác với chính mình</h2><div className="help-grid"><p><kbd>W A S D</kbd> / phím mũi tên: di chuyển.</p><p><kbd>E</kbd> bắt đầu ghi; nhấn lần nữa để lưu. Echo đứng ở điểm cuối.</p><p><kbd>1–6</kbd> chọn Echo; <kbd>C</kbd> tạm dừng; <kbd>Shift + Q</kbd> hoán đổi khi đường thẳng không bị chặn.</p><p><kbd>Q</kbd> gọi Echo. Để Echo giữ nút trong khi bạn vượt cổng. <kbd>X</kbd> xóa Echo.</p><p>5 màn đầu: thời gian mỗi chặng thay đổi theo màn. Đặt Echo giữ các rune được ghi bên cổng cuối; màn 5 có 5 rune nhưng chỉ cần giữ đúng 4 rune cuối. Mỗi chặng có tối đa một mảnh +3 giây và dùng một bình +2 giây; không thể farm vô hạn. Chỉ nhân vật chạm rune kế tiếp mới được nạp giờ.</p><p>Bẫy dập và đá rơi có viền vàng báo trước, gây 20 sát thương và giữ chân 0,25 giây khi trúng. Dây leo làm chậm 45% trên cả dải; có thể đi vòng.</p><p>Sau mỗi màn 1–5, chọn một trong ba ấn Echo ngẫu nhiên. Hoàn thành năm màn để mở trạm chuẩn bị; không tiêu hao ấn để mở boss.</p><p>Chuột trái tấn công; chuột phải hoặc <kbd>Space</kbd> dùng kỹ năng class; <kbd>R</kbd> dùng vật phẩm +2 giây; <kbd>F</kbd> bật/tắt toàn màn hình. <kbd>Shift</kbd> lướt né; <kbd>Esc</kbd> tạm dừng.</p><p>Boss báo trước đòn đánh bằng vòng băng xanh. Né ra ngoài; Echo giữ ấn sẽ tăng sức mạnh.</p></div></>}
    </div></div>}
  </div>);
}

export function AdventureHUD({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const [bag, setBag] = useState(false);
  const [touch] = useState(isTouchDevice);
  const boss = hud.bossHp > 0;
  return localize(<div className="adventure-hud overlay">
    {hud.bossIntroduction&&<BossIntro engine={engine} hud={hud}/>}

    <div className="hud-top"><div className="level-card"><small>{hud.levelName}{hud.training?' · DEV':' / 13'}</small><strong>{hud.levelSubtitle}</strong><span>{Math.floor(hud.elapsedLevelTime / 60).toString().padStart(2,'0')}:{Math.floor(hud.elapsedLevelTime % 60).toString().padStart(2,'0')} <i/> <span className="player-health" role="meter" aria-label={hud.language==='vi'?'Máu nhân vật':'Player health'} aria-valuenow={hud.health} aria-valuemin={0} aria-valuemax={hud.maxHealth??100}><b style={{width:`${hud.health/(hud.maxHealth??100)*100}%`}}/><strong>{hud.health} / {hud.maxHealth??100} HP</strong></span></span>
      {(hud.enemiesRemaining??0)>0&&<small>{boss?(hud.language==='vi'?`QUỶ LỬA · ${hud.enemiesRemaining}`:`MINIONS · ${hud.enemiesRemaining}`):(hud.language==='vi'?`QUÁI CANH ĐƯỜNG · ${hud.enemiesRemaining}`:`TRAIL ENEMIES · ${hud.enemiesRemaining}`)}</small>}
      {(hud.echoCount>0 || hud.echoDurationMs>0) && <div className="echo-timeline" aria-label="Echo timeline"><span>ECHO {hud.echoCount}/{hud.echoLimit} · {hud.echoCharges} {hud.language==='vi'?'lượt':'charges'} · {Math.ceil(hud.echoStability)} {hud.language==='vi'?'ổn định':'stability'}</span>{hud.echoDurationMs>0 && <div className="echo-timeline-track"><i style={{left:`${Math.min(100,hud.echoElapsedMs/hud.echoDurationMs*100)}%`}}/>{hud.echoEvents.map((event,index)=><b key={index} style={{left:`${Math.min(100,event.time/hud.echoDurationMs*100)}%`}} title={`${event.kind} · ${(event.time/1000).toFixed(1)}s`}>{event.kind==='attack'?'✦':'◆'}</b>)}</div>}</div>}
    </div>
      <div className="hud-tools"><span className="hud-wallet"><CoinIcon/> {hud.coins} · +2s ×{hud.timeItems}</span><button aria-label={hud.language==='vi'?'Túi đồ':'Inventory'} title={hud.language==='vi'?'Túi đồ':'Inventory'} onClick={() => setBag(!bag)}><Backpack size={17}/></button><button aria-label={hud.language==='vi'?'Tạm dừng':'Pause game'} title="Esc" onClick={() => engine?.pauseGame()}><Pause size={17}/></button></div>
    {hud.legTimeRemaining !== null && <div className={'leg-clock ' + (hud.legTimeRemaining <= 2 ? 'urgent' : '')} role="timer" aria-label="Thời gian đến điểm kế tiếp"><div><span>{hud.checkpointIndex < hud.checkpointCount ? `ĐẾN ẤN THẠCH ${hud.checkpointIndex+1} / ${hud.checkpointCount}` : 'ĐẾN CỔNG THOÁT'}</span><strong>{hud.legTimeRemaining.toFixed(1)}<small>s</small></strong></div><div className="leg-track"><i style={{width: `${Math.min(100,hud.legTimeRemaining/(hud.legTimeBudget??16)*100)}%`}}/></div><p>{hud.slowed ? 'DÂY LEO · TỐC ĐỘ −45%' : (hud.finalGateCrossed ? ((engine?.currentLevel.id??0)>=7&&(hud.enemiesRemaining??0)>0?(hud.language==='vi'?`CÒN ${hud.enemiesRemaining} QUÁI · HẠ QUÁI ĐỂ MỞ CỔNG`:`${hud.enemiesRemaining} ENEMIES · CLEAR TO OPEN EXIT`):(hud.language==='vi'?'LỐI THOÁT ĐÃ MỞ':'EXIT OPEN')) : hud.finalGateNeedsRelease ? (hud.language==='vi'?'CỔNG CUỐI · NHẢ ẤN ĐÁNH DẤU':'FINAL GATE · RELEASE MARKED RUNE') : (hud.language==='vi'?`ẤN CỔNG CUỐI: ${hud.runesHeld??0} / ${hud.runesRequired??0}`:`FINAL SEALS: ${hud.runesHeld??0} / ${hud.runesRequired??0}`))}</p></div>}
    {hud.legTimeRemaining === null && !boss && <div className="leg-clock run-clock" role="timer" aria-label={hud.language==='vi'?'Thời gian màn chơi':'Level time'}><div><span>{hud.language==='vi'?'THỜI GIAN MÀN CHƠI':'LEVEL TIME'}</span><strong>{Math.floor(hud.elapsedLevelTime/60).toString().padStart(2,'0')}:{Math.floor(hud.elapsedLevelTime%60).toString().padStart(2,'0')}</strong></div><p>{hud.devUnlocked||hud.training?(hud.language==='vi'?'KHÔNG GIỚI HẠN · CHẾ ĐỘ TẬP':'NO TIME LIMIT · PRACTICE'):(hud.language==='vi'?'THỜI GIAN ĐÃ CHƠI':'ELAPSED TIME')}</p></div>}
    {boss && <div className="boss-bar"><div><span>{hud.bossKind==='demon'?'QUỶ TÂM HỎA':'THỦ VỆ BĂNG'}</span><small>{hud.bossHp} / {hud.bossMaxHp??240} · {translate('GIAI ĐOẠN',hud.language)} {hud.bossPhase} / 3</small></div><div className="health-track boss-segments" role="progressbar" aria-label="Máu boss" aria-valuenow={hud.bossHp} aria-valuemin={0} aria-valuemax={hud.bossMaxHp??240}><i style={{ width: `${hud.bossHp/(hud.bossMaxHp??240)*100}%` }}/>{[1,2,3].map(k=><b key={k} className={hud.bossHp>k*(hud.bossMaxHp??240)/4?'':'spent'} style={{left:`${k*25}%`}}/>)}</div><p className="boss-armor">{hud.bossKind==='demon'?(hud.demonStunned?(hud.language==='vi'?'SƠ HỞ CHOÁNG · SÁT THƯƠNG ×2.5 · ĐÁNH NGAY!':'STUNNED · 2.5× DAMAGE · STRIKE NOW!'):hud.demonRitual?(hud.language==='vi'?'TẾ LỄ NGUYÊN TỐ · ĐỨNG LÊN TRỤ ĐỂ PHONG ẤN!':'RITUAL · STAND ON CORE TO SEAL!'):hud.demonHeatShield?(hud.language==='vi'?'GIÁP KHÁNG HỎA · DỤ BOSS HÚC VÀO TRỤ TẢN NHIỆT!':'HEAT SHIELD · BAIT BOSS INTO COOLING VENT!'):hud.bossVulnerable?(hud.language==='vi'?'SƠ HỞ · PHẢN CÔNG +35%':'OPENING · DAMAGE +35%'):(hud.language==='vi'?'NÉ VÙNG CAM · DỤ BOSS ĐÁNH ECHO':'EVADE ORANGE ZONES · BAIT ATTACKS ON ECHO')):hud.pillarsRemaining>0?(hud.language==='vi'?`PHÁ ${hud.pillarsRemaining} TRỤ · GIÁP ${hud.bossArmor}`:`BREAK ${hud.pillarsRemaining} PILLARS · ARMOR ${hud.bossArmor}`):hud.bossVulnerable?(hud.language==='vi'?'SƠ HỞ · SÁT THƯƠNG +35%':'OPENING · DAMAGE +35%'):(hud.bossShieldAt??0)>0?(hud.language==='vi'?`KHIÊN KẾ TIẾP · ${hud.bossShieldAt} HP`:`NEXT SHIELD · ${hud.bossShieldAt} HP`):(hud.language==='vi'?'ĐOẠN MÁU CUỐI':'FINAL HEALTH BAR')}</p></div>}
    </div>
    <div className="hud-alerts">
      {hud.bannerMessage && <div className={'hud-banner ' + (boss ? 'boss-banner' : 'trail-banner')}>{hud.bannerMessage}</div>}
      {hud.activeBuff && <div className="combat-buff">{hud.activeBuff}</div>}
      {hud.dissonanceSeconds>0 && <div className="combat-buff" role="status">RẠN VỠ {hud.dissonanceSeconds.toFixed(1)} / 5s · Gọi Echo để bảo hộ</div>}
    </div>
    {!bag&&!hud.bossIntroduction&&<CombatActionBar engine={engine} hud={hud} touch={touch}/>}
    {touch&&!bag&&!hud.bossIntroduction&&<TouchJoystick engine={engine} vi={hud.language==='vi'}/>}
    {/* Selected runes are managed and activated inside Inventory. */}
    {bag && <div className="modal-backdrop inventory-backdrop" onClick={()=>document.dispatchEvent(new Event('close-trail-inventory'))}><div className="panel inventory-modal forest-dialog" onClick={e=>e.stopPropagation()}><Inventory engine={engine} hud={hud} close={()=>setBag(false)}/></div></div>}
  </div>);
}

function VictoryOrnaments(){
 return <div className="victory-ornaments" aria-hidden="true"><span>✦</span><i/><i/><i/><i/><i/></div>;
}

export function VictoryStars({count,vi}:{count:number;vi:boolean}){
 return <div className="victory-stars" role="img" aria-label={`${count} / 3 ${vi?'sao':'stars'}`}>
  {[0,1,2].map(i=><span key={i} className={`victory-star ${i<count?'earned':'unearned'}`} style={{'--star-delay':`${.2+i*.24}s`} as React.CSSProperties}>
   <svg viewBox="0 0 100 100" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M44 6H56V18H62V30H68V36H94V48H82V60H74V70H80V88H68V82H56V76H44V82H32V88H20V70H26V60H18V48H6V36H32V30H38V18H44Z" className="star-outline"/>
    <path d="M48 14H52V26H58V38H70V42H84V46H74V56H66V68H70V78H64V72H54V66H46V72H36V78H30V68H34V56H26V46H16V42H30V38H42V26H48Z" className="star-face"/>
    <path d="M48 14H52V47L16 42H30V38H42V26H48Z" className="star-light"/>
    <path d="M52 47L70 78H64V72H54V66H46V72H36V78H30L46 48Z" className="star-shade"/>
   </svg><i>✦</i>
  </span>)}
 </div>;
}

export function Completion({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  return <RuneRewardFlow engine={engine} hud={hud}/>;
}

function DefeatScreen({engine,hud}:{engine:GameEngine|null;hud:HUDState}){
 const vi=hud.language==='vi',timeout=hud.defeatReason==='timeout',boss=!!engine?.boss;
 const hint = timeout
  ? (vi ? 'Chạm ấn kế tiếp để nạp lại giờ. Mảnh thời gian cộng 3 giây.' : 'Reach the next rune to refill the timer. Time shards add 3 seconds.')
  : boss
   ? (vi ? 'Phá 4 trụ để hạ khiên. Rời vùng báo đòn, rồi đánh khi hiện “Sơ hở”.' : 'Break 4 pillars to drop the shield. Dodge marked attacks, then strike during “Opening”.')
   : (vi ? 'Rời vòng cảnh báo trước khi quái hoặc bẫy ra đòn.' : 'Leave the marked area before enemies or traps strike.');
 return <div className="modal-backdrop defeat-backdrop"><section className="defeat-stage forest-defeat" data-reduced-motion={hud.reducedMotion} data-reason={timeout?'timeout':'damage'} role="dialog" aria-modal="true" aria-labelledby="defeat-title">
  <span className="defeat-kicker">{vi?'MỘT LẦN VẤP NGÃ · CHƯA PHẢI KẾT THÚC':'ONE FALL · NOT THE END'}</span>
  <h2 id="defeat-title">{timeout?(vi?'HẾT THỜI GIAN':'TIME RAN OUT'):(vi?'GỤC NGÃ':'FALLEN')}</h2>
  <p className="defeat-level">{translate(hud.levelName,hud.language)} · {translate(hud.levelSubtitle,hud.language)}</p>
  <div className="defeat-hero-scene" data-hero={hud.characterClass} role="img" aria-label={timeout?(vi?'Nhân vật bị dừng lại vì hết giờ':'Your hero stopped as time expired'):(vi?'Nhân vật đã gục ngã':'Your fallen hero')}><div className="defeat-rays"/>{timeout?<div className="defeat-timeout-art"/>:<div className="defeat-collapse-art"/>}</div>
  <div className="defeat-stats"><span>{vi?'THỜI GIAN':'TIME'} <b>{hud.elapsedLevelTime.toFixed(1)}s</b></span><span>{vi?'MÀN CHƠI':'TRAIL'} <b>{String((engine?.currentLevelIdx??0)+1).padStart(2,'0')}</b></span></div>
  <p className="defeat-hint">{hint}</p>
  {engine?.canUseSupply('revive')&&<button className="defeat-revive" onClick={()=>engine.useSupply('revive')}>{vi?'DÙNG TRỤC PHỤC SINH · VỀ PHÁP ĐÀN':'USE REVIVAL SCROLL · RETURN TO ALTAR'} <span>× {hud.supplies?.revive??0}</span></button>}
  <button className="defeat-retry" onClick={()=>engine?.restartLevel()}><RotateCcw size={18}/>{vi?'THỬ LẠI':'TRY AGAIN'}<ArrowRight size={17}/></button>
  <button className="defeat-return" onClick={()=>engine?.goToLobby()}><Map size={15}/>{vi?'VỀ TRẠI':'BACK TO BASE CAMP'}</button>
 </section></div>;
}

export function EndScreen({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  if(hud.screen!=='ending')return <DefeatScreen engine={engine} hud={hud}/>;
  const vi=hud.language==='vi',hero=hud.characterClass==='swordsman'?'Kael':hud.characterClass==='mechanical'?'Rivet-07':'Aeris';
  return <div className="modal-backdrop finale-backdrop"><section className="journey-finale" data-reduced-motion={hud.reducedMotion} role="dialog" aria-modal="true" aria-labelledby="finale-title">
    <header className="finale-heading"><span>{vi?'HÀNH TRÌNH HOÀN TẤT':'JOURNEY COMPLETE'}</span><b>VI / VI</b></header>
    <div className="finale-body"><div className="finale-hero" data-character={hud.characterClass}><div className="hero-echo-ring"/><div className="finale-portrait"><SelectedCharacterAvatar hud={hud}/></div><span>{hero}</span><small>{vi?'NGƯỜI GÌN GIỮ KÝ ỨC':'KEEPER OF ECHOES'}</small></div>
    <div className="finale-story"><span className="finale-kicker">{vi?'THỦ VỆ BĂNG ĐÃ GỤC NGÃ':'THE FROST GUARDIAN HAS FALLEN'}</span><h2 id="finale-title">{vi?'Khu rừng\nđã thức giấc.':'The forest\nawakens.'}</h2><p>{vi?'Bạn và các Echo đã hoàn thành cả sáu thử thách.':'You and your Echoes completed all six trials.'}</p>
    <div className="finale-seals" aria-label={vi?'Đã hoàn thành 6 màn':'All six trials completed'}>{['I','II','III','IV','V','VI'].map(n=><span key={n}>{n}<Check size={12}/></span>)}</div>
    <div className="finale-stats"><span>{vi?'THỜI GIAN ĐẤU BOSS':'BOSS BATTLE'}<b>{hud.elapsedLevelTime.toFixed(1)}s</b></span><span>{vi?'XẾP HẠNG':'RATING'}<b aria-label={`${hud.lastRating?.stars??0} / 3`}>{'★'.repeat(hud.lastRating?.stars??0)}{'☆'.repeat(3-(hud.lastRating?.stars??0))}</b></span></div>
    <p className="finale-key-reward">+{hud.lastRating?.keys??0} {vi?'CHÌA KHÓA MỞ RƯƠNG':'CHEST KEYS'}</p>
    <p className="finale-saved">{vi?'Tiến trình đã lưu · Cả sáu màn đã mở để chơi lại.':'Progress saved · All six trails are open for replay.'}</p></div></div>
    <footer className="finale-actions"><button className="secondary" onClick={()=>engine?.restartLevel()}><RotateCcw size={17}/>{vi?'ĐẤU LẠI BOSS':'REMATCH GUARDIAN'}</button><button className="primary" onClick={()=>engine?.goToLobby()}><Map size={18}/>{vi?'VỀ TRẠI':'BACK TO BASE CAMP'}<ArrowRight size={17}/></button></footer>
  </section></div>;
}
