import test from 'node:test';
import assert from 'node:assert/strict';
import { levelUses, startPreload, resetPreloadForTests, type LevelLoadSpec } from './preloader.ts';

const level = (levelId: number, character: LevelLoadSpec['character'] = 'mage'): LevelLoadSpec => ({ levelId, character, lang: 'vi' });

test('a level loads its scenery and the chosen hero, not the menu or other heroes', () => {
  const spec = level(2, 'swordsman');
  assert.ok(levelUses('assets/forest/ground.jpg', spec));
  assert.ok(levelUses('assets/magic-effects/rune.png', spec));
  assert.ok(levelUses('assets/soldier/Soldier_Walk.png', spec));
  assert.ok(!levelUses('assets/blue-wizard/walk/01.png', spec));
  assert.ok(!levelUses('assets/menu/main-menu.jpg', spec));
  assert.ok(!levelUses('assets/loading/background.jpg', spec));
  assert.ok(!levelUses('assets/frost-guardian/sheet.png', spec));
  assert.ok(!levelUses('assets/music/Nhạc đánh boss.mp3', spec));
});

test('only the selected boss art blocks loading, while audio loads on demand', () => {
  const spec = level(6);
  assert.ok(levelUses('assets/frost-guardian/sheet.png', spec));
  assert.ok(!levelUses('assets/music/Nhạc đánh boss.mp3', spec));
  assert.ok(!levelUses('assets/voice/guardian/vi/g1.mp3', spec));
  assert.ok(!levelUses('assets/voice/aeris/vi/a1.mp3', spec));
  assert.ok(!levelUses('assets/voice/guardian/en/g1.mp3', spec));
  assert.ok(!levelUses('assets/voice/narrator/vi/n1.mp3', spec));
  assert.ok(levelUses('assets/demon-boss/cave-arena.png', level(13)));
  assert.ok(!levelUses('assets/demon-boss/cave-arena.png', spec));
  assert.ok(levelUses('assets/volcano/v2/icefire-11.png', level(11)));
  assert.ok(!levelUses('assets/volcano/v2/icefire-12.png', level(11)));
});


test('loading follows received bytes, waits for completion and reuses decoded lobby images', async t => {
  resetPreloadForTests();
  const originalFetch = globalThis.fetch;
  const originalImage = globalThis.Image;
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
    resetPreloadForTests();
  });
  const paths = ['assets/ui/journey-forest-map.png', 'assets/ui/echo-campsite.png'];
  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
  let imageRequests = 0;
  globalThis.fetch = (async (url: string) => {
    if (url.endsWith('index.json')) return Response.json(paths.map(path => ({ path, bytes: 100 })));
    imageRequests++;
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { streams.push(controller); } }), {
      headers: { 'Content-Length': '100', 'Content-Type': 'image/png' },
    });
  }) as typeof fetch;
  globalThis.Image = class {
    onload?: () => void;
    decoding = '';
    set src(_url: string) { queueMicrotask(() => this.onload?.()); }
    decode() { return Promise.resolve(); }
  } as unknown as typeof Image;
  const flush = () => new Promise<void>(resolve => setImmediate(resolve));
  const load = startPreload();
  await flush();
  assert.equal(streams.length, 2);
  assert.equal(load.progress, 0);
  streams[0].enqueue(new Uint8Array(50));
  await flush();
  assert.equal(load.progress, .25);
  assert.equal(load.done, false);
  assert.equal(load.loadedFiles, 0);
  await flush();
  assert.equal(load.progress, .25, 'time alone must not advance loading');
  streams[0].enqueue(new Uint8Array(50));
  streams[1].enqueue(new Uint8Array(100));
  await flush();
  assert.ok(load.progress < 1, 'received bytes do not finish an open response');
  assert.equal(load.done, false);
  for (const stream of streams) stream.close();
  await load.whenDone;
  assert.equal(load.progress, 1);
  assert.equal(load.done, true);
  assert.equal(load.loadedFiles, 2);
  assert.deepEqual(load.failed, []);
  assert.equal(startPreload(), load);
  assert.equal(imageRequests, 2, 'cached preload should not download again');
});
