import {outfitSheet} from '../game/rendering/outfitSprites.ts';
import {drawWizardSprite} from '../game/rendering/wizardSprite.ts';
import {drawSoldierSprite} from '../game/rendering/soldierSprite.ts';
import {drawAssassinSprite} from '../game/rendering/assassinSprite.ts';
import type {Direction} from '../game/logic/types.ts';
import type {OutfitId} from '../game/logic/outfits.ts';
import { useEffect, useRef } from 'react';
import sprites from '../game/data/comboSprites.json';
import { COMBO_HITS } from '../game/logic/combo.ts';
type ComboHero = 'mage' | 'swordsman';
import { drawSantaHat, readySantaHat } from './HeroSantaHat.ts';

/** How much slower than in battle the showcase plays, so each swing can be followed. */
const SLOW = 1.35;
const IDLE_BEFORE = 0.55, REST_AFTER = 0.9;
const SHEETS = { swordsman: sprites.kael, mage: sprites.aeris };

/**
 * The loop: idle, the four hits, a rest. Frames are not evenly timed: the wind-up before the
 * hit frame and the hit frame itself hold longer, the swing between passes quickly, the last
 * frame settles; with only 3-6 drawn frames per hit, even timing reads as a slideshow.
 */
function timeline(hero: ComboHero) {
  const s = SHEETS[hero];
  const steps: { frame: number; dur: number }[] = [{ frame: s.anims.idle[0], dur: IDLE_BEFORE }];
  COMBO_HITS[hero].forEach(h => {
    const frames = (s.anims as Record<string,number[]>)[h.anim];
    frames.forEach((f, k) => {
      const weight = k === h.hitFrame ? 1.9 : k === h.hitFrame - 1 ? 1.25 : k === frames.length - 1 ? 1.4 : 0.75;
      steps.push({ frame: f, dur: h.frameTime * SLOW * weight * (h.heavy ? 1.15 : 1) });
    });
  });
  steps.push({ frame: s.anims.idle[0], dur: REST_AFTER });
  return steps;
}

const SIZE = 320;
const FLOOR = 280;
const HERO_HEIGHT = 190;
const COMBO_PREVIEW_ATLASES = {
  mage: {
    file:'aeris-combo-reference-matched.png', center:149, bodyHeight:222,
    rows:[{top:0,bottom:263,feet:246,crown:23},{top:263,bottom:523,feet:513,crown:30},{top:523,bottom:820,feet:791,crown:42}],
  },
  swordsman: {
    file:'kael-combo-reference-matched.png', center:155, bodyHeight:222,
    rows:[{top:0,bottom:295,feet:264,crown:42},{top:295,bottom:587,feet:553,crown:41},{top:587,bottom:887,feet:843,crown:48}],
  },
};
const CRIMSON_ATTACKS = [
  ['atk1a','atk1b'], ['atk2a','atk2b'], ['atk3a','atk3b'],
] as const;
const CRIMSON_SEQUENCE = CRIMSON_ATTACKS.flatMap(([windup,hit], index) => {
  const attack = COMBO_HITS.assassin[index];
  return [
    { pose:windup, column:index*2, dur:attack.frameTime * attack.hitFrame * SLOW },
    { pose:hit, column:index*2+1, dur:attack.frameTime * (attack.frames - attack.hitFrame) * SLOW },
  ];
});
const CRIMSON_DURATION=CRIMSON_SEQUENCE.reduce((sum,step)=>sum+step.dur,IDLE_BEFORE+REST_AFTER);
const CRIMSON_DIRECTIONS={down:0,left:1,up:2,right:3};
const SHEET_TIMELINES = {mage:timeline('mage'),swordsman:timeline('swordsman')};

type Scarf = {left:number; right:number; top:number; bottom:number; tipOnRight?:boolean};
type CrimsonCell = {center:number; feet:number; height:number; scarf:Scarf; neck?:number};
const CRIMSON_COMBO_CELLS: CrimsonCell[] = [
  {center:189,feet:338,height:317,scarf:{left:28,right:118,top:146,bottom:258}},
  {center:189,feet:340,height:317,scarf:{left:28,right:118,top:146,bottom:258}},
];
const CRIMSON_STANCE_CELLS: CrimsonCell[][] = [
  [
    {center:252,feet:421,height:400,neck:231,scarf:{left:41,right:171,top:158,bottom:310}},
    {center:169,feet:421,height:398,neck:227,scarf:{left:255,right:391,top:161,bottom:310,tipOnRight:true}},
    {center:226,feet:421,height:397,neck:227,scarf:{left:31,right:163,top:161,bottom:317}},
    {center:275,feet:421,height:398,neck:228,scarf:{left:48,right:184,top:161,bottom:310}},
  ],
  [
    {center:252,feet:419,height:400,neck:229,scarf:{left:38,right:171,top:162,bottom:307}},
    {center:170,feet:419,height:400,neck:226,scarf:{left:253,right:392,top:164,bottom:307,tipOnRight:true}},
    {center:226,feet:419,height:400,neck:224,scarf:{left:34,right:163,top:164,bottom:313}},
    {center:266,feet:419,height:400,neck:227,scarf:{left:48,right:184,top:162,bottom:306}},
  ],
];

/** Keep the knot fixed and give the loose end a few pixels of vertical follow-through. */
function swayScarf(original:ImageData, animated:ImageData, time:number, amplitude:number, tipOnRight=false) {
  const {width,height,data}=original;
  for(let x=0;x<width;x++){
    const distance=(tipOnRight?x:width-1-x)/width;
    const wave=Math.sin(time*5-distance*2.5)*amplitude*distance**1.5;
    for(let y=0;y<height;y++){
      const taper=Math.min(1,y/10,(height-1-y)/10);
      const sourceY=y-Math.round(wave*taper);
      const sourceIndex=(sourceY*width+x)*4;
      const index=(y*width+x)*4;
      animated.data[index]=data[sourceIndex];
      animated.data[index+1]=data[sourceIndex+1];
      animated.data[index+2]=data[sourceIndex+2];
      animated.data[index+3]=data[sourceIndex+3];
    }
  }
}

function visibleBounds(ctx: CanvasRenderingContext2D, width: number, height: number, crisp = false) {
  const data = ctx.getImageData(0, 0, width, height);
  let left=width, top=height, right=0, bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const offset=(y*width+x)*4+3;
    const opaque=data.data[offset]>=180;
    if(crisp)data.data[offset]=opaque?255:0;
    if(!opaque)continue;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
  }
  if(crisp)ctx.putImageData(data,0,0);
  return right>left&&bottom>top?{left,top,right,bottom}:null;
}

type PreviewHero = ComboHero | 'assassin';

/** Crimson's Christmas-outfit sneeze (tools/assets/make_crimson_sneeze.py): cold, inhale, sneeze, sniffle. */
const SNEEZE_STEPS = [0.9, 1.4, 1.85, 2.4] as const;

export function HeroStagePreview({hero,outfit,direction,combo,reducedMotion=false,winter=false,sneeze=false}:{
  hero:PreviewHero;outfit?:OutfitId;direction:Direction;combo:boolean;reducedMotion?:boolean;winter?:boolean;
  /** Play the sneeze once (Crimson in her Christmas outfit, facing the viewer). */
  sneeze?:boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sneezeAt = useRef<number|null>(null);
  useEffect(() => { sneezeAt.current = sneeze ? performance.now() : null; }, [sneeze]);
  useEffect(() => {
    const ctx=canvas.current?.getContext('2d',{willReadFrequently:hero==='assassin'});
    const scratch=document.createElement('canvas');
    scratch.width=scratch.height=280;
    const source=scratch.getContext('2d',{willReadFrequently:true});
    if(!ctx||!source)return;
    ctx.imageSmoothingEnabled=false;
    const atlas=hero==='assassin'?null:COMBO_PREVIEW_ATLASES[hero];
    const steps=hero==='assassin'?null:SHEET_TIMELINES[hero];
    const image=new Image();
    if(combo&&atlas)image.src=`${import.meta.env.BASE_URL}assets/combat/${atlas.file}`;
    const crimsonIdle=new Image(),crimsonCombo=new Image(),crimsonSneeze=new Image();
    if(hero==='assassin'&&outfit==='frost'&&!combo&&!reducedMotion)crimsonSneeze.src=`${import.meta.env.BASE_URL}assets/combat/crimson-winter-sneeze.png`;
    if(hero==='assassin'){
      crimsonIdle.src=`${import.meta.env.BASE_URL}assets/combat/crimson-stance-reference-matched.png`;
      if(combo&&!reducedMotion)crimsonCombo.src=`${import.meta.env.BASE_URL}assets/combat/crimson-combo-reference-matched.png`;
    }
    let frameId=0;
    let started:number|undefined;
    let previous='';
    let crimsonScale:number|undefined;
    let scarfFrame:{x:number;y:number;original:ImageData;animated:ImageData;tipOnRight?:boolean}|undefined;
    let scarfTick=-1;
    const paintPortrait=(pose?:typeof CRIMSON_SEQUENCE[number]['pose']) => {
      source.setTransform(1,0,0,1,0,0);
      source.clearRect(0,0,280,280);
      source.setTransform(4,0,0,4,0,0);
      source.imageSmoothingEnabled=false;
      const facing=combo?'down':direction;
      const baseline=winter?66:55;
      if(hero==='mage')drawWizardSprite(source,35,baseline,facing,false,false,0,outfit);
      else if(hero==='swordsman')drawSoldierSprite(source,35,baseline,facing,false,false,0,false,0,outfit);
      else drawAssassinSprite(source,35,58,facing,false,0,false,outfit,1,pose);
      const body=visibleBounds(source,280,280,hero==='assassin');
      if(!body)return false;
      let bounds=body;
      if(winter&&hero!=='assassin'&&readySantaHat()){
        if(hero==='mage')drawSantaHat(source,35,facing==='up'?22:19,34,facing==='left');
        else drawSantaHat(source,37,facing==='up'?21:18,28,facing==='left');
        bounds=visibleBounds(source,280,280)??body;
      }
      const bodyHeight=body.bottom-body.top,height=bounds.bottom-bounds.top;
      const scale=pose?(crimsonScale??=HERO_HEIGHT/bodyHeight):HERO_HEIGHT/bodyHeight;
      const w=Math.round((bounds.right-bounds.left)*scale),h=Math.round(height*scale);
      ctx.clearRect(0,0,SIZE,SIZE);
      ctx.drawImage(scratch,bounds.left,bounds.top,bounds.right-bounds.left,height,Math.round((SIZE-w)/2),FLOOR-h,w,h);
      return true;
    };
    const drawCrimsonCell=(sheet:HTMLImageElement, columns:number, column:number, row:number, cell:CrimsonCell) => {
      if(!sheet.naturalWidth)return false;
      const left=Math.round(column*sheet.naturalWidth/columns),right=Math.round((column+1)*sheet.naturalWidth/columns);
      const top=Math.round(row*sheet.naturalHeight/2),bottom=Math.round((row+1)*sheet.naturalHeight/2);
      const scale=HERO_HEIGHT/cell.height;
      const neck=cell.neck??0;
      const scaleX=cell.neck?scale*1.15:scale;
      // Match the attack sprites' head-to-body ratio using the existing turn art.
      const bodyHeight=cell.feet-neck;
      const bodyScale=cell.neck?(HERO_HEIGHT*.4)/bodyHeight:scale;
      const headScale=cell.neck?(HERO_HEIGHT*.6)/(cell.height-bodyHeight):scale;
      const toX=(at:number)=>Math.round(SIZE/2+(at-cell.center)*scaleX);
      const toY=(at:number)=>Math.round(FLOOR-bodyHeight*bodyScale+(at-neck)*(at<neck?headScale:bodyScale));
      const x=toX(0),width=toX(right-left)-x;
      const drawBand=(from:number,to:number)=>{
        const y=toY(from);
        ctx.drawImage(sheet,left,top+from,right-left,to-from,x,y,width,toY(to)-y);
      };
      ctx.clearRect(0,0,SIZE,SIZE);
      if(neck)drawBand(0,neck);
      drawBand(neck,bottom-top);
      if(!reducedMotion){
        const scarf=cell.scarf;
        const scarfX=toX(scarf.left),scarfY=toY(scarf.top);
        const original=ctx.getImageData(scarfX,scarfY,toX(scarf.right)-scarfX,toY(scarf.bottom)-scarfY);
        scarfFrame={x:scarfX,y:scarfY,original,animated:ctx.createImageData(original),tipOnRight:scarf.tipOnRight};
        scarfTick=-1;
      }
      return true;
    };
    const paintComboFrame=(index:number) => {
      if(index===0)return paintPortrait();
      if(!atlas||hero==='assassin'||!image.complete||!image.naturalWidth||(winter&&!readySantaHat()))return false;
      const recolored=outfitSheet(image,hero,outfit);
      const column=index%6,row=atlas.rows[Math.floor(index/6)];
      const left=Math.round(column*image.naturalWidth/6);
      const right=Math.round((column+1)*image.naturalWidth/6);
      const scale=HERO_HEIGHT/atlas.bodyHeight;
      const x=Math.round(SIZE/2-atlas.center*scale);
      const y=Math.round(FLOOR-(row.feet-row.top)*scale);
      ctx.clearRect(0,0,SIZE,SIZE);
      ctx.drawImage(recolored,left,row.top,right-left,row.bottom-row.top,x,y,
        Math.round((right-left)*scale),Math.round((row.bottom-row.top)*scale));
      if(winter)drawSantaHat(ctx,SIZE/2,y+row.crown*scale,88*scale);
      return true;
    };
    const frame=(now:number)=>{
      started??=now;
      const elapsed=(now-started)/1000;
      if(hero==='assassin'){
        const row=outfit==='frost'?1:0;
        let time=elapsed%CRIMSON_DURATION-IDLE_BEFORE;
        const attack=combo&&!reducedMotion&&time>=0?CRIMSON_SEQUENCE.find(step=>{time-=step.dur;return time<0;}):undefined;
        const column=attack?.column??CRIMSON_DIRECTIONS[combo?'down':direction];
        // The sneeze replaces the front stance while it plays (Christmas outfit only).
        const since=sneezeAt.current===null?-1:(now-sneezeAt.current)/1000;
        const sneezeStep=!attack&&row===1&&column===0&&since>=0?SNEEZE_STEPS.findIndex(end=>since<end):-1;
        const sneezing=sneezeStep>=0&&crimsonSneeze.naturalWidth>0;
        const sheet=sneezing?crimsonSneeze:attack?crimsonCombo:crimsonIdle;
        const key=sneezing?`sneeze-${sneezeStep}`:`${attack?'attack':'stance'}-${column}`;
        if(previous!==key){
          const cell=attack?CRIMSON_COMBO_CELLS[row]:CRIMSON_STANCE_CELLS[row][column];
          if(drawCrimsonCell(sheet,attack?6:4,sneezing?sneezeStep:column,row,cell))previous=key;
          else if(previous!==`fallback-${key}`&&paintPortrait(attack?.pose)){
            scarfFrame=undefined;
            previous=`fallback-${key}`;
          }
        }
        const tick=Math.floor(elapsed*18);
        if(scarfFrame&&tick!==scarfTick){
          swayScarf(scarfFrame.original,scarfFrame.animated,tick/18,attack?10:7,scarfFrame.tipOnRight);
          ctx.putImageData(scarfFrame.animated,scarfFrame.x,scarfFrame.y);
          scarfTick=tick;
        }
        if(reducedMotion&&previous===key)return;
      }else if(!combo||reducedMotion){
        if(paintPortrait()&&(!winter||readySantaHat()))return;
      }else if(steps){
        const duration=steps.reduce((sum,step)=>sum+step.dur,0);
        let time=elapsed%duration;
        const step=steps.find(step=>{time-=step.dur;return time<0;})??steps[0];
        const key=String(step.frame);
        if(previous!==key){
          if(paintComboFrame(step.frame))previous=key;
          else if(!previous)paintPortrait();
        }
      }
      frameId=requestAnimationFrame(frame);
    };
    frameId=requestAnimationFrame(frame);
    // The stage hero is painted once and then left alone, so if the browser drops the canvas (a hidden
    // window or tab can lose its 2D canvas to free memory) it would stay blank. Repaint from scratch
    // when the canvas comes back or the page is shown again.
    const repaint=()=>{
      if(document.visibilityState==='hidden')return;
      previous='';scarfFrame=undefined;scarfTick=-1;
      cancelAnimationFrame(frameId);frameId=requestAnimationFrame(frame);
    };
    const element=canvas.current;
    element?.addEventListener('contextrestored',repaint);
    document.addEventListener('visibilitychange',repaint);
    window.addEventListener('focus',repaint);
    return ()=>{
      cancelAnimationFrame(frameId);
      element?.removeEventListener('contextrestored',repaint);
      document.removeEventListener('visibilitychange',repaint);
      window.removeEventListener('focus',repaint);
    };
  },[hero,outfit,direction,combo,reducedMotion,winter]);
  return <canvas ref={canvas} width={SIZE} height={SIZE} aria-hidden="true"/>;
}
