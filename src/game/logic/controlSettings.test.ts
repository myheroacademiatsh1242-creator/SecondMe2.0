import test from 'node:test';
import assert from 'node:assert/strict';
import {ControlStore,controls,freshControls,cleanControls,actionForInput,bindingLabel,validBinding} from './controlSettings.ts';
import {GamepadDriver,stickAxis} from './gamepadControls.ts';
import {GameEngine} from '../GameEngine.ts';
import {sounds} from './sound.ts';sounds.setMuted(true);
const memory=()=>{let v='null';return {getItem:()=>v,setItem:(_k:string,x:string)=>{v=x;}};};
test('bindings save, reload, reject conflicts/system shortcuts and reset',()=>{
 const m=memory(),s=new ControlStore(m);assert.equal(s.bind('record','KeyK'),null);assert.equal(s.bind('recall','KeyK')?.includes('Đã dùng'),true);assert.ok(s.bind('record','KeyY'));assert.ok(s.bind('record','F5'));assert.ok(s.bind('record','Ctrl+KeyR'));
 const reload=new ControlStore(m);assert.deepEqual(reload.value.keys.record,['KeyK']);assert.equal(actionForInput('KeyE',false,reload.value),null);assert.equal(actionForInput('KeyK',false,reload.value),'record');reload.reset();assert.deepEqual(reload.value,freshControls());
});
test('malformed saved input is bounded and does not throw or create duplicate assignments',()=>{
 const value=cleanControls({keys:{record:['KeyQ','F12'],summon:['KeyQ']},touch:{skills:{x:Infinity,y:-200,scale:9}},pad:{attack:0,skill:0,dodge:99},deadzone:7});
 assert.equal(value.touch.skills.x,0);assert.equal(value.touch.skills.y,-25);assert.equal(value.touch.skills.scale,1.4);assert.equal(value.pad.skill,undefined);assert.equal(value.pad.dodge,undefined);assert.equal(value.deadzone,.4);
 const all=Object.values(value.keys).flat();assert.equal(new Set(all).size,all.length);
});
test('shift combos take precedence while movement still works with Shift held',()=>{
 assert.equal(actionForInput('KeyQ',true),'swap');assert.equal(actionForInput('KeyQ',false),'summon');assert.equal(actionForInput('KeyW',true),'up');assert.equal(actionForInput('Mouse0',true),'mark');assert.equal(actionForInput('ShiftLeft',true),'dodge');
});
test('touch positioning, sizes and gamepad settings persist within valid bounds',()=>{
 const m=memory(),s=new ControlStore(m);s.touch('skills','x',-12);s.touch('joystick','scale',1.3);assert.equal(s.bindPad('record',20),null);assert.ok(s.bindPad('recall',20));s.deadzone(.3);const next=new ControlStore(m);assert.equal(next.value.touch.skills.x,-12);assert.equal(next.value.touch.joystick.scale,1.3);assert.equal(next.value.pad.record,20);assert.equal(next.value.deadzone,.3);assert.equal(stickAxis(.1,.2),0);assert.equal(stickAxis(1,.2),1);assert.equal(stickAxis(NaN,.2),0);
});
function game(t:test.TestContext){
 const doc=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{dataset:{}},querySelector:()=>null}});t.after(()=>doc?Object.defineProperty(globalThis,'document',doc):Reflect.deleteProperty(globalThis,'document'));
 const initial=structuredClone(controls.value);t.after(()=>{controls.value=initial;controls.capturing=false;});controls.value=freshControls();const e=new GameEngine();e.currentLevelIdx=1;e.restartLevel();e.legTimeRemaining=null;return e;
}
function press(e:GameEngine,code:string,shiftKey=false,up=false){(e as any)[up?'handleKeyUp':'handleKeyDown']({code,key:code.startsWith('Key')?code.slice(3).toLowerCase():code,shiftKey,repeat:false,preventDefault(){}});}
test('purchases and consumables emit their own sound only after a successful action',t=>{
 const e=game(t),cues:string[]=[];t.mock.method(sounds,'playFeedback',(kind:string)=>{cues.push(kind);});
 e.screen='shop';e.campaign.coins=100;
 assert.ok(e.buyShopItem('manaLarge'));assert.deepEqual(cues,['purchase']);
 assert.equal(e.buyShopItem('manaLarge',0),false);assert.deepEqual(cues,['purchase']);
 assert.ok(e.campaign.packItem('manaLarge'));e.restartLevel();e.mana.value=0;
 assert.ok(e.useSupply('manaLarge'));assert.deepEqual(cues,['purchase','item']);
 assert.equal(e.useSupply('manaLarge'),false);e.pauseEcho();e.swapEcho();
 assert.deepEqual(cues,['purchase','item']);
});
test('five sound toggles unlock dev tools without changing normal mute behavior',t=>{
 const e=game(t);e.devUnlocked=false;
 const muted=sounds.getMuted();t.after(()=>sounds.setMuted(muted));
 for(let i=1;i<=4;i++){e.toggleAudio();assert.equal(e.devUnlocked,false);assert.equal(sounds.getMuted(),i%2?!muted:muted);}
 e.toggleAudio();assert.equal(e.devUnlocked,true);assert.equal(sounds.getMuted(),!muted);
 e.toggleAudio();assert.equal(e.devUnlocked,true);assert.equal(sounds.getMuted(),muted);
});
test('new keyboard keys drive real recording and movement, old keys no longer fire',t=>{
 const e=game(t);assert.equal(controls.bind('record','KeyK'),null);press(e,'KeyE');assert.equal(e.recorder.getStatus(),'idle');press(e,'KeyK');assert.equal(e.recorder.getStatus(),'recording');press(e,'KeyK');assert.equal(e.recorder.getStatus(),'recorded');
 assert.equal(controls.bind('right','KeyL'),null);const x=e.player.x;press(e,'KeyD');(e as any).update(.1);assert.equal(e.player.x,x);press(e,'KeyL');(e as any).update(.1);assert.ok(e.player.x>x);press(e,'KeyL',false,true);const next=e.player.x;(e as any).update(.1);assert.equal(e.player.x,next);assert.ok(bindingLabel('record').includes('K'));
});
test('capture mode suppresses every gameplay action including YYYY and clears drift',t=>{
 const e=game(t);controls.capturing=true;press(e,'KeyE');press(e,'KeyY');press(e,'KeyY');press(e,'KeyY');press(e,'KeyY');assert.equal(e.recorder.getStatus(),'idle');assert.equal(e.devUnlocked,false);e.performControl('attack');assert.equal(e.attackCooldown,0);
});
function pad(buttons:number[]=[],axes:number[]=[0,0,0,0]){return {id:'test standard controller',connected:true,mapping:'standard' as GamepadMappingType,axes,buttons:Array.from({length:32},(_,i)=>({pressed:buttons.includes(i),touched:buttons.includes(i),value:buttons.includes(i)?1:0}))};}
test('gamepad uses rising edges, new mappings, analog deadzone and disconnect cleanup',t=>{
 const e=game(t),driver=new GamepadDriver(e);driver.poll(pad([4]));assert.equal(e.recorder.getStatus(),'idle','held when first connected must not trigger');driver.poll(pad());driver.poll(pad([4]));assert.equal(e.recorder.getStatus(),'recording');driver.poll(pad([4]));assert.equal(e.recorder.getStatus(),'recording','holding does not toggle twice');
 driver.poll(pad());driver.poll(pad([4]));assert.equal(e.recorder.getStatus(),'recorded');assert.equal(controls.bindPad('record',20),null);driver.poll(pad());driver.poll(pad([4]));assert.equal(e.recorder.getStatus(),'recorded');driver.poll(pad([20]));assert.equal(e.recorder.getStatus(),'recording');driver.poll(pad([],[.1,0,0,0]));assert.equal(e.gamepadMove.x,0);driver.poll(pad([],[1,0,.8,0]));assert.equal(e.gamepadMove.x,1);driver.poll(null);assert.equal(e.gamepadMove.x,0);
});
test('mouse remapping removes the old attack binding and performs its replacement',t=>{
 const e=game(t);assert.equal(controls.bind('attack','KeyJ'),null);(e as any).canvas={width:1280,height:720,getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})};(e as any).handleCanvasMouseDown({button:0,clientX:800,clientY:400,preventDefault(){}});assert.equal(e.attackCooldown,0);press(e,'KeyJ');assert.ok(e.attackCooldown>0);
});

