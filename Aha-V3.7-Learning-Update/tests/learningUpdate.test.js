import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,makeQuestPlan,awardCompletedQuests,questStatus,upsertMistake,completeAha,completeMistake} from '../src/learningUpdate.js';
test('quest plan works for a fresh learner, existing lessons and mistakes',()=>{
 assert.deepEqual(makeQuestPlan('2026-11-14').ids,['master','finish','start']);
 assert.equal(makeQuestPlan('2026-11-14',[],[{completed:true}]).ids[2],'aha');
 assert.equal(makeQuestPlan('2026-11-14',[{status:'open'}]).ids[2],'review');
});
test('daily quest rewards settle exactly once',()=>{
 const today=dateKey();const state={questPlan:makeQuestPlan(today),events:[{type:'start',at:new Date().toISOString()}]};
 const once=awardCompletedQuests(state,today);assert.equal(once.events.length,2);
 assert.equal(awardCompletedQuests(once,today),once);
 assert.equal(questStatus(once.questPlan,once.events).filter(q=>q.claimed).length,1);
});
test('Aha reflection reward cannot be claimed more than once',()=>{
 const session={id:'lesson-1',completed:true};const state={sessions:[session],events:[]};
 const once=completeAha(state,'lesson-1','gravity pulls down',{understood:true,feedback:'Yes',followUp:''});
 const twice=completeAha(once,'lesson-1','some different answer',{understood:true,feedback:'Yes',followUp:''});
 assert.equal(twice.events.filter(e=>e.type==='aha').length,1);
 assert.equal(twice.sessions[0].reflection.rewarded,true);
});
test('mistake resolution is idempotent and de-duplicates the cards',()=>{
 const item={id:'1:0',status:'open'};
 assert.equal(upsertMistake([item],item).length,1);
 const once=completeMistake({mistakes:[item],events:[]},item.id);
 assert.equal(completeMistake(once,item.id),once);
 assert.equal(once.events[0].xpAwarded,15);
});
test('XP includes reflection, museum and quest rewards without touching momentum chain',async()=>{
 const {earnedXp,momentumFromEvents}=await import('../src/momentum.js');
 const events=[{type:'aha',xpAwarded:20},{type:'mistake_resolved',xpAwarded:15},{type:'quest_reward',xpAwarded:12,rockFragments:1}];
 assert.equal(earnedXp(events),47);
 assert.equal(momentumFromEvents(events).chain,0);
});
test('already rewarded reflections remain one-time even if old events were trimmed',()=>{
 const state={sessions:[{id:'lesson-1',completed:true,reflection:{rewarded:true}}],events:[]};
 const result=completeAha(state,'lesson-1','sound reasoning',{understood:true,feedback:'Great',followUp:''});
 assert.equal(result.events.length,0);
});
