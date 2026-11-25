import type { GameEngine } from '../GameEngine.ts';
import type { ControlAction } from './controlSettings.ts';
import { practiceTask, type PracticeTask } from './practiceGround.ts';
import { trailObjective, type TrailAction } from './trailObjective.ts';

/**
 * The one prompt shown by the hero during play, in the style of a key hint: a key cap and a verb
 * ("[E] Ghi đường đi"). It replaces the coach pop-ups and the mission briefing: it appears when the
 * action is useful and goes away once it is done. `action` is null for prompts without a key.
 */
export interface KeyPrompt { action: ControlAction | 'move' | null; vi: string; en: string }

const PRACTICE: Record<PracticeTask | 'next', KeyPrompt> = {
  move: { action: 'move', vi: 'Di chuyển', en: 'Move' },
  attack: { action: 'attack', vi: 'Đánh hình nộm', en: 'Hit the dummy' },
  skill: { action: 'skill', vi: 'Dùng kỹ năng', en: 'Use your skill' },
  dodge: { action: 'dodge', vi: 'Lướt né qua vùng đá rơi', en: 'Dash through the rockfall' },
  next: { action: null, vi: 'Đi tiếp →', en: 'Keep going →' },
};

const TRAIL: Record<TrailAction, KeyPrompt> = {
  record: { action: 'record', vi: 'Ghi đường đi', en: 'Record your path' },
  reach: { action: null, vi: 'Tới ấn viền vàng', en: 'Reach the outlined rune' },
  save: { action: 'record', vi: 'Lưu đường đi', en: 'Save the path' },
  summon: { action: 'summon', vi: 'Gọi Echo', en: 'Summon Echo' },
  wait: { action: null, vi: 'Chờ Echo giữ ấn', en: 'Wait for your Echo' },
  recall: { action: 'recall', vi: 'Thu Echo cũ', en: 'Recall oldest Echo' },
  recharge: { action: null, vi: 'Hết lượt Echo · tới ấn mới', en: 'No charges · reach a new rune' },
  opening: { action: null, vi: 'Cổng đang mở…', en: 'Gate opening…' },
  release: { action: 'recall', vi: 'Nhả ấn ghi cạnh cổng', en: 'Free the rune marked by the gate' },
  cross: { action: null, vi: 'Qua cổng', en: 'Cross the gate' },
  exit: { action: null, vi: 'Vào cổng thoát', en: 'Enter the exit' },
  fight: { action: 'attack', vi: 'Hạ quái còn lại', en: 'Defeat the enemies' },
  ward: { action: 'attack', vi: 'Hạ lính gác nối với ấn', en: 'Defeat the linked sentries' },
  rhythm: { action: null, vi: 'Qua khi thanh chắn rút', en: 'Cross when the barrier lifts' },
};

/** The prompt for this frame, or null when there is nothing worth saying. */
export function currentKeyPrompt(game: GameEngine): KeyPrompt | null {
  if (game.screen !== 'playing' || !game.tutorialEnabled || !game.showHints) return null;
  if (game.isPracticeGround) {
    const task = practiceTask(game.player.x, game.practice);
    if (task) return PRACTICE[task];
  }
  const action = trailObjective(game)?.action;
  return action ? TRAIL[action] : null;
}
