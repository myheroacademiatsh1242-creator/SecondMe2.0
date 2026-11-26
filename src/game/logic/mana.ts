export const MAX_MP=100;
export const maxMana=(hero:string)=>hero==='mage'?120:MAX_MP;
export const MP_REGEN_PER_SECOND=5;
export const MP_REGEN_DELAY=2;
/** MP per combo hit. A full ranged combo costs 36 MP, a melee combo 31 MP and Crimson's three-dart combo 22 MP. */
export const COMBO_MP={swordsman:[0,6,9,16],mage:[0,8,11,17],assassin:[0,6,16]} as const;
export const comboManaCost=(hero:keyof typeof COMBO_MP,step:number)=>COMBO_MP[hero][step]??0;
export const skillManaCost=(hero:string)=>hero==='assassin'?26:hero==='mage'?24:30;
export class ManaPool {
 value:number;
 constructor(private capacity:()=>number=()=>MAX_MP){this.value=this.max;}
 get max(){return this.capacity();}
 private delay=0;
 reset(){this.value=this.max;this.delay=0;}
 spend(cost:number){if(cost<0||!Number.isFinite(cost)||this.value+1e-6<cost)return false;if(cost>0){this.value=Math.max(0,this.value-cost);this.delay=MP_REGEN_DELAY;}return true;}
 update(dt:number){const elapsed=Math.max(0,dt),regenTime=Math.max(0,elapsed-this.delay);this.delay=Math.max(0,this.delay-elapsed);this.value=Math.min(this.max,this.value+regenTime*MP_REGEN_PER_SECOND);}
}
