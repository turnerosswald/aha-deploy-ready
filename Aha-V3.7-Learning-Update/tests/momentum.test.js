import test from 'node:test';
import assert from 'node:assert/strict';
import {masteryReward,momentumFromEvents,earnedXp} from '../src/momentum.js';
test('momentum grows with mastered steps and grants bonus XP',()=>{
 let events=[];
 assert.equal(masteryReward(events).xp,31);
 events.push({type:'attempt',mastered:true,xpAwarded:31});
 assert.equal(momentumFromEvents(events).multiplier,1.25);
 assert.equal(masteryReward(events).xp,38);
});
test('wrong answers do not erase XP or block new attempts',()=>{
 const events=[{type:'attempt',mastered:true,xpAwarded:31},{type:'attempt',choiceCorrect:false,mastered:false}];
 assert.equal(earnedXp(events),31);
 assert.equal(momentumFromEvents(events).multiplier,1);
 assert.equal(masteryReward(events).xp,31);
});
test('momentum is capped and old V3.5 events retain original XP',()=>{
 const events=Array.from({length:24},()=>({type:'attempt',mastered:true}));
 assert.equal(momentumFromEvents(events).multiplier,3);
 assert.equal(earnedXp(events),600);
 assert.equal(masteryReward(events).xp,75);
});
test('guided and qualified completion XP remain backwards compatible',()=>{
 assert.equal(earnedXp([{type:'guided'},{type:'complete',qualified:true},{type:'complete',qualified:false}]),45);
});
