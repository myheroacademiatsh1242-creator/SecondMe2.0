import type { Rect } from '../logic/types.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../logic/levels.ts';
import {drawRuneHints,gateLabelLayout,overlaps,romanRune,runeLabelLayout} from './runeLabels.ts';
test('Roman rune strips clear every campaign rune, other strip, and HUD',()=>{
 for(const level of LEVELS){const boxes=gateLabelLayout(level);for(const [i,box] of boxes.entries()){
  assert.ok(box.x>=44&&box.x+box.width<=1236&&box.y>=44&&box.y+box.height<=676,`bounds ${level.id}/${i}`);
  for(const label of runeLabelLayout(level))assert.ok(!overlaps(box,label),`rune label ${level.id}/${i}`);
  assert.ok(!overlaps(box,{x:450,y:0,width:360,height:140}),`HUD ${level.id}/${i}`);
  assert.ok(box.y>=105,`toolbar ${level.id}/${i}`);
  for(const other of boxes.slice(0,i))assert.ok(!overlaps(box,other),`strip ${level.id}/${i}`);
 }}assert.deepEqual([0,1,2,3,4].map(romanRune),['I','II','III','IV','V']);
});

test('gate labels do not cover walls, trap footprints or the gate artwork',()=>{
 for(const level of LEVELS)for(const [i,box]of gateLabelLayout(level).entries()){
  for(const wall of level.walls)assert.ok(!overlaps(box,wall),`wall ${level.id}/${i}`);
  for(const trap of level.traps??[])assert.ok(!overlaps(box,trap),`trap ${level.id}/${i}`);
  for(const door of level.doors)assert.ok(!overlaps(box,{x:door.x-14,y:door.y-14,width:door.width+28,height:door.height+28}),`gate ${level.id}/${i}`);
 }
});

test('labels leave the spawn altar and exit portal visible',()=>{
 for(const level of LEVELS)for(const box of gateLabelLayout(level)){
  assert.ok(!overlaps(box,{x:level.playerSpawn.x-52,y:level.playerSpawn.y-62,width:104,height:114}),`spawn ${level.id}`);
  assert.ok(!overlaps(box,{x:level.exit.x-35,y:level.exit.y-35,width:level.exit.width+70,height:level.exit.height+70}),`exit ${level.id}`);
 }
});

test('every discovered numeral is centered over its rune and in the matching gate slots', () => {
  for (const level of LEVELS) {
    const pixels: Rect[] = [];
    const ctx = {
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {},
      fillRect(x: number, y: number, width: number, height: number) {
        if (width === 2 && height === 2) pixels.push({ x, y, width, height });
      },
    } as unknown as CanvasRenderingContext2D;
    const runeBoxes = runeLabelLayout(level);
    const gateBoxes = gateLabelLayout(level);
    for (const [runeIndex, plate] of level.plates.entries()) {
      const runeBox = runeBoxes[runeIndex];
      assert.ok(
        runeBox.x + runeBox.width / 2 === plate.x + plate.width / 2 ||
        runeBox.y + runeBox.height / 2 === plate.y + plate.height / 2
      );
      assert.ok(runeBox.y >= 105 && runeBox.y + runeBox.height <= 676);
      for (const obstacle of [...level.walls, ...(level.traps ?? []), ...level.doors, ...level.plates]) {
        assert.ok(!overlaps(runeBox, obstacle), `rune box ${level.id}/${plate.id}`);
      }

      pixels.length = 0;
      drawRuneHints(ctx, level, new Set([plate.id]));
      const signature = (box: Rect) => {
        const matches = pixels.filter(pixel => overlaps(pixel, box));
        assert.ok(matches.length > 0);
        const left = Math.min(...matches.map(pixel => pixel.x));
        const right = Math.max(...matches.map(pixel => pixel.x + pixel.width));
        assert.equal((left + right) / 2, box.x + box.width / 2);
        return matches.map(pixel => [pixel.x - left, pixel.y - box.y]);
      };
      const runeGlyph = signature(runeBox);
      let copies = 1;
      for (const [doorIndex, door] of level.doors.entries()) {
        const slot = door.requiredPlates.indexOf(plate.id);
        if (slot === -1) continue;
        const gateBox = gateBoxes[doorIndex];
        const width = (gateBox.width - 8) / door.requiredPlates.length;
        assert.deepEqual(signature({ ...gateBox, x: gateBox.x + 4 + slot * width, width }), runeGlyph);
        copies++;
      }
      assert.equal(pixels.length, copies * runeGlyph.length);
    }
  }
});

test('rune and gate badges clear all objective outlines', () => {
  for (const level of LEVELS) {
    for (const badge of [...runeLabelLayout(level), ...gateLabelLayout(level)]) {
      for (const target of [...level.plates, ...level.doors]) {
        assert.ok(!overlaps(badge, {
          x: target.x - 10, y: target.y - 10,
          width: target.width + 20, height: target.height + 20,
        }), `level ${level.id}: badge overlaps outline on ${target.id}`);
      }
    }
  }
});
