import {rarityName,RARITY_COLORS} from '../game/logic/rarity.ts';
import React, { useEffect, useState } from 'react';
import { CHEST_PRICES,chestBalance,chestCurrencyName,type ChestKind,type ChestRewardId } from '../game/logic/chest.ts';
import { ChestCurrencyIcon } from './ChestCurrencyIcon.tsx';
import './gachaReward.css';
import {getRewardMeta} from '../game/logic/chestHistory.ts';

export interface GachaRewardModalProps {
  rewards: ChestRewardId[];
  language: 'vi' | 'en';
  chestKeys: number;
  coins?:number;
  whiteCrystals?:number;
  mysticCrystals?:number;
  kind?:ChestKind;
  onClose: () => void;
  onDrawAgain: (count: 1 | 10) => void;
}

function getCardMeta(id:ChestRewardId,vi:boolean){return {id,...getRewardMeta(id,vi),isNew:false};}

export function GachaRewardModal({
  rewards,
  language,
  chestKeys,
  coins=0,
  whiteCrystals=0,
  mysticCrystals=0,
  kind='royal',
  onClose,
  onDrawAgain,
}: GachaRewardModalProps) {
  const vi = language === 'vi';
  const isTenPull = rewards.length >= 10;
  const price=CHEST_PRICES[kind];
  const balance=chestBalance(price.currency,{coins,chestKeys,whiteCrystals,mysticCrystals});
  const currencyName=chestCurrencyName(price.currency,vi);
  const costName=chestCurrencyName(price.currency,vi,true);
  const [skipped, setSkipped] = useState(false);
  const [fullyRevealed, setFullyRevealed] = useState(false);

  // Auto-finish reveal state after all cards finish their staggered animation
  useEffect(() => {
    if (skipped) {
      setFullyRevealed(true);
      return;
    }
    const totalTime = rewards.length * 75 + 500;
    const timer = window.setTimeout(() => {
      setFullyRevealed(true);
    }, totalTime);
    return () => window.clearTimeout(timer);
  }, [rewards, skipped]);

  // Keyboard shortcut to close or skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (!fullyRevealed && !skipped) {
          setSkipped(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [fullyRevealed, skipped, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // If not fully revealed yet, click skips animation
    if (!fullyRevealed && !skipped) {
      setSkipped(true);
    }
  };

  const handleDrawAgainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const count = isTenPull ? 10 : 1;
    if (balance >= count * price.single) {
      setSkipped(false);
      setFullyRevealed(false);
      onDrawAgain(count);
    }
  };

  const canDrawAgain = balance >= (isTenPull?10:1)*price.single;
  const cost = (isTenPull?10:1)*price.single;

  return (
    <div
      className={`gacha-reward-overlay ${skipped ? 'is-skipped' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={vi ? 'Phần thưởng quay rương' : 'Chest Gacha Rewards'}
    >
      {/* Background atmospheric particles & nebula glows */}
      <div className="gacha-bg-aurora" aria-hidden="true" />
      <div className="gacha-bg-embers" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>

      {/* Top Header Bar */}
      <header className="gacha-reward-header" onClick={(e) => e.stopPropagation()}>
        <div className="gacha-header-title-wrap">
          <span className="gacha-header-ornament left" aria-hidden="true">✦ ──</span>
          <h2 className="gacha-header-title">
            {vi ? 'PHẦN THƯỞNG RƯƠNG THẦN' : 'CHEST REWARDS ACQUIRED'}
          </h2>
          <span className="gacha-header-ornament right" aria-hidden="true">── ✦</span>
        </div>
        <p className="gacha-header-subtitle">
          {vi
            ? 'Tất cả vật phẩm đã tự động chuyển vào túi đồ của bạn'
            : 'All items have been delivered directly to your inventory'}
        </p>
      </header>

      {/* Skip button in top corner */}
      {!fullyRevealed && !skipped && (
        <button
          className="gacha-skip-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSkipped(true);
          }}
          aria-label={vi ? 'Bỏ qua hoạt ảnh' : 'Skip animation'}
        >
          {vi ? 'BỎ QUA' : 'SKIP'} ❯❯
        </button>
      )}

      {/* Main 10-item (or 1-item) horizontal card container */}
      <div
        className={`gacha-cards-container ${isTenPull ? 'ten-pull' : 'single-pull'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gacha-cards-row">
          {rewards.map((id, index) => {
            const meta = getCardMeta(id, vi);
            const isCoin = id.startsWith('coins');
            const isTime = id === 'time';
            const atlasIndex = ['healSmall', 'healLarge', 'revive'].indexOf(id);

            return (
              <div
                key={`${id}-${index}`}
                className={`gacha-card-wrapper tier-${meta.tier}`}
                style={{ '--card-i': index } as React.CSSProperties}
              >
                {/* 5-Star special golden radiant sunburst */}
                {meta.stars === 5 && (
                  <div className="gacha-card-sunburst" aria-hidden="true" />
                )}

                <div className={`gacha-card tier-${meta.tier}`} style={{borderColor:RARITY_COLORS[meta.tier]}}>
                  {/* Top Badge (NEW / 5-Star / Category) */}
                  <div className="gacha-card-top">
                    {meta.isNew ? (
                      <span className="gacha-badge-new">NEW!</span>
                    ) : (
                      <span className="gacha-card-category">{rarityName(meta.tier,vi)}</span>
                    )}
                  </div>

                  {/* Center Visual Art Section */}
                  <div className="gacha-card-visual">
                    <div className="gacha-item-halo" aria-hidden="true" />
                    {id.startsWith('commonCrystals')&&<ChestCurrencyIcon currency="commonCrystals" size={90}/>}
                    {isCoin && (
                      <div className="gacha-coin-wrap">
                        <img
                          src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`}
                          alt="Coin"
                          className="gacha-img coin-img"
                        />
                      </div>
                    )}
                    {(id==='manaSmall'||id==='manaLarge')&&<img className="gacha-img time-img" src={`${import.meta.env.BASE_URL}assets/items/${id==='manaSmall'?'mana-small':'mana-large'}.png`} alt=""/>}
                    {isTime && (
                      <img
                        src={`${import.meta.env.BASE_URL}assets/ui/them-mot-chut.png`}
                        alt="Time Potion"
                        className="gacha-img time-img"
                      />
                    )}
                    {atlasIndex >= 0 && (
                      <span
                        className="gacha-img atlas-img"
                        aria-hidden="true"
                        style={{
                          backgroundImage: `url(${import.meta.env.BASE_URL}assets/shop/item-atlas.png)`,
                          backgroundPosition: `${atlasIndex % 3 * 50}% ${Math.floor(atlasIndex / 3) * 100}%`,
                        }}
                      />
                    )}
                  </div>

                  {/* Item Name & Quantity */}
                  <div className="gacha-card-info">
                    <strong className="gacha-item-name" title={meta.name}>
                      {meta.name}
                    </strong>
                    <span className="gacha-item-amount">{meta.amountText}</span>
                  </div>

                  {/* Stars Row at Bottom */}
                  <div className="gacha-card-stars" aria-label={`${meta.stars} stars`}>
                    {Array.from({ length: meta.stars }).map((_, s) => (
                      <span key={s} className="gacha-star-glyph">
                        ★
                      </span>
                    ))}
                  </div>

                  {/* Shimmer light bar across card */}
                  <div className="gacha-card-shimmer" aria-hidden="true" />
                </div>

                {/* Floor reflection effect beneath card */}
                <div className={`gacha-floor-reflection tier-${meta.tier}`} aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <footer className="gacha-reward-footer" onClick={(e) => e.stopPropagation()}>
        <div className="gacha-keys-status">
          <ChestCurrencyIcon currency={price.currency} size={22} />
          <span>
            {vi ? 'Còn lại:' : 'Remaining:'} <b>{balance}</b> {currencyName}
          </span>
        </div>

        <div className="gacha-footer-actions">
          <button
            type="button"
            className="gacha-action-btn primary"
            onClick={onClose}
            autoFocus={fullyRevealed}
          >
            {vi ? 'THU THẬP & TIẾP TỤC' : 'COLLECT & CONTINUE'}
          </button>

          <button
            type="button"
            className="gacha-action-btn draw-again"
            disabled={!canDrawAgain}
            onClick={handleDrawAgainClick}
            title={
              !canDrawAgain
                ? vi
                  ? `Chưa đủ ${cost} ${currencyName} để mở tiếp`
                  : `Not enough ${currencyName} (need ${cost})`
                : ''
            }
          >
            <span>{isTenPull ? (vi ? 'MỞ TIẾP ×10' : 'DRAW AGAIN ×10') : vi ? 'MỞ TIẾP ×1' : 'DRAW AGAIN ×1'}</span>
            <span className="gacha-btn-cost">
              <ChestCurrencyIcon currency={price.currency} size={18} /> {cost} {costName}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
