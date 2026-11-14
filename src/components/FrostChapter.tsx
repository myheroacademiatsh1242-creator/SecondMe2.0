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

  const unlocked = (id: number) =>
    hud.devUnlocked || id === 7 || hud.completed.includes(id - 1) || hud.completed.includes(id);

  const readSavedStop = () => {
    try {
      const saved = Number(localStorage.getItem(FROST_HERO_KEY) ?? -1);
      if (Number.isInteger(saved) && saved >= 0 && saved < stops.length && unlocked(STAGES[saved].id)) {
        return saved;
      }
    } catch {}
    return hereIdx;
  };

  const [heroStop, setHeroStop] = useState<number>(readSavedStop);
  const [selected, setSelected] = useState<number>(() => STAGES[readSavedStop()]?.id ?? next.id);
  const [inspect, setInspect] = useState<number | null>(null);
  const [touchInspect, setTouchInspect] = useState<number | null>(null);
  const [runeEditor, setRuneEditor] = useState(false);

  const level = STAGES.find((l) => l.id === selected) ?? STAGES[0];
  const selectedIdx = Math.max(0, STAGES.findIndex((l) => l.id === selected));

  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  const walker = useRef<HTMLDivElement>(null);
  const posRef = useRef<number>(heroStop);
  const walkRafRef = useRef<number>(0);
  const walkTimerRef = useRef<number>(0);

  const putAtParam = (u: number) => {
    const el = walker.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(stops.length - 1, u));
    const segIdx = Math.min(stops.length - 2, Math.max(0, Math.floor(clamped)));
    const localT = clamped - segIdx;
    const trail = trailRefs.current[segIdx];
    let x = stops[segIdx][0] + (stops[segIdx + 1][0] - stops[segIdx][0]) * localT;
    let y = stops[segIdx][1] + (stops[segIdx + 1][1] - stops[segIdx][1]) * localT;
    if (trail) {
      try {
        const len = trail.getTotalLength();
        if (len > 0) {
          const pt = trail.getPointAtLength(localT * len);
          x = pt.x;
          y = pt.y;
        }
      } catch {}
    }
    el.style.left = `${(x / 1536) * 100}%`;
    el.style.top = `${(y / 1024) * 100}%`;
  };

  const walkToStop = (targetIdx: number, enterOnArrive: boolean) => {
    const clampedTarget = Math.max(0, Math.min(stops.length - 1, targetIdx));
    const targetStage = STAGES[clampedTarget] ?? STAGES[0];
    setSelected(targetStage.id);
    cancelAnimationFrame(walkRafRef.current);
    window.clearTimeout(walkTimerRef.current);

    const el = walker.current;
    const startU = posRef.current;
    const dist = Math.abs(clampedTarget - startU);

    if (!el || hud.reducedMotion || dist < 0.02) {
      posRef.current = clampedTarget;
      setHeroStop(clampedTarget);
      if (el) {
        el.classList.remove('is-walking');
        el.style.left = `${(stops[clampedTarget][0] / 1536) * 100}%`;
        el.style.top = `${(stops[clampedTarget][1] / 1024) * 100}%`;
      }
      try {
        localStorage.setItem(FROST_HERO_KEY, String(clampedTarget));
      } catch {}
      if (enterOnArrive) engine?.selectLevel(targetStage.id - 1);
      return;
    }

    const duration = Math.min(1800, Math.max(520, dist * 520));
    const t0 = performance.now();
    el.classList.add('is-walking');

    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const u = startU + (clampedTarget - startU) * eased;
      posRef.current = u;
      putAtParam(u);
      if (k < 1) {
        walkRafRef.current = requestAnimationFrame(step);
      } else {
        posRef.current = clampedTarget;
        setHeroStop(clampedTarget);
        el.classList.remove('is-walking');
        el.style.left = `${(stops[clampedTarget][0] / 1536) * 100}%`;
        el.style.top = `${(stops[clampedTarget][1] / 1024) * 100}%`;
        try {
          localStorage.setItem(FROST_HERO_KEY, String(clampedTarget));
        } catch {}
        if (enterOnArrive) {
          walkTimerRef.current = window.setTimeout(() => {
            engine?.selectLevel(targetStage.id - 1);
          }, 140);
        }
      }
    };
    walkRafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = walker.current;
    if (el) {
      const idx = Math.round(posRef.current);
      el.style.left = `${(stops[idx][0] / 1536) * 100}%`;
      el.style.top = `${(stops[idx][1] / 1024) * 100}%`;
    }
    return () => {
      cancelAnimationFrame(walkRafRef.current);
      window.clearTimeout(walkTimerRef.current);
    };
  }, []);

  const minLive = Math.min(heroStop, selectedIdx);
  const maxLive = Math.max(heroStop, selectedIdx);

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
              if (unlocked(level.id)) walkToStop(selectedIdx, true);
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
              const isCur = s.id === selected;
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
              const isLive = minLive !== maxLive ? i >= minLive && i < maxLive : selected === nextStageId;
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
            const isCurrent = item.id === selected;
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
                  if (ready) walkToStop(i, true);
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
