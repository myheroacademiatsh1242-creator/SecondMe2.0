/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pointInRect, rectIntersects, getCharacterBoundingBox, GATE_PASSABLE_PROGRESS } from './collision.ts';
import { PressurePlate, SecurityDoor, ExitPortal, Rect } from './types.ts';
import type { LevelData } from './types.ts';

export function isPuzzleExitOpen(level: LevelData, checkpoint: number, finalGateCrossed: boolean): boolean {
  return checkpoint >= level.plates.length && (!level.doors.length || finalGateCrossed);
}

export function crossedGateTowardExit(
  gate: SecurityDoor, exit: ExitPortal, before: CharacterPosition, after: CharacterPosition,
): boolean {
  if (gate.openProgress < GATE_PASSABLE_PROGRESS) return false;
  const horizontal = gate.orientation === 'horizontal';
  const axis = horizontal ? 'y' : 'x';
  const across = horizontal ? 'x' : 'y';
  const depth = horizontal ? 'height' : 'width';
  const span = horizontal ? 'width' : 'height';
  const middle = gate[axis] + gate[depth] / 2;
  const direction = Math.sign(exit[axis] + exit[depth] / 2 - middle);
  if (direction === 0) return false;
  const farEdge = middle + direction * (gate[depth] / 2);
  if ((before[axis] - farEdge) * direction >= 0 || (after[axis] - farEdge) * direction < 0) return false;
  const t = (farEdge - before[axis]) / (after[axis] - before[axis]);
  const crossing = before[across] + (after[across] - before[across]) * t;
  return crossing > gate[across] && crossing < gate[across] + gate[span];
}

export interface CharacterPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Checks which pressure plates are currently occupied by player or echo.
 */
export function updatePressurePlates(
  plates: PressurePlate[],
  player: CharacterPosition,
  echo: CharacterPosition | CharacterPosition[] | null,
  dt: number
): { plateChanged: boolean; activatedIds: string[]; deactivatedIds: string[] } {
  let plateChanged = false;
  const activatedIds: string[] = [];
  const deactivatedIds: string[] = [];

  const playerBox = getCharacterBoundingBox(
    player.x,
    player.y,
    player.width ?? 24,
    player.height ?? 24
  );

  const echoBoxes=(Array.isArray(echo)?echo:echo?[echo]:[]).map(e=>getCharacterBoundingBox(e.x,e.y,e.width??24,e.height??24));

  for (const plate of plates) {
    const plateRect: Rect = {
      x: plate.x,
      y: plate.y,
      width: plate.width,
      height: plate.height,
    };

    const playerOn = rectIntersects(playerBox, plateRect);
    const echoOn = echoBoxes.some(box=>rectIntersects(box,plateRect));
    const isNowPressed = !plate.wardLocked && (playerOn || echoOn);

    if (isNowPressed !== plate.isPressed) {
      plateChanged = true;
      if (isNowPressed) {
        activatedIds.push(plate.id);
      } else {
        deactivatedIds.push(plate.id);
      }
    }

    plate.isPressed = isNowPressed;
    if (isNowPressed) {
      plate.pressTimer = (plate.pressTimer ?? 0) + dt;
    } else {
      plate.pressTimer = 0;
    }
  }

  return { plateChanged, activatedIds, deactivatedIds };
}

/**
 * Updates doors based on required pressure plates.
 * Handles safe closing (never crush player or echo while occupying door threshold).
 */
export function updateSecurityDoors(
  doors: SecurityDoor[],
  plates: PressurePlate[],
  player: CharacterPosition,
  echo: CharacterPosition | CharacterPosition[] | null,
  dt: number,
  openSpeed: number = 3.5, // full open/close in ~0.3 seconds
  elapsed: number = 0
): { doorStateChanged: boolean; openedDoorIds: string[]; closedDoorIds: string[] } {
  let doorStateChanged = false;
  const openedDoorIds: string[] = [];
  const closedDoorIds: string[] = [];

  const playerBox = getCharacterBoundingBox(
    player.x,
    player.y,
    player.width ?? 26,
    player.height ?? 26
  );
  const echoBoxes=(Array.isArray(echo)?echo:echo?[echo]:[]).map(e=>getCharacterBoundingBox(e.x,e.y,e.width??26,e.height??26));

  // Build a lookup map of plate states
  const plateStateMap = new Map<string, boolean>();
  for (const plate of plates) {
    plateStateMap.set(plate.id, plate.isPressed);
  }

  for (const door of doors) {
    // Check if all required plates are pressed
    const allRequiredPressed = door.requiredPlates.every(
      (id) => plateStateMap.get(id) === true
    );

    const canOpen = (!door.pulse || pulseWindow(door,elapsed).open) && allRequiredPressed && (!door.releasedPlate || plateStateMap.get(door.releasedPlate) === false);
    const prevOpen = door.isOpen;
    door.isOpen = canOpen;

    if (canOpen !== prevOpen) {
      doorStateChanged = true;
      if (canOpen) {
        openedDoorIds.push(door.id);
      } else {
        closedDoorIds.push(door.id);
      }
    }

    const doorRect: Rect = {
      x: door.x,
      y: door.y,
      width: door.width,
      height: door.height,
    };

    if (door.isOpen) {
      // Animate opening
      if (door.openProgress < 1) {
        door.openProgress = Math.min(1, door.openProgress + dt * openSpeed);
      }
    } else {
      // Safety check: is player or echo inside the doorway?
      const playerInside = rectIntersects(playerBox, doorRect);
      const echoInside = echoBoxes.some(box=>rectIntersects(box,doorRect));

      // Only close if doorway is unoccupied to prevent getting crushed or stuck
      if (!playerInside && !echoInside) {
        if (door.openProgress > 0) {
          door.openProgress = Math.max(0, door.openProgress - dt * openSpeed);
        }
      }
    }
  }

  return { doorStateChanged, openedDoorIds, closedDoorIds };
}

/**
 * Checks if the player has entered the exit portal.
 */
export function checkExitReached(
  playerX: number,
  playerY: number,
  exit: ExitPortal
): boolean {
  const portalCenterX = exit.x + exit.width / 2;
  const portalCenterY = exit.y + exit.height / 2;
  const dist = Math.hypot(playerX - portalCenterX, playerY - portalCenterY);
  return dist <= exit.radius;
}

/** The window is deterministic so the visible countdown and collision always agree. */
export function pulseWindow(door:SecurityDoor,elapsed:number):{open:boolean;remaining:number}{
 if(!door.pulse)return{open:true,remaining:Infinity};
 const {period,openSeconds,offset=0}=door.pulse,phase=((elapsed+offset)%period+period)%period;
 return{open:phase<openSeconds,remaining:phase<openSeconds?openSeconds-phase:period-phase};
}
