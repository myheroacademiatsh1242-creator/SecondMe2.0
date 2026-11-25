import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Check, Gift, X } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { CHRISTMAS_COINS, christmasSeason, type SeasonPreview } from '../game/logic/christmas.ts';
import './ChristmasEvent.css';

export function useChristmas(selection: SeasonPreview = 'auto') {
  const [year, setYear] = useState(christmasSeason);
  useEffect(() => {
    const refresh = () => setYear(christmasSeason());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const preview = selection === 'christmas';
  return { preview, year, active: preview || (selection === 'auto' && year !== null) };
}

export function ChristmasLights() {
  return <div className="christmas-lights" aria-hidden="true">
    {Array.from({ length: 7 }, (_, index) => <i key={index}/>)}
  </div>;
}

const menuBulbs = [
  [190, 482, '#ff503b'], [199, 400, '#69d9ff'], [228, 360, '#ff503b'],
  [284, 335, '#ff523b'], [309, 351, '#ffcf4b'], [337, 348, '#ff503b'],
  [381, 309, '#ff5338'], [426, 303, '#ffcb56'], [471, 402, '#ffdb52'],
  [512, 399, '#ff643b'], [521, 428, '#ffd451'], [492, 504, '#ffd157'],
  [229, 662, '#ff6142'], [235, 611, '#63caff'], [207, 574, '#ff5350'],
  [256, 502, '#ffe15f'], [1172, 216, '#66dcff'], [1202, 223, '#ffce57'],
  [1235, 222, '#ff5839'], [1262, 212, '#72deff'], [1380, 208, '#ffd75f'],
  [1408, 220, '#78d9ff'], [1471, 226, '#ffd252'], [1548, 92, '#ff5344'],
] as const;

export function ChristmasMenuGlow({ still }: { still: boolean }) {
  if (still) return null;
  return <svg className="christmas-menu-glow" viewBox="0 0 1672 941"
    preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <radialGradient id="winter-bulb-aura">
        <stop stopColor="white" stopOpacity=".7"/>
        <stop offset="1" stopColor="white" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id="winter-bulb-dim">
        <stop offset=".25" stopColor="#0b1522" stopOpacity=".96"/>
        <stop offset=".55" stopColor="#0b1522" stopOpacity=".78"/>
        <stop offset="1" stopColor="#0b1522" stopOpacity="0"/>
      </radialGradient>
    </defs>
    {menuBulbs.map(([x, y, color], index) => <g key={x}
      style={{
        '--blink-delay': `-${index * .67}s`,
        '--blink-period': `${2.3 + index % 4 * .65}s`,
        '--reveal-delay': `${.32 + Math.floor(index / 4) * .12}s`,
        '--steady-delay': `${2.25 + index % 6 * .09}s`,
      } as CSSProperties}>
      <circle className="winter-menu-bulb-dim" cx={x} cy={y} r="12" fill="url(#winter-bulb-dim)"/>
      <g className="winter-menu-bulb">
        <circle cx={x} cy={y} r="13" fill="url(#winter-bulb-aura)"/>
        <circle cx={x} cy={y} r="3" fill={color}/>
      </g>
    </g>)}
    <g className="winter-menu-secondary-glow">
      <circle className="winter-menu-fire" cx="849" cy="590" r="36" fill="url(#winter-bulb-aura)"/>
      <path className="winter-menu-bell-glint" d="M854 240v14m-7-7h14 M230 240v12m-6-6h12"
        fill="none" stroke="#fff0a3" strokeWidth="2"/>
    </g>
  </svg>;
}

export function ChristmasOrnaments({ scene, still }: {
  scene: 'loading' | 'shop' | 'camp';
  still: boolean;
}) {
  const first = scene === 'shop' || scene === 'loading' ? 'stocking' : 'candy';
  const second = scene === 'camp' ? 'stocking' : 'candy';
  const root = `${import.meta.env.BASE_URL}assets/ui/noel/`;
  return <div className={`christmas-ornaments ornaments-${scene}${still ? ' ornaments-still' : ''}`} aria-hidden="true">
    <img src={`${root}pedestal-${first}.png`} alt="" draggable={false}/>
    <img src={`${root}pedestal-${second}.png`} alt="" draggable={false}/>
  </div>;
}

export function ChristmasSnow({ still = false, count = 20 }: { still?: boolean; count?: number }) {
  return <div className={`christmas-snow${still ? ' christmas-snow--still' : ''}`} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <i key={index} style={{
      '--x': `${(index * 47 + 5) % 99}%`,
      '--y': `${(index * 29 + 11) % 97}%`,
      '--size': `${2 + index % 4}px`,
      '--drift': `${(index % 9 - 4) * 13}px`,
      '--fall': `${7 + index % 9 * .9}s`,
      '--delay': `-${index * 0.87}s`,
    } as CSSProperties}/>)}
  </div>;
}

export function ChristmasPanelTrim({ still }: { still: boolean }) {
  return <div className="christmas-panel-trim" aria-hidden="true">
    <ChristmasSnow still={still}/>
    <ChristmasLights/>
  </div>;
}

export function ChristmasEvent({ engine, hud, event, menuDialog }: {
  engine: GameEngine | null;
  hud: HUDState;
  event: ReturnType<typeof useChristmas>;
  menuDialog?: RefObject<HTMLDialogElement | null>;
}) {
  const shopDialog = useRef<HTMLDialogElement>(null);
  const dialog = menuDialog ?? shopDialog;
  const [previewClaimed, setPreviewClaimed] = useState(false);
  useEffect(() => { if (!event.preview) setPreviewClaimed(false); }, [event.preview]);
  const vi = hud.language === 'vi';
  const claimed = event.preview ? previewClaimed
    : event.year !== null && event.year <= (engine?.campaign.christmasGiftYear ?? 0);

  if (!event.active) return null;
  return <div className="christmas-entry">
    {!menuDialog && <button className="christmas-trigger" type="button" onClick={() => dialog.current?.showModal()}>
      <Gift size={18} aria-hidden="true"/>{vi ? 'Sự kiện Noel' : 'Christmas event'}
    </button>}
    <dialog className="christmas-dialog" ref={dialog} data-lobby-dialog
      aria-label={vi ? 'Sự kiện Noel' : 'Christmas event'}
      onKeyDown={e => {
        if (e.key === 'Escape') dialog.current?.close();
        e.stopPropagation();
      }}>
      <ChristmasLights/>
      <button className="christmas-close" type="button" autoFocus onClick={() => dialog.current?.close()}
        aria-label={vi ? 'Đóng' : 'Close'}><X size={22}/></button>
      <div className="christmas-gift" aria-hidden="true"><i/></div>
      <p className="christmas-dates">{vi ? '01–31/12 · Giờ Việt Nam' : 'Dec 1–31 · Vietnam time'}</p>
      <h2>{vi ? 'Săn quái đêm Noel' : 'Snow Hunt'}</h2>
      <p>{vi ? 'Trụ qua các đợt quái tuyết, lên cấp chọn sức mạnh cho nhân vật và Echo. Trụ càng lâu, càng nhiều vé Noel và xu.' : 'Survive waves of snow monsters and level up powers for your hero and Echoes. The longer you last, the more Noel tickets and coins.'}</p>
      <button className="christmas-claim christmas-play" type="button" disabled={!engine?.canPlayChristmasTrail}
        onClick={()=>{if(engine?.startSnowHunt())dialog.current?.close();}}>
        {vi?'Chơi sự kiện':'Play event'}
      </button>
      {!engine?.campaign.bossDefeated&&!hud.devUnlocked&&<p>{vi?'Thắng Boss 1 · Thủ Vệ Băng để mở khóa.':'Defeat Boss 1 · the Frost Guardian to unlock.'}</p>}
      {engine?.campaign.bossDefeated&&!!hud.pendingRuneChoices?.length&&<p>{vi?'Nhận ấn thưởng đang chờ để vào sự kiện.':'Claim your pending rune reward to enter the event.'}</p>}
      {event.preview && <p className="christmas-preview">{vi ? 'Xem thử local · Xu thử không cộng vào túi.' : 'Local preview · Test coins are not added to your wallet.'}</p>}
      <button className="christmas-claim" type="button" disabled={claimed || (!event.preview && !engine)}
        onClick={() => event.preview ? setPreviewClaimed(true) : engine?.claimChristmasGift()}>
        {claimed ? <><Check size={18} aria-hidden="true"/>{vi ? 'Đã nhận quà' : 'Gift claimed'}</>
          : vi ? `Nhận ${CHRISTMAS_COINS} xu` : `Claim ${CHRISTMAS_COINS} coins`}
      </button>
    </dialog>
  </div>;
}
