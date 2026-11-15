import test from 'node:test';
import assert from 'node:assert/strict';
import {sounds} from './sound.ts';
import {controls} from './controlSettings.ts';
import {installUISounds} from './uiSounds.ts';

test('combat uses synth fallback only when a sample is unavailable and honors mute',t=>{
 const audio=sounds as any;const old={sample:audio.sample,stone:audio.stoneHit,tone:audio.threatGrowl,muted:sounds.getMuted()};
 t.after(()=>{audio.sample=old.sample;audio.stoneHit=old.stone;audio.threatGrowl=old.tone;sounds.setMuted(old.muted);});
 let samples=0,synths=0,available=false;
 audio.sample=()=>{samples++;return available;};audio.stoneHit=audio.threatGrowl=()=>synths++;
 sounds.setMuted(false);sounds.playSlash();sounds.playSpell();sounds.playDodge();assert.equal(samples,3);assert.equal(synths,3);
 available=true;sounds.playSlash();sounds.playSpell();sounds.playDodge();assert.equal(samples,6);assert.equal(synths,3);
 sounds.setMuted(true);sounds.playSlash();sounds.playSpell();sounds.playDodge();assert.equal(samples,6);assert.equal(synths,3);
});

test('every new action cue honors mute and marks its own UI feedback',t=>{
 const audio=sounds as any,old=audio.threatGrowl,muted=sounds.getMuted();let tones=0;
 audio.threatGrowl=()=>tones++;t.after(()=>{audio.threatGrowl=old;sounds.setMuted(muted);});
 const kinds=['item','time','echoPause','swap','mark','purchase','upgrade','rune'] as const;
 const revision=sounds.uiRevision;sounds.setMuted(false);for(const kind of kinds)sounds.playFeedback(kind);
 assert.equal(tones,8);assert.equal(sounds.uiRevision,revision+8);
 sounds.setMuted(true);for(const kind of kinds)sounds.playFeedback(kind);assert.equal(tones,8);
});

test('UI feedback survives stopped bubbling, avoids duplicate action sounds and cleans up',async t=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'Element');
 let excluded=false,disabled=false;
 class FakeElement{
  closest(selector:string):any{
   if(selector.startsWith('button,'))return this;
   if(selector.startsWith('[inert]'))return excluded?this:null;
   return this;
  }
  matches(){return disabled;}
 }
 Object.defineProperty(globalThis,'Element',{configurable:true,value:FakeElement});
 const audio=sounds as any,old=audio.stoneHit,muted=sounds.getMuted();let clicks=0;audio.stoneHit=()=>clicks++;sounds.setMuted(false);
 t.after(()=>{audio.stoneHit=old;sounds.setMuted(muted);controls.capturing=false;descriptor?Object.defineProperty(globalThis,'Element',descriptor):Reflect.deleteProperty(globalThis,'Element');});
 let listener:((e:any)=>void)|undefined;let removed=false;
 const root={addEventListener:(_name:string,fn:any)=>listener=fn,removeEventListener:(_name:string,fn:any)=>{removed=fn===listener;}} as unknown as Document;
 const dispose=installUISounds(root);const click=()=>listener!({target:new FakeElement()});
 click();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,1);
 click();sounds.playStoneClick();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,2,'no second generic sound after a menu-specific click');
 click();sounds.playFeedback('purchase');await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,2,'purchase cue replaces generic click');
 excluded=true;click();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,2);excluded=false;
 disabled=true;click();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,2);disabled=false;
 controls.capturing=true;click();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(clicks,2);
 dispose();assert.ok(removed);
});
