import type { GameEngine } from '../GameEngine.ts';
import { getCharacterBoundingBox, rectIntersects } from './collision.ts';
import type { Rect } from './types.ts';

export type TrailAction = 'record' | 'reach' | 'save' | 'summon' | 'wait' | 'recall' | 'recharge' | 'cross' | 'exit';
type Position = { x: number; y: number };

export function trailObjective(game: GameEngine): { action: TrailAction; target: Rect } | null {
  const level = game.currentLevel;
  if (!game.tutorialEnabled || !game.showHints || game.screen !== 'playing' ||
      game.guides.blocking || game.exitTravelRemaining > 0 || !level.plates.length) return null;

  const nextRune = level.plates[game.checkpointIndex];
  const nextGate = level.doors[game.checkpointIndex - 1];
  const destination = nextRune ?? level.exit;
  const requirements = nextGate?.requiredPlates ?? level.exitRequiredPlates ?? [];
  const occupies = (position: Position, target: Rect) =>
    rectIntersects(getCharacterBoundingBox(position.x, position.y), target);

  const axis = nextGate?.orientation === 'horizontal' ? 'y' : 'x';
  const size = axis === 'x' ? 'width' : 'height';
  const gateMiddle = nextGate ? nextGate[axis] + nextGate[size] / 2 : 0;
  const gateAhead = !!nextGate &&
    (destination[axis] + destination[size] / 2 - gateMiddle) * (game.player[axis] - gateMiddle) < 0;

  const required = nextRune
    ? (gateAhead ? requirements : [])
    : level.exitRequiredPlates ?? requirements;
  const missing = [...level.plates].reverse().find(plate =>
    required.includes(plate.id) && !game.echoes.some(echo => occupies(echo, plate)));
  const target = missing ?? nextRune;

  if (!missing && gateAhead && nextGate) return { action: 'cross', target: nextGate };
  if (!target) return { action: 'exit', target: level.exit };

  const recording = game.recorder.getStatus();
  const end = game.recorder.getSamples().at(-1);
  if (game.echoes.some(echo => {
    const echoEnd = echo.samples.at(-1);
    return echo.status === 'replaying' && echoEnd && occupies(echoEnd, target);
  })) return { action: 'wait', target };

  if (recording !== 'recording' && end && occupies(end, target)) {
    if (game.echoes.length >= game.echoLimit) return { action: 'recall', target };
    if (game.availableEchoCharges === 0) {
      return { action: 'recharge', target: nextRune ?? target };
    }
    return { action: 'summon', target };
  }

  if (recording === 'recording') return { action: occupies(game.player, target) ? 'save' : 'reach', target };
  return { action: 'record', target };
}
