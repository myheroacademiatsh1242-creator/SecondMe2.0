import {controls,type ControlAction} from './controlSettings.ts';
import type {GameEngine} from '../GameEngine.ts';
export function stickAxis(value:number,deadzone:number){if(!Number.isFinite(value)||Math.abs(value)<=deadzone)return 0;return Math.sign(value)*Math.min(1,(Math.abs(value)-deadzone)/(1-deadzone));}
export class GamepadDriver{
 private previous=new Set<number>();private id:string|null=null;
 constructor(private engine:GameEngine){}
 poll(pad:Pick<Gamepad,'id'|'mapping'|'buttons'|'axes'|'connected'>|null){
  if(!pad||!pad.connected||pad.mapping!=='standard'||controls.capturing){this.engine.setGamepadInput(0,0);this.previous.clear();this.id=null;return;}
  const pressed=new Set(pad.buttons.flatMap((b,i)=>b.pressed?[i]:[]));
  if(this.id!==pad.id){this.id=pad.id;this.previous=pressed;this.engine.setGamepadInput(0,0);return;}
  const rising=[...pressed].filter(i=>!this.previous.has(i));this.previous=pressed;
  const modal=typeof document==='undefined'?null:document.querySelector<HTMLElement>('.settings-panel,.mission-briefing,.pause-menu,.trail-inventory,.player-guide,.trading-confirm,.hero-upgrades[open]');
  if(modal){
   this.engine.setGamepadInput(0,0);
   if(modal.matches('.pause-menu')&&controls.value.pad.pause!==undefined&&rising.includes(controls.value.pad.pause)){this.engine.performControl('pause');return;}
   const buttons=Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b=>b.getClientRects().length>0);
   if(rising.some(i=>[12,13,14,15].includes(i))&&buttons.length){const index=buttons.indexOf(document.activeElement as HTMLButtonElement);const dir=rising.some(i=>i===12||i===14)?-1:1;buttons[(index+dir+buttons.length)%buttons.length]?.focus();}
   if(rising.includes(0)&&document.activeElement instanceof HTMLButtonElement&&modal.contains(document.activeElement))document.activeElement.click();
   return;
  }
  const playing=this.engine.screen==='playing'&&!this.engine.inventoryOpen&&!this.engine.runeEditing&&!this.engine.orientationBlocked&&!this.engine.bossIntroduction&&!this.engine.missionBriefing&&!this.engine.guides.blocking;
  if(playing){const d=controls.value.deadzone;const x=stickAxis(pad.axes[0]??0,d),y=stickAxis(pad.axes[1]??0,d);const length=Math.hypot(x,y);this.engine.setGamepadInput(length>1?x/length:x,length>1?y/length:y,stickAxis(pad.axes[2]??0,d),stickAxis(pad.axes[3]??0,d));}else this.engine.setGamepadInput(0,0);
  for(const [action,button] of Object.entries(controls.value.pad))if(rising.includes(button!))this.engine.performControl(action as ControlAction);
 }
 disconnect(){this.previous.clear();this.id=null;this.engine.setGamepadInput(0,0);}
}
export function startGamepadControls(engine:GameEngine){const driver=new GamepadDriver(engine);let timer:number;const read=()=>{if(document.hidden||!document.hasFocus()){driver.disconnect();return;}try{const pads=navigator.getGamepads?.()??[];driver.poll(Array.from(pads).find(p=>p?.connected&&p.mapping==='standard')??null);}catch{driver.disconnect();}};timer=window.setInterval(read,16);const blur=()=>driver.disconnect();window.addEventListener('blur',blur);return()=>{clearInterval(timer);window.removeEventListener('blur',blur);driver.disconnect();};}
