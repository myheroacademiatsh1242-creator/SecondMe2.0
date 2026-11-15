import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChestSprite, type ChestKind } from './ChestSprite.tsx';
import { SUMMON_CHEST_MOTION_MS, SUMMON_DURATION_MS, SUMMON_GEM_MS, SUMMON_LID_SECONDS, summonFrameAt, royalSummonAssets } from './chestSummon.ts';
import { usePanelArt, warmPanelArt } from './panelArt.ts';
import { sounds } from '../game/logic/sound.ts';
import { SummonPixelCircle } from './SummonPixelCircle.tsx';
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

const chestAsset = (file: string) => `${import.meta.env.BASE_URL}assets/chest/${file}`;
const summonSources = (kind: ChestKind, fire: boolean) => kind === 'royal'
  ? royalSummonAssets(fire).map(chestAsset)
  : [kind === 'platinum' ? 'white-tanuki-crystal.png' : 'mystic-tanuki-crystal.png',
    `chest_${kind}_closed.png`, `chest_${kind}_opening.png`, `chest_${kind}_open_loop.png`].map(chestAsset);

function SummonPixelRing({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="currentColor" fillRule="evenodd" d="
      M11 0h10v2h4v3h3v3h2v3h2v10h-2v3h-2v3h-3v3h-4v2H11v-2H7v-3H4v-3H2v-3H0V11h2V8h2V5h3V2h4z
      M12 2h8v2h4v3h3v3h2v3h1v6h-1v3h-2v3h-3v3h-4v2h-8v-2H8v-3H5v-3H3v-3H2v-6h1v-3h2V7h3V4h4z
    " />
  </svg>;
}

export function warmRoyalSummon() {
  warmPanelArt([...new Set([...summonSources('royal', false), ...summonSources('royal', true)])]);
}

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
  const completedRef = useRef(false);
  const completeRef = useRef(onComplete);
  const skipButton = useRef<HTMLButtonElement>(null);
  const crystalSource=chestAsset(kind==='platinum'?'white-tanuki-crystal.png':kind==='crystal'?'mystic-tanuki-crystal.png':'tanuki-crystal.png');
  const crystalName=kind==='platinum'?(vi?'Tanuki thanh tinh thể':'Tanuki Azure Crystal'):kind==='crystal'?(vi?'Tanuki huyền tinh thể':'Tanuki Mystic Crystal'):(vi?'Tanuki phàm tinh thể':'Tanuki Common Crystal');

  const fire = highestTier === 'fire';
  const sources = useMemo(() => summonSources(kind, fire), [kind, fire]);
  const art = usePanelArt(sources);
  const ready = art === 'ready';
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
    if (!ready) return;
    if (stage === 'resonating') sounds.playChestCue('charge');
    if (stage === 'opening') sounds.playChestCue('unlock');
    if (stage === 'burst') sounds.playChestCue('reveal', highestTier);
  }, [ready, stage, highestTier]);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    completeRef.current();
  }, []);

  useEffect(() => {
    if (kind === 'wood' || art === 'fallback') {
      finish();
    }
  }, [kind, art, finish]);

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

  const tierClass = stage !== 'burst' || highestTier === 'rare'
    ? 'tier-rare' : fire ? 'tier-legendary' : 'tier-epic';

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
          {stage === 'burst' && (fire
            ? (vi ? 'BẢO VẬT HIẾM!' : 'RARE TREASURE!')
            : (vi ? 'RƯƠNG ĐÃ MỞ!' : 'CHEST OPENED!'))}
        </h3>
      </div>

      {/* Center Stage: Altar, Magic Circle, Floating Celestial Crystal & Chest */}
      <div className="summon-stage" style={{
        '--summon-gem-duration': `${SUMMON_GEM_MS}ms`,
        '--summon-chest-motion': `${SUMMON_CHEST_MOTION_MS}ms`,
      } as React.CSSProperties} hidden={!ready}>
        {/* Magic Summoning Circle on ground */}
        <div className="summon-magic-circle" aria-hidden="true">
          <div className="summon-circle-glow" />
          <SummonPixelCircle stage={stage} still={still} />
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
        {stage === 'burst' && !still && <SummonPixelRing className="summon-floor-wave" />}

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
              <SummonPixelRing className="summon-gem-shockwave-ring" />
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
              openingDuration={SUMMON_LID_SECONDS}
              reducedMotion={still}
            />
          </div>
          {stage === 'opening' && !still && <SummonPixelRing className="summon-shatter-impact" />}
          {stage === 'burst' && !still && <div className="summon-chest-sparks" aria-hidden="true">
            {Array.from({length: fire ? 30 : highestTier === 'gold' ? 20 : 14}, (_, i) => {
              const angle = i * 2.39996;
              const distance = (fire ? 120 : 75) + i % 5 * 14;
              return <i key={i} style={{
                '--spark-x': `${Math.cos(angle) * distance}px`,
                '--spark-y': `${Math.sin(angle) * distance * .5 - 36}px`,
                '--spark-size': `${3 + i % 4}px`,
              } as React.CSSProperties}/>;
            })}
          </div>}
        </div>
      </div>

    </div>
  );
}
