import {rarityName,rarityColor} from '../game/logic/rarity.ts';
import { useEffect } from 'react';
import { Home, RotateCcw, Ticket, Coins, LogOut, Shuffle } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { HUNT_CARD, xpToNext, waveReward } from '../game/logic/snowHunt.ts';
import './SnowHuntHUD.css';

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${Math.floor(Math.max(0, s) % 60).toString().padStart(2, '0')}`;

/**
 * Snow Hunt overlay: wave clock, XP bar, run loot and Retreat; the level-up card offer (keys 1–3);
 * and the result panel when the run ends. All in the flat-stone in-match frame.
 */
export function SnowHuntHUD({ engine, hud }: { engine: GameEngine; hud: HUDState }) {
  const run = hud.hunt;
  const vi = hud.language === 'vi';
  const choices = run?.choices ?? null;
  useEffect(() => {
    if (!choices) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') { e.preventDefault(); e.stopImmediatePropagation(); engine.rerollHuntCards(); return; }
      const i = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code) % 3;
      if (i >= 0 && choices[i]) { e.preventDefault(); e.stopImmediatePropagation(); engine.chooseHuntCard(choices[i]); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [choices, engine]);
  if (!run) return null;
  const result = hud.huntResult;
  const need = xpToNext(run.level);
  const owned = Object.entries(run.stacks).filter(([id, n]) => n > 0 && HUNT_CARD[id]);
  const next = waveReward(run.wave);
  return <div className="snow-hunt-layer">
    <header className="snow-hunt-bar stone-frame">
      <div className="snow-hunt-wave"><small>{vi ? 'ĐỢT' : 'WAVE'}</small><strong>{run.wave}</strong><span>{clock(run.waveTime)}</span></div>
      <div className="snow-hunt-xp" title={`${run.xp} / ${need} XP`}>
        <small>{vi ? 'CẤP' : 'LEVEL'} {run.level}<span>{run.xp} / {need} XP</span></small>
        <i key={run.xpPulse} className={run.xpPulse ? 'pulse' : undefined}><i style={{ width: `${Math.min(100, run.xp / need * 100)}%` }}/></i>
      </div>
      <div className="snow-hunt-loot">
        <span title={vi ? 'Vé Noel' : 'Noel tickets'}><Ticket size={16} aria-hidden="true"/>{run.tickets}</span>
        <span title={vi ? 'Xu' : 'Coins'}><Coins size={16} aria-hidden="true"/>{run.coins}</span>
        <small>{vi ? `Qua đợt: +${next.tickets} vé, +${next.coins} xu` : `Wave clear: +${next.tickets} tickets, +${next.coins} coins`}</small>
      </div>
      {!run.over && <button type="button" className="snow-hunt-retreat" onClick={() => engine.endSnowHunt()}
        title={vi ? 'Kết thúc lượt và giữ toàn bộ vé, xu đã nhặt' : 'End the run and keep everything collected'}><LogOut size={15} aria-hidden="true"/>{vi ? 'Rút lui' : 'Retreat'}</button>}
    </header>

    {owned.length > 0 && <ul className="snow-hunt-owned" aria-label={vi ? 'Sức mạnh đang có' : 'Powers this run'}>
      {owned.map(([id, level]) => {
        const card = HUNT_CARD[id];
        return <li key={id} className={`side-${card.side}${card.needs ? ' evolved' : ''}`} style={{ '--rarity': rarityColor(card.rarity) } as React.CSSProperties}
          title={vi ? card.descVi : card.descEn}>{vi ? card.vi : card.en}{card.max > 1 && <b>{level}</b>}</li>;
      })}
    </ul>}

    {run.waveBanner > 0 && !run.over && <div className="snow-hunt-wave-banner" key={run.wave}>{vi ? `ĐỢT ${run.wave}` : `WAVE ${run.wave}`}</div>}

    {choices && !run.over && <div className="snow-hunt-offer" role="dialog" aria-modal="true" aria-labelledby="snow-hunt-offer-title">
      <h2 id="snow-hunt-offer-title">{run.offerKind === 'wave'
        ? (vi ? `Qua đợt ${run.wave - 1}! Chọn 1 trong 2` : `Wave ${run.wave - 1} cleared! Pick 1 of 2`)
        : (vi ? `Lên cấp ${run.level}! Chọn một sức mạnh` : `Level ${run.level}! Choose a power`)}</h2>
      <div className="snow-hunt-cards">
        {choices.map((id, i) => {
          const card = HUNT_CARD[id];
          const owned = run.stacks[id] ?? 0;
          const rarity = {vi:rarityName(card.rarity,true),en:rarityName(card.rarity,false),color:rarityColor(card.rarity)};
          return <button type="button" key={id} className={`snow-hunt-card stone-frame side-${card.side}`} style={{ '--rarity': rarity.color } as React.CSSProperties}
            onClick={() => engine.chooseHuntCard(id)}>
            <span className="snow-hunt-card-key">{i + 1}</span>
            <span className="snow-hunt-card-side">{card.needs ? (vi ? 'TIẾN HOÁ' : 'EVOLUTION') : card.side === 'echo' ? 'ECHO' : card.hero ? (vi ? 'RIÊNG' : 'SIGNATURE') : (vi ? 'NHÂN VẬT' : 'HERO')}</span>
            <strong>{vi ? card.vi : card.en}</strong>
            <p>{vi ? card.descVi : card.descEn}</p>
            <small>{vi ? rarity.vi : rarity.en}{card.max > 1 ? ` · ${vi ? 'Cấp' : 'Lv'} ${owned + 1}/${card.max}` : ''}</small>
          </button>;
        })}
      </div>
      <button type="button" className="snow-hunt-reroll" disabled={run.rerolls <= 0} onClick={() => engine.rerollHuntCards()}>
        <Shuffle size={15} aria-hidden="true"/>{vi ? `Đổi thẻ (R) · còn ${run.rerolls}` : `Reroll (R) · ${run.rerolls} left`}
      </button>
    </div>}

    {result && <div className="snow-hunt-result" role="dialog" aria-modal="true" aria-labelledby="snow-hunt-result-title">
      <section className="stone-frame">
        <h2 id="snow-hunt-result-title">{vi ? 'Kết thúc lượt săn' : 'Hunt over'}</h2>
        <dl>
          <div><dt>{vi ? 'Đợt đạt tới' : 'Wave reached'}</dt><dd>{result.wave}</dd></div>
          <div><dt>{vi ? 'Thời gian trụ' : 'Time survived'}</dt><dd>{clock(result.time)}</dd></div>
          <div><dt>{vi ? 'Quái đã hạ' : 'Enemies defeated'}</dt><dd>{result.kills}</dd></div>
          <div><dt>{vi ? 'Cấp' : 'Level'}</dt><dd>{result.level}</dd></div>
        </dl>
        <p className="snow-hunt-take"><span><Ticket size={20} aria-hidden="true"/>+{result.tickets} {vi ? 'vé Noel' : 'Noel tickets'}</span><span><Coins size={20} aria-hidden="true"/>+{result.coins} {vi ? 'xu' : 'coins'}</span></p>
        <small>{vi ? `Tổng vé Noel: ${hud.noelTickets ?? 0}` : `Noel tickets total: ${hud.noelTickets ?? 0}`}</small>
        <footer>
          <button type="button" onClick={() => engine.goToLobby()}><Home size={17} aria-hidden="true"/>{vi ? 'Về trại' : 'Back to camp'}</button>
          <button type="button" className="primary" onClick={() => engine.restartSnowHunt()}><RotateCcw size={17} aria-hidden="true"/>{vi ? 'Săn tiếp' : 'Hunt again'}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
