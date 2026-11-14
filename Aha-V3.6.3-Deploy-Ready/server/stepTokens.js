/** Tamper-evident lesson step tokens. No server-side session storage required.
 * A stable AI_SIGNING_SECRET is recommended for multi-instance deployments.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const MAX_TOKEN_LENGTH = 16000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const devOnlySecret = randomBytes(32).toString('hex');

export function signingSecret(env = process.env) {
  const explicit = env.AI_SIGNING_SECRET?.trim();
  if (explicit) return explicit;
  // A stable fallback across workers when the same API key is configured.
  // Do not transmit this derived key or token-signing material to the client.
  if (env.OPENAI_API_KEY) return createHash('sha256').update(`aha:step:v1:${env.OPENAI_API_KEY}`).digest('hex');
  return devOnlySecret;
}

export function issueStepToken(step, { secret = signingSecret(), now = Date.now(), ttlMs = MAX_AGE_MS } = {}) {
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: now + ttlMs, step }), 'utf8').toString('base64url');
  if (payload.length > MAX_TOKEN_LENGTH - 65) throw new Error('Generated step is too large to sign.');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyStepToken(token, { secret = signingSecret(), now = Date.now() } = {}) {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) throw new Error('Invalid lesson token.');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Invalid lesson token.');
  const actual = Buffer.from(parts[1], 'base64url');
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Lesson token was changed.');
  let parsed;
  try { parsed = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
  catch { throw new Error('Invalid lesson token contents.'); }
  if (parsed?.v !== 1 || !Number.isFinite(parsed.exp) || parsed.exp <= now || parsed.exp > now + MAX_AGE_MS ||
      !parsed.step || typeof parsed.step.question !== 'string' || !Array.isArray(parsed.step.options) ||
      parsed.step.options.length !== 4 || !Number.isInteger(parsed.step.correctIndex) ||
      parsed.step.correctIndex < 0 || parsed.step.correctIndex > 3) {
    throw new Error('Lesson token is expired or invalid.');
  }
  return parsed.step;
}
