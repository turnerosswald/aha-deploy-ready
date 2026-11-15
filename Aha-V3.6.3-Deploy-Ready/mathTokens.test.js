import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, stepReference } from '../src/apiClient.js';
import { demoLesson } from '../src/demo.js';

test('demo step references use the exact demo ID and index', () => {
  assert.deepEqual(stepReference(demoLesson, demoLesson.steps[1], 1), { demo: { lessonId: demoLesson.id, stepIndex: 1 } });
});

test('generated step requests send signed token, not a mutable correctIndex', () => {
  assert.deepEqual(stepReference({ generated: true }, { correctIndex: 1, evaluationToken: 'token.to.verify' }, 2), { evaluationToken: 'token.to.verify' });
  assert.equal(stepReference({ generated: true }, { correctIndex: 1 }, 2), null);
});

test('API client returns parsed JSON and preserves useful error messages', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_path, opts) => { assert.equal(opts.method, 'POST'); return { ok: true, text: async () => '{"feedback":{"level":"strong"}}' }; };
    assert.equal((await apiRequest('/api/feedback', { body: { x: 1 } })).feedback.level, 'strong');
    globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => '{"error":"Try later"}' });
    await assert.rejects(() => apiRequest('/api/feedback', { body: { x: 1 } }), /Try later/);
  } finally { globalThis.fetch = original; }
});
