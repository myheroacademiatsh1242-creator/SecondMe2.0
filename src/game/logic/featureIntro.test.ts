import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_KEY, FeatureIntro } from './featureIntro.ts';

test('a feature is new until its tip is dismissed; the mark is saved, survives reload and notifies once', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  const intro = new FeatureIntro(storage);
  let calls = 0;
  intro.subscribe(() => calls++);
  assert.equal(intro.isNew('shop'), true);
  intro.markSeen('shop');
  intro.markSeen('shop');
  assert.equal(intro.isNew('shop'), false);
  assert.equal(intro.isNew('bag'), true);
  assert.equal(calls, 1);
  assert.deepEqual(JSON.parse(store.get(FEATURE_KEY)!), ['shop']);
  assert.equal(new FeatureIntro(storage).isNew('shop'), false);
});

test('corrupt or unknown saved entries are ignored', () => {
  const storage = { getItem: () => '["shop","nope",3]', setItem() {} };
  const intro = new FeatureIntro(storage);
  assert.equal(intro.isNew('shop'), false);
  assert.equal(intro.isNew('runes'), true);
  assert.equal(new FeatureIntro({ getItem: () => '{bad', setItem() {} }).isNew('shop'), true);
});
