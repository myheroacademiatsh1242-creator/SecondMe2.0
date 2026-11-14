import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Backpack, ChevronLeft, Flame, Lock, Play, Snowflake, Users } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { DEMON_LEVEL } from '../game/logic/levels.ts';
import { FROST_LEVELS } from '../game/logic/frostLevels.ts';
import { RuneLoadoutEditor } from './EchoRunes.tsx';
import { FxCanvas } from './JourneyAmbience.tsx';
import { FrostAmbience } from './FrostAmbience.tsx';
import { translate } from '../i18n.ts';
import './FrostChapter.css';

const STAGES = [...FROST_LEVELS, DEMON_LEVEL];

// Traced along the scenic path from snowy portal across the bridge to the volcanic demon cave on 1536x1024
const trailSegments = [
  // 07 -> 08: Leaves blue portal landing, follows snowy ridge path southeast towards cliff camp
  'M 230 240 C 260 250, 290 265, 330 280',
  // 08 -> 09: Passes campsite fences and descends the stone stairs carved into the cliff
  'M 330 280 C 370 300, 420 370, 445 455',
  // 09 -> 10: Steps onto bridge approach and crosses onto the wooden suspension bridge
  'M 445 455 C 490 485, 540 515, 590 535',
  // 10 -> 11: Crosses the suspension bridge onto the rocky plateau at watchtower entrance
  'M 590 535 C 670 565, 760 575, 840 560',
  // 11 -> 12: Follows path around watchtower and descends rocky steps into the canyon
  'M 840 560 C 920 590, 990 680, 1060 800',
  // 12 -> 13: Follows canyon trail past dragon bones, between guardian statues into demon cavern
  'M 1060 800 C 1140 810, 1240 800, 1360 765',
];

const stops = [
  [230, 240],  // 07: Mystical Blue Portal (Cổng Băng Tuyết Đầu Mùa)
  [330, 280],  // 08: High Cliff Basecamp (Bản Trại Đèo Cao)
  [445, 455],  // 09: Snowy Cliff Stairs Descent (Bậc Thang Vách Đá)
  [590, 535],  // 10: Suspension Bridge over Waterfall Gorge (Cầu Treo Vực Thác)
  [840, 560],  // 11: Medieval Stone Watchtower (Tháp Canh Cổ Thạch)
  [1060, 800], // 12: Volcanic Lava Canyon & Flame Brazier (Thung Lũng Nham Thạch)
  [1360, 765], // 13: Fiery Ember Demon Cavern Arch (Hang Quỷ Tâm Hỏa)
];

const WALK_MS = 2400;
const FROST_HERO_KEY = 'secondme.frostHeroAt';

export function FrostChapter({
  engine,
  hud,
  back,
  traveler,
}: {
  engine: GameEngine | null;
  hud: HUDState;
  back: () => void;
  traveler?: React.ReactNode;
}) {
  const vi = hud.language === 'vi';
  const done = STAGES.filter((l) => hud.completed.includes(l.id)).length;
  const next = STAGES.find((l) => !hud.completed.includes(l.id)) ?? STAGES[0];
  const nextIdx = STAGES.findIndex((l) => l.id === next.id);
  const hereIdx = Math.max(0, Math.min(nextIdx, stops.length - 1));

  const unlocked = (id: number) => engine?.canSelectLevel(id - 1) ?? false;

  const [inspect, setInspect] = useState<number | null>(null);
  const [touchInspect, setTouchInspect] = useState<number | null>(null);
  const [runeEditor, setRuneEditor] = useState(false);

  const level = next;
  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  const walker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = walker.current;
    const put = (x: number, y: number) => {
      if (el) {
        el.style.left = `${(x / 1536) * 100}%`;
        el.style.top = `${(y / 1024) * 100}%`;
      }
    };
    put(stops[hereIdx][0], stops[hereIdx][1]);

    let seen = -1;
    try {
      seen = Number(localStorage.getItem(FROST_HERO_KEY) ?? -1);
      localStorage.setItem(FROST_HERO_KEY, String(hereIdx));
    } catch {}

    const trail = hereIdx > 0 ? trailRefs.current[hereIdx - 1] : null;
    if (!el || !trail || hereIdx === 0 || hud.reducedMotion || seen < 0 || seen >= hereIdx) return;

    const len = trail.getTotalLength();
    let raf = 0;
    put(stops[hereIdx - 1][0], stops[hereIdx - 1][1]);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / WALK_MS);
      const pt = trail.getPointAtLength(len * (1 - (1 - k) * (1 - k)));
      put(pt.x, pt.y);
      el.classList.toggle('is-walking', k < 1);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.classList.remove('is-walking');
    };
  }, [hereIdx, hud.reducedMotion]);

  return (
    <div className="journey-layout frost-chapter">
      {runeEditor && <RuneLoadoutEditor hud={hud} engine={engine} close={() => setRuneEditor(false)} />}

      <aside className="journey-camp integrated-camp frost-camp">
        <button className="frost-back" onClick={back} aria-label={vi ? 'Về Chương I · Rừng Vọng Âm' : 'Back to Chapter I · Echo Forest'}>
          <ChevronLeft size={18} />
          {vi ? 'CHƯƠNG I · RỪNG VỌNG ÂM' : 'CHAPTER I · ECHO FOREST'}
        </button>

        <header className="rest-heading frost-rest-heading">
          <span>
            <Snowflake size={17} />
            {vi ? 'TRẠI TUYẾT ECHO' : 'FROST CAMP'}
          </span>
          <span>{done} / 7</span>
        </header>

        <div className={`rest-scene rest-scene-frost ${hud.reducedMotion ? 'rest-still' : ''}`}>
          <div className="rest-firelight frost-firelight" aria-hidden="true" />
          <FxCanvas name="campfire" still={hud.reducedMotion} className="rest-fx" />
          <div className="rest-embers frost-snow-drift" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <button
            className="rest-hero"
            onClick={() => engine?.openCharacters()}
            aria-label={vi ? 'Đổi nhân vật' : 'Change character'}
          >
            <span>{traveler ?? <Users size={50} />}</span>
          </button>
          <div className="rest-scene-caption">
            <strong>
              {hud.characterClass === 'swordsman' ? 'Kael' : hud.characterClass === 'mechanical' ? 'Rivet' : 'Aeris'}
            </strong>
            <button onClick={() => engine?.openCharacters()}>
              {vi ? 'Đổi nhân vật' : 'Change hero'} <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="rest-kit frost-kit">
          <div>
            <span>{vi ? 'BỘ RUNE' : 'RUNE LOADOUT'}</span>
            <p>
              {hud.runeLoadout?.length ?? 0} / 4 {vi ? 'ấn đã chọn' : 'equipped'}
            </p>
          </div>
          <button className="rest-prepare frost-prepare" onClick={() => setRuneEditor(true)}>
            <Backpack size={18} />
            {vi ? 'Đổi rune' : 'Edit runes'}
          </button>
        </div>

        <div className="rest-departure frost-departure">
          <span>
            {level.id === 13
              ? vi
                ? 'TRẬN ĐẤU TRÙM CUỐI'
                : 'FINAL BOSS ENCOUNTER'
              : vi
              ? 'ĐIỂM ĐẾN ĐÃ CHỌN'
              : 'SELECTED DESTINATION'}
          </span>
          <div className="rest-destination">
            <b>{String(level.id).padStart(2, '0')}</b>
            <strong>{translate(level.subtitle, hud.language)}</strong>
          </div>
          <p className="frost-stage-desc">{translate(level.description, hud.language)}</p>
          <button
            className="camp-continue frost-continue"
            disabled={!unlocked(level.id)}
            onClick={() => {
              if (unlocked(level.id)) engine?.selectLevel(level.id - 1);
            }}
          >
            <Play size={19} fill="currentColor" />
            <span>
              {unlocked(level.id)
                ? hud.completed.includes(level.id)
                  ? vi
                    ? 'CHƠI LẠI MÀN'
                    : 'REPLAY TRAIL'
                  : vi
                  ? 'VÀO MÀN'
                  : 'ENTER TRAIL'
                : vi
                ? 'CHƯA MỞ KHÓA'
                : 'LOCKED'}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>

        <footer className="rest-progress frost-progress-bar">
          <div
            role="progressbar"
            aria-label={vi ? 'Tiến độ chương băng tuyết' : 'Frozen frontier progress'}
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={7}
          >
            {STAGES.map((s) => {
              const isDone = hud.completed.includes(s.id);
              const isCur = s.id === level.id;
              return <i key={s.id} className={isDone ? 'explored' : isCur ? 'next' : ''} />;
            })}
          </div>
        </footer>
      </aside>

      <section className="journey-chart frost-chart" aria-label={vi ? 'Bản đồ băng tuyết' : 'Frozen frontier map'}>
        <div className={`journey-world frost-world ${hud.reducedMotion ? 'map-still' : ''}`}>
          {/* Animated SVG Trails */}
          <svg className="journey-path frost-path" viewBox="0 0 1536 1024" aria-hidden="true">
            {trailSegments.map((d, i) => {
              const nextStageId = STAGES[i + 1]?.id ?? 13;
              const isUnlocked = unlocked(nextStageId);
              const isDone = hud.completed.includes(nextStageId);
              const isLive = next.id === nextStageId;
              return (
                <path
                  key={i}
                  ref={(e) => {
                    trailRefs.current[i] = e;
                  }}
                  d={d}
                  className={`${isDone ? 'trail-done' : isUnlocked ? 'trail-open' : 'trail-locked'} ${
                    isLive ? 'trail-live' : ''
                  }`}
                />
              );
            })}
          </svg>

          {/* Living Map Ambience: Waterfall, River, Campfire, Lanterns, Snow */}
          <FrostAmbience still={hud.reducedMotion} />

          {/* Hero Traveler walking between stops */}
          <div className="map-traveler" ref={walker} aria-hidden="true">
            <span>{traveler}</span>
          </div>

          {/* Stage Stop Medallions */}
          {STAGES.map((item, i) => {
            const ready = unlocked(item.id);
            const isDone = hud.completed.includes(item.id);
            const isCurrent = item.id === level.id;
            const isBoss = item.id === 13;

            return (
              <button
                key={item.id}
                className={`journey-stop frost-stop ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${
                  isBoss ? 'is-boss' : ''
                } ${inspect === i ? 'is-inspected' : ''}`}
                style={{
                  left: `${(stops[i][0] / 1536) * 100}%`,
                  top: `${(stops[i][1] / 1024) * 100}%`,
                }}
                aria-disabled={!ready}
                onMouseEnter={() => {
                  setInspect(i);
                }}
                onMouseLeave={() => {
                  if (touchInspect === null) setInspect(null);
                }}
                onFocus={() => {
                  setInspect(i);
                }}
                onBlur={() => {
                  setInspect(null);
                  setTouchInspect(null);
                }}
                onClick={() => {
                  if (window.matchMedia('(hover: none)').matches && touchInspect !== i) {
                    setTouchInspect(i);
                    setInspect(i);
                    return;
                  }
                  if (ready) engine?.selectLevel(item.id - 1);
                }}
                aria-label={`${String(item.id).padStart(2, '0')} · ${translate(item.subtitle, hud.language)} · ${
                  isDone ? (vi ? 'Đã hoàn thành' : 'Cleared') : ready ? (vi ? 'Sẵn sàng' : 'Ready') : (vi ? 'Chưa mở' : 'Locked')
                }`}
              >
                <span className="stop-medallion">
                  {!ready ? (
                    <Lock size={18} />
                  ) : isBoss ? (
                    <Flame size={22} />
                  ) : (
                    <span>{String(item.id).padStart(2, '0')}</span>
                  )}
                </span>
                <span
                  className="stop-caption"
                  data-idle={inspect === null}
                  role="tooltip"
                  hidden={inspect !== i}
                >
                  <small>
                    {isBoss
                      ? vi
                        ? 'TRÙM QUỶ TÂM HỎA'
                        : 'EMBER DEMON BOSS'
                      : `${vi ? 'MÀN' : 'TRAIL'} ${String(item.id).padStart(2, '0')}`}
                  </small>
                  <strong>{translate(item.subtitle, hud.language)}</strong>
                  {isDone ? (
                    <em>
                      {'★'.repeat(hud.bestStars[item.id] ?? 0)}
                      {'☆'.repeat(3 - (hud.bestStars[item.id] ?? 0))}
                    </em>
                  ) : (
                    <em>
                      {isCurrent && ready
                        ? vi
                          ? 'Sẵn sàng khám phá'
                          : 'Ready to explore'
                        : !ready
                        ? vi
                          ? 'CHƯA MỞ'
                          : 'LOCKED'
                        : vi
                        ? 'SẴN SÀNG'
                        : 'READY'}
                    </em>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
