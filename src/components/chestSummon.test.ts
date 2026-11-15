import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHEST_SUMMON_ATLASES,SUMMON_FRAME_MS,SUMMON_DURATION_MS,summonFrameAt,royalSummonAssets} from './chestSummon.ts';

test('the three new chest kinds keep their original 6 by 2 PNG atlases',()=>{
  assert.equal(new Set(Object.values(CHEST_SUMMON_ATLASES).map(a=>a.file)).size,3);
  for(const atlas of Object.values(CHEST_SUMMON_ATLASES)){
    const png=readFileSync(new URL(`../../public/assets/chest/unlock/${atlas.file}.png`,import.meta.url));
    assert.equal(png.readUInt32BE(16),atlas.width*6);
    assert.equal(png.readUInt32BE(20),atlas.height*2);
  }
});
test('timeline visits all 12 frames in order, holds the final frame, and never wraps',()=>{
  let elapsed=0;
  for(let frame=0;frame<12;frame++){
    assert.equal(summonFrameAt(elapsed).frame,frame);
    assert.equal(summonFrameAt(elapsed+SUMMON_FRAME_MS[frame]-1).frame,frame);
    elapsed+=SUMMON_FRAME_MS[frame];
  }
  assert.equal(elapsed,SUMMON_DURATION_MS);
  assert.equal(summonFrameAt(elapsed+10000).frame,11);
  assert.equal(summonFrameAt(4900).frame,11);
});

test('royal summon retains original red sprites for both reward effects',()=>{
 for(const fire of [false,true]){
  const paths=royalSummonAssets(fire);
  assert.equal(paths[0],'chest_closed.png');assert.equal(paths[1],'tanuki-crystal.png');
  assert.ok(paths[2].includes(fire?'chest_fire_':'chest_gold_'));
  for(const file of paths)assert.ok(readFileSync(new URL(`../../public/assets/chest/${file}`,import.meta.url)).length>0);
  assert.ok(paths.every(p=>!p.includes('platinum')));
 }
});
