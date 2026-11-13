import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {Campaign} from './campaign.ts';
import {ECHO_RUNES} from './echoRunes.ts';
import {GameEngine} from '../GameEngine.ts';
function storage(t:TestContext){const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),map=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)}});t.after(()=>old?Object.defineProperty(globalThis,'localStorage',old):Reflect.deleteProperty(globalThis,'localStorage'));return map;}
test('loadout picks any owned rune but rejects duplicates and a fifth slot',()=>{
 const c=new Campaign();c.echoRunes=Object.fromEntries(ECHO_RUNES.map(r=>[r.id,2]));
 assert.equal(ECHO_RUNES.length,12);
 for(let i=0;i<4;i++)assert.ok(c.setRuneSlot(i,ECHO_RUNES[i].id));
 const before=[...c.runeLoadout],stock={...c.echoRunes};
 assert.equal(c.setRuneSlot(4,'call'),false);assert.equal(c.setRuneSlot(1,'call'),false);
 assert.ok(c.setRuneSlot(0,'cleave'));assert.equal(c.runeLoadout[0],'cleave');assert.ok(c.setRuneSlot(0,before[0]));
 assert.ok(c.setRuneSlot(3,null));assert.ok(c.setRuneSlot(3,before[3]));assert.deepEqual(c.runeLoadout,before);
 for(const r of ECHO_RUNES)assert.equal(c.echoRunes[r.id],stock[r.id]);
});
test('old stock and pending rewards retain their original types',t=>{
 const m=storage(t);m.set('second-me-campaign-v3',JSON.stringify({echoRunes:{call:1,lure:2,rapid:3,vamp:4,anchor:5},runeLoadout:['lure','power','call','vamp','guard'],pendingRuneChoices:['rapid','vamp','anchor']}));
 const c=new Campaign();c.load();assert.deepEqual(c.echoRunes,{call:1,lure:2,rapid:3,vamp:4,anchor:5});
 assert.deepEqual(c.runeLoadout,['lure','power','call','vamp']);assert.equal(c.pendingRuneChoices.length,3);
 assert.ok(c.pendingRuneChoices.every(id=>ECHO_RUNES.some(r=>r.id===id)));assert.ok(c.chooseRune(c.pendingRuneChoices[0]));
 c.save();const reload=new Campaign();reload.load();assert.deepEqual(reload.echoRunes,c.echoRunes);
 while(c.runeLoadout.length)c.setRuneSlot(0,null);const empty=new Campaign();empty.load();assert.deepEqual(empty.runeLoadout,[]);
});
test('rewards add to stock even when all four slots are full',()=>{
 const c=new Campaign();for(const r of ECHO_RUNES){c.pendingRuneChoices=[r.id];assert.ok(c.chooseRune(r.id));}
 const before=[...c.runeLoadout];c.pendingRuneChoices=['power','guard','restore'];assert.ok(c.chooseRune('power'));assert.deepEqual(c.runeLoadout,before);assert.equal(c.echoRunes.power,2);
 c.pendingRuneChoices=['cleave'];assert.equal(c.chooseRune('cleave'),true);assert.equal(c.echoRunes.cleave,2);assert.deepEqual(c.runeLoadout,before);
 c.reset();assert.deepEqual(c.runeLoadout,[]);
});
test('editing freezes combat and timers, leaves active buffs intact, then gameplay resumes',t=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}}}});t.after(()=>old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document'));
 const g=new GameEngine();g.currentLevelIdx=1;g.restartLevel();g.tutorialEnabled=false;g.campaign.echoRunes.guard=2;g.activeEchoRunes.add('guard');const time=g.legTimeRemaining;
 g.setRuneEditing(true);(g as any).update(1);assert.equal(g.legTimeRemaining,time);assert.ok(g.setRuneSlot(0,'guard'));assert.ok(g.activeEchoRunes.has('guard'));assert.equal(g.campaign.echoRunes.guard,2);assert.equal(g.useEchoRune('guard'),false);
 g.setRuneEditing(false);(g as any).update(.1);assert.ok(g.legTimeRemaining!<time!);
});
