/** Friendly, specific presentation strings shared by offline and AI feedback. */
export function feedbackHeading(outcome){
  if(outcome?.mastered)return 'YES! THAT CLICKED ✨';
  if(outcome?.choiceCorrect)return 'NICE PICK — LET’S CONNECT IT';
  return 'GOOD TRY — HERE’S A CLUE';
}
export function feedbackSubtext(outcome){
  if(outcome?.mastered)return 'Your explanation connects to the lesson. Beautiful work.';
  if(outcome?.choiceCorrect)return 'You found the answer! Add one more detail if you want full mastery, or keep moving with a guided step.';
  return 'This is practice, not a test. You can change your choice, ask for a hint, or learn from the example.';
}
