export const MAX_MP=100;
export const MP_REGEN_PER_SECOND=5;
export const MP_REGEN_DELAY=2;
/** MP per combo hit (index = hit). Aeris's ranged combo costs more than Kael's: she was too strong (a full
 *  combo 50 MP, so two from a full pool, against Kael's 31). */
export const COMBO_MP={swordsman:[0,6,9,16],mage:[0,10,15,25]} as const;
export const comboManaCost=(hero:keyof typeof COMBO_MP,step:number)=>COMBO_MP[hero][step]??0;
export const skillManaCost=(hero:string)=>hero==='mage'?40:30;
export class ManaPool {
 value=MAX_MP;
 private delay=0;
 reset(){this.value=MAX_MP;this.delay=0;}
 spend(cost:number){if(cost<0||!Number.isFinite(cost)||this.value+1e-6<cost)return false;if(cost>0){this.value=Math.max(0,this.value-cost);this.delay=MP_REGEN_DELAY;}return true;}
 update(dt:number){const elapsed=Math.max(0,dt),regenTime=Math.max(0,elapsed-this.delay);this.delay=Math.max(0,this.delay-elapsed);this.value=Math.min(MAX_MP,this.value+regenTime*MP_REGEN_PER_SECOND);}
}
