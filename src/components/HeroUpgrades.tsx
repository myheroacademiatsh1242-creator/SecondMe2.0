import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { cleanHeroRanks, HERO_MAX_RANK, HERO_RESET_FEE_PERCENT, HERO_UPGRADE_PRICES, HERO_UPGRADE_STATS, heroResetQuote, heroStats, type UpgradeHero } from '../game/logic/heroUpgrades.ts';
import { skillManaCost } from '../game/logic/mana.ts';
import './HeroUpgrades.css';

export function HeroUpgrades({ engine, hud, hero, close }: { engine: GameEngine | null; hud: HUDState; hero: UpgradeHero; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [resetSpent, setResetSpent] = useState<number | null>(null);
  const vi = hud.language === 'vi';
  const ranks = hud.heroRanks ?? cleanHeroRanks();
  const format = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US');
  const spent = hud.heroUpgradeSpent?.[hero] ?? 0;
  const resetQuote = resetSpent === null ? null : heroResetQuote(resetSpent);
  const heroName = hero === 'mage' ? 'Aeris' : hero === 'assassin' ? 'Crimson Veil' : 'Kael';
  const role = hero === 'mage' ? (vi ? 'Pháp sư' : 'Mage') : hero === 'assassin' ? (vi ? 'Xạ thủ' : 'Marksman') : (vi ? 'Kiếm sĩ' : 'Swordsman');
  const coins = (amount: number) => `${format.format(amount)} ${vi ? 'xu' : 'coins'}`;
  useEffect(() => { dialog.current?.showModal(); }, []);

  const mage = hero === 'mage';
  const stats = {
    health: { label: vi ? 'Máu tối đa' : 'Max health', value: (s: ReturnType<typeof heroStats>) => `${s.maxHealth} HP` },
    attack: { label: vi ? 'Sát thương cộng thêm' : 'Bonus damage', value: (s: ReturnType<typeof heroStats>) => `+${s.attackBonus}%` },
    specialty: mage
      ? { label: vi ? 'MP dùng Gai Băng' : 'Ice Spike MP cost', value: (s: ReturnType<typeof heroStats>) => `${skillManaCost(hero) - s.skillManaDiscount} MP` }
      : hero === 'assassin'
      ? { label: vi ? 'Chí mạng và hồi chiêu' : 'Crit and skill cooldown', value: (s: ReturnType<typeof heroStats>) => `+${Math.round(s.assassinCritBonus * 100)}% · −${s.assassinSkillCooldownDiscount.toLocaleString(vi?'vi-VN':'en-US',{maximumFractionDigits:2})}s` }
      : { label: vi ? 'Giảm sát thương nhận' : 'Damage reduction', value: (s: ReturnType<typeof heroStats>) => `${s.damageReduction}%` },
  };
  const current = heroStats(hero, ranks);
  const milestones = {
    attack: vi ? 'Cấp 10 · Đòn thường hạ quái màn 1–2 trong một phát.' : 'Rank 10 · Basic attacks defeat enemies in levels 1–2 in one hit.',
    specialty: mage
      ? (vi ? 'Cấp 5 / 10 · Bán kính Gai Băng tăng 15 / 30 px.' : 'Rank 5 / 10 · Ice Spike radius grows by 15 / 30 px.')
      : hero === 'assassin'
      ? (vi ? 'Mỗi cấp +2% chí mạng, −0,08 giây hồi Bóng Ma Đỏ · Cấp 5: nhặt phi tiêu hồi 12 MP · Cấp 10: đòn cuối ném 2 phi tiêu.' : 'Each rank +2% crit, −0.08 sec Crimson Phantom cooldown · Rank 5: picked-up darts restore 12 MP · Rank 10: the finisher throws two darts.')
      : (vi ? 'Cấp 5 / 10 · Pháp trận kéo dài 7 / 9 giây.' : 'Rank 5 / 10 · Sanctuary lasts 7 / 9 seconds.'),
  };

  useEffect(()=>{engine?.tutorialUI({heroUpgrade:true,resetOpen:resetSpent!==null});if(resetSpent!==null)engine?.onboarding.event('upgrade-reset-view');return()=>engine?.tutorialUI({heroUpgrade:false,resetOpen:false});},[engine,resetSpent]);
  return <dialog ref={dialog} className="hero-upgrades" data-lobby-dialog aria-labelledby="hero-upgrades-title"
    onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
    onCancel={event => { event.preventDefault(); if (resetSpent !== null) setResetSpent(null); else close(); }}>
    <header>
      <h2 id="hero-upgrades-title">{vi ? 'Nâng cấp Hero' : 'Hero upgrades'}</h2>
      <span aria-live="polite">{format.format(hud.coins)} {vi ? 'xu' : 'coins'}</span>
      <button type="button" className="icon-close" aria-label={vi ? 'Đóng' : 'Close'} onClick={close}><X size={18}/></button>
    </header>
    <h3 className="hero-upgrade-name">{heroName} · {role}</h3>
    <div className="hero-upgrade-list">
      {HERO_UPGRADE_STATS.map(key => {
        const stat = stats[key];
        const rank = ranks[hero][key];
        const price = HERO_UPGRADE_PRICES[rank];
        const next = price === undefined ? null : heroStats(hero, { ...ranks, [hero]: { ...ranks[hero], [key]: rank + 1 } });
        return <section className="hero-upgrade-card" key={key} aria-labelledby={`hero-stat-${key}`}>
          <div>
            <h4 id={`hero-stat-${key}`}>{stat.label}</h4>
            <p key={rank}>{vi ? 'Cấp' : 'Rank'} {rank}/{HERO_MAX_RANK} · {stat.value(current)}{next && <strong> → {stat.value(next)}</strong>}</p>
            <div className="hero-rank-track" aria-hidden="true">
              {HERO_UPGRADE_PRICES.map((_, i) => <i key={i} data-filled={i < rank} data-milestone={i === 4 || i === 9}/>)}
            </div>
            {key !== 'health' && <small>{milestones[key]}</small>}
          </div>
          <div>
            <button type="button" disabled={!engine || price === undefined || hud.coins < price}
              aria-describedby={`hero-stat-${key}`} onClick={() => engine?.buyHeroUpgrade(hero, key, rank)}>
              {price === undefined ? (vi ? 'Đã đạt tối đa' : 'Max rank') : (vi ? 'Nâng' : 'Upgrade') + ' · ' + format.format(price) + (vi ? ' xu' : ' coins')}
            </button>
            {price !== undefined && hud.coins < price && <small>{vi ? 'Còn thiếu' : 'Still needed'} {format.format(price - hud.coins)} {vi ? 'xu' : 'coins'}</small>}
          </div>
        </section>;
      })}
    </div>
    <footer className="hero-upgrade-footer">
      {resetQuote ? <>
        <p role="status">{vi
          ? `Đưa cả 3 chỉ số của ${heroName} về cấp 0. Hoàn ${coins(resetQuote.refund)}, trừ phí ${coins(resetQuote.fee)} (${HERO_RESET_FEE_PERCENT}%).`
          : `Reset all 3 stats for ${heroName} to rank 0. Refund ${coins(resetQuote.refund)} after a ${coins(resetQuote.fee)} fee (${HERO_RESET_FEE_PERCENT}%).`}</p>
        <button type="button" onClick={() => {setResetSpent(null);engine?.onboarding.event('upgrade-reset-close');}}>{vi ? 'Hủy' : 'Cancel'}</button>
        <button type="button" className="hero-reset-button" disabled={resetSpent !== spent}
          onClick={() => { if (resetSpent !== null && engine?.resetHeroUpgrades(hero, resetSpent)) setResetSpent(null); }}>
          {vi ? 'Xác nhận đặt lại' : 'Confirm reset'}
        </button>
      </> : <>
        <p className="hero-upgrade-tip">{vi ? 'Chơi lại màn đã qua để kiếm xu. Màn cao và nhiều sao thưởng nhiều xu hơn.' : 'Replay cleared trails for coins. Higher levels and more stars pay more.'}</p>
        <button type="button" className="hero-reset-button" disabled={!engine || spent === 0} onClick={() => setResetSpent(spent)}>
          {vi ? 'Đặt lại nâng cấp' : 'Reset upgrades'}
        </button>
      </>}
    </footer>
  </dialog>;
}
