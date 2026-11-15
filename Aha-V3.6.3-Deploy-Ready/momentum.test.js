import test from 'node:test';
import assert from 'node:assert/strict';
import { issueStepToken, verifyStepToken } from '../server/stepTokens.js';
import { getTrustedStep, validateFeedbackInput, validateHintInput, normalizeFeedback } from '../server/apiContract.js';
import { createAiLimiter } from '../server/rateLimit.js';
import { ladderLesson } from '../src/demo.js';
const secret = 'unit-test-only-aha-secret';
const sample = ladderLesson.steps[0];

test('signed lesson step verifies and retains correct choice', () => {
  const token = issueStepToken(sample, { secret, now: 1000, ttlMs: 5000 });
  assert.deepEqual(verifyStepToken(token, { secret, now: 2000 }), sample);
});

test('tampered lesson token, wrong signing key, expired token are refused', () => {
  const token = issueStepToken(sample, { secret, now: 1000, ttlMs: 5000 });
  const [payload, sig] = token.split('.');
  assert.throws(() => verifyStepToken(`${payload.slice(0,-1)}A.${sig}`, { secret, now: 2000 }));
  assert.throws(() => verifyStepToken(token, { secret: 'wrong-secret', now: 2000 }));
  assert.throws(() => verifyStepToken(token, { secret, now: 7000 }));
  assert.throws(() => verifyStepToken('nonsense', { secret }));
});

test('trusted demo resolution ignores user-supplied answer keys', () => {
  const step = getTrustedStep({ demo: { lessonId: ladderLesson.id, stepIndex: 6 }, step: { correctIndex: 0 } });
  assert.equal(step.correctIndex, 1);
  assert.throws(() => getTrustedStep({ demo: { lessonId: '__proto__', stepIndex: 0 } }));
  assert.throws(() => getTrustedStep({ demo: { lessonId: ladderLesson.id, stepIndex: 100 } }));
});

test('feedback validation limits submitted reasoning and requires valid choice', () => {
  const demo = { lessonId: ladderLesson.id, stepIndex: 0 };
  assert.equal(validateFeedbackInput({ demo, selectedIndex: 0, why: 'Because the wall and ground make a right angle.' }).selectedIndex, 0);
  assert.throws(() => validateFeedbackInput({ demo, selectedIndex: 9, why: 'because' }));
  assert.throws(() => validateFeedbackInput({ demo, selectedIndex: 0, why: 'a' }));
  assert.throws(() => validateHintInput({ demo, studentQuestion: 'q'.repeat(501) }));
});

test('app correctness overrides model grading', () => {
  const modelSaysStrong = { level: 'strong', message: 'Great reasoning', nextHint: '' };
  assert.equal(normalizeFeedback(modelSaysStrong, 1, 0).level, 'retry');
  assert.equal(normalizeFeedback({ level: 'retry' }, 0, 0).level, 'partial');
  assert.equal(normalizeFeedback(modelSaysStrong, 0, 0).level, 'strong');
});

test('per-IP AI request limiter returns 429 and Retry-After', () => {
  let time = 0, nextCount = 0;
  const limit = createAiLimiter({ now: () => time, max: 2, windowMs: 1000 });
  const headers = {};
  const req = { ip: '127.0.0.1' };
  const res = { setHeader: (k, v) => { headers[k] = v; }, status(code) { this.code = code; return this; }, json(obj) { this.body = obj; return this; } };
  limit(req, res, () => nextCount++);
  limit(req, res, () => nextCount++);
  limit(req, res, () => nextCount++);
  assert.equal(nextCount, 2);
  assert.equal(res.code, 429);
  assert.ok(Number(headers['Retry-After']) > 0);
  time = 1001;
  limit(req, res, () => nextCount++);
  assert.equal(nextCount, 3);
});
