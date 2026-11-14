import type { HUDState } from '../game/GameEngine.ts';
import { FROST_PRELUDE_KILLS } from '../game/logic/pillarSummon.ts';

export function PausedQuests({hud,levelId}:{hud:HUDState;levelId?:number}) {
  const vi = hud.language === 'vi';
  const runesRequired = Math.max(1, hud.runesRequired ?? 1);
  const tasks = hud.bossHp > 0
    ? (hud.bossKind === 'demon'
      ? [
          { done: !hud.demonHeatShield, text: vi ? 'Phá giáp kháng hỏa' : 'Break heat shield' },
          { done: !!hud.demonStunned || !!hud.bossVulnerable, text: vi ? 'Đánh lúc sơ hở' : 'Strike in opening' },
          { done: false, text: vi ? 'Hạ Quỷ Tâm Hỏa' : 'Defeat Flame Demon' },
        ]
      : [
          { done: hud.pillarsRemaining === 0, text: vi ? `Phá trụ băng (${4 - hud.pillarsRemaining}/4)` : `Break pillars (${4 - hud.pillarsRemaining}/4)` },
          { done: !!hud.bossVulnerable, text: vi ? 'Đánh lúc sơ hở' : 'Strike in opening' },
          { done: false, text: vi ? 'Hạ Thủ Vệ Băng' : 'Defeat Guardian' },
        ])
    : hud.crystalsShattered !== undefined ? [
        { done: hud.crystalsShattered >= FROST_PRELUDE_KILLS, text: vi ? `Đập vỡ Pha Lê Băng (${Math.min(hud.crystalsShattered, FROST_PRELUDE_KILLS)}/${FROST_PRELUDE_KILLS})` : `Shatter Frost Crystals (${Math.min(hud.crystalsShattered, FROST_PRELUDE_KILLS)}/${FROST_PRELUDE_KILLS})` },
        { done: false, text: vi ? 'Hạ Thủ Vệ Băng' : 'Defeat Guardian' },
      ]
    : hud.training ? [
        { done: false, text: vi ? 'Tập đánh với hình nộm, rồi vào cổng để về trại' : 'Practise on the dummies, then enter the portal to return to camp' },
      ]
    : levelId === 13 ? [
        { done: false, text: vi ? 'Hạ slime đỏ' : 'Defeat the red slime' },
      ]
    : [
        { done: hud.checkpointIndex >= hud.checkpointCount, text: vi ? `Kích hoạt ấn (${hud.checkpointIndex}/${hud.checkpointCount})` : `Activate runes (${hud.checkpointIndex}/${hud.checkpointCount})` },
        { done: (hud.runesHeld ?? 0) >= runesRequired || !!hud.finalGateCrossed, text: hud.finalGateCrossed ? (vi ? 'Đã qua cổng cuối' : 'Final gate crossed') : (vi ? `Giữ ấn cổng cuối (${hud.runesHeld ?? 0}/${runesRequired})` : `Hold final seals (${hud.runesHeld ?? 0}/${runesRequired})`) },
        ...(hud.finalGateNeedsRelease && !hud.finalGateCrossed ? [{ done: false, text: vi ? 'Thu Echo ở ấn cần nhả' : 'Recall Echo on release rune' }] : []),
        ...(hud.trailAction === 'rhythm' ? [{ done: false, text: vi ? 'Chờ nhịp mở của cổng' : 'Wait for the gate window' }] : []),
        ...((hud.exitBlockingEnemiesRemaining ?? 0) > 0 ? [{ done: false, text: vi ? `Hạ lính giữ cổng (${hud.exitBlockingEnemiesRemaining})` : `Defeat exit guards (${hud.exitBlockingEnemiesRemaining})` }] : []),
        { done: !!hud.exitOpen, text: hud.exitOpen ? (vi ? 'Cổng thoát đã mở' : 'Exit portal open') : hud.finalGateCrossed ? (vi ? 'Hoàn tất nhiệm vụ để mở cổng thoát' : 'Finish objectives to open exit') : (vi ? 'Qua cổng cuối để mở lối thoát' : 'Cross the final gate to open exit') },
      ];
  return <section className="pause-quests" aria-labelledby="pause-quests-title">
    <h3 id="pause-quests-title">{vi ? 'Nhiệm vụ' : 'Quests'}</h3>
    <ul>
      {tasks.map(task => <li key={task.text} data-complete={task.done}>
        <span className="pause-quest-mark" aria-label={task.done ? (vi ? 'Đã hoàn thành' : 'Complete') : (vi ? 'Chưa hoàn thành' : 'Incomplete')}>{task.done ? '✓' : '□'}</span>
        <span>{task.text}</span>
      </li>)}
    </ul>
  </section>;
}
