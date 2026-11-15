/** V3.7 learning mechanics: pure local-state helpers with idempotent rewards. */
export const AHA_BONUS_XP = 20;
export const MUSEUM_BONUS_XP = 15;
export const QUEST_BONUS_XP = 12;
export const QUEST_DEFINITIONS = Object.freeze({
  start: {title:'Start a curious adventure',detail:'Open a guided lesson today.',icon:'✦',type:'start'},
  master: {title:'One thoughtful win',detail:'Master one step by explaining why.',icon:'✳',type:'attempt'},
  finish: {title:'Finish the journey',detail:'Complete a guided lesson, at your pace.',icon:'★',type:'complete'},
  aha: {title:'Catch an Aha! moment',detail:'Reflect on what clicked after a lesson.',icon:'💡',type:'aha'},
  review: {title:'Polish an old mistake',detail:'Resolve one Mistake Museum review.',icon:'◆',type:'mistake_resolved'},
});
export const dateKey=(date=new Date())=>{
 const d=new Date(date);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export function makeQuestPlan(day, mistakes=[], sessions=[]) {
 const unfinished=(mistakes||[]).some(m=>m.status!=='resolved');
 const completed=(sessions||[]).some(s=>s.completed);
 return {day,ids:['master','finish',unfinished?'review':completed?'aha':'start']};
}
export function questCount(events=[],day,questId){
 return events.filter(e=>dateKey(e.at)===day && (
  questId==='master' ? e.type==='attempt'&&(e.mastered||(!('mastered' in e)&&e.correct)) :
  e.type===QUEST_DEFINITIONS[questId]?.type
 )).length;
}
export function awardCompletedQuests(data,day){
 const plan=data.questPlan;
 if(!plan||plan.day!==day||!Array.isArray(plan.ids))return data;
 const events=data.events||[];
 const claimed=new Set(events.filter(e=>e.type==='quest_reward'&&e.questDay===day).map(e=>e.questId));
 const fresh=plan.ids.filter(id=>QUEST_DEFINITIONS[id]&&!claimed.has(id)&&questCount(events,day,id)>0);
 if(!fresh.length)return data;
 const at=new Date().toISOString();
 return {...data,events:[...events,...fresh.map(id=>({id:`quest:${day}:${id}`,type:'quest_reward',questDay:day,questId:id,at,xpAwarded:QUEST_BONUS_XP,rockFragments:1}))].slice(-4000)};
}
export function questStatus(plan,events=[]){
 if(!plan)return [];
 return plan.ids.filter(id=>QUEST_DEFINITIONS[id]).map(id=>({
  id,...QUEST_DEFINITIONS[id],complete:questCount(events,plan.day,id)>0,
  claimed:events.some(e=>e.type==='quest_reward'&&e.questDay===plan.day&&e.questId===id),
 }));
}
export function rockFragments(events=[]){return events.filter(e=>e.type==='quest_reward'||e.type==='mistake_resolved').reduce((sum,e)=>sum+(e.rockFragments||0),0);}
export function mistakeFromAttempt({lessonId,stepIndex,lesson,step,choice,reason,feedback}){
 return {
  id:`${lessonId}:${stepIndex}`,
  lessonId,stepIndex,subject:String(lesson.subject||'Learning').slice(0,100),
  concept:String(step.concept||'Another idea').slice(0,160),
  question:String(step.question||'').slice(0,1200),
  originalAnswer:String(step.options?.[choice]?.label||'').slice(0,500),
  originalReason:String(reason||'').slice(0,1600),
  misconception:String(feedback.message||'').slice(0,500),
  takeaway:String(step.takeaway||step.explanation||'').slice(0,650),
  status:'open',createdAt:new Date().toISOString(),
 };
}
/** One card per lesson step, not one per attempt; don't reopen a mastered card. */
export function upsertMistake(mistakes=[],item){
 if(mistakes.some(m=>m.id===item.id))return mistakes;
 return [item,...mistakes].slice(0,120);
}
export function completeAha(data,lessonId,text,assessment){
 const original=data.sessions.find(s=>s.id===lessonId);
 if(!original||!original.completed)return data;
 const rewarded=Boolean(original.reflection?.rewarded || data.events.some(e=>e.type==='aha'&&e.lessonId===lessonId));
 const reflection={text,at:new Date().toISOString(),understood:Boolean(assessment.understood),
  feedback:String(assessment.feedback||'').slice(0,400),followUp:String(assessment.followUp||'').slice(0,320),rewarded:rewarded||Boolean(assessment.understood)};
 const sessions=data.sessions.map(s=>s.id===lessonId?{...s,reflection}:s);
 const extra=assessment.understood&&!rewarded?[{id:`aha:${lessonId}`,type:'aha',lessonId,at:reflection.at,xpAwarded:AHA_BONUS_XP}]:[];
 return {...data,sessions,events:[...data.events,...extra].slice(-4000)};
}
export function completeMistake(data,mistakeId){
 const current=data.mistakes?.find(m=>m.id===mistakeId);
 if(!current||current.status==='resolved')return data;
 const at=new Date().toISOString();
 return {...data,
  mistakes:data.mistakes.map(m=>m.id===mistakeId?{...m,status:'resolved',resolvedAt:at}:m),
  events:[...data.events,{id:`mistake-resolved:${mistakeId}`,type:'mistake_resolved',mistakeId,at,xpAwarded:MUSEUM_BONUS_XP,rockFragments:1}].slice(-4000),
 };
}
