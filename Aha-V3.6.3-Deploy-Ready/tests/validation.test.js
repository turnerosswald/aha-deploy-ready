import test from 'node:test';
import assert from 'node:assert/strict';
import { ladderLesson, demoLesson } from '../src/demo.js';
import { assessOfflineReasoning } from '../src/validation.js';

test('ladder lesson is seven scaffolded steps and answer is 57 degrees',()=>{
 assert.equal(ladderLesson.steps.length,7);
 assert.equal(ladderLesson.steps.at(-1).options[ladderLesson.steps.at(-1).correctIndex].label,'57°');
 assert.equal(Math.round(Math.acos(13.5/25)*180/Math.PI),57);
});
test('nonsense does not earn mastery even with correct choice',()=>{
 const step=ladderLesson.steps[3];
 const result=assessOfflineReasoning(step,step.correctIndex,'because I like pizza and here is random text');
 assert.equal(result.mastered,false);
 assert.equal(result.level,'partial');
});
test('reasoned cosine choice earns mastery',()=>{
 const step=ladderLesson.steps[3];
 const result=assessOfflineReasoning(step,2,'Cosine is adjacent 13.5 over hypotenuse 25.');
 assert.equal(result.mastered,true);
});
test('wrong choice cannot earn mastery even with correct reasoning',()=>{
 const step=ladderLesson.steps[3];
 const result=assessOfflineReasoning(step,1,'Cosine is adjacent 13.5 over hypotenuse 25.');
 assert.equal(result.mastered,false);
 assert.equal(result.choiceCorrect,false);
});
test('unsupported generated lesson does not pretend offline semantic understanding',()=>{
 const result=assessOfflineReasoning({...demoLesson.steps[0],reasoningGroups:undefined},1,'velocity acceleration and time');
 assert.equal(result.mastered,false);
});

test('each ladder step accepts a concise, relevant explanation',()=>{
 const explanations=[
  'The vertical wall meets the ground at a right angle.',
  'The ladder is opposite the 90 degree angle.',
  'The ground is adjacent to theta because it touches the angle.',
  'Cosine is adjacent 13.5 over hypotenuse 25.',
  '13.5 is the adjacent ground and 25 is the hypotenuse ladder; divide.',
  'Inverse cosine undoes cosine and isolates the angle.',
  '57.3 rounds down to 57 degrees because of the decimal.',
 ];
 explanations.forEach((text,i)=>{
  const step=ladderLesson.steps[i];
  assert.equal(assessOfflineReasoning(step,step.correctIndex,text).mastered,true,`step ${i+1}`);
 });
});
test('ladder calculator setup catches the reversed ratio misconception',()=>{
 const step=ladderLesson.steps[4];
 const result=assessOfflineReasoning(step,step.correctIndex,'Hypotenuse divided by adjacent is 25 / 13.5, so I use cos theta.');
 assert.equal(result.mastered,false);
});
test('no empty reason earns XP',()=>{
 const step=demoLesson.steps[1];
 assert.equal(assessOfflineReasoning(step,step.correctIndex,'').mastered,false);
 assert.equal(assessOfflineReasoning(step,step.correctIndex,'This answer is correct because yes yes yes.').mastered,false);
});

test('natural short reasoning at the top is recognized without a long essay',()=>{
 const step=demoLesson.steps[1];
 const result=assessOfflineReasoning(step,step.correctIndex,'At the top the ball stops moving for a moment.');
 assert.equal(result.mastered,true);
});
test('random prose still does not earn mastery in the gentler version',()=>{
 const step=demoLesson.steps[1];
 const result=assessOfflineReasoning(step,step.correctIndex,'I like to eat noodles with spicy sauce at night.');
 assert.equal(result.mastered,false);
 assert.equal(result.choiceCorrect,true);
});
