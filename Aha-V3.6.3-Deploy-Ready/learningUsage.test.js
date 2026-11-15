/** Transparent, deterministic checking for our *authored* offline demo lessons.
 * AI-generated lessons use /api/feedback for deeper semantic grading instead.
 */
const normalize = value => String(value||'').toLowerCase().replace(/[−–—]/g,'-').replace(/\s+/g,' ').trim();
const tokenMatch=(text, word)=> {
  const w=normalize(word);
  // Numeric/symbolic answers can appear as pieces of equations, whereas words
  // need boundaries so 'at' does not match 'gravity', for example.
  if (/^[0-9/\.θ°-]+$/.test(w)) return text.includes(w);
  if (w==='stop') return /\b(stop|stops|stopped|stopping)\b/.test(text);
  if (w==='turn') return /\b(turn|turns|turned|turning)\b/.test(text);
  const escaped=w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^a-z])${escaped}($|[^a-z])`,'i').test(text);
};
export function assessOfflineReasoning(step, selectedIndex, response){
  if (!step) return {mastered:false,choiceCorrect:false,level:'retry',message:'This learning step is unavailable.',nextHint:''};
  const choiceCorrect=selectedIndex===step.correctIndex;
  if (!choiceCorrect) return {mastered:false,choiceCorrect:false,level:'retry',message:'That was a thoughtful try! Look for the clue in the reading above and give another option a shot.',nextHint:step.hint};
  const text=normalize(response);
  if (!text || text.length<7 || !/[a-zθ0-9]/i.test(text)) return {mastered:false,choiceCorrect:true,level:'partial',message:'You found the right option! Can you tell me one clue that helped you pick it? A short sentence is enough.',nextHint:step.reasoningPrompt||step.hint};
  // Discard repeated filler, irrelevant strings, and answer-only text.
  const words=text.match(/[a-z]{2,}/g)||[];
  if ((new Set(words)).size<2 && words.length>2) return {mastered:false,choiceCorrect:true,level:'partial',message:'Great choice! Tell me just one thing from the problem that helped you decide.',nextHint:step.reasoningPrompt||step.hint};
  const groups = Array.isArray(step.reasoningGroups) && step.reasoningGroups.length?step.reasoningGroups:null;
  if (!groups) return {mastered:false,choiceCorrect:true,level:'partial',message:'Nice choice! This custom lesson needs the AI connection to fully review explanations. You can still study the example and continue with guidance.',nextHint:step.hint};
  // Reject common, explicitly contradictory claims rather than merely counting keywords.
  const contradicts=(step.misconceptionPatterns||[]).some(pattern=>new RegExp(pattern,'i').test(text));
  if (contradicts) return {mastered:false,choiceCorrect:true,level:'partial',message:'You identified the right choice! Let’s check one little detail: which side should go on top of this ratio?',nextHint:step.hint};
  const missing = groups.filter(group=>!group.some(keyword=>tokenMatch(text,keyword)));
  if (missing.length) return {mastered:false,choiceCorrect:true,level:'partial',message:'That’s a helpful start! Could you add one clue from the diagram or equation? Even a few words will do.',nextHint:step.reasoningPrompt||step.hint};
  return {mastered:true,choiceCorrect:true,level:'strong',message:'Exactly! Your reasoning points to the key idea. You earned this step!',nextHint:''};
}
