import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUIDE, CONTROLS, TOPIC_IDS, pageForTopic, pageText, fold, type Block, type L } from './guideContent.ts';
import { ALL_LEVEL_FACTS, levelFacts } from './levelFacts.ts';
import { LEVELS } from '../../game/logic/levels.ts';
import SHOTS from './shots.json' with { type: 'json' };

const shots = SHOTS as Record<string, { w: number; h: number; marks?: Record<string, unknown> }>;
const publicDir = fileURLToPath(new URL('../../../public/assets/guide/', import.meta.url));

function* strings(b: Block): Generator<L> {
  if (b.t === 'p' || b.t === 'note') yield b.text;
  if (b.t === 'list') yield* b.items;
  if (b.t === 'figure') { yield b.fig.alt; if (b.fig.caption) yield b.fig.caption; }
  if (b.t === 'steps') for (const s of b.steps) { yield s.text; yield s.fig.alt; }
  if (b.t === 'table') for (const c of [...b.head, ...b.rows.flat()]) if (typeof c !== 'string') yield c;
}

test('the guide has sections A–G, a page for each of the 13 levels and one per boss', () => {
  assert.deepEqual(GUIDE.map(s => s.letter), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  const levels = GUIDE.find(s => s.id === 'levels')!.pages;
  for (let id = 1; id <= 13; id++) assert.ok(levels.some(p => p.blocks.some(b => b.t === 'level' && b.id === id)), `level ${id}`);
  assert.ok(levels.some(p => p.id === 'boss-guardian') && levels.some(p => p.id === 'boss-demon'));
});

test('every text exists in Vietnamese and English', () => {
  for (const s of GUIDE) {
    assert.ok(s.title.vi && s.title.en);
    for (const p of s.pages) {
      assert.ok(p.title.vi && p.title.en, p.id);
      for (const b of p.blocks) for (const x of strings(b)) assert.ok(x.vi.trim() && x.en.trim(), `${p.id}: ${JSON.stringify(x)}`);
    }
  }
  for (const g of CONTROLS) for (const r of g.rows) assert.ok(r.action.vi && r.action.en && (!r.touch || (r.touch.vi && r.touch.en)));
});

test('every in-game hint topic opens a guide page (the old library topics are kept)', () => {
  for (const id of TOPIC_IDS) assert.ok(pageForTopic(id), id);
});

test('level facts are read from the level data: runes, gate requirements, empty runes, beats, sealed runes', () => {
  assert.equal(ALL_LEVEL_FACTS.length, 13);
  for (const level of LEVELS) {
    const f = levelFacts(level);
    assert.equal(f.runes.length, level.plates.length);
    assert.equal(f.gates.length, level.doors.length);
    level.doors.forEach((d, i) => assert.equal(f.gates[i].needs.length, d.requiredPlates.length));
  }
  const byId = (id: number) => ALL_LEVEL_FACTS.find(f => f.id === id)!;
  assert.deepEqual(byId(1).gates.map(g => g.needs), [['I']]);
  assert.deepEqual(byId(3).gates.map(g => g.needs), [['I'], ['I', 'II'], ['II', 'III']]);
  assert.deepEqual(byId(4).gates.at(-1)!.needs, ['I', 'III', 'IV']);
  assert.deepEqual(byId(5).gates.at(-1)!.needs, ['II', 'III', 'IV', 'V']);
  assert.equal(byId(5).gates.at(-1)!.empty, 'I');
  assert.deepEqual(byId(8).gates[0].pulse, { open: 4, period: 8 });
  assert.equal(byId(7).runes[1].guards, 1);
  assert.equal(byId(7).exitClear, 'all');
  assert.equal(byId(10).gates[0].bridge, true);
  assert.equal(byId(6).boss, 'guardian');
  assert.equal(byId(13).boss, 'demon');
});

test('every screenshot the guide uses was captured (registered in shots.json, file on disk)', () => {
  const used = new Set<string>();
  for (const s of GUIDE) for (const p of s.pages) for (const b of p.blocks) {
    if (b.t === 'figure') used.add(b.fig.shot);
    if (b.t === 'steps') b.steps.forEach(x => used.add(x.fig.shot));
    if (b.t === 'level') used.add(`map-${b.id}`);
  }
  const missing = [...used].filter(id => !shots[id] || !existsSync(publicDir + id + '.webp'));
  assert.deepEqual(missing, [], 'run: node tools/guide-shots/capture.mjs');
  // Named marks an annotation points at must have been recorded with that shot.
  for (const s of GUIDE) for (const p of s.pages) for (const b of p.blocks) {
    const figs = b.t === 'figure' ? [b.fig] : b.t === 'steps' ? b.steps.map(x => x.fig) : [];
    for (const fig of figs) for (const n of fig.notes ?? []) for (const at of n.kind === 'arrow' ? [n.from, n.to] : [n.at])
      if (typeof at === 'string') assert.ok(shots[fig.shot]?.marks?.[at], `${fig.shot}: mark "${at}"`);
  }
});

test('search ignores accents and case', () => {
  const hits = GUIDE.flatMap(s => s.pages).filter(p => pageText(p, 'vi').includes(fold('CỔNG')));
  assert.ok(hits.length >= 3);
  assert.equal(fold('Đường đi'), 'duong di');
});
