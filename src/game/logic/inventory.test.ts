import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../GameEngine.ts';
import {Campaign} from './campaign.ts';
import {sounds} from './sound.ts';
sounds.setMuted(true);
function setup(t:TestContext){const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));const g=new GameEngine();g.currentLevelIdx=1;g.tutorialEnabled=false;g.campaign.timeItems=2;g.campaign.echoRunes.guard=2;g.campaign.packItem('time');g.campaign.packItem('time');g.restartLevel();return g;}
test('inventory freezes the entire combat clock but allows one deliberate consumable activation',t=>{
 const g=setup(t);const time=g.legTimeRemaining!;g.setInventoryOpen(true);(g as any).update(2);assert.equal(g.legTimeRemaining,time);assert.equal(g.health,g.maxHealth);
 assert.ok(g.canUseTimeItem());assert.ok(g.useTimeItem());assert.equal(g.campaign.timeItems,1);assert.equal(g.legTimeRemaining,time+2);assert.ok(g.useTimeItem());assert.equal(g.campaign.timeItems,0);assert.equal(g.legTimeRemaining,time+4);assert.equal(g.useTimeItem(),false);
 assert.ok(g.campaign.setRuneSlot(0,'guard'));assert.ok(g.useEchoRune('guard'));assert.equal(g.campaign.echoRunes.guard,1);assert.equal(g.useEchoRune('guard'),false);
 g.setInventoryOpen(false);(g as any).update(.1);assert.equal(g.legTimeRemaining,time+3.9);
});
test('closing nested rune editing keeps the inventory pause and does not consume a potion outside gameplay',t=>{
 const g=setup(t);g.setInventoryOpen(true);g.setRuneEditing(true);assert.equal(g.canUseTimeItem(),false);g.setRuneEditing(false);const time=g.legTimeRemaining;(g as any).update(1);assert.equal(g.legTimeRemaining,time);
 g.goToLobby();assert.equal(g.canUseTimeItem(),false);assert.equal(g.useTimeItem(),false);assert.equal(g.campaign.timeItems,2);
});

test('the limit is three types, and each type can carry multiple copies up to stock', t => {
 const g = setup(t);
 g.goToLobby();
 g.campaign.supplies.healSmall = 4;
 g.campaign.supplies.healLarge = 1;
 g.campaign.supplies.manaSmall = 10;
 assert.ok(g.packItem('healSmall'));
 assert.ok(g.packItem('manaSmall'));
 assert.equal(g.packItem('healLarge'), false);
 assert.ok(g.packItem('healSmall'));
 assert.ok(g.setPackedCount(2, 10));
 assert.equal(g.setPackedCount(2, 11), false);
 assert.deepEqual(g.campaign.itemLoadout, [
   {id: 'time', count: 2}, {id: 'healSmall', count: 2}, {id: 'manaSmall', count: 10},
 ]);
 assert.equal(g.campaign.supplies.healSmall, 4);
 g.restartLevel();
 assert.equal(g.unpackItem(0), false);
 assert.equal(g.setPackedCount(1, 4), false);
 g.health = 10;
 assert.equal(g.useSupply('healLarge'), false);
 assert.ok(g.useSupply('healSmall'));
 assert.ok(g.useSupply('healSmall'));
 assert.equal(g.useSupply('healSmall'), false);
 assert.equal(g.campaign.supplies.healSmall, 2);
 assert.equal(g.campaign.supplies.healLarge, 1);
 assert.equal(g.campaign.timeItems, 2);
 assert.equal(g.campaign.supplies.manaSmall, 10);
});

test('packed items survive reload and legacy saves keep all stock without a loadout', t => {
 const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 let data = JSON.stringify({ timeItems: 2, limitRings: 2, chanceCharges: 1 });
 Object.defineProperty(globalThis, 'localStorage', {
   configurable: true, value: { getItem: () => data, setItem: (_key: string, next: string) => { data = next; } },
 });
 t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : Reflect.deleteProperty(globalThis, 'localStorage'));
 const campaign = new Campaign();
 campaign.load();
 assert.deepEqual(campaign.itemLoadout, []);
 assert.equal(campaign.timeItems, 2);
 assert.ok(campaign.packItem('ring'));
 assert.equal(campaign.packItem('ring'), false);
 assert.ok(campaign.packItem('chances'));
 assert.ok(campaign.packItem('time'));
 const reloaded = new Campaign();
 reloaded.load();
 assert.deepEqual(reloaded.itemLoadout, [
   {id: 'ring', count: 1}, {id: 'chances', count: 1}, {id: 'time', count: 1},
 ]);
 assert.equal(reloaded.chanceCharges, 1);
 assert.equal(reloaded.timeItems, 2);
 assert.equal(reloaded.limitRings, 2);
 data = JSON.stringify({ timeItems: 2, limitRings: 2, itemLoadout: ['time', 'ring', 'time'] });
 reloaded.load();
 assert.deepEqual(reloaded.itemLoadout, [{id: 'time', count: 2}, {id: 'ring', count: 1}]);
 assert.equal(reloaded.timeItems, 2);
 assert.equal(reloaded.limitRings, 2);
});

test('entering a battle requires confirming equipment when an item is available', t => {
 const g = setup(t);
 g.campaign.completed = [1, 2];
 g.goToLobby();
 g.unpackItem(1);
 g.unpackItem(0);
 let entries = 0;
 const enter = () => { entries++; };
 g.requestBattleStart(enter);
 assert.equal(g.canConfirmBattleStart(), false);
 g.confirmBattleStart();
 assert.equal(entries, 0);
 assert.ok(g.packItem('time'));
 assert.equal(g.canConfirmBattleStart(), true);
 g.confirmBattleStart();
 g.confirmBattleStart();
 assert.equal(entries, 1);
 g.unpackItem(0);
 g.campaign.timeItems = 0;
 g.requestBattleStart(enter);
 assert.equal(g.canConfirmBattleStart(), true);
 g.cancelBattleStart();
 g.confirmBattleStart();
 assert.equal(entries, 1);
 g.requestBattleStart(enter);
 g.confirmBattleStart();
 assert.equal(entries, 2);
});

test('number shortcuts spend one copy without shifting the other item types', t => {
 const g = setup(t);
 g.goToLobby();
 g.campaign.supplies.healSmall = 1;
 g.campaign.supplies.manaSmall = 2;
 g.packItem('healSmall');
 g.packItem('manaSmall');
 g.restartLevel();
 const press = (code: string) => (g as any).handleKeyDown({code, key: code.slice(-1), preventDefault() {}});
 g.health -= 20;
 press('Digit2');
 assert.equal(g.campaign.supplies.healSmall, 0);
 assert.equal(g.canUseCarriedItem(0), true);
 assert.equal(g.canUseCarriedItem(1), false);
 press('Digit2');
 assert.equal(g.campaign.timeItems, 2);
 g.mana.value = 0;
 press('Numpad3');
 assert.equal(g.campaign.supplies.manaSmall, 1);
 assert.equal(g.health, g.maxHealth - 10);
 press('Digit1');
 assert.equal(g.campaign.timeItems, 1);
 assert.equal(g.canUseCarriedItem(0), true);
 press('Digit1');
 assert.equal(g.campaign.timeItems, 0);
});


test('battle preparation is hidden until trail two is completed, including on reload', t => {
 const g = setup(t);
 g.goToLobby();
 let entries = 0;
 for (const completed of [[], [1]]) {
  g.campaign.completed = completed;
  g.requestBattleStart(() => { entries++; });
  assert.equal(g.canConfirmBattleStart(), false);
 }
 assert.equal(entries, 2);
 g.campaign.completed = [1, 2];
 g.requestBattleStart(() => { entries++; });
 assert.equal(entries, 2);
 assert.equal(g.canConfirmBattleStart(), true);
 g.confirmBattleStart();
 assert.equal(entries, 3);
});
