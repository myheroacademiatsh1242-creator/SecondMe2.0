import type {ChestKind} from './ChestSprite.tsx';

/** Original 6×2 atlases, read left to right, then top to bottom. */
export const CHEST_SUMMON_ATLASES:Record<Exclude<ChestKind,'royal'>,{file:string;width:number;height:number}>={
  wood:{file:'wood',width:254,height:240},
  platinum:{file:'angel',width:298,height:212},
  crystal:{file:'immortal',width:278,height:244},
};
/** Royal uses the original red artwork rather than the silver atlas. */
export function royalSummonAssets(fire:boolean){return ['chest_closed.png','tanuki-crystal.png',`chest_${fire?'fire':'gold'}_opening.png`,`chest_${fire?'fire':'gold'}_open_loop.png`];}
// Key approaches, inserts, turns, unlocks, then the lid opens and treasure glows.
export const SUMMON_FRAME_MS=[280,240,210,260,215,200,180,150,160,170,180,660] as const;
export const SUMMON_DURATION_MS=SUMMON_FRAME_MS.reduce((sum,ms)=>sum+ms,0);
export const SUMMON_GEM_MS=SUMMON_FRAME_MS.slice(0,7).reduce((sum,ms)=>sum+ms,0);
export const SUMMON_LID_SECONDS=SUMMON_FRAME_MS.slice(7,11).reduce((sum,ms)=>sum+ms,0)/1000;
export const SUMMON_CHEST_MOTION_MS=SUMMON_FRAME_MS.slice(3).reduce((sum,ms)=>sum+ms,0);
export function summonFrameAt(elapsed:number){
  let end=0;
  for(let frame=0;frame<SUMMON_FRAME_MS.length;frame++){
    end+=SUMMON_FRAME_MS[frame];
    if(elapsed<end)return {frame,nextAt:end};
  }
  return {frame:11,nextAt:SUMMON_DURATION_MS};
}
