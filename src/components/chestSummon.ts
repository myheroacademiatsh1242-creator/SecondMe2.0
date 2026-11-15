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
export const SUMMON_FRAME_MS=[400,350,350,400,400,400,400,400,450,450,450,650] as const;
export const SUMMON_DURATION_MS=SUMMON_FRAME_MS.reduce((sum,ms)=>sum+ms,0);
export function summonFrameAt(elapsed:number){
  let end=0;
  for(let frame=0;frame<SUMMON_FRAME_MS.length;frame++){
    end+=SUMMON_FRAME_MS[frame];
    if(elapsed<end)return {frame,nextAt:end};
  }
  return {frame:11,nextAt:SUMMON_DURATION_MS};
}
