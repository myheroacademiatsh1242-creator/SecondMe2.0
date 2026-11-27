import {actionForInput,bindingLabel,controls,liveKeyLabel} from '../game/logic/controlSettings.ts';
import {ControlSettingsPanel} from './ControlSettingsPanel.tsx';
import {DEFEAT_ART,PANEL_ART,usePanelArt} from './panelArt.ts';
import { GUARDIAN_HP, SHARD_BONUS } from '../game/logic/balance.ts';
import { COMBO_HITS } from '../game/logic/combo.ts';
import { ICE_MAGIC, ENEMY_CHILL } from '../game/logic/iceMagic.ts';
import './ForestDefeat.css';
import {RuneRewardFlow} from './RuneRewardFlow.tsx';
import {isDeluxe,OUTFITS,canWearOutfit,characterOutfitRarity,orderedCharacterOutfits,type OutfitId,type OutfitHero} from '../game/logic/outfits.ts';
import {RARITY_COLORS,rarityName} from '../game/logic/rarity.ts';
import {DEFAULT_WEAPON,TRAIT_TEXT,canUseWeapon,weaponById,weaponsOf,type WeaponHero,type WeaponId} from '../game/logic/weapons.ts';
import './JourneyFinale.css';
import './CombatActionBar.css';
import { CombatActionBar } from './CombatActionBar.tsx';
import { TouchJoystick, TouchEchoStrip } from './TouchControls.tsx';
import { FullscreenButton } from './FullscreenButton.tsx';
import { isTouchDevice } from '../game/logic/orientation.ts';
import { TrailInventory } from './TrailInventory.tsx';
import { CombatItemSlots } from './InventorySupplies.tsx';
import { TanukiShop } from './TanukiShop.tsx';
import { ECHO_RUNES } from '../game/logic/echoRunes.ts';
import { EchoRuneStock, RuneChoiceDialog } from './EchoRunes.tsx';
import { JourneyCamp } from './JourneyCamp.tsx';
import { MechanicalPortrait } from './MechanicalPortrait.tsx';
import { IntroEffects } from './IntroEffects.tsx';
import { MenuVines } from './MenuVines.tsx';
import { MenuWizard } from './MenuWizard.tsx';
import { drawSantaHat } from './HeroSantaHat.ts';
import { ChristmasEvent, ChristmasLights, ChristmasMenuGlow, ChristmasSnow, useChristmas } from './ChristmasEvent.tsx';
import credits from '../game/data/credits.json';
import { HeroStagePreview } from './ComboShowcase.tsx';
import { WeaponPreview } from './WeaponPreview.tsx';
import { HeroUpgrades } from './HeroUpgrades.tsx';
import { cleanHeroRanks, heroStats, isUpgradeHero } from '../game/logic/heroUpgrades.ts';
import React, { useEffect, useRef, useState } from 'react';
import { drawWizardSprite } from '../game/rendering/wizardSprite.ts';
import { sounds } from '../game/logic/sound.ts';
import { drawSoldierSprite } from '../game/rendering/soldierSprite.ts';
import { drawAssassinSprite } from '../game/rendering/assassinSprite.ts';
import { localize } from '../localize.tsx';
import { translate } from '../i18n.ts';
import { BookOpen, ArrowRight, ChevronLeft, ChevronRight, RotateCcw, Home, Pause, Volume2, VolumeX, Lock, Sword, Check, Shield, Backpack, Bell, Settings, Map, Play, X, SlidersHorizontal, ShoppingBasket, Music as MusicIcon, Zap, ChevronsUp, Gift } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { MECHANICAL_ENABLED } from '../game/logic/campaign.ts';
import { LEVELS } from '../game/logic/levels.ts';
import { NewDot } from './FeatureIntro.tsx';

function CoinIcon() { return <img className="raccoon-coin" src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`} alt="" aria-hidden="true"/>; }

type PortraitProps = {outfit?:OutfitId;direction?:'up'|'down'|'left'|'right';winter?:boolean};
function AerisPortrait({outfit,direction='down',winter=false}:PortraitProps={}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 70, 70);
      const drawn = drawWizardSprite(ctx, 35, winter && !isDeluxe(outfit) ? 66 : 55, direction, false, false, 0, outfit);
      if (winter && !isDeluxe(outfit) && drawn) drawSantaHat(ctx, 35, direction === 'up' ? 22 : 19, 34, direction === 'left');
    };
    draw(); const timer = window.setInterval(draw, 250); return () => window.clearInterval(timer);
  }, [outfit,direction,winter]);
  return <canvas ref={ref} width={70} height={70} role="img" aria-label="Aeris"/>;
}
function WizardAvatar({className='',winter=false}:{className?:string;winter?:boolean}) { return <span className={`wizard-avatar ${className}`}><AerisPortrait winter={winter}/></span>; }
function KaelPortrait({outfit,direction='down',winter=false}:PortraitProps={}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 70, 70);
      drawSoldierSprite(ctx, 35, winter && !isDeluxe(outfit) ? 66 : 55, direction, false, false, 0, false, 0, outfit);
      if (winter && !isDeluxe(outfit)) drawSantaHat(ctx, 37, direction === 'up' ? 21 : 18, 28, direction === 'left');
    };
    draw(); const timer = window.setInterval(draw, 250); return () => window.clearInterval(timer);
  }, [outfit,direction,winter]);
  return <canvas ref={ref} width={70} height={70} role="img" aria-label="Kael"/>;
}
/**
 * Life for the winter clearing (hero select, assets/ui/noel/hero-selection-clearing-winter.png). Every spot is a
 * percentage of the painting, which fills the scene: the string lights twinkle, both lanterns flicker, the moon
 * breathes, mist drifts over the snow, gold motes float, glints sparkle on the ground, and a near layer of big
 * flakes falls in front of the far snow.
 */
const WINTER_BULBS: [number, number][] = [[23.2, 18.1], [26.5, 18.3], [29.8, 14.3], [32.8, 14.6], [39.6, 11.2], [43.1, 11.9], [52.4, 10.3], [55.7, 10.9]];
function WinterAmbience({ still = false }: { still?: boolean }) {
  return <div className={`winter-ambience${still ? ' winter-ambience--still' : ''}`} aria-hidden="true">
    <i className="winter-moon"/>
    <i className="winter-lantern" style={{left: '19.9%', top: '29.5%', '--glow': '9cqw'} as React.CSSProperties}/>
    <i className="winter-lantern" style={{left: '7.2%', top: '62.8%', '--glow': '7cqw', animationDelay: '-.7s'} as React.CSSProperties}/>
    {WINTER_BULBS.map(([x, y], i) => <i key={`b${i}`} className="winter-bulb" style={{left: `${x}%`, top: `${y}%`,
      '--bulb': ['#ffd76a', '#ff6b5e', '#8fe388'][i % 3], animationDelay: `-${i * .45}s`} as React.CSSProperties}/>)}
    <i className="winter-mist"/><i className="winter-mist winter-mist--far"/>
    {Array.from({ length: 9 }, (_, i) => <i key={`m${i}`} className="winter-mote" style={{left: `${18 + (i * 37) % 60}%`, top: `${30 + (i * 23) % 40}%`,
      animationDelay: `-${i * 1.3}s`, animationDuration: `${6 + i % 4 * 1.5}s`} as React.CSSProperties}/>)}
    {Array.from({ length: 12 }, (_, i) => <i key={`g${i}`} className="winter-glint" style={{left: `${8 + (i * 41) % 84}%`, top: `${76 + (i * 13) % 20}%`,
      animationDelay: `-${i * .73}s`, animationDuration: `${2.6 + i % 5 * .5}s`} as React.CSSProperties}/>)}
    {Array.from({ length: 8 }, (_, i) => <i key={`f${i}`} className="winter-flake" style={{left: `${(i * 61 + 9) % 95}%`,
      '--drift': `${(i % 5 - 2) * 30}px`, animationDelay: `-${i * 1.6}s`, animationDuration: `${8 + i % 4 * 1.7}s`} as React.CSSProperties}/>)}
  </div>;
}
/** Pixel leaves drifting down over the forest clearing (hero select). */
function FallingLeaves({ still = false, count = 18 }: { still?: boolean; count?: number }) {
  return <div className={`falling-leaves${still ? ' falling-leaves--still' : ''}`} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => <i key={i} style={{
      '--x': `${(i * 53 + 7) % 97}%`,
      '--y': `${(i * 31 + 9) % 90}%`,
      '--size': `${12 + i % 3 * 4}px`,
      '--drift': `${(i % 7 - 3) * 22}px`,
      '--fall': `${9 + i % 6 * 1.3}s`,
      '--delay': `-${i * 1.37}s`,
      '--leaf': ['#9fd05a', '#c8e06a', '#f0c24a', '#e08a3c', '#7fbf4e'][i % 5],
    } as React.CSSProperties}/>)}
  </div>;
}
function CrimsonPortrait({outfit,direction='down',demo=false}:PortraitProps & {demo?:boolean}={}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const draw=()=>{const ctx=ref.current?.getContext('2d');if(!ctx)return;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,70,70);ctx.save();
    // The Christmas sprite (hat + scarf) fills its whole frame; shrink it about the feet so the figure is as tall
    // as the original one and stands on the same line.
    if(outfit==='frost'&&!demo){ctx.translate(35,61);ctx.scale(.86,.86);ctx.translate(-35,-65);}
    drawAssassinSprite(ctx,35,58,direction,false,0,false,outfit,1,demo?(['atk1a','atk1b','atk2a','atk2b','atk3a','atk3b'] as const)[Math.floor(performance.now()/260)%6]:undefined);ctx.restore();};draw();const timer=window.setInterval(draw,90);return()=>window.clearInterval(timer);},[outfit,direction,demo]);
  return <canvas ref={ref} width={70} height={70} role="img" aria-label="Crimson Veil"/>;
}
function SelectedCharacterAvatar({hud,winter=false}:{hud:HUDState;winter?:boolean}) {
  if(hud.characterClass==='mechanical')return <MechanicalPortrait/>;
  if(hud.characterClass==='assassin')return <span className="selected-soldier-avatar"><CrimsonPortrait outfit={hud.outfits?.assassin}/></span>;
  return hud.characterClass==='swordsman'
    ? <span className="selected-soldier-avatar"><KaelPortrait winter={winter} outfit={winter ? hud.outfits?.swordsman : undefined}/></span>
    : winter ? <span className="wizard-avatar"><AerisPortrait winter outfit={hud.outfits?.mage}/></span> : <WizardAvatar/>;
}

export function Intro({ engine, hud, afterFilm = false }: { engine: GameEngine | null; hud: HUDState; afterFilm?: boolean }) {
  const localEventLink = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get('preview') === 'noel';
  const christmas = useChristmas(localEventLink ? 'christmas' : engine?.devSeasonPreview);
  const revealChristmas = useRef(false);
  const filmWasFinished = useRef(false);
  if (afterFilm && !filmWasFinished.current) {
    filmWasFinished.current = true;
    revealChristmas.current = christmas.active && !hud.reducedMotion;
  }
  if (!christmas.active || hud.reducedMotion) revealChristmas.current = false;
  const christmasDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (localEventLink && engine && !christmasDialog.current?.open) christmasDialog.current?.showModal();
  }, [localEventLink, engine]);
  const [panel, setPanel] = useState<'none' | 'settings' | 'credits' | 'quit'>('none');
  const vi = hud.language === 'vi';
  const hasProgress = hud.completed.length > 0;
  // At most one highlighted item: the one under the mouse (none once it leaves), or the one
  // moved to with the arrow keys. -1 = none; Enter then falls through to "start".
  const items = [
    { label: vi ? 'BẮT ĐẦU' : 'START GAME', disabled: false, act: () => engine?.openLobby(true) },
    { label: vi ? 'TIẾP TỤC' : 'CONTINUE', disabled: !hasProgress, act: () => engine?.continueGame() },
    ...(christmas.active ? [{ label: vi ? 'SỰ KIỆN NOEL' : 'CHRISTMAS EVENT', disabled: false, act: () => christmasDialog.current?.showModal(), slab: 3, seasonal: true }] : []),
    { label: vi ? 'CÀI ĐẶT' : 'SETTINGS', disabled: false, act: () => setPanel('settings'), slab: 2 },
    { label: vi ? 'TÁC GIẢ' : 'CREDITS', disabled: false, act: () => setPanel('credits'), slab: 3 },
    { label: vi ? 'THOÁT' : 'QUIT', disabled: false, act: () => setPanel('quit'), slab: 4 },
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
      if (m.panel !== 'none' || document.querySelector('.cinematic-intro, .studio-splash')
        || (event.target instanceof Element && event.target.closest('.christmas-entry'))) return;
      const step = event.key === 'ArrowDown' || event.key === 's' ? 1 : event.key === 'ArrowUp' || event.key === 'w' ? -1 : 0;
      if (step) {
        event.preventDefault();
        let i = m.selected < 0 ? (step > 0 ? -1 : 0) : m.selected;
        do i = (i + step + m.items.length) % m.items.length; while (m.items[i].disabled);
        setSelected(i);
      } else if ((event.key === 'Enter' || event.key === ' ') && m.items[m.selected] && !m.items[m.selected].disabled) {
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
    <div className={`intro-artwork${christmas.active ? ' christmas-menu' : ''}${revealChristmas.current ? ' christmas-menu-reveal' : ''}`}>
    {christmas.active
      ? <svg className="christmas-entrance" viewBox="0 0 1376 768" preserveAspectRatio="none" aria-hidden="true">
          {!hud.reducedMotion && <>
            <defs>
              <radialGradient id="winter-swirl-fade">
                <stop offset=".84" stopColor="white"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </radialGradient>
              <mask id="winter-swirl-mask" maskUnits="userSpaceOnUse" x="230" y="290" width="168" height="272">
                <ellipse cx="314" cy="426" rx="84" ry="134" fill="url(#winter-swirl-fade)"/>
              </mask>
            </defs>
            <g mask="url(#winter-swirl-mask)">
              <g transform="translate(314 426) scale(1 1.6)">
                <g className="portal-swirl winter-portal-swirl">
                  <image href={`${import.meta.env.BASE_URL}assets/ui/noel/menu-winter-night.webp`} width="1376" height="768"
                    transform="scale(1 .625) translate(-314 -426)" preserveAspectRatio="none"/>
                </g>
              </g>
            </g>
          </>}
          <MenuWizard winter reducedMotion={hud.reducedMotion}/>
        </svg>
      : <IntroEffects/>}
    {christmas.active && <>
      <ChristmasSnow still={hud.reducedMotion} count={44}/>
      {revealChristmas.current && <div className="christmas-menu-blackout" aria-hidden="true"/>}
      <ChristmasMenuGlow still={hud.reducedMotion}/>
    </>}
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
        <button key={item.label} type="button" className={`intro-menu-item${i === selected ? ' selected' : ''}${'seasonal' in item ? ' intro-noel-action' : ''}`} disabled={item.disabled}
          style={{ '--slab': 'slab' in item ? item.slab : i } as React.CSSProperties}
          onMouseEnter={() => !item.disabled && setSelected(i)} onMouseLeave={() => setSelected(-1)} onClick={() => press(item)}>
          <span className="intro-menu-face"><span className="intro-menu-label">{item.label}</span><MenuVines active={i === selected && !item.disabled} reducedMotion={hud.reducedMotion}/></span>
        </button>
      ))}
    </nav>
    <ChristmasEvent engine={engine} hud={hud} event={christmas} menuDialog={christmasDialog}/>
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
  const panelArt=usePanelArt(PANEL_ART.material);
  type Entry = { name: string; roleVi: string; roleEn: string; by?: string };
  const sections: [string, string, Entry[]][] = [
    ['ĐỘI PHÁT TRIỂN', 'DEVELOPMENT TEAM', credits.team],
    ['MỸ THUẬT', 'ART', credits.art],
    ['ÂM NHẠC', 'MUSIC', credits.music],
    ['TÀI NGUYÊN BÊN THỨ BA', 'THIRD-PARTY ASSETS', credits.thirdParty],
  ];
  return <div className="modal-backdrop intro-dialog" onClick={close}><div className="panel settings-panel credits-panel" data-panel-art={panelArt} role="dialog" aria-modal="true" aria-label={vi ? 'Tác giả' : 'Credits'} onClick={event => event.stopPropagation()}>
    <div className="panel-top"><span className="eyebrow gold">{vi ? 'TÁC GIẢ' : 'CREDITS'}</span><button className="icon-close" aria-label={vi ? 'Đóng' : 'Close'} onClick={close}><X size={18}/></button></div>
    <div className="settings-scroll credits-scroll">
    <h2>SECOND ME</h2>
    <p className="credits-tagline">{vi ? 'Một chuyến phiêu lưu Echo trong khu rừng cổ.' : 'An Echo adventure in the ancient forest.'}</p>
    {sections.map(([titleVi, titleEn, list]) => <section key={titleEn} className="credits-section">
      <h3>{vi ? titleVi : titleEn}</h3>
      <ul>{list.map((entry, i) => <li key={i}><b>{entry.name || '—'}</b><span>{[entry.by, vi ? entry.roleVi : entry.roleEn].filter(Boolean).join(' · ') || '—'}</span></li>)}</ul>
    </section>)}
    </div>
    <button className="primary" onClick={close}>{vi ? 'QUAY LẠI' : 'BACK TO MENU'}</button>
  </div></div>;
}

export function SettingsPanel({ engine, hud, close }: { engine: GameEngine | null; hud: HUDState; close: () => void }) {
  const panelArt=usePanelArt(PANEL_ART.inventory);
  const [tab,setTab]=useState<'audio'|'display'|'controls'|'dev'>('audio');
  const vi=hud.language==='vi';
  const tabs: ('audio'|'display'|'controls'|'dev')[]=hud.devUnlocked?['audio','display','controls','dev']:['audio','display','controls'];
  return localize(<div className="modal-backdrop settings-backdrop"><div className="panel settings-panel settings-clean" data-panel-art={panelArt} role="dialog" aria-modal="true" aria-labelledby="settings-title">

    <h2 id="settings-title">{vi?'Cài đặt':'Settings'}</h2>
    <div className="settings-tabs" role="tablist" aria-label={vi?'Nhóm cài đặt':'Settings groups'}>
      {tabs.map(id=><button key={id} id={`settings-tab-${id}`} type="button" role="tab" aria-selected={tab===id} aria-controls={`settings-${id}`} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs[tabs.length-1]:tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];setTab(next);document.getElementById(`settings-tab-${next}`)?.focus();}}}>{id==='audio'?(vi?'Âm thanh':'Audio'):id==='display'?(vi?'Hiển thị':'Display'):id==='controls'?(vi?'Tùy chỉnh nút':'Controls'):(vi?'DEV · Công cụ test':'DEV · Test tools')}</button>)}
    </div>
    <div className="settings-scroll" key={tab}>
      <div id={`settings-${tab}`} role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
      {tab==='audio'?<>
    <label className="setting-row"><span><Volume2 size={18}/><b>Âm lượng tổng</b><small>Toàn bộ âm thanh trò chơi</small></span><input aria-label="Âm lượng tổng" type="range" min="0" max="1" step="0.05" value={hud.volume} onChange={e=>engine?.setVolume(Number(e.target.value))}/><strong>{Math.round(hud.volume*100)}%</strong></label>
    <label className="setting-row"><span><MusicIcon size={18}/><b>Nhạc nền</b><small>Nhạc màn hình chính, nhạc boss và intro</small></span><input aria-label="Nhạc nền" type="range" min="0" max="1" step="0.05" value={hud.musicVolume} onChange={e=>engine?.setMusicVolume(Number(e.target.value))}/><strong>{Math.round(hud.musicVolume*100)}%</strong></label>
    <label className="setting-row"><span><Zap size={18}/><b>Hiệu ứng (SFX)</b><small>Đòn đánh, kỹ năng, bẫy và môi trường</small></span><input aria-label="Hiệu ứng (SFX)" type="range" min="0" max="1" step="0.05" value={hud.effectsVolume} onChange={e=>engine?.setEffectsVolume(Number(e.target.value))}/><strong>{Math.round(hud.effectsVolume*100)}%</strong></label>
    <label className="setting-row"><span><Volume2 size={18}/><b>Giọng nói</b><small>Lồng tiếng nhân vật và người kể chuyện</small></span><input aria-label="Giọng nói" type="range" min="0" max="1" step="0.05" value={hud.voiceVolume} onChange={e=>engine?.setVoiceVolume(Number(e.target.value))}/><strong>{Math.round(hud.voiceVolume*100)}%</strong></label>
    <label className="setting-row switch-row"><span><VolumeX size={18}/><b>Tắt âm</b><small>Tắt toàn bộ âm thanh trò chơi</small></span><input type="checkbox" checked={hud.isMuted} onChange={()=>engine?.toggleAudio()}/><i/></label>
      </>:tab==='display'?<>
    <div className="setting-row"><span><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><rect x="2" y="5" width="20" height="14"/><path d="M15 8h4v4M9 16H5v-4"/></svg><b>{hud.language==='vi'?'Toàn màn hình':'Full screen'}</b><small>F</small></span><FullscreenButton vi={hud.language==='vi'}/></div>
    <label className="setting-row switch-row"><span><SlidersHorizontal size={18}/><b>Giảm chuyển động</b><small>Giảm sương, rung và hiệu ứng lặp</small></span><input type="checkbox" checked={hud.reducedMotion} onChange={e=>engine?.setReducedMotion(e.target.checked)}/><i/></label>
    <label className="setting-row switch-row"><span><Map size={18}/><b>Nhãn trong màn</b><small>Hiện gợi ý rune và nhãn mảnh thời gian</small></span><input type="checkbox" checked={hud.showHints} onChange={e=>engine?.setShowHints(e.target.checked)}/><i/></label>
    <label className="setting-row"><span><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="5.6" ry="9"/><ellipse cx="12" cy="12" rx="2.3" ry="9"/></svg><b>Language</b><small>Choose the game language</small></span><select aria-label="Language" value={hud.language} onChange={e=>engine?.setLanguage(e.target.value as 'en' | 'vi')}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
    <details className="setting-controls"><summary>{vi?'Bảng phím điều khiển':'Keyboard & mouse controls'}</summary>
      <div className="control-groups">{[
        {title:vi?'DI CHUYỂN & CHIẾN ĐẤU':'MOVEMENT & COMBAT',rows:[
          ['WASD / ↑ ↓ ← →',vi?'Di chuyển':'Move'],['Shift',vi?'Lướt né':'Dodge'],
          [vi?'Chuột trái':'Left click',vi?'Tấn công':'Attack'],[vi?'Chuột phải / Space':'Right click / Space',vi?'Dùng kỹ năng':'Use skill']]},
        {title:vi?'ĐIỀU KHIỂN ECHO':'ECHO CONTROLS',rows:[
          ['E',vi?'Bắt đầu ghi · nhấn lần nữa để lưu':'Record · press again to save'],['Q',vi?'Gọi Echo từ bản ghi':'Summon recorded Echo'],
          ['C',vi?'Dừng / tiếp tục Echo vừa gọi':'Pause / resume latest Echo'],
          ['Shift + Q',vi?'Đổi chỗ với Echo vừa gọi':'Swap with latest Echo'],['X',vi?'Thu hồi Echo lâu nhất':'Recall oldest Echo']]},
        {title:vi?'HÀNH TRANG & TRÒ CHƠI':'ITEMS & GAME',rows:[
          ['1 / 2 / 3',vi?'Dùng vật phẩm ở ô tương ứng':'Use item in matching slot'],['R',vi?'Dùng bình thời gian đã mang':'Use carried time potion'],
          ['Tab',vi?'Mở kho đồ':'Open inventory'],['Esc',vi?'Tạm dừng':'Pause'],['F',vi?'Bật / tắt toàn màn hình':'Toggle full screen']]},
      ].map(group=><section className="control-group" key={group.title}><h3>{group.title}</h3><dl>{group.rows.map(([key,label])=><div className="control-binding" key={key}><dt><kbd>{liveKeyLabel(key, hud.language)}</kbd></dt><dd>{label}</dd></div>)}</dl></section>)}</div>
    </details>
      </>:tab==='controls'?<ControlSettingsPanel engine={engine} language={hud.language}/>:hud.devUnlocked?<div className="dev-supplies">
        <h3>{vi?'QUYỀN DEVELOPER ĐÃ BẬT':'DEVELOPER ACCESS ENABLED'}</h3>
        <div className="setting-row dev-season-setting">
          <label htmlFor="settings-dev-season">{vi?'Chọn theo mùa':'Season preview'}</label>
          <select id="settings-dev-season" aria-describedby="settings-dev-season-hint" value={engine?.devSeasonPreview ?? 'auto'} onChange={event => {
            const value = event.currentTarget.value;
            if (value === 'auto' || value === 'none' || value === 'christmas') engine?.setDevSeasonPreview(value);
          }}>
            <option value="auto">{vi?'Tự động theo lịch':'Automatic by date'}</option>
            <option value="none">{vi?'Giao diện thường':'Default theme'}</option>
            <option value="christmas">{vi?'Xem thử Noel':'Preview Christmas'}</option>
          </select>
          <small id="settings-dev-season-hint">{vi?'Xem thử giao diện theo mùa trong phiên này.':'Preview the seasonal theme for this session.'}</small>
        </div>
        <p>{vi?'Nạp 99.999 vàng, 99.999 Tanuki phàm tinh thể, 99.999 Tanuki thanh tinh thể và 99.999 Tanuki huyền tinh thể; mở toàn bộ trang phục, vũ khí và rune; cấp đầy tất cả vật phẩm theo giới hạn túi đồ. Có thể bấm lại để nạp khi cần.':'Set gold, Tanuki Common Crystals and Tanuki Azure Crystals and Tanuki Mystic Crystals to 99,999, unlock all outfits, weapons and runes, and fill all item stocks to their inventory limits. Refill again whenever needed.'}</p>
        <button type="button" className="secondary" onClick={()=>engine?.grantDevResources()}>{vi?'DEV · NHẬN TÀI NGUYÊN & MỞ KHÓA TẤT CẢ':'DEV · GRANT RESOURCES & UNLOCK ALL'}</button>
        <p role="status">{vi?'Đang sở hữu':'Owned'}: {hud.coins.toLocaleString(vi?'vi-VN':'en-US')} {vi?'vàng':'gold'} · {hud.chestKeys.toLocaleString(vi?'vi-VN':'en-US')} {vi?'Tanuki phàm tinh thể':'Tanuki Common Crystals'} · {hud.whiteCrystals.toLocaleString(vi?'vi-VN':'en-US')} {vi?'Tanuki thanh tinh thể':'Tanuki Azure Crystals'} · {hud.mysticCrystals.toLocaleString(vi?'vi-VN':'en-US')} {vi?'Tanuki huyền tinh thể':'Tanuki Mystic Crystals'} · {hud.ownedOutfits?.length??0} {vi?'trang phục':'outfits'} · {ECHO_RUNES.filter(r=>(hud.echoRunes?.[r.id]??0)>0).length}/{ECHO_RUNES.length} rune</p>
        <p>{vi?'Đã mở toàn bộ màn chơi để chọn tại trại nghỉ. Tiến độ và số sao đã kiếm được vẫn được giữ nguyên.':'All levels are available from camp. Earned progress and star ratings are preserved.'}</p>
      </div>:null}
      </div>
    </div><button className="primary" onClick={close}>LƯU & ĐÓNG</button>
  </div></div>, hud.language);
}

const latestNews = { title: 'Diện mạo Tanuki mới', description: 'Chủ quầy có bộ lông nâu, mõm sáng và chiếc lá xanh trên đầu. Các động tác chào khách cũng được cập nhật đồng bộ.' };

export function Notifications({ close }: { close: () => void }) {
  const panelArt=usePanelArt(PANEL_ART.material);
  return localize(<div className="modal-backdrop"><div className="panel news-panel" data-panel-art={panelArt}><div className="panel-top"><span className="eyebrow gold">THÔNG BÁO TRÒ CHƠI</span><button className="icon-close" aria-label="Đóng thông báo" onClick={close}><X size={18}/></button></div><h2>Tiếng vọng mới trong rừng</h2>
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
    <article><div><h3>Thử thách từng chặng</h3><p>Năm màn đầu có thời gian theo độ khó từng chặng. Mỗi chặng có một mảnh +{SHARD_BONUS} giây; các rune cuối cần nhiều Echo giữ đồng thời. Bẫy dập và đá rơi giữ chân 0,25 giây; dây leo làm chậm cả một dải.</p></div></article>
    <article><time>06.11.2026</time><div><h3>Sảnh hành trình đã mở</h3><p>Chọn màn, xem tiến độ, điều chỉnh cài đặt và chơi lại bất kỳ màn nào sau khi hoàn thành chiến dịch.</p></div></article>
  </div></div>);
}

export function Lobby({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const christmas = useChristmas(engine?.devSeasonPreview);
  const [panel, setPanel] = useState<'none'|'news'|'settings'|'heroUpgrades'>('none');
  const [bag, setBag] = useState(false);
  const christmasDialog=useRef<HTMLDialogElement>(null);
  const complete = engine?.campaign.bossDefeated === true;
  const next = Math.min(hud.completed.filter(id=>id<=5).length, 5);
  // Esc returns to the main menu, unless a lobby panel is open (Esc is for closing it then).
  useEffect(() => {
    if (hud.screen !== 'lobby' || panel !== 'none' || bag) return;
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape' && !document.querySelector('[data-lobby-dialog]')) { e.preventDefault(); engine?.goToMainMenu(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, bag, engine, hud.screen]);
  return localize(<div className={`lobby-screen overlay journey-lobby${christmas.active ? ' christmas-lobby' : ''}`}><div className="lobby-canopy"/><header className="lobby-header"><button className="camp-brand" onClick={()=>engine?.goToMainMenu()} aria-label={hud.language==='vi'?'Về menu chính':'Back to main menu'}><SelectedCharacterAvatar hud={hud} winter={christmas.active}/><span><b>SECOND ME</b><small>ECHOES OF THE WILD</small></span></button><nav aria-label={hud.language==='vi'?'Tiện ích trại nghỉ':'Camp utilities'}><FullscreenButton vi={hud.language==='vi'}/><button data-tutorial="bag" onClick={()=>setBag(true)} aria-label={hud.language==='vi'?'Túi đồ':'Inventory'} title={hud.language==='vi'?'Túi đồ':'Inventory'}><Backpack size={22}/><NewDot feature="bag" show={false} acquired={hud.newItems || hud.newRunes}/></button><button disabled={!engine?.shopUnlocked} data-tutorial="shop" onClick={()=>engine?.openShop()} aria-label={hud.language==='vi'?'Cửa hàng':'Shop'} title={hud.language==='vi'?'Cửa hàng':'Shop'}><ShoppingBasket size={22}/><NewDot feature="shop" show={!!engine?.shopUnlocked}/></button>{christmas.active&&<button className="lobby-noel-action" type="button" aria-label={hud.language==='vi'?'Sự kiện Noel':'Christmas event'} title={hud.language==='vi'?'Sự kiện Noel':'Christmas event'} onClick={()=>christmasDialog.current?.showModal()}><Gift size={22} aria-hidden="true"/></button>}<button onClick={()=>setPanel('settings')} aria-label={hud.language==='vi'?'Cài đặt':'Settings'} title={hud.language==='vi'?'Cài đặt':'Settings'}><Settings size={22}/></button></nav></header>
    <ChristmasEvent engine={engine??null} hud={hud} event={christmas} menuDialog={christmasDialog}/>
    <JourneyCamp engine={engine} hud={hud} complete={complete} next={next} christmas={christmas.active} traveler={<SelectedCharacterAvatar hud={hud} winter={christmas.active}/>} onNews={()=>setPanel('news')} onUpgradeHero={()=>setPanel('heroUpgrades')} onOpenInventory={()=>setBag(true)}/>
    {panel==='heroUpgrades' && isUpgradeHero(hud.characterClass) && <HeroUpgrades engine={engine} hud={hud} hero={hud.characterClass} close={()=>setPanel('none')}/>}
    {bag&&<div className="modal-backdrop inventory-backdrop" onClick={()=>document.dispatchEvent(new Event('close-trail-inventory'))}><div className="panel inventory-modal forest-dialog" onClick={e=>e.stopPropagation()}><Inventory engine={engine} hud={hud} close={()=>setBag(false)}/></div></div>}
    <RuneChoiceDialog engine={engine} hud={hud}/>{panel==='news'&&<Notifications close={()=>setPanel('none')}/>} {panel==='settings'&&<SettingsPanel engine={engine} hud={hud} close={()=>setPanel('none')}/>}</div>);
}

export function Shop({engine, hud}: {engine: GameEngine | null; hud: HUDState}) { return <TanukiShop engine={engine} hud={hud}/>; }

export function Inventory({ hud, close,engine }: { hud: HUDState; close: () => void;engine?:GameEngine|null }) {
  return <TrailInventory hud={hud} engine={engine??null} close={close}/>;
}

type SelectableCharacter = 'mage' | 'swordsman' | 'assassin' | 'mechanical';

export function Characters({engine, hud}: {engine: GameEngine | null; hud: HUDState}) {
  const christmas = useChristmas(engine?.devSeasonPreview);
  const vi = hud.language === 'vi';
  const [selected, setSelected] = useState<SelectableCharacter>(hud.characterClass);
  const previousHero = useRef<HTMLButtonElement>(null);
  const [draftOutfits,setDraftOutfits]=useState<Record<OutfitHero,OutfitId>>(hud.outfits??{mage:'default',swordsman:'default',assassin:'default'});

  const [previewDirection,setPreviewDirection]=useState<'down'|'left'|'up'|'right'>('down');
  const [upgradeOpen,setUpgradeOpen]=useState(false);
  const techniqueDialog=useRef<HTMLDialogElement>(null);
  const [comboPlayback,setComboPlayback]=useState<boolean>();
  const playingCombo=comboPlayback??!hud.reducedMotion;
  useEffect(() => { previousHero.current?.focus({preventScroll:true}); }, []);
  const roster: {id: SelectableCharacter; name: string; roleVi: string; roleEn: string}[] = [
    {id:'mage', name:'Aeris', roleVi:'Pháp sư', roleEn:'Mage'},
    {id:'swordsman', name:'Kael', roleVi:'Kiếm sĩ', roleEn:'Swordsman'},
    {id:'assassin', name:'Crimson Veil', roleVi:'Xạ thủ', roleEn:'Marksman'},
    ...(MECHANICAL_ENABLED && hud.mechanicalOwned ? [{id:'mechanical' as const, name:'Rivet-07', roleVi:'Cơ giới', roleEn:'Mechanic'}] : []),
  ];
  const choice = roster.find(c => c.id === selected) ?? roster[0];
  const browseHero = (offset: number) => {
    const index = roster.findIndex(candidate=>candidate.id===choice.id);
    const next = roster[(index+offset+roster.length)%roster.length];
    setSelected(next.id);
    setPreviewDirection('down');
    engine?.onboarding.event('hero-select');
  };
  const portrait = (id: SelectableCharacter,outfit?:OutfitId) => id === 'mage' ? <AerisPortrait outfit={outfit} winter={christmas.active}/> : id === 'swordsman' ? <KaelPortrait outfit={outfit} winter={christmas.active}/> : id === 'assassin' ? <CrimsonPortrait outfit={outfit}/> : <MechanicalPortrait/>;
  const outfit=choice.id==='mechanical'?'default':draftOutfits[choice.id];
  const hero=choice.id==='mechanical'?null:choice.id;
  const {maxHealth,sanctuaryBonus} = heroStats(choice.id, hud.heroRanks ?? cleanHeroRanks());
  const slowPercent=Math.round((1-ENEMY_CHILL.SPEED)*100);
  const technique = choice.id==='mage'
    ? {
        title:vi?'Gai Băng':'Ice Spikes',
        description:vi
          ? `Gai Băng gây ${ICE_MAGIC.DAMAGE} sát thương, làm quái chậm ${slowPercent}% trong ${ENEMY_CHILL.SECONDS} giây. Ưu tiên boss, rồi quái gần nhất, cuối cùng là con trỏ.`
          : `Ice Spikes deals ${ICE_MAGIC.DAMAGE} damage and slows enemies by ${slowPercent}% for ${ENEMY_CHILL.SECONDS} seconds. It targets the boss first, then the nearest enemy, then the cursor.`,
      }
    : choice.id==='swordsman'
    ? {
        title:vi?'Thánh vực':'Sanctuary',
        description:vi
          ? `Thánh vực tồn tại ${5+sanctuaryBonus} giây. Đứng trong vòng sáng hồi 20 HP mỗi 2 giây và tăng 20% sát thương.`
          : `Sanctuary lasts ${5+sanctuaryBonus} seconds. While in the ring, you recover 20 HP every 2 seconds and deal 20% more damage.`,
      }
    : choice.id==='assassin'
    ? {
        title:vi?'Thu hồi phi tiêu':'Dart recovery',
        description:vi
          ? 'Nhặt phi tiêu trong 10 giây để hồi 8 MP và giảm 0,4 giây hồi chiêu mỗi chiếc.'
          : 'Recover darts within 10 seconds for 8 MP and 0.4 seconds of cooldown reduction each.',
      }
    : null;
  const detail = choice.id === 'mage'
    ? (vi ? 'Đánh xa và làm chậm quái bằng Gai Băng.' : 'Fights at range and slows enemies with Ice Spikes.')
    : choice.id === 'swordsman'
    ? (vi ? 'Đánh cận chiến và hồi máu trong Thánh vực.' : 'Fights up close and heals inside Sanctuary.')
    : choice.id === 'assassin'
    ? (vi ? 'Ném phi tiêu và thoát khỏi tầm đánh.' : 'Throws darts and quickly moves out of reach.')
    : (vi ? 'Chiến binh cơ giới dùng cưa máy. Kỹ năng Quá tải tăng tốc đánh trong 5 giây.' : 'A mechanical fighter wielding a chainblade. Overdrive boosts attack speed for five seconds.');
  // Crimson's Christmas outfit can be previewed out of season, but not equipped.
  // A locked outfit can be previewed but not equipped: Crimson's Christmas one waits for December,
  // the others are bought in the shop.
  const outfitRow = useRef<HTMLDivElement>(null);
  // Which way the outfit row can still slide: the arrows light up only when there is more to see.
  const [outfitEnds, setOutfitEnds] = useState({ prev: false, next: false });
  const readOutfitEnds = () => {
    const row = outfitRow.current;
    if (!row) return;
    const prev = row.scrollLeft > 2, next = row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
    setOutfitEnds(old => old.prev === prev && old.next === next ? old : { prev, next });
  };
  // Show the selected outfit when the hero changes (it may sit on the second page of the row).
  useEffect(() => {
    const row = outfitRow.current, picked = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row) row.scrollLeft = picked ? Math.floor(picked.offsetLeft / row.clientWidth) * row.clientWidth : 0;
    readOutfitEnds();
  }, [choice.id]);
  const outfitLocked = choice.id !== 'mechanical' && !canWearOutfit(choice.id, draftOutfits[choice.id], hud.ownedOutfits ?? [], christmas.active,hud.christmasDeluxeUnlocked);
  const eventHint=vi?'Tham gia màn Giáng Sinh để mở khóa':'Play a Christmas event stage to unlock';
  const seasonalLocked = outfitLocked && choice.id === 'assassin' && draftOutfits.assassin === 'frost';
  const confirm = () => { if (!engine || outfitLocked) return; if(choice.id!=='mechanical'){engine.setCharacterOutfit(choice.id,outfit);}engine.selectClass(choice.id); engine.goToLobby(); };
  const outfits = choice.id==='mechanical' ? OUTFITS.slice(0,1)
    : choice.id==='assassin' ? OUTFITS.slice(0,2).map(option=>option.id==='frost'?{...option,vi:'Giáng sinh',en:'Christmas'}:option)
    : orderedCharacterOutfits(choice.id,hud.ownedOutfits??[],hud.christmasDeluxeUnlocked);
  // The winter clearing with falling snow in the Christmas season, or while Crimson's Christmas outfit is
  // previewed; otherwise the forest clearing with falling leaves.
  const winterScene = christmas.active || (choice.id === 'assassin' && outfit === 'frost');
  // Christmas skin only: left idle for a while, a cold gust blows past and the hero shivers and sneezes once.
  // Any mouse or key input restarts the wait; after a sneeze the next one needs another long idle spell.
  const christmasSkin = choice.id === 'assassin' && outfit === 'frost' && previewDirection === 'down';
  const [chilly, setChilly] = useState(false);
  useEffect(() => {
    setChilly(false);
    if (!christmasSkin || hud.reducedMotion) return;
    let wait = 0, end = 0;
    const arm = (delay: number) => {
      window.clearTimeout(wait);
      wait = window.setTimeout(() => {
        setChilly(true);
        end = window.setTimeout(() => setChilly(false), 2600);
        arm(25000);
      }, delay);
    };
    const reset = () => arm(8000);
    reset();
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach(name => window.addEventListener(name, reset, { passive: true }));
    return () => {
      window.clearTimeout(wait); window.clearTimeout(end);
      events.forEach(name => window.removeEventListener(name, reset));
    };
  }, [christmasSkin, hud.reducedMotion]);
  return <div className={`characters-screen overlay hero-selection-screen${winterScene?' hero-selection-winter':''}`}>
    {winterScene&&<ChristmasSnow still={hud.reducedMotion}/>}
    <div className="hero-selection-scene" role="dialog" aria-modal="true" aria-labelledby="hero-select-title">
      {winterScene&&<WinterAmbience still={hud.reducedMotion}/>}
      <header className="hero-selection-header">
        <h1 id="hero-select-title">{vi?'Chọn nhân vật':'Choose your hero'}</h1>
        <button type="button" className="hero-selection-back" onClick={()=>engine?.goToLobby()}><ChevronLeft size={17} aria-hidden="true"/>{vi?'Về sảnh':'Back to camp'}</button>
      </header>

      <section className="hero-selection-preview" aria-label={vi?'Xem trước nhân vật':'Hero preview'}>
        {!winterScene&&<FallingLeaves still={hud.reducedMotion}/>}
        <div className="hero-selection-caption" aria-live="polite">
          <span className="hero-selection-class">{vi?choice.roleVi:choice.roleEn}</span>
          <h2 className="hero-selection-name">{choice.name}</h2>
        </div>
        {chilly&&<div className="winter-gust" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i} style={{'--row':`${18+i*9}%`,animationDelay:`${i*.07}s`} as React.CSSProperties}/>)}</div>}
        {chilly&&<span className="sneeze-bubble" aria-hidden="true">{vi?'Hắt xì!':'Achoo!'}</span>}
        <div className={`hero-selection-figure${chilly?' is-chilly':''}`}>
          {hero ? <HeroStagePreview key={hero} hero={hero} outfit={outfit} direction={previewDirection} combo={false} winter={christmas.active} reducedMotion={hud.reducedMotion} sneeze={chilly}/> : <MechanicalPortrait/>}
        </div>
        <div className="hero-selection-arrows" role="group" aria-label={vi?'Đổi nhân vật':'Change hero'}>
          <button ref={previousHero} type="button" aria-label={vi?'Nhân vật trước':'Previous hero'} onClick={()=>browseHero(-1)}><ChevronLeft size={24} aria-hidden="true"/></button>
          <button type="button" aria-label={vi?'Nhân vật tiếp theo':'Next hero'} onClick={()=>browseHero(1)}><ChevronRight size={24} aria-hidden="true"/></button>
        </div>
        <div className="hero-selection-preview-actions">
          <nav aria-label={vi?'Xoay hướng xem':'Rotate preview'}>
            {(['down','left','up','right'] as const).map((direction,index)=><button type="button" key={direction}
              aria-pressed={previewDirection===direction} onClick={()=>setPreviewDirection(direction)}>{vi?['Trước','Trái','Sau','Phải'][index]:['Front','Left','Back','Right'][index]}</button>)}
          </nav>
        </div>
      </section>

      <section className="hero-selection-details" aria-label={vi?'Nhân vật và trang phục':'Hero and outfits'}>
        {christmas.active&&<ChristmasLights/>}
        <div className="hero-selection-details-scroll">
          <div className="hero-selection-identity" aria-live="polite">
            <span className="hero-selection-health">{maxHealth} HP</span>
            <p>{detail}</p>
          </div>
          {hero&&technique&&<div className="hero-selection-info-actions">
            <button type="button" className="hero-selection-technique" aria-haspopup="dialog"
              aria-controls="hero-technique-dialog" onClick={()=>techniqueDialog.current?.showModal()}>
              <BookOpen size={15} aria-hidden="true"/>
              {vi?'Kỹ năng & combo':'Skills & combo'}
            </button>
            <button type="button" className="hero-selection-upgrade" onClick={()=>setUpgradeOpen(true)} disabled={!engine}>
              <ChevronsUp size={16} aria-hidden="true"/>{vi?'Nâng cấp':'Upgrades'}
            </button>
          </div>}
          {hero&&<section className="hero-selection-showcase" aria-labelledby="hero-showcase-title">
            <div className="hero-selection-showcase-bar">
              <h3 id="hero-showcase-title">{vi?'Diễn thử combo':'Combo preview'}</h3>
              <button type="button" className="hero-selection-combo" onClick={()=>setComboPlayback(!playingCombo)}
                aria-label={playingCombo?(vi?'Tạm dừng combo':'Pause combo'):(vi?'Phát combo':'Play combo')}
                title={playingCombo?(vi?'Tạm dừng combo':'Pause combo'):(vi?'Phát combo':'Play combo')}>
                {playingCombo?<Pause size={15} aria-hidden="true"/>:<Play size={15} aria-hidden="true"/>}
              </button>
            </div>
            <div className="hero-selection-demo">
              <HeroStagePreview key={hero} hero={hero} outfit={outfit} direction="down" combo={playingCombo}
                winter={christmas.active} reducedMotion={hud.reducedMotion&&!playingCombo}/>
            </div>
          </section>}
          <section className="hero-selection-wardrobe" aria-labelledby="hero-wardrobe-title">
            <div className="hero-selection-wardrobe-bar">
              <h3 id="hero-wardrobe-title">{vi?'Trang phục':'Outfits'}</h3>
              {outfits.length>2&&<span className="outfit-scroll">
                <button type="button" disabled={!outfitEnds.prev} aria-label={vi?'Trang phục trước':'Previous outfits'} onClick={()=>outfitRow.current?.scrollBy({left:-outfitRow.current.clientWidth,behavior:'smooth'})}><ChevronLeft size={15} aria-hidden="true"/></button>
                <button type="button" disabled={!outfitEnds.next} aria-label={vi?'Trang phục tiếp':'More outfits'} onClick={()=>outfitRow.current?.scrollBy({left:outfitRow.current.clientWidth,behavior:'smooth'})}><ChevronRight size={15} aria-hidden="true"/></button>
              </span>}
            </div>
            {/* Two outfits at a time; slide (swipe, wheel or the arrows) to see the rest. */}
            <div ref={outfitRow} className="hero-selection-outfits" role="group" aria-label={vi?'Chọn trang phục':'Choose outfit'} onScroll={readOutfitEnds}
              onWheel={event=>{const row=event.currentTarget;if(Math.abs(event.deltaY)>Math.abs(event.deltaX)&&row.scrollWidth>row.clientWidth){row.scrollBy({left:event.deltaY>0?row.clientWidth:-row.clientWidth,behavior:'smooth'});}}}>
              {outfits.map(option=>{
                const locked=choice.id==='mechanical'?option.id!=='default':!canWearOutfit(choice.id,option.id,hud.ownedOutfits??[],christmas.active,hud.christmasDeluxeUnlocked);
                // Locked outfits stay visible and can be clicked to preview on the stage; the confirm button then
                // says how to unlock them (December for Crimson's Christmas outfit, the shop for the rest).
                const seasonal=choice.id==='assassin'&&option.id==='frost'&&locked;
                const previewable=locked&&choice.id!=='mechanical';
                const rarity=characterOutfitRarity(choice.id==='mechanical'?'swordsman':choice.id,option.id);
                const name=vi?option.vi:option.en;
                return <button type="button" key={choice.id+option.id} aria-pressed={outfit===option.id}
                  aria-label={name+(rarity==='limited'?' · '+rarityName(rarity,vi):'')+(locked&&isDeluxe(option.id)?' · '+eventHint:seasonal?(vi?' · Mở vào mùa Giáng sinh':' · Unlocks at Christmas'):locked?(vi?' · Mua trong cửa hàng':' · Available in shop'):'')}
                  className={previewable?'outfit-locked-preview':undefined} title={locked&&isDeluxe(option.id)?eventHint:seasonal?(vi?'Xem thử được · Mở vào mùa Giáng sinh (tháng 12)':'Preview only · Unlocks in the Christmas season (December)'):previewable?(vi?'Xem thử được · Mua trong cửa hàng để mặc':'Preview only · Buy it in the shop to wear it'):undefined}
                  disabled={locked&&!previewable} style={option.id==='default'?undefined:{'--outfit-color':RARITY_COLORS[rarity]} as React.CSSProperties}
                  onClick={()=>{if(choice.id!=='mechanical')setDraftOutfits(old=>({...old,[choice.id]:option.id}));}}>
                  {/* The original look is the base, not a tier: no tag, no tier colour. */}{choice.id!=='mechanical'&&option.id!=='default'&&<em className="outfit-rarity-tag">{rarityName(rarity,vi)}</em>}<span>{portrait(choice.id,option.id)}</span><strong>{name}</strong>{previewable?<Lock size={14} aria-hidden="true"/>:outfit===option.id&&<Check size={15} aria-hidden="true"/>}
                </button>;
              })}
            </div>
          </section>
        </div>
        <footer className="hero-selection-footer">
          <small>{choice.id===hud.characterClass?(vi?'Nhân vật hiện tại':'Current hero'):null}</small>
          <button type="button" onClick={confirm} disabled={!engine||outfitLocked}>{outfitLocked?<><Lock size={16} aria-hidden="true"/>{isDeluxe(outfit)?eventHint:seasonalLocked?(vi?'Mở vào tháng 12':'Unlocks in December'):(vi?'Mua trong cửa hàng':'Buy in the shop')}</>:<>{vi?'Trang bị & chọn':'Equip & confirm'}<ArrowRight size={17} aria-hidden="true"/></>}</button>
        </footer>
      </section>
    </div>
    {hero&&technique&&<dialog ref={techniqueDialog} id="hero-technique-dialog" className="hero-technique-dialog" data-lobby-dialog
      aria-labelledby="hero-technique-title" onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}>
      <header>
        <h2 id="hero-technique-title">{choice.name} · {vi?'Kỹ năng & combo':'Skills & combo'}</h2>
        <button type="button" aria-label={vi?'Đóng':'Close'} onClick={()=>techniqueDialog.current?.close()}><X size={19} aria-hidden="true"/></button>
      </header>
      <div className="hero-technique-content" key={hero}>
        {hero==='assassin'&&<section>
          <h3>{vi?'Bóng Ma Đỏ':'Crimson Phantom'}</h3>
          <p>{vi?'Lao vào mục tiêu, phóng 5 phi tiêu rồi giật lùi.':'Rush toward the target, throw five darts, then recoil.'}</p>
        </section>}
        <section>
          <h3>{technique.title}</h3>
          <p>{technique.description}</p>
        </section>
        <section>
          <h3>Combo</h3>
          {hero==='assassin'
            ? <p>{vi?'Ném 1–3–1 phi tiêu. Đòn cuối tốn 20 MP để giật lùi. Khi thiếu MP, combo lặp lại hai đòn đầu.':'Throw darts in a 1–3–1 sequence. The final recoil costs 20 MP. With less MP, the first two hits repeat.'}</p>
            : <ol>{COMBO_HITS[hero].map(hit=><li key={hit.anim}>{vi?hit.vi:hit.name}</li>)}</ol>}
        </section>
      </div>
    </dialog>}
    {upgradeOpen&&hero&&<HeroUpgrades engine={engine} hud={hud} hero={hero} close={()=>setUpgradeOpen(false)}/>}
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
        const unlocked = engine?.canSelectLevel(index)??false;
        return <button key={level.id} disabled={!unlocked} onClick={() => engine?.requestBattleStart(()=>engine.selectLevel(index))} className="trail-item"><span className="trail-number">0{level.id}</span><span><strong>{translate(level.subtitle, hud.language)}</strong><small>{translate(level.description, hud.language)}</small></span>{!unlocked ? <Lock size={17}/> : hud.completed.includes(level.id) ? <Check size={18}/> : <ArrowRight size={18}/>}</button>;
      })}</div></> : <><h2>Hợp tác với chính mình</h2><div className="help-grid"><p><kbd>W A S D</kbd> / phím mũi tên: di chuyển.</p><p><kbd>E</kbd> bắt đầu ghi; nhấn lần nữa để lưu. Echo đứng ở điểm cuối.</p><p><kbd>1–3</kbd> dùng vật phẩm. <kbd>C</kbd> dừng/phát Echo vừa gọi; <kbd>Shift + Q</kbd> hoán đổi khi đường thẳng không bị chặn.</p><p><kbd>Q</kbd> gọi Echo. Để Echo giữ nút trong khi bạn vượt cổng. <kbd>X</kbd> xóa Echo.</p><p>5 màn đầu: thời gian mỗi chặng thay đổi theo màn. Đặt Echo giữ các rune được ghi bên cổng cuối; màn 5 có 5 rune nhưng chỉ cần giữ đúng 4 rune cuối. Mỗi chặng có tối đa một mảnh +{SHARD_BONUS} giây và dùng một bình +2 giây; không thể farm vô hạn. Chỉ nhân vật chạm rune kế tiếp mới được nạp giờ.</p><p>Bẫy dập và đá rơi có viền vàng báo trước, gây 20 sát thương và giữ chân 0,25 giây khi trúng. Dây leo làm chậm 45% trên cả dải; có thể đi vòng.</p><p>Sau mỗi màn 1–5, chọn một trong ba ấn Echo ngẫu nhiên. Hoàn thành năm màn để mở trạm chuẩn bị; không tiêu hao ấn để mở boss.</p><p>Chuột trái tấn công; chuột phải hoặc <kbd>Space</kbd> dùng kỹ năng class; <kbd>R</kbd> dùng vật phẩm +2 giây; <kbd>F</kbd> bật/tắt toàn màn hình. <kbd>Shift</kbd> lướt né; <kbd>Esc</kbd> tạm dừng.</p><p>Boss báo trước đòn đánh bằng vòng băng xanh. Né ra ngoài; Echo giữ ấn sẽ tăng sức mạnh.</p></div></>}
    </div></div>}
  </div>);
}

export function AdventureHUD({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  const [bag, setBag] = useState(false);
  const [touch] = useState(isTouchDevice);
  const winter = useChristmas(engine?.devSeasonPreview).active;
  useEffect(() => {
    if (!engine || bag || hud.screen !== 'playing') return;
    const openWithTab = (event: KeyboardEvent) => {
      if (actionForInput(event.code,event.shiftKey)!=='inventory' || controls.capturing || event.defaultPrevented || event.repeat || event.isComposing ||
        event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
      if (!engine.canOpenCombatInventory()) return;
      event.preventDefault();
      setBag(true);
    };
    const openWithPad=()=>{if(engine.canOpenCombatInventory())setBag(true);};
    document.addEventListener('game-open-inventory',openWithPad);window.addEventListener('keydown', openWithTab);
    return () => {document.removeEventListener('game-open-inventory',openWithPad);window.removeEventListener('keydown', openWithTab);};
  }, [engine, bag, hud.screen]);

  const openBag = () => {
    if (engine?.canOpenCombatInventory()) setBag(true);
  };
  const closeBag = () => {
    setBag(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.game-stage [data-tutorial="bag"]')?.focus({preventScroll:true}));
  };
  const inventory = bag && <div className="modal-backdrop inventory-backdrop" onClick={() => document.dispatchEvent(new Event('close-trail-inventory'))}><div className="panel inventory-modal forest-dialog" onClick={event => event.stopPropagation()}><Inventory engine={engine} hud={hud} close={closeBag}/></div></div>;
  const boss = hud.bossHp > 0;
  if (!touch) return <LevelOneHUD engine={engine} hud={hud} openBag={openBag} inventory={inventory} winter={winter}/>;
  return localize(<div className={`adventure-hud overlay${winter?' christmas-combat':''}`}>

    <div className="hud-top"><div className="level-card"><small>{hud.levelName}{hud.training?' · DEV':' / 13'}</small><strong>{translate(hud.levelSubtitle, hud.language)}</strong><span>{Math.floor(hud.elapsedLevelTime / 60).toString().padStart(2,'0')}:{Math.floor(hud.elapsedLevelTime % 60).toString().padStart(2,'0')} <i/> <span className="player-health" role="meter" aria-label={hud.language==='vi'?'Máu nhân vật':'Player health'} aria-valuenow={hud.health} aria-valuemin={0} aria-valuemax={hud.maxHealth??100}><b style={{width:`${hud.health/(hud.maxHealth??100)*100}%`}}/><strong>{hud.health} / {hud.maxHealth??100} HP</strong></span></span>
      {(hud.enemiesRemaining??0)>0&&<small>{boss?(hud.language==='vi'?`QUỶ LỬA · ${hud.enemiesRemaining}`:`MINIONS · ${hud.enemiesRemaining}`):(hud.language==='vi'?`QUÁI CANH ĐƯỜNG · ${hud.enemiesRemaining}`:`TRAIL ENEMIES · ${hud.enemiesRemaining}`)}</small>}
      {(hud.echoCount>0 || hud.echoDurationMs>0) && <div className="echo-timeline" aria-label="Echo timeline"><span>ECHO {hud.echoCount}/{hud.echoLimit} · {hud.echoCharges} {hud.language==='vi'?'lượt':'charges'} · {Math.ceil(hud.echoStability)} {hud.language==='vi'?'ổn định':'stability'}</span>{hud.echoDurationMs>0 && <div className="echo-timeline-track"><i style={{left:`${Math.min(100,hud.echoElapsedMs/hud.echoDurationMs*100)}%`}}/>{hud.echoEvents.map((event,index)=><b key={index} style={{left:`${Math.min(100,event.time/hud.echoDurationMs*100)}%`}} title={`${event.kind} · ${(event.time/1000).toFixed(1)}s`}>{event.kind==='attack'?'✦':'◆'}</b>)}</div>}</div>}
    </div>
      <div className="hud-tools"><span className="hud-wallet"><CoinIcon/> {hud.coins} · +2s ×{hud.carriedItems?.find(item=>item?.id==='time')?.count ?? 0}</span><button aria-label={hud.language==='vi'?'Sổ tay hướng dẫn':'Guide'} title={hud.language==='vi'?'Sổ tay hướng dẫn':'Guide'} onClick={() => engine?.openGuide()}><BookOpen size={17}/></button><button aria-label={hud.language==='vi'?'Túi đồ':'Inventory'} data-tutorial="bag" aria-keyshortcuts="Tab" title={hud.language==='vi'?'Túi đồ · Tab':'Inventory · Tab'} onClick={openBag}><Backpack size={17}/><NewDot feature="bag" show={false} acquired={hud.newItems || hud.newRunes}/></button><button aria-label={hud.language==='vi'?'Tạm dừng':'Pause game'} title="Esc" onClick={() => engine?.pauseGame()}><Pause size={17}/></button></div>
    {hud.legTimeRemaining !== null && <div className={'leg-clock ' + (hud.legTimeRemaining <= 2 ? 'urgent' : '')} role="timer" aria-label="Thời gian đến điểm kế tiếp"><div><span>{hud.checkpointIndex < hud.checkpointCount ? (hud.language==='vi'?`ĐẾN ẤN THẠCH ${hud.checkpointIndex+1} / ${hud.checkpointCount}`:`REACH RUNE ${hud.checkpointIndex+1} / ${hud.checkpointCount}`) : (hud.language==='vi'?'ĐẾN CỔNG THOÁT':'REACH EXIT')}</span><strong>{hud.legTimeRemaining.toFixed(1)}<small>s</small></strong></div><div className="leg-track"><i style={{width: `${Math.min(100,hud.legTimeRemaining/(hud.legTimeBudget??16)*100)}%`}}/></div><p>{hud.slowed ? (hud.language==='vi'?'DÂY LEO · TỐC ĐỘ −45%':'VINES · SPEED −45%') : (hud.exitOpen ? (hud.language==='vi'?'LỐI THOÁT ĐÃ MỞ · BƯỚC VÀO CỔNG!':'EXIT OPEN · ENTER PORTAL!') : hud.finalGateCrossed ? ((hud.exitBlockingEnemiesRemaining??0)>0?(hud.language==='vi'?`CÒN ${hud.exitBlockingEnemiesRemaining} LÍNH GÁC · HẠ ĐỂ MỞ CỔNG`:`${hud.exitBlockingEnemiesRemaining} GUARDS · CLEAR TO OPEN EXIT`):(hud.language==='vi'?'KÍCH HOẠT ĐỦ ẤN ĐỂ MỞ LỐI THOÁT':'ACTIVATE ALL RUNES TO OPEN EXIT')) : hud.finalGateNeedsRelease ? (hud.language==='vi'?'CỔNG CUỐI · NHẢ ẤN ĐÁNH DẤU':'FINAL GATE · RELEASE MARKED RUNE') : (hud.language==='vi'?`ẤN CỔNG CUỐI: ${hud.runesHeld??0} / ${hud.runesRequired??0}`:`FINAL SEALS: ${hud.runesHeld??0} / ${hud.runesRequired??0}`))}</p></div>}
    {hud.legTimeRemaining === null && !boss && <div className="leg-clock run-clock" role="timer" aria-label={hud.language==='vi'?'Thời gian màn chơi':'Level time'}><div><span>{hud.language==='vi'?'THỜI GIAN MÀN CHƠI':'LEVEL TIME'}</span><strong>{Math.floor(hud.elapsedLevelTime/60).toString().padStart(2,'0')}:{Math.floor(hud.elapsedLevelTime%60).toString().padStart(2,'0')}</strong></div><p>{hud.devUnlocked||hud.training?(hud.language==='vi'?'KHÔNG GIỚI HẠN · CHẾ ĐỘ TẬP':'NO TIME LIMIT · PRACTICE'):(hud.language==='vi'?'THỜI GIAN ĐÃ CHƠI':'ELAPSED TIME')}</p></div>}
    {boss && <div className="boss-bar"><div><span>{hud.bossKind==='demon'?'QUỶ TÂM HỎA':'THỦ VỆ BĂNG'}</span><small>{hud.bossHp} / {hud.bossMaxHp??GUARDIAN_HP} · {translate('GIAI ĐOẠN',hud.language)} {hud.bossPhase} / 3</small></div><div className="health-track boss-segments" role="progressbar" aria-label="Máu boss" aria-valuenow={hud.bossHp} aria-valuemin={0} aria-valuemax={hud.bossMaxHp??GUARDIAN_HP}><i style={{ width: `${hud.bossHp/(hud.bossMaxHp??GUARDIAN_HP)*100}%` }}/>{[1,2,3].map(k=><b key={k} className={hud.bossHp>k*(hud.bossMaxHp??GUARDIAN_HP)/4?'':'spent'} style={{left:`${k*25}%`}}/>)}</div><p className="boss-armor">{hud.bossKind==='demon'?(hud.demonStunned?(hud.language==='vi'?'SƠ HỞ CHOÁNG · SÁT THƯƠNG ×2.5 · ĐÁNH NGAY!':'STUNNED · 2.5× DAMAGE · STRIKE NOW!'):hud.demonRitual?(hud.language==='vi'?'TẾ LỄ NGUYÊN TỐ · ĐỨNG LÊN TRỤ ĐỂ PHONG ẤN!':'RITUAL · STAND ON CORE TO SEAL!'):hud.demonHeatShield?(hud.language==='vi'?'GIÁP KHÁNG HỎA · DỤ BOSS HÚC VÀO TRỤ TẢN NHIỆT!':'HEAT SHIELD · BAIT BOSS INTO COOLING VENT!'):hud.bossVulnerable?(hud.language==='vi'?'SƠ HỞ · PHẢN CÔNG +35%':'OPENING · DAMAGE +35%'):(hud.language==='vi'?'NÉ VÙNG CAM · DỤ BOSS ĐÁNH ECHO':'EVADE ORANGE ZONES · BAIT ATTACKS ON ECHO')):hud.pillarsRemaining>0?(hud.language==='vi'?`PHÁ ${hud.pillarsRemaining} TRỤ · GIÁP ${hud.bossArmor}`:`BREAK ${hud.pillarsRemaining} PILLARS · ARMOR ${hud.bossArmor}`):hud.bossVulnerable?(hud.language==='vi'?'SƠ HỞ · SÁT THƯƠNG +35%':'OPENING · DAMAGE +35%'):(hud.bossShieldAt??0)>0?(hud.language==='vi'?`KHIÊN KẾ TIẾP · ${hud.bossShieldAt} HP`:`NEXT SHIELD · ${hud.bossShieldAt} HP`):(hud.language==='vi'?'ĐOẠN MÁU CUỐI':'FINAL HEALTH BAR')}</p></div>}
    </div>
    <div className="hud-alerts">
      {hud.bannerMessage && <div className={'hud-banner ' + (boss ? 'boss-banner' : 'trail-banner')}>{hud.bannerMessage}</div>}
      {hud.activeBuff && <div className="combat-buff">{hud.activeBuff}</div>}
      {hud.dissonanceSeconds>0 && <div className="combat-buff" role="status">RẠN VỠ {hud.dissonanceSeconds.toFixed(1)} / 5s · Gọi Echo để bảo hộ</div>}
    </div>
    {!bag&&!hud.bossIntroduction&&<CombatActionBar engine={engine} hud={hud} touch={touch}/>}
    {touch&&!bag&&!hud.bossIntroduction&&<><TouchEchoStrip engine={engine} hud={hud}/><div className="mobile-combat-items"><CombatItemSlots engine={engine} hud={hud}/></div></>}
    {touch&&!bag&&!hud.bossIntroduction&&<TouchJoystick engine={engine} vi={hud.language==='vi'}/>}

    {/* Selected runes are managed and activated inside Inventory. */}
    {inventory}
  </div>);
}

function LevelOneHUD({ engine, hud, openBag, inventory, winter }: { engine: GameEngine | null; hud: HUDState; openBag: () => void; inventory: React.ReactNode; winter:boolean }) {
  const vi = hud.language === 'vi';
  const boss = hud.bossHp > 0;
  const time = `${Math.floor(hud.elapsedLevelTime / 60).toString().padStart(2, '0')}:${Math.floor(hud.elapsedLevelTime % 60).toString().padStart(2, '0')}`;
  const hero = hud.characterClass === 'swordsman' ? 'KAEL' : hud.characterClass === 'assassin' ? 'CRIMSON VEIL' : hud.characterClass === 'mechanical' ? 'RIVET-07' : 'AERIS';
  return localize(<div className={`level-one-hud overlay${winter?' christmas-combat':''}`}>
    <aside className="level-one-left" inert={!!inventory}>
      <div className="level-one-sidebar-content">
        <div className="level-one-stat"><small>{vi ? 'MÀN CHƠI' : 'LEVEL'}</small><strong>{engine?.isChristmasTrail?'NOEL':hud.training ? 'DEV' : <>{String(engine?.currentLevel.id ?? 1).padStart(2, '0')} <em>/ {String(LEVELS.length).padStart(2, '0')}</em></>}</strong></div>
        {/* One clock, in the same card style as the level: the leg countdown on timed levels, elapsed time otherwise. */}
        {hud.legTimeRemaining !== null
          ? <div className="level-one-stat level-one-clock" role="timer" aria-label={vi ? 'Thời gian còn lại' : 'Time remaining'}><small>{vi ? 'CÒN LẠI' : 'TIME LEFT'}</small><strong className={hud.legTimeRemaining <= 5 ? 'urgent' : undefined}>{hud.legTimeRemaining.toFixed(1)}<em>s</em></strong></div>
          : <div className="level-one-stat"><small>{vi ? 'THỜI GIAN' : 'ELAPSED'}</small><strong>{time}</strong></div>}
        {boss && (
          <div className="level-one-stat"><small>{vi ? 'MÁU BOSS' : 'BOSS HP'}</small><strong>{hud.bossHp} <em>/ {hud.bossMaxHp ?? 240}</em></strong></div>
        )}
        <div className="level-one-vitals">
          <div className="vital vital-hp" role="meter" aria-label="HP" aria-valuenow={Math.ceil(hud.health)} aria-valuemin={0} aria-valuemax={hud.maxHealth ?? 100}>
            <span><b>HP</b>{Math.ceil(hud.health)}/{hud.maxHealth ?? 100}</span><i><i style={{ width: `${Math.max(0, hud.health / (hud.maxHealth ?? 100) * 100)}%` }}/></i>
          </div>
          <div className="vital vital-mp" role="meter" aria-label="MP" aria-valuenow={Math.floor(hud.mana ?? 100)} aria-valuemin={0} aria-valuemax={hud.maxMana ?? 100}>
            <span><b>MP</b>{Math.floor(hud.mana ?? 100)}/{hud.maxMana ?? 100}</span><i><i style={{ width: `${Math.max(0, (hud.mana ?? 100) / (hud.maxMana ?? 100) * 100)}%` }}/></i>
          </div>
        </div>
        <div className="level-one-runes"><EchoRuneStock engine={engine} hud={hud} compact/></div>
        <CombatItemSlots engine={engine} hud={hud}/>
      </div>
      <div className="level-one-utilities" role="group" aria-label={vi ? 'Tiện ích' : 'Game utilities'}>
        <button aria-label={vi ? 'Cài đặt và tạm dừng' : 'Settings and pause'} title={`${vi?'Cài đặt':'Settings'} · ${bindingLabel('pause')}`} onClick={() => engine?.pauseGame()}><Settings size={18}/></button>
        <button aria-label={vi ? 'Túi đồ' : 'Inventory'} data-tutorial="bag" aria-keyshortcuts="Tab" title={`${vi?'Túi đồ':'Inventory'} · ${bindingLabel('inventory')}`} onClick={openBag}><Backpack size={18}/><NewDot feature="bag" show={false} acquired={hud.newItems || hud.newRunes}/></button>
        <button aria-label={vi ? 'Sổ tay hướng dẫn' : 'Guide'} title={vi ? 'Sổ tay hướng dẫn' : 'Guide'} onClick={() => engine?.openGuide()}><BookOpen size={18}/></button>
      </div>
    </aside>
    <header className="level-one-top">
      <div className="level-one-heading"><strong>{hud.levelSubtitle}</strong></div>
    </header>
    <div className="level-one-arena-overlay">
      {boss && <div className="boss-bar"><div><span>{hud.bossKind === 'demon' ? 'QUỶ TÂM HỎA' : 'THỦ VỆ BĂNG'}</span><small>{hud.bossHp} / {hud.bossMaxHp ?? 240} · {translate('GIAI ĐOẠN', hud.language)} {hud.bossPhase} / 3</small></div><div className="health-track boss-segments" role="progressbar" aria-label="Máu boss" aria-valuenow={hud.bossHp} aria-valuemin={0} aria-valuemax={hud.bossMaxHp ?? 240}><i style={{ width: `${hud.bossHp / (hud.bossMaxHp ?? 240) * 100}%` }}/>{[1, 2, 3].map(k => <b key={k} className={hud.bossHp > k * (hud.bossMaxHp ?? 240) / 4 ? '' : 'spent'} style={{ left: `${k * 25}%` }}/>)}</div><p className="boss-armor">{hud.bossKind === 'demon' ? (hud.demonStunned ? (vi ? 'SƠ HỞ CHOÁNG · SÁT THƯƠNG ×2.5 · ĐÁNH NGAY!' : 'STUNNED · 2.5× DAMAGE · STRIKE NOW!') : hud.demonRitual ? (vi ? 'TẾ LỄ NGUYÊN TỐ · ĐỨNG LÊN TRỤ ĐỂ PHONG ẤN!' : 'RITUAL · STAND ON CORE TO SEAL!') : hud.demonHeatShield ? (vi ? 'GIÁP KHÁNG HỎA · DỤ BOSS HÚC VÀO TRỤ TẢN NHIỆT!' : 'HEAT SHIELD · BAIT BOSS INTO COOLING VENT!') : hud.bossVulnerable ? (vi ? 'SƠ HỞ · PHẢN CÔNG +35%' : 'OPENING · DAMAGE +35%') : (vi ? 'NÉ VÙNG CAM · DỤ BOSS ĐÁNH ECHO' : 'EVADE ORANGE ZONES · BAIT ATTACKS ON ECHO')) : hud.pillarsRemaining > 0 ? (vi ? `PHÁ ${hud.pillarsRemaining} TRỤ · GIÁP ${hud.bossArmor}` : `BREAK ${hud.pillarsRemaining} PILLARS · ARMOR ${hud.bossArmor}`) : hud.bossVulnerable ? (vi ? 'SƠ HỞ · SÁT THƯƠNG +35%' : 'OPENING · DAMAGE +35%') : (hud.bossShieldAt ?? 0) > 0 ? (vi ? `KHIÊN KẾ TIẾP · ${hud.bossShieldAt} HP` : `NEXT SHIELD · ${hud.bossShieldAt} HP`) : (vi ? 'ĐOẠN MÁU CUỐI' : 'FINAL HEALTH BAR')}</p></div>}
      <div className="hud-alerts">
        {hud.bannerMessage && <div className={'hud-banner ' + (boss ? 'boss-banner' : 'trail-banner')}>{hud.bannerMessage}</div>}
        {hud.activeBuff && <div className="combat-buff">{hud.activeBuff}</div>}
        {hud.dissonanceSeconds > 0 && <div className="combat-buff" role="status">RẠN VỠ {hud.dissonanceSeconds.toFixed(1)} / 5s · Gọi Echo để bảo hộ</div>}
      </div>
    </div>
    <aside className="level-one-right" inert={!!inventory}>
      <div className="level-one-character"><SelectedCharacterAvatar hud={hud}/><small>{vi ? 'NHÂN VẬT' : 'CHARACTER'}</small><strong>{hero}</strong></div>
      {!inventory && !hud.bossIntroduction && <CombatActionBar engine={engine} hud={hud}/>}
    </aside>
    {inventory}
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
 const vi=hud.language==='vi',timeout=hud.defeatReason==='timeout',boss=engine?.boss;
 const art=timeout?'timeout':hud.characterClass==='swordsman'?'swordsman':'mage';
 const panelArt=usePanelArt(PANEL_ART.defeat[art]);
 const hint = timeout
  ? (vi ? `Chạm ấn kế tiếp để nạp lại giờ. Mảnh thời gian cộng ${SHARD_BONUS} giây.` : `Reach the next rune to refill the timer. Time shards add ${SHARD_BONUS} seconds.`)
  : boss?.kind==='demon'
   ? (vi ? 'Phong ấn lõi và dùng Echo dụ boss lao vào trụ tản nhiệt. Tấn công khi boss choáng.' : 'Seal the cores and use an Echo to bait the boss into a cooling vent. Strike while it is stunned.')
  : boss
   ? (vi ? 'Phá 4 trụ để hạ khiên. Rời vùng báo đòn, rồi đánh khi hiện “Sơ hở”.' : 'Break 4 pillars to drop the shield. Dodge marked attacks, then strike during “Opening”.')
   : (vi ? 'Rời vòng cảnh báo trước khi quái hoặc bẫy ra đòn.' : 'Leave the marked area before enemies or traps strike.');
 return <div className="modal-backdrop defeat-backdrop"><section className="forest-defeat" data-panel-art={panelArt} data-reduced-motion={hud.reducedMotion} data-reason={timeout?'timeout':'damage'} role="dialog" aria-modal="true" aria-labelledby="defeat-title">
  <h2 id="defeat-title">{timeout?(vi?'HẾT THỜI GIAN':'TIME RAN OUT'):(vi?'TỬ VONG':'DEFEATED')}</h2>
  <div className="defeat-content">
  <p className="defeat-level">{translate(hud.levelName,hud.language)} · {translate(hud.levelSubtitle,hud.language)}</p>
  <figure className="defeat-hero-scene" data-hero={art}>
   <img src={DEFEAT_ART[art]} alt="" />
  </figure>
  <div className="defeat-stats"><span>{vi?'THỜI GIAN':'TIME'} <b>{hud.elapsedLevelTime.toFixed(1)}s</b></span><span>{vi?'MÀN CHƠI':'TRAIL'} <b>{engine?.isChristmasTrail?'NOEL':String((engine?.currentLevelIdx??0)+1).padStart(2,'0')}</b></span></div>
  <p className="defeat-hint">{hint}</p>
  {!timeout&&engine?.canUseSupply('revive')&&<button className="defeat-revive" onClick={()=>engine.useSupply('revive')}>{vi?'DÙNG TRỤC PHỤC SINH · VỀ PHÁP ĐÀN':'USE REVIVAL SCROLL · RETURN TO ALTAR'}</button>}
  <button className="defeat-retry" onClick={()=>engine?.requestBattleRetry()}><RotateCcw size={18}/>{vi?'THỬ LẠI':'TRY AGAIN'}<ArrowRight size={17}/></button>
  <div className="defeat-secondary-actions">
    {engine?.battlePreparationUnlocked&&<button className="defeat-return" onClick={()=>engine.requestBattleRetry(true)}><Backpack size={15}/>{vi?'CHUẨN BỊ VẬT PHẨM':'PREPARE ITEMS'}</button>}
    <button className="defeat-return" onClick={()=>engine?.goToLobby()}><Map size={15}/>{vi?'VỀ TRẠI':'BACK TO BASE CAMP'}</button>
  </div>
  </div>
 </section></div>;
}

export function EndScreen({ engine, hud }: { engine: GameEngine | null; hud: HUDState }) {
  if(hud.screen!=='ending')return <DefeatScreen engine={engine} hud={hud}/>;
  const vi=hud.language==='vi',hero=hud.characterClass==='swordsman'?'Kael':hud.characterClass==='assassin'?'Crimson Veil':hud.characterClass==='mechanical'?'Rivet-07':'Aeris';
  return <div className="modal-backdrop finale-backdrop"><section className="journey-finale" data-reduced-motion={hud.reducedMotion} role="dialog" aria-modal="true" aria-labelledby="finale-title">
    <header className="finale-heading"><span>{vi?'HÀNH TRÌNH HOÀN TẤT':'JOURNEY COMPLETE'}</span><b>VI / VI</b></header>
    <div className="finale-body"><div className="finale-hero" data-character={hud.characterClass}><div className="hero-echo-ring"/><div className="finale-portrait"><SelectedCharacterAvatar hud={hud}/></div><span>{hero}</span><small>{vi?'NGƯỜI GÌN GIỮ KÝ ỨC':'KEEPER OF ECHOES'}</small></div>
    <div className="finale-story"><span className="finale-kicker">{vi?'THỦ VỆ BĂNG ĐÃ GỤC NGÃ':'THE FROST GUARDIAN HAS FALLEN'}</span><h2 id="finale-title">{vi?'Khu rừng\nđã thức giấc.':'The forest\nawakens.'}</h2><p>{vi?'Bạn và các Echo đã hoàn thành cả sáu thử thách.':'You and your Echoes completed all six trials.'}</p>
    <div className="finale-seals" aria-label={vi?'Đã hoàn thành 6 màn':'All six trials completed'}>{['I','II','III','IV','V','VI'].map(n=><span key={n}>{n}<Check size={12}/></span>)}</div>
    <div className="finale-stats"><span>{vi?'THỜI GIAN ĐẤU BOSS':'BOSS BATTLE'}<b>{hud.elapsedLevelTime.toFixed(1)}s</b></span><span>{vi?'XẾP HẠNG':'RATING'}<b aria-label={`${hud.lastRating?.stars??0} / 3`}>{'★'.repeat(hud.lastRating?.stars??0)}{'☆'.repeat(3-(hud.lastRating?.stars??0))}</b></span></div>
    <p className="finale-key-reward">+{hud.lastRating?.commonCrystals??0} {vi?'TANUKI PHÀM TINH THỂ':'TANUKI CELESTIAL CRYSTALS'}</p>
    <p className="finale-saved">{vi?'Tiến trình đã lưu · Cả sáu màn đã mở để chơi lại.':'Progress saved · All six trails are open for replay.'}</p></div></div>
    <footer className="finale-actions"><button className="secondary" onClick={()=>engine?.requestBattleRetry()}><RotateCcw size={17}/>{vi?'ĐẤU LẠI BOSS':'REMATCH GUARDIAN'}</button><button className="primary" onClick={()=>engine?.goToLobby()}><Map size={18}/>{vi?'VỀ TRẠI':'BACK TO BASE CAMP'}<ArrowRight size={17}/></button></footer>
  </section></div>;
}
