/** One source of truth for keyboard/mouse, Standard Gamepad buttons and touch layout. */
export const ACTIONS = {
 up:'Đi lên',down:'Đi xuống',left:'Đi trái',right:'Đi phải',attack:'Tấn công',skill:'Kỹ năng',ultimate:'Tuyệt kỹ',dodge:'Lướt né',record:'Ghi / lưu đường đi',summon:'Gọi Echo',recall:'Thu Echo',echoPause:'Dừng / phát Echo',swap:'Đổi chỗ Echo',mark:'Đánh dấu mục tiêu',item1:'Vật phẩm ô 1',item2:'Vật phẩm ô 2',item3:'Vật phẩm ô 3',time:'Bình thời gian',inventory:'Mở túi đồ',pause:'Tạm dừng / tiếp tục',retry:'Chơi lại màn',mute:'Bật / tắt âm thanh',fullscreen:'Toàn màn hình',guide:'Sổ tay'
} as const;
export type ControlAction=keyof typeof ACTIONS;
export const DEFAULT_KEYS:Record<ControlAction,string[]>={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],attack:['Mouse0'],skill:['Space','Mouse2'],ultimate:['KeyV','Mouse1'],dodge:['ShiftLeft','ShiftRight'],record:['KeyE'],summon:['KeyQ'],recall:['KeyX'],echoPause:['KeyC'],swap:['Shift+KeyQ'],mark:['Shift+Mouse0'],item1:['Digit1','Numpad1'],item2:['Digit2','Numpad2'],item3:['Digit3','Numpad3'],time:['KeyR'],inventory:['Tab'],pause:['Escape','KeyP'],retry:['KeyT'],mute:['KeyM'],fullscreen:['KeyF'],guide:['KeyH']};
export const DEFAULT_PAD:Partial<Record<ControlAction,number>>={attack:0,skill:2,dodge:1,ultimate:3,record:4,summon:5,echoPause:6,pause:9,inventory:8,recall:7,item1:12,item2:13,item3:14,swap:15,mark:10,guide:11};
export const TOUCH_PARTS={skills:'Cụm chiến đấu',joystick:'Joystick',echo:'Thanh Echo',items:'Ô vật phẩm'} as const;
export type TouchPart=keyof typeof TOUCH_PARTS;
export type TouchLayout=Record<TouchPart,{x:number;y:number;scale:number}>;
export interface ControlConfig{keys:Record<ControlAction,string[]>;pad:Partial<Record<ControlAction,number>>;touch:TouchLayout;deadzone:number}
export const freshControls=():ControlConfig=>({keys:structuredClone(DEFAULT_KEYS),pad:{...DEFAULT_PAD},touch:{skills:{x:0,y:0,scale:1},joystick:{x:0,y:0,scale:1},echo:{x:0,y:0,scale:1},items:{x:0,y:0,scale:1}},deadzone:.2});
export const CONTROL_KEY='second-me-controls-v1';
const all=Object.keys(ACTIONS) as ControlAction[];
export function validBinding(value:string){return /^(Shift\+)?(Key[A-XZ]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Space|Tab|Escape|ShiftLeft|ShiftRight|Mouse[012]|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash)$/.test(value);}
export function cleanControls(value:unknown):ControlConfig{
 const out=freshControls();if(!value||typeof value!=='object')return out;const v=value as Partial<ControlConfig>;
 if(v.keys&&typeof v.keys==='object'){
  const seen=new Set<string>();for(const a of all){const proposed=v.keys[a];const keys=Array.isArray(proposed)?proposed.filter((x):x is string=>typeof x==='string'&&validBinding(x)).slice(0,2):out.keys[a];
   const safe=[...new Set(keys.filter(x=>!seen.has(x)))];out.keys[a]=safe.length?safe:DEFAULT_KEYS[a].filter(x=>!seen.has(x));for(const k of out.keys[a])seen.add(k);
  }
  if(all.some(a=>!out.keys[a].length))out.keys=structuredClone(DEFAULT_KEYS);
 }
 if(v.pad&&typeof v.pad==='object'){out.pad={};const seen=new Set<number>();for(const a of all){const n=v.pad[a];if(Number.isInteger(n)&&n!>=0&&n!<=31&&!seen.has(n!)){out.pad[a]=n!;seen.add(n!);}}}
 if(v.touch&&typeof v.touch==='object')for(const part of Object.keys(TOUCH_PARTS) as TouchPart[]){const p=v.touch[part];if(p)for(const key of ['x','y','scale'] as const){const n=p[key];if(Number.isFinite(n))out.touch[part][key]=key==='scale'?Math.max(.7,Math.min(1.4,n)):Math.max(-25,Math.min(25,n));}}
 if(Number.isFinite(v.deadzone))out.deadzone=Math.max(.1,Math.min(.4,v.deadzone!));return out;
}
export class ControlStore{
 value=freshControls();revision=0;private listeners=new Set<()=>void>();capturing=false;
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>|null=typeof localStorage==='undefined'?null:localStorage){try{this.value=cleanControls(JSON.parse(storage?.getItem(CONTROL_KEY)??'null'));}catch{}}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};snapshot=()=>this.revision;
 private save(){try{this.storage?.setItem(CONTROL_KEY,JSON.stringify(this.value));}catch{}this.revision++;for(const f of this.listeners)f();}
 bind(action:ControlAction,binding:string,slot=0):string|null{
  if(!validBinding(binding))return 'Phím này được giữ cho trình duyệt, điều hướng hoặc dev mode.';
  const conflict=all.find(a=>a!==action&&this.value.keys[a].includes(binding));if(conflict)return `Đã dùng cho “${ACTIONS[conflict]}”. Hãy đổi phím đó trước.`;
  if(slot<0||slot>1)return 'Ô phím không hợp lệ.';this.value.keys[action][slot]=binding;this.value.keys[action]=[...new Set(this.value.keys[action].filter(Boolean))];this.save();return null;
 }
 bindPad(action:ControlAction,button:number):string|null{if(!Number.isInteger(button)||button<0||button>31)return 'Nút không hợp lệ.';const conflict=all.find(a=>a!==action&&this.value.pad[a]===button);if(conflict)return `Nút đã dùng cho “${ACTIONS[conflict]}”.`;this.value.pad[action]=button;this.save();return null;}
 clear(action:ControlAction,mode:'keys'|'pad',slot=1){if(mode==='pad')delete this.value.pad[action];else if(this.value.keys[action].length>1)this.value.keys[action].splice(slot,1);this.save();}
 touch(part:TouchPart,key:'x'|'y'|'scale',value:number){if(!Number.isFinite(value))return;this.value.touch[part][key]=key==='scale'?Math.max(.7,Math.min(1.4,value)):Math.max(-25,Math.min(25,value));this.save();}
 deadzone(value:number){if(!Number.isFinite(value))return;this.value.deadzone=Math.max(.1,Math.min(.4,value));this.save();}
 reset(){this.value=freshControls();this.save();}
}
export const controls=new ControlStore();
export function inputToken(code:string,shift=false){return (shift&&!['ShiftLeft','ShiftRight'].includes(code)?'Shift+':'')+code;}
export function actionForInput(code:string,shift=false,config=controls.value):ControlAction|null{
 const token=inputToken(code,shift);const exact=all.find(a=>config.keys[a].includes(token));if(exact)return exact;
 if(shift)return (['up','down','left','right'] as ControlAction[]).find(a=>config.keys[a].includes(code))??null;return null;
}
export function keyLabel(key:string){return key.replace('Shift+','Shift + ').replace(/^Key/,'').replace(/Key/g,'').replace(/Digit|Numpad/g,'').replace('Mouse0','Chuột trái').replace('Mouse1','Chuột giữa').replace('Mouse2','Chuột phải').replace('ShiftLeft','Shift trái').replace('ShiftRight','Shift phải').replace('ArrowUp','↑').replace('ArrowDown','↓').replace('ArrowLeft','←').replace('ArrowRight','→').replace('Escape','Esc');}
export function bindingLabel(action:ControlAction){return [...new Set(controls.value.keys[action].map(keyLabel))].join(' / ');}
export function touchVars(){const out:Record<string,string>={};for(const [part,p] of Object.entries(controls.value.touch)){out[`--touch-${part}-x`]=p.x+'vw';out[`--touch-${part}-y`]=p.y+'vh';out[`--touch-${part}-scale`]=String(p.scale);}return out;}

export function liveKeyLabel(label:string){const map:Record<string,ControlAction>={'E':'record','Q':'summon','X':'recall','C':'echoPause','Shift + Q':'swap','Shift+Q':'swap','Shift':'dodge','SHIFT':'dodge','Space / Chuột phải':'skill','Chuột phải / Space':'skill','Chuột phải / Phím Space':'skill','Chuột phải hoặc Space':'skill','Chuột trái':'attack','CHUỘT TRÁI':'attack','V / Chuột giữa':'ultimate','V / chuột giữa':'ultimate','R':'time','Tab':'inventory','Esc':'pause','Esc / P':'pause','T':'retry','M':'mute','F':'fullscreen'};if(map[label])return bindingLabel(map[label]);if(label==='1 / 2 / 3'||label==='1 – 3')return (['item1','item2','item3'] as ControlAction[]).map(bindingLabel).join(' · ');if(label.startsWith('WASD')||label.startsWith('W A S D'))return (['up','left','down','right'] as ControlAction[]).map(a=>keyLabel(controls.value.keys[a][0])).join(' ');return label;}
