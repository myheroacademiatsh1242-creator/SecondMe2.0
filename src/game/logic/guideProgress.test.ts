import test from 'node:test';
import assert from 'node:assert/strict';
import {guidePageUnlocked as open} from './guideProgress.ts';
test('new players only have the first level guide and general instructions',()=>{
 assert.ok(open('controls','pc'));assert.ok(open('levels','level-1'));
 for(let id=2;id<=13;id++)assert.equal(open('levels',`level-${id}`),false);
 assert.equal(open('levels','boss-guardian'),false);assert.equal(open('levels','boss-demon'),false);
});
test('each clear unlocks the next level, and the guardian gates the second chapter',()=>{
 const progress={completed:[] as number[],bossDefeated:false};
 for(let id=1;id<=5;id++){
  assert.ok(open('levels',`level-${id}`,progress));assert.equal(open('levels',`level-${id+1}`,progress),false);
  progress.completed.push(id);assert.ok(open('levels',`level-${id+1}`,progress));
 }
 assert.ok(open('levels','boss-guardian',progress));assert.equal(open('levels','level-7',progress),false);
 progress.bossDefeated=true;assert.ok(open('levels','level-7',progress));
 for(let id=7;id<=12;id++){
  assert.equal(open('levels',`level-${id+1}`,progress),false);progress.completed.push(id);assert.ok(open('levels',`level-${id+1}`,progress));
 }
 assert.ok(open('levels','boss-demon',progress));
});
test('reset and incomplete or forged progress cannot bypass locked guides',()=>{
 assert.equal(open('levels','level-13',{completed:[12,13],bossDefeated:true}),false);
 assert.equal(open('levels','boss-guardian',{completed:[],bossDefeated:true}),false);
 assert.equal(open('levels','level-2',{completed:[],bossDefeated:false}),false);
 assert.equal(open('levels','level-99'),false);
});
