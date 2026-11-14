/** Aha! Momentum: practice stays unlimited, wrong answers never remove earned XP. */
export const BASE_STEP_XP=25;
export const GUIDED_XP=10;
export const LESSON_BONUS_XP=35;
export const MAX_CHAIN=8;

export function momentumFromEvents(events=[]){
  let chain=0;
  for(const e of events){
    if(e.type!=='attempt') continue;
    if(e.mastered||(!('mastered' in e)&&e.correct)) chain=Math.min(MAX_CHAIN,chain+1);
    else if(e.choiceCorrect===false||(!('choiceCorrect' in e)&&e.correct===false)) chain=0;
  }
  return {chain,multiplier:Number((1+0.25*Math.min(chain,MAX_CHAIN)).toFixed(2)),percent:Math.round(Math.min(chain,MAX_CHAIN)/MAX_CHAIN*100)};
}

export function masteryReward(events=[]){
  const before=momentumFromEvents(events);
  const chain=Math.min(MAX_CHAIN,before.chain+1);
  const multiplier=1+0.25*chain;
  return {xp:Math.round(BASE_STEP_XP*multiplier),chain,multiplier};
}

export function earnedXp(events=[]){
  return events.reduce((sum,e)=>{
    if(e.type==='attempt'&&(e.mastered||(!('mastered' in e)&&e.correct))){
      return sum+(Number.isFinite(e.xpAwarded)?e.xpAwarded:BASE_STEP_XP);
    }
    if(e.type==='guided')return sum+(Number.isFinite(e.xpAwarded)?e.xpAwarded:GUIDED_XP);
    if(e.type==='complete'&&e.qualified!==false)return sum+(Number.isFinite(e.xpAwarded)?e.xpAwarded:LESSON_BONUS_XP);
    return sum;
  },0);
}
