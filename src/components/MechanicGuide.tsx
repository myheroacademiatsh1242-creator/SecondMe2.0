import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Footprints, Link, Shield, Snowflake, Sparkles, Swords, TriangleAlert } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { GUIDE_TOPICS, QUICK_HINTS, type GuideTopic } from '../game/logic/tutorials.ts';
import './MechanicGuide.css';

const hintIcons = {
  echo: Footprints, links: Link, enemies: Swords, vines: Footprints, crusher: TriangleAlert,
  spikes: TriangleAlert, rocks: TriangleAlert, time: Clock3, multi: Link, recycle: Footprints,
  upgradeRunes: Sparkles, shield: Snowflake, bossPatterns: TriangleAlert, skillPickups: Sparkles,
  shieldRestored: Shield, decoy: Footprints, vulnerable: Swords,
};

const trailCopy = {
  record: ['E', 'Ghi hình', 'Record', 'Bắt đầu ghi đường đi', 'Start recording your path'],
  reach: ['', '', '', 'Đi tới ấn viền vàng', 'Step onto the outlined rune'],
  save: ['E', 'Dừng ghi', 'Stop', 'Lưu đường đi tại ấn', 'Save your path on the rune'],
  summon: ['Q', 'Gọi Echo', 'Summon Echo', 'Gọi Echo giữ ấn', 'Summon an Echo to hold the rune'],
  wait: ['', '', '', 'Chờ Echo tới giữ ấn', 'Wait for your Echo to reach the rune'],
  recall: ['X', 'Thu Echo', 'Recall Echo', 'Thu Echo cũ để gọi thêm', 'Recall the oldest Echo to free a slot'],
  recharge: ['', '', '', 'Hết lượt Echo · chạm ấn mới hoặc hạ quái', 'Out of Echo charges · reach a new rune or defeat an enemy'],
  cross: ['', '', '', 'Qua cổng viền vàng', 'Cross the outlined gate'],
  exit: ['', '', '', 'Đi vào cổng thoát', 'Enter the exit portal'],
} as const;

export function MechanicGuide({ engine, hud, touch }: { engine: GameEngine | null; hud: HUDState; touch: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const libraryOpen = hud.guideLibrary === true;
  const topic = hud.guideTopic;
  const vi = hud.language === 'vi';
  const copy = topic ? GUIDE_TOPICS[topic][vi ? 'vi' : 'en'] : null;
  const hint = topic ? QUICK_HINTS[topic][vi ? 0 : 1] : null;

  useEffect(() => {
    if (!libraryOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (topic) engine?.dismissGuide();
        else engine?.closeGuide();
      } else if (event.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll('button') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      } else if (event.key !== 'Enter' && event.key !== ' ') {
        event.stopPropagation();
      }
    };
    ref.current?.querySelector('button')?.focus();
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      previous?.focus();
    };
  }, [libraryOpen, topic, engine]);

  if (!libraryOpen) {
    const objective = hud.trailAction ? trailCopy[hud.trailAction] : null;
    const Icon = topic ? hintIcons[topic] : null;
    return <>
      {objective && <aside className="trail-objective" role="status">
        {objective[0] ? <kbd>{touch ? objective[vi ? 1 : 2] : objective[0]}</kbd> :
          <Footprints size={18} aria-hidden="true"/>}
        <span>{objective[vi ? 3 : 4]}</span>
      </aside>}
      {Icon && hint && <aside className={`mechanic-hint${objective ? ' with-objective' : ''}`} role="status">
        <Icon size={18} aria-hidden="true"/>
        <span>{hint}</span>
      </aside>}
    </>;
  }

  return <div className="mechanic-guide-backdrop is-library">
    <div ref={ref} className="mechanic-guide" role="dialog" aria-modal="true" aria-labelledby="mechanic-guide-title">
      <header><span><BookOpen size={15}/>{vi ? 'SỔ TAY TIẾNG VỌNG' : 'THE ECHO FIELD GUIDE'}</span></header>
      <h2 id="mechanic-guide-title">{copy?.[0] ?? (vi ? 'Sổ tay hành trình' : 'Your field guide')}</h2>
      {copy ? <>
        <div className="guide-control-note">{hint}</div>
        <p className="guide-details">{copy[1]}</p>
      </> : <div className="guide-topic-list">
        {(Object.keys(GUIDE_TOPICS) as GuideTopic[]).map(id => {
          const Icon = hintIcons[id];
          return <button key={id} onClick={() => engine?.replayGuide(id)}>
            <Icon size={16} aria-hidden="true"/>
            <span>{GUIDE_TOPICS[id][vi ? 'vi' : 'en'][0]}</span>
            {engine?.guides.seen.has(id) ? <Check size={14} aria-hidden="true"/> : <ArrowRight size={14} aria-hidden="true"/>}
          </button>;
        })}
      </div>}
      <footer>
        {copy && <button className="guide-library-link" onClick={() => engine?.dismissGuide()}>
          <ArrowLeft size={16}/>{vi ? 'Về mục lục' : 'Back to topics'}
        </button>}
        <button className="guide-ack" onClick={() => engine?.closeGuide()}>
          {vi ? 'Chơi tiếp' : 'Resume'}<ArrowRight size={16}/>
        </button>
      </footer>
    </div>
  </div>;
}
