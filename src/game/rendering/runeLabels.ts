import type { LevelData, Rect } from '../logic/types.ts';

export const romanRune = (index: number) => ['I', 'II', 'III', 'IV', 'V', 'VI'][index] ?? String(index + 1);
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const padded = (r: Rect, p: number): Rect =>
  ({ x: r.x - p, y: r.y - p, width: r.width + 2 * p, height: r.height + 2 * p });
const centerX = (r: Rect) => r.x + r.width / 2;
const centerY = (r: Rect) => r.y + r.height / 2;
const CELL = 32;
const HEIGHT = 30;

function mapObstacles(level: LevelData): Rect[] {
  return [
    { x: level.playerSpawn.x - 52, y: level.playerSpawn.y - 62, width: 104, height: 114 },
    padded(level.exit, 35),
    { x: 0, y: 0, width: 1280, height: 105 },
    { x: 450, y: 0, width: 360, height: 140 },
    { x: 900, y: 570, width: 380, height: 150 },
    { x: 320, y: 640, width: 580, height: 80 },
    ...level.walls.map(wall => padded(wall, 5)),
    ...(level.traps ?? []).map(trap => padded(trap, 8)),
    ...level.doors.map(door => padded(door, 14)),
  ];
}

export function runeLabelLayout(level: LevelData): Rect[] {
  const obstacles = mapObstacles(level);
  return level.plates.map(plate => {
    const x = centerX(plate) - CELL / 2;
    const above = { x, y: plate.y - HEIGHT - 12, width: CELL, height: HEIGHT };
    const below = { ...above, y: plate.y + plate.height + 12 };
    const left = { ...above, x: plate.x - CELL - 12, y: centerY(plate) - HEIGHT / 2 };
    const right = { ...left, x: plate.x + plate.width + 12 };
    return [above, below, left, right].find(box =>
      obstacles.every(obstacle => !overlaps(padded(box, 3), obstacle))
    ) ?? above;
  });
}

export function gateLabelLayout(level: LevelData): Rect[] {
  const occupied = [
    ...mapObstacles(level),
    ...level.plates.map(plate => padded(plate, 12)),
    ...runeLabelLayout(level).map(label => padded(label, 8)),
  ];
  return level.doors.map(door => {
    const width = door.requiredPlates.length * CELL + 8;
    const candidates: { box: Rect; cost: number }[] = [];
    for (const gap of [18, 30, 46, 66, 94, 128]) {
      for (const offset of [0, -24, 24, -48, 48, -72, 72]) {
        const besideY = centerY(door) - HEIGHT / 2 + offset;
        const acrossX = centerX(door) - width / 2 + offset;
        const cost = gap + Math.abs(offset) * 2;
        const sideCost = door.orientation === 'horizontal' ? 60 : 0;
        const topCost = door.orientation === 'horizontal' ? 0 : 60;
        candidates.push(
          { box: { x: door.x - gap - width, y: besideY, width, height: HEIGHT }, cost: cost + sideCost },
          { box: { x: door.x + door.width + gap, y: besideY, width, height: HEIGHT }, cost: cost + sideCost },
          { box: { x: acrossX, y: door.y - gap - HEIGHT, width, height: HEIGHT }, cost: cost + topCost },
          { box: { x: acrossX, y: door.y + door.height + gap, width, height: HEIGHT }, cost: cost + topCost },
        );
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    const selected = candidates.find(({ box }) =>
      box.x >= 44 && box.x + box.width <= 1236 && box.y >= 105 && box.y + box.height <= 676 &&
      occupied.every(obstacle => !overlaps(box, obstacle))
    ) ?? candidates[0];
    occupied.push(padded(selected.box, 8));
    return selected.box;
  });
}

function drawFrame(ctx: CanvasRenderingContext2D, box: Rect, anchor: Rect, lit: boolean) {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const anchorX = clamp(centerX(box), anchor.x, anchor.x + anchor.width);
  const anchorY = clamp(centerY(box), anchor.y, anchor.y + anchor.height);
  const startX = clamp(anchorX, box.x, box.x + box.width);
  const startY = clamp(anchorY, box.y, box.y + box.height);

  ctx.strokeStyle = lit ? '#8bd8b4' : '#d1b47b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  const distance = Math.hypot(anchorX - startX, anchorY - startY);
  // A short tab points at the target without touching its gold objective brackets.
  const fraction = distance ? Math.min(6, Math.max(0, distance - 11)) / distance : 0;
  ctx.lineTo(startX + (anchorX - startX) * fraction, startY + (anchorY - startY) * fraction);
  ctx.stroke();
  ctx.fillStyle = '#101d17';
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

const layoutCache = new WeakMap<LevelData, { runes: Rect[]; gates: Rect[] }>();

export function drawRuneHints(ctx: CanvasRenderingContext2D, level: LevelData, discovered: ReadonlySet<string>) {
  if (discovered.size === 0) return;
  let layout = layoutCache.get(level);
  if (!layout) {
    layout = { runes: runeLabelLayout(level), gates: gateLabelLayout(level) };
    layoutCache.set(level, layout);
  }

  ctx.save();
  level.plates.forEach((plate, index) => {
    if (!discovered.has(plate.id)) return;
    const box = layout.runes[index];
    drawFrame(ctx, box, plate, plate.isPressed);
    ctx.fillStyle = plate.isPressed ? '#caffdf' : '#fff0bd';
    drawRoman(ctx, romanRune(index), centerX(box), centerY(box));
  });

  level.doors.forEach((door, index) => {
    if (!door.requiredPlates.some(id => discovered.has(id))) return;
    const box = layout.gates[index];
    drawFrame(ctx, box, door, door.requiredPlates.every(id => level.plates.some(plate => plate.id === id && plate.isPressed)));
    door.requiredPlates.forEach((id, slot) => {
      const runeIndex = level.plates.findIndex(plate => plate.id === id);
      const x = box.x + 4 + slot * CELL;
      const y = centerY(box);
      if (!discovered.has(id) || runeIndex === -1) {
        ctx.fillStyle = '#a99b76';
        ctx.fillRect(x + CELL / 2 - 2, y - 2, 4, 4);
        return;
      }
      const pressed = level.plates[runeIndex].isPressed;
      if (pressed) {
        ctx.fillStyle = '#28523b';
        ctx.fillRect(x + 2, box.y + 4, CELL - 4, box.height - 8);
      }
      ctx.fillStyle = pressed ? '#caffdf' : '#fff0bd';
      drawRoman(ctx, romanRune(runeIndex), x + CELL / 2, y);
    });
  });
  ctx.restore();
}

const glyphs: Record<string, string[]> = {
  I: ['111', '010', '010', '010', '010', '010', '111'],
  V: ['10001', '10001', '10001', '01010', '01010', '00100', '00100'],
};

function drawRoman(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  const chars = [...text].map(char => glyphs[char] ?? glyphs.I);
  const width = chars.reduce((sum, glyph) => sum + glyph[0].length * 2 + 2, -2);
  let left = Math.round(cx - width / 2);
  const top = Math.round(cy - 7);
  for (const glyph of chars) {
    glyph.forEach((row, y) => [...row].forEach((bit, x) => {
      if (bit === '1') ctx.fillRect(left + x * 2, top + y * 2, 2, 2);
    }));
    left += glyph[0].length * 2 + 2;
  }
}
