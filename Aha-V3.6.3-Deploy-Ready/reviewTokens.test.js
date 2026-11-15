import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBootError } from '../server/bootDiagnostics.js';
import { readFileSync } from 'node:fs';

test('short password error returns an actionable, secret-free code', () => {
  const r=classifyBootError(new Error('SITE_ACCESS_PASSWORD must be at least 12 characters long.'));
  assert.equal(r.code, 'SITE_PASSWORD_TOO_SHORT');
  assert.doesNotMatch(JSON.stringify(r), /super-secret-value/);
});
test('missing site password error is distinguishable', () => {
  const r=classifyBootError(new Error('Refusing public AI deployment without SITE_ACCESS_PASSWORD.'));
  assert.equal(r.code,'SITE_PASSWORD_MISSING');
});
test('PDF library import errors have a specific diagnostic', () => {
  const r=classifyBootError(new Error('DOMMatrix is not defined'));
  assert.equal(r.code,'PDF_LIBRARY_STARTUP');
});
test('unknown errors do not expose raw exception contents to visitors', () => {
  const r=classifyBootError(new Error('my private secret is xyz'));
  assert.equal(r.code,'BACKEND_STARTUP_FAILED');
  assert.doesNotMatch(JSON.stringify(r), /private secret|xyz/);
});
test('health function imports Express within the handler, not at module scope', () => {
  const s=readFileSync(new URL('../api/health.js', import.meta.url),'utf8');
  assert.match(s, /await import\('\.\.\/server\.js'\)/);
});
test('server PDF parsing imports occur only inside PDF upload request block', () => {
  const s=readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.doesNotMatch(s, /^import \{ PDFParse \}/m);
  assert.match(s, /await import\('pdf-parse\/worker'\)/);
  assert.match(s, /await import\('pdf-parse'\)/);
});
