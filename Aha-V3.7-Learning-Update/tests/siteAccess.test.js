import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeProductionConfig, checkBasicAuthorization, siteAccessMiddleware } from '../server/siteAccess.js';

const encode = (username, password) => 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
const secret = 'lengthy-private-passphrase';

test('private preview access accepts only correct Basic credentials', () => {
  assert.equal(checkBasicAuthorization(encode('aha', secret), secret), true);
  assert.equal(checkBasicAuthorization(encode('aha', 'wrong'), secret), false);
  assert.equal(checkBasicAuthorization(encode('admin', secret), secret), false);
  assert.equal(checkBasicAuthorization('Bearer 123', secret), false);
  assert.equal(checkBasicAuthorization('Basic !!!', secret), false);
});

test('paid AI endpoints cannot be deployed publicly without an access password', () => {
  assert.throws(() => assertSafeProductionConfig({ NODE_ENV: 'production', OPENAI_API_KEY: 'sk-test' }), /Refusing public AI deployment/);
  assert.doesNotThrow(() => assertSafeProductionConfig({ NODE_ENV: 'production', OPENAI_API_KEY: '' }));
  assert.doesNotThrow(() => assertSafeProductionConfig({ NODE_ENV: 'production', OPENAI_API_KEY: 'sk-test', SITE_ACCESS_PASSWORD: secret }));
  assert.throws(() => assertSafeProductionConfig({ SITE_ACCESS_PASSWORD: 'too-short' }), /at least 12/);
});

test('private access gate checks the request and keeps health route unblocked', () => {
  const gate = siteAccessMiddleware({ env: { SITE_ACCESS_PASSWORD: secret } });
  let called = 0;
  const next = () => { called += 1; };
  const req = (path, authorization) => ({ method: 'GET', path, headers: { authorization } });
  const makeRes = () => ({ statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, type() { return this; }, send(s) { this.body = s; return this; } });
  const denied = makeRes();
  gate(req('/api/lesson'), denied, next);
  assert.equal(denied.statusCode, 401);
  assert.match(denied.headers['WWW-Authenticate'], /Basic/);
  assert.equal(called, 0);
  gate(req('/somewhere', encode('aha', secret)), makeRes(), next);
  assert.equal(called, 1);
  gate(req('/api/health'), makeRes(), next);
  assert.equal(called, 2);
});
