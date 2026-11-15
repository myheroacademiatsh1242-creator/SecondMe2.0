import {sounds} from './sound.ts';
import {controls} from './controlSettings.ts';

/** A single click event covers mouse, touch, keyboard and gamepad menu activation.
 * Defer until handlers finish so an action's own sound replaces the generic click. */
export function installUISounds(root:Document=document){
 const pending=new Set<ReturnType<typeof setTimeout>>();
 const click=(event:MouseEvent)=>{
  if(controls.capturing)return;
  const target=event.target;
  if(!(target instanceof Element))return;
  const button=target.closest('button,input[type="checkbox"],input[type="radio"],select');
  if(!button||button.matches(':disabled,[aria-disabled="true"]')||button.closest('[inert],.control-capture,.combat-action-bar,.touch-skills,.touch-echo-strip,.mobile-combat-items'))return;
  if(!button.closest('.adventure-app,.modal-backdrop,.trading-world,.player-guide-backdrop'))return;
  const revision=sounds.uiRevision;
  const timer=setTimeout(()=>{pending.delete(timer);if(sounds.uiRevision===revision&&!controls.capturing)sounds.playStoneClick();},0);
  pending.add(timer);
 };
 root.addEventListener('click',click,true);
 return()=>{root.removeEventListener('click',click,true);for(const timer of pending)clearTimeout(timer);pending.clear();};
}
