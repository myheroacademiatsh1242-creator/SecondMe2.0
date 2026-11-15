export interface GuideProgress {completed:readonly number[];bossDefeated:boolean}
/** Guide access follows the saved campaign, independently of read marks or dev access. */
export function guidePageUnlocked(section:string,page:string,progress?:GuideProgress){
 if(section!=='levels')return true;
 const level=page==='boss-guardian'?6:page==='boss-demon'?13:/^level-\d+$/.test(page)?Number(page.slice(6)):0;
 if(level<1||level>13)return false;
 if(level===1)return true;
 for(let id=1;id<Math.min(level,6);id++)if(!progress?.completed.includes(id))return false;
 if(level>=7){
  if(!progress?.bossDefeated)return false;
  for(let id=7;id<level;id++)if(!progress.completed.includes(id))return false;
 }
 return true;
}
