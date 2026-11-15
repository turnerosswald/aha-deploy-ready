import { demoLesson, ladderLesson } from '../src/demo.js';
import { verifyStepToken } from './stepTokens.js';
import { unsealReviewStep } from './reviewTokens.js';

const knownDemos = new Map([demoLesson, ladderLesson].map(x => [x.id, x]));

export function getTrustedStep(body) {
  if (!body || typeof body !== 'object') throw new Error('Missing learning step.');
  if (typeof body.reviewToken === 'string' && body.reviewToken) return unsealReviewStep(body.reviewToken);
  if (typeof body.evaluationToken === 'string' && body.evaluationToken) return verifyStepToken(body.evaluationToken);
  if (body.demo && typeof body.demo === 'object') {
    const lesson = knownDemos.get(body.demo.lessonId);
    const number = body.demo.stepIndex;
    if (!lesson || !Number.isInteger(number) || number < 0 || number >= lesson.steps.length) throw new Error('Unknown demo lesson step.');
    return lesson.steps[number];
  }
  throw new Error('This saved lesson needs to be regenerated to use the AI tutor.');
}

export function validateFeedbackInput(body) {
  const step = getTrustedStep(body);
  const { selectedIndex, why } = body;
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3 ||
      typeof why !== 'string' || why.trim().length < 2 || why.length > 1600) {
    throw new Error('Pick one answer and explain why in a short sentence.');
  }
  return { step, selectedIndex, why: why.trim() };
}

export function validateHintInput(body) {
  const step = getTrustedStep(body);
  const question = body.studentQuestion ?? '';
  if (typeof question !== 'string' || question.length > 500) throw new Error('Keep your question under 500 characters.');
  return { step, studentQuestion: question.trim() };
}

export function normalizeFeedback(result, selectedIndex, correctIndex) {
  const correct = selectedIndex === correctIndex;
  const level = !correct ? 'retry' : result?.level === 'strong' ? 'strong' : 'partial';
  return {
    correct,
    level,
    message: String(result?.message || (correct ? 'Nice start! Can you connect that answer to the idea in the reading?' : 'Good try! Look for another clue in the reading.')).slice(0, 480),
    nextHint: String(result?.nextHint || '').slice(0, 360),
  };
}
