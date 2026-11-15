import { Clock3, Footprints, Link, Shield, Snowflake, Sparkles, Swords, TriangleAlert } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { QUICK_HINTS } from '../game/logic/tutorials.ts';
import { PlayerGuide } from './guide/PlayerGuide.tsx';
import './MechanicGuide.css';

const hintIcons = {
  echo: Footprints, links: Link, enemies: Swords, vines: Footprints, crusher: TriangleAlert,
  spikes: TriangleAlert, rocks: TriangleAlert, time: Clock3, multi: Link, recycle: Footprints,
  upgradeRunes: Sparkles, shield: Snowflake, bossPatterns: TriangleAlert, skillPickups: Sparkles,
  shieldRestored: Shield, decoy: Footprints, vulnerable: Swords,
  ward: Shield, release: Footprints, rhythm: Clock3,
};

const trailCopy = {
  record: ['E', 'Ghi hình', 'Record', 'Bắt đầu ghi đường đi', 'Start recording your path'],
  reach: ['', '', '', 'Đi tới ấn viền vàng', 'Step onto the outlined rune'],
  save: ['E', 'Dừng ghi', 'Stop', 'Lưu đường đi tại ấn', 'Save your path on the rune'],
  summon: ['Q', 'Gọi Echo', 'Summon Echo', 'Gọi Echo giữ ấn', 'Summon an Echo to hold the rune'],
  wait: ['', '', '', 'Chờ Echo tới giữ ấn', 'Wait for your Echo to reach the rune'],
  recall: ['X', 'Thu Echo', 'Recall Echo', 'Thu Echo cũ để gọi thêm', 'Recall the oldest Echo to free a slot'],
  recharge: ['', '', '', 'Hết lượt Echo · chạm ấn mới hoặc hạ quái', 'Out of Echo charges · reach a new rune or defeat an enemy'],
  opening: ['', '', '', 'Cổng đang mở…', 'Gate opening…'],
  release: ['X', 'Thu Echo', 'Recall Echo', 'Nhả ấn ghi cạnh cổng, rồi qua cổng', 'Release the rune marked beside the gate'],
  cross: ['', '', '', 'Qua cổng viền vàng', 'Cross the outlined gate'],
  exit: ['', '', '', 'Đi vào cổng thoát', 'Enter the exit portal'],
  ward: ['', '', '', 'Hạ lính gác nối với ấn tím để phá phong ấn', 'Defeat the linked sentries to unseal the rune'],
  rhythm: ['', '', '', 'Giữ đủ ấn, qua khi thanh chắn rút', 'Hold the required runes and cross when the barrier retracts'],
  fight: ['', '', '', 'Hạ hết quái để mở cổng thoát', 'Defeat the remaining enemies to unlock the exit'],
} as const;

export function MechanicGuide({ engine, hud, touch }: { engine: GameEngine | null; hud: HUDState; touch: boolean }) {
  const libraryOpen = hud.guideLibrary === true;
  const topic = hud.guideTopic;
  const vi = hud.language === 'vi';
  const hint = topic ? QUICK_HINTS[topic][vi ? 0 : 1] : null;
  // The library is the full player guide (guide/PlayerGuide.tsx); play stays frozen while it is open (guides.blocking).
  if (libraryOpen) return <PlayerGuide lang={vi ? 'vi' : 'en'} topic={topic} onClose={() => engine?.closeGuide()} onReplayTutorial={track=>{engine?.onboarding.replay(track);engine?.closeGuide();}}/>;
  const objective = hud.trailAction ? trailCopy[hud.trailAction] : null;
  const Icon = topic ? hintIcons[topic] : null;
  return <>
    {objective && <aside className="trail-objective" role="status">
      {objective[0] ? <kbd>{touch ? objective[vi ? 1 : 2] : objective[0]}</kbd> :
        <Footprints size={18} aria-hidden="true"/>}
      <span>{objective[vi ? 3 : 4]}</span>
    </aside>}
    {Icon && hint && topic && !engine?.onboarding.active && <aside className={`mechanic-hint${objective ? ' with-objective' : ''}`} role="status">
      <Icon size={18} aria-hidden="true"/>
      <span>{hint}</span>
      <button type="button" className="mechanic-hint-more" onClick={() => { engine?.openGuide(); engine?.replayGuide(topic); }}>{vi ? 'Xem chi tiết' : 'Details'}</button>
    </aside>}
  </>;
}
