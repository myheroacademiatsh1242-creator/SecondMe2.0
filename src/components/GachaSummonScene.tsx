import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChestSprite, type ChestKind } from './ChestSprite.tsx';
import { SUMMON_DURATION_MS, summonFrameAt, royalSummonAssets } from './chestSummon.ts';
import './gachaSummon.css';

export interface GachaSummonSceneProps {
  highestTier: 'fire' | 'gold' | 'rare';
  isTenPull: boolean;
  kind?: ChestKind;
  language: 'vi' | 'en';
  onComplete: () => void;
  reducedMotion?: boolean;
}

export type SummonStage = 'descending' | 'resonating' | 'shattering' | 'opening' | 'burst';

export function GachaSummonScene({
  highestTier,
  isTenPull,
  kind = 'royal',
  language,
  onComplete,
  reducedMotion = false,
}: GachaSummonSceneProps) {
  const vi = language === 'vi';
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const completedRef = useRef(false);
  const completeRef = useRef(onComplete);
  const skipButton = useRef<HTMLButtonElement>(null);
  const crystalSource=`${import.meta.env.BASE_URL}assets/${kind==='platinum'?'chest/white-tanuki-crystal.png':kind==='crystal'?'chest/mystic-tanuki-crystal.png':'ui/tanuki-crystal.png'}`;
  const crystalName=kind==='platinum'?(vi?'Tanuki thanh tinh thể':'Tanuki Azure Crystal'):kind==='crystal'?(vi?'Tanuki huyền tinh thể':'Tanuki Mystic Crystal'):(vi?'Tanuki phàm tinh thể':'Tanuki Common Crystal');

  const sources = useMemo(() => {
    const list = [
      crystalSource,
    ];
    if (kind === 'royal') {
      const isFire = highestTier === 'fire';
      list.push(
        `${import.meta.env.BASE_URL}assets/chest/chest_closed.png`,
        `${import.meta.env.BASE_URL}assets/chest/chest_${isFire ? 'fire' : 'gold'}_opening.png`,
        `${import.meta.env.BASE_URL}assets/chest/chest_${isFire ? 'fire' : 'gold'}_open_loop.png`,
      );
    } else {
      list.push(
        `${import.meta.env.BASE_URL}assets/chest/chest_${kind}_closed.png`,
        `${import.meta.env.BASE_URL}assets/chest/chest_${kind}_opening.png`,
        `${import.meta.env.BASE_URL}assets/chest/chest_${kind}_open_loop.png`,
      );
    }
    return list;
  }, [kind, highestTier, crystalSource]);

  const ready = loaded >= sources.length;
  const still = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage: SummonStage =
    frame < 3
      ? 'descending'
      : frame < 5
      ? 'resonating'
      : frame < 7
      ? 'shattering'
      : frame < 11
      ? 'opening'
      : 'burst';

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    completeRef.current();
  }, []);

  useEffect(() => {
    if (kind === 'wood') {
      finish();
    }
  }, [kind, finish]);

  useEffect(() => {
    if (!ready) return;
    if (still) {
      setFrame(11);
      const timer = window.setTimeout(finish, 800);
      return () => window.clearTimeout(timer);
    }
    const started = performance.now();
    let timer = 0;
    const advance = () => {
      const elapsed = performance.now() - started;
      if (elapsed >= SUMMON_DURATION_MS) {
        finish();
        return;
      }
      const next = summonFrameAt(elapsed);
      setFrame(next.frame);
      timer = window.setTimeout(advance, Math.max(1, next.nextAt - elapsed + 1));
    };
    advance();
    return () => window.clearTimeout(timer);
  }, [ready, still, finish]);

  useEffect(() => {
    skipButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (['Escape', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        skipButton.current?.focus();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [finish]);

  const tierClass =
    highestTier === 'fire' ? 'tier-legendary' : highestTier === 'gold' ? 'tier-epic' : 'tier-rare';

  // Chest opens when reaching frame >= 7
  const chestTier = frame >= 7 ? (highestTier === 'fire' ? 'fire' : 'gold') : null;

  return (
    <div
      className={`gacha-summon-scene ${tierClass} stage-${stage} ${still ? 'summon-still' : ''}`}
      onClick={finish}
      role="dialog"
      aria-modal="true"
      aria-label={vi ? 'Hoạt ảnh mở rương tinh thể' : 'Celestial Gem Summon Scene'}
    >
      {/* Preload required image assets */}
      {sources.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          hidden
          onLoad={() => setLoaded((n) => n + 1)}
          onError={() => setLoaded((n) => n + 1)}
        />
      ))}

      {/* Magical vignette & astral aurora background */}
      <div className="summon-backdrop-aurora" aria-hidden="true" />

      {/* Skip Button */}
      <button
        className="summon-skip-btn"
        ref={skipButton}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        aria-label={vi ? 'Bỏ qua hoạt ảnh' : 'Skip animation'}
      >
        {vi ? 'BỎ QUA' : 'SKIP'} ❯❯
      </button>

      {/* Atmospheric Header & Gacha Stage Subtitle */}
      <div className="summon-status-text">
        <span className="summon-pill">
          {isTenPull
            ? vi
              ? 'TRIỆU HỒI ×10'
              : '10-PULL SUMMON'
            : vi
            ? 'TRIỆU HỒI ×1'
            : '1-PULL SUMMON'}
        </span>
        <h3 className="summon-subtext">
          {!ready && (vi ? 'Đang triệu hồi linh lực…' : 'Preparing astral ritual…')}
          {ready && stage === 'descending' &&
            (vi
              ? `${crystalName} giáng thế, linh lực trời sao thức tỉnh…`
              : `${crystalName} descends, starlight mana awakens…`)}
          {stage === 'resonating' &&
            (vi
              ? 'Pháp trận cộng hưởng, tinh thể truyền dẫn thần lực vào phong ấn…'
              : 'Magic circle resonates, channeling celestial mana into the seal…')}
          {stage === 'shattering' &&
            (vi
              ? 'Phong ấn ngàn năm vỡ tan! Kỳ bảo đang thức giấc…'
              : 'The ancient seal shatters! The relic stirs…')}
          {stage === 'opening' &&
            (vi
              ? 'Rương báu đã mở! Bảo vật cổ xưa xuất thế…'
              : 'Chest unlocked! Ancient treasures revealed…')}
          {stage === 'burst' &&
            (vi ? 'BẢO VẬT ĐÃ THỨC TỈNH!' : 'TREASURE UNLEASHED!')}
        </h3>
      </div>

      {/* Center Stage: Altar, Magic Circle, Floating Celestial Crystal & Chest */}
      <div className="summon-stage">
        {/* Magic Summoning Circle on ground */}
        <div className="summon-magic-circle" aria-hidden="true">
          <svg className="summon-circle-svg" viewBox="0 0 400 400">
            <defs>
              <radialGradient id="summon-core-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ambient core glow disk */}
            <circle cx="200" cy="200" r="188" fill="url(#summon-core-grad)" />

            {/* Outer Clockwise Rotating Ring */}
            <g className="summon-ring-clockwise">
              <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.85" />
              <circle cx="200" cy="200" r="182" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.65" />
              <circle cx="200" cy="200" r="166" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.75" />

              {/* 16 celestial tick marks along outer rim */}
              {Array.from({ length: 16 }).map((_, i) => (
                <line
                  key={`tick-${i}`}
                  x1="200"
                  y1="10"
                  x2="200"
                  y2="26"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.85"
                  transform={`rotate(${i * 22.5} 200 200)`}
                />
              ))}

              {/* 8 Cardinal Star Nodes on rim */}
              {Array.from({ length: 8 }).map((_, i) => (
                <g key={`node-${i}`} transform={`rotate(${i * 45} 200 200)`}>
                  <circle cx="200" cy="26" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
                  <circle cx="200" cy="26" r="2.5" fill="currentColor" opacity="0.95" />
                </g>
              ))}

              {/* Outer Octagram */}
              <polygon
                points="200,42 358,200 200,358 42,200"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.75"
              />
              <polygon
                points="200,42 358,200 200,358 42,200"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.75"
                transform="rotate(45 200 200)"
              />
            </g>

            {/* Inner Counter-Clockwise Rotating Ring */}
            <g className="summon-ring-counter">
              <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.85" />
              <circle cx="200" cy="200" r="120" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />

              {/* 12-pointed star pattern */}
              <polygon
                points="200,74 238,162 326,200 238,238 200,326 162,238 74,200 162,162"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.65"
              />
              <polygon
                points="200,74 238,162 326,200 238,238 200,326 162,238 74,200 162,162"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.65"
                transform="rotate(45 200 200)"
              />

              {/* Inner focus rune ring */}
              <circle cx="200" cy="200" r="78" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
              <circle cx="200" cy="200" r="68" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
            </g>

            {/* Central Focal Glyph */}
            <circle cx="200" cy="200" r="42" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.85" />
            <circle cx="200" cy="200" r="12" fill="currentColor" opacity="0.75" />
          </svg>
          <div className="summon-circle-glow" />
        </div>

        {/* Floor Contact Shadow Grounding the Chest */}
        <div className="summon-chest-shadow" aria-hidden="true" />

        {/* Radiating Light Beams in opening & burst stage */}
        {(stage === 'opening' || stage === 'burst') && (
          <div className="summon-radiant-beams" aria-hidden="true">
            <span className="beam beam-1" />
            <span className="beam beam-2" />
            <span className="beam beam-3" />
            <span className="beam beam-4" />
            <span className="beam beam-5" />
            <span className="beam beam-6" />
          </div>
        )}

        {/* Light Pillar shooting upwards as lid fully opens */}
        {stage === 'burst' && <div className="summon-light-pillar" aria-hidden="true" />}

        {/* Floating Celestial Catalyst (Tanuki Celestial Gem) */}
        {frame < 7 && (
          <div
            className={`summon-celestial-gem-wrap stage-${stage}`}
            aria-hidden="true"
          >
            {/* Celestial Nebula Aura */}
            <div className="summon-gem-nebula" />

            {/* Orbiting Satellite Star Motes */}
            <div className="summon-orbit-system">
              {Array.from({ length: isTenPull ? 10 : 3 }).map((_, i) => (
                <span
                  key={`mote-${i}`}
                  className="summon-satellite-mote"
                  style={
                    {
                      '--mote-idx': i,
                      '--mote-total': isTenPull ? 10 : 3,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            {/* Downward Mana Stream Lightning */}
            {(stage === 'resonating' || stage === 'shattering') && (
              <div className="summon-mana-stream">
                <span className="mana-bolt bolt-1" />
                <span className="mana-bolt bolt-2" />
                <span className="mana-bolt bolt-3" />
              </div>
            )}

            {/* Energy Shockwave Rings */}
            {(stage === 'resonating' || stage === 'shattering') && (
              <div className="summon-gem-shockwave-ring" />
            )}

            {/* Core Tanuki Gem Sprite with Glints */}
            <div className="summon-gem-core">
              <img
                src={crystalSource}
                alt={crystalName}
                className="summon-gem-img"
              />
              <div className="summon-gem-glint glint-1" />
              <div className="summon-gem-glint glint-2" />
            </div>

            {/* Shatter Impact Flash at Chest Lock */}
            {stage === 'shattering' && <div className="summon-shatter-impact" />}
          </div>
        )}

        {/* Chest Object Container - Completely Clean Sprite Without Keys */}
        <div
          className={`summon-chest-container summon-atlas-container ${kind === 'royal' ? 'summon-royal' : ''}`}
          data-kind={kind}
          data-frame={frame + 1}
        >
          <div className="summon-chest-wrapper">
            <ChestSprite
              kind={kind}
              tier={chestTier}
              openingDuration={1.6}
              reducedMotion={still}
            />
          </div>
        </div>
      </div>

      {/* Screen Soft Glow at moment of final treasure burst */}
      {stage === 'burst' && <div className="summon-screen-flash" aria-hidden="true" />}
    </div>
  );
}
