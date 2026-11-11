import test from 'node:test';
import assert from 'node:assert/strict';
import { TutorialDirector } from './tutorials.ts';
import { GameEngine } from '../GameEngine.ts';
import { trailObjective } from './trailObjective.ts';
import { LEVELS } from './levels.ts';

test('first encounters queue once and acknowledged topics persist across reloads',()=>{
 let saved:string|null=null;const storage={getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}};
 const guide=new TutorialDirector(storage);guide.offer('links');guide.offer('links');guide.offer('rocks');guide.offer('rocks');
 assert.equal(guide.active,'links');guide.dismiss();assert.equal(guide.active,'rocks');guide.dismiss();assert.equal(guide.blocking,false);
 const reload=new TutorialDirector(storage);reload.offer('links');reload.offer('rocks');assert.equal(reload.blocking,false);
 reload.offer('multi');assert.equal(reload.active,'multi');
});
test('the library can replay a seen topic without clearing discovery history',()=>{
 const guide=new TutorialDirector(null);guide.offer('links');guide.dismiss();guide.openLibrary();assert.equal(guide.blocking,true);
 guide.replay('links');assert.equal(guide.libraryOpen,true);assert.equal(guide.active,'links');guide.dismiss();
 assert.equal(guide.active,null);assert.equal(guide.blocking,true);guide.closeLibrary();
 assert.equal(guide.seen.has('links'),true);assert.equal(guide.blocking,false);
});
test('corrupt or unavailable storage does not break guidance',()=>{
 assert.doesNotThrow(()=>new TutorialDirector({getItem:()=>'{bad',setItem:()=>{throw new Error('blocked');}}));
 const guide=new TutorialDirector({getItem:()=>null,setItem:()=>{throw new Error('blocked');}});
 guide.offer('echo');assert.doesNotThrow(()=>guide.dismiss());assert.equal(guide.seen.has('echo'),true);
});
test('automatic hints expire while movement and the timer continue; only the library pauses',()=>{
 const game=new GameEngine();game.screen='playing';game.tutorialEnabled=true;game.legTimeRemaining=10;
 const internals=game as unknown as {update(dt:number):void;heldKeys:Set<string>;elapsedLevelTime:number};
 game.guides.offer('links');internals.heldKeys.add('KeyD');const x=game.player.x;
 internals.update(.1);
 assert.equal(game.guides.active,'links');assert.ok(game.legTimeRemaining<10);
 assert.ok(internals.elapsedLevelTime>0);assert.ok(game.player.x>x);assert.ok(internals.heldKeys.has('KeyD'));
 game.guides.advance(4);assert.equal(game.guides.active,null);assert.ok(game.guides.seen.has('links'));
 game.openGuide();const remaining=game.legTimeRemaining;internals.update(2);assert.equal(game.legTimeRemaining,remaining);
 game.closeGuide();internals.update(.1);assert.ok(game.legTimeRemaining!<remaining!);
});
test('the first trail follows recording, reaching the rune, playback, crossing and exit', () => {
  const game = new GameEngine();
  game.screen = 'playing';
  game.legTimeRemaining = 16;
  game.tutorialEnabled = true;
  const internal = game as unknown as { update(dt: number): void; heldKeys: Set<string> };
  const [plate] = game.currentLevel.plates;
  const [door] = game.currentLevel.doors;
  const action = () => trailObjective(game)?.action;
  assert.equal(action(), 'record');
  game.toggleRecording();
  assert.equal(action(), 'reach');
  const move = (axis: 'x' | 'y', end: number, key: string) => {
    internal.heldKeys.add(key);
    for (let i = 0; i < 120 && Math.abs(end - game.player[axis]) > .1; i++) {
      internal.update(Math.min(.02, Math.abs(end - game.player[axis]) / game.player.speed));
    }
    internal.heldKeys.clear();
    assert.ok(Math.abs(end - game.player[axis]) <= .1);
  };
  move('y', plate.y + plate.height / 2, 'KeyW');
  move('x', plate.x + plate.width / 2, 'KeyD');
  assert.equal(action(), 'save');
  game.toggleRecording();
  assert.equal(action(), 'summon');
  game.spawnEcho();
  assert.equal(action(), 'wait');
  for (let i = 0; i < 120 && action() === 'wait'; i++) internal.update(.02);
  assert.deepEqual(trailObjective(game), { action: 'cross', target: door });
  game.player.x = door.x + door.width + 28;
  assert.deepEqual(trailObjective(game), { action: 'exit', target: game.currentLevel.exit });
  game.setShowHints(false);
  assert.equal(trailObjective(game), null);
});

test('all five trails show an objective before the first rune is discovered', () => {
  for (let idx = 0; idx < 5; idx++) {
    const game = new GameEngine();
    game.currentLevel = structuredClone(LEVELS[idx]);
    game.tutorialEnabled = true;
    game.screen = 'playing';
    assert.deepEqual(trailObjective(game), { action: 'record', target: game.currentLevel.plates[0] });
  }
});
