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

export function ChristmasSnow({ still = false }: { still?: boolean }) {
  return <div className={`christmas-snow${still ? ' christmas-snow--still' : ''}`} aria-hidden="true">
    {Array.from({ length: 20 }, (_, index) => <i key={index} style={{
      '--x': `${(index * 47 + 5) % 99}%`,
      '--y': `${(index * 29 + 11) % 97}%`,
      '--size': `${2 + index % 3}px`,
      '--drift': `${18 + index % 5 * 11}px`,
      '--fall': `${9 + index % 7}s`,
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
    <dialog className="christmas-dialog" ref={dialog}
      aria-label={vi ? 'Quà Noel của Tanuki' : 'Tanuki’s Christmas gift'}
      onKeyDown={e => {
        if (e.key === 'Escape') dialog.current?.close();
        e.stopPropagation();
      }}>
      <ChristmasLights/>
      <button className="christmas-close" type="button" autoFocus onClick={() => dialog.current?.close()}
        aria-label={vi ? 'Đóng' : 'Close'}><X size={22}/></button>
      <div className="christmas-gift" aria-hidden="true"><i/></div>
      <p className="christmas-dates">{vi ? '01–31/12 · Giờ Việt Nam' : 'Dec 1–31 · Vietnam time'}</p>
      <h2>{vi ? 'Quà Noel của Tanuki' : 'Tanuki’s Christmas gift'}</h2>
      <p>{vi ? 'Tanuki để dành một hộp quà cho bạn. Mỗi mùa Noel có một lượt nhận.' : 'Tanuki has saved a gift for you. Claim it once each Christmas season.'}</p>
      {event.preview && <p className="christmas-preview">{vi ? 'Xem thử local · Xu thử không cộng vào túi.' : 'Local preview · Test coins are not added to your wallet.'}</p>}
      <button className="christmas-claim" type="button" disabled={claimed || (!event.preview && !engine)}
        onClick={() => event.preview ? setPreviewClaimed(true) : engine?.claimChristmasGift()}>
        {claimed ? <><Check size={18} aria-hidden="true"/>{vi ? 'Đã nhận quà' : 'Gift claimed'}</>
          : vi ? `Nhận ${CHRISTMAS_COINS} xu` : `Claim ${CHRISTMAS_COINS} coins`}
      </button>
    </dialog>
  </div>;
}
