/** Optional password gate for a private hosted Aha! preview.
 * Protects the app and /api routes with HTTP Basic over the host's HTTPS.
 * Login credentials are NOT stored in the browser app or bundled with static assets.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export function needsSitePassword(env = process.env) {
  return Boolean(env.SITE_ACCESS_PASSWORD?.trim());
}

function equalSecret(a, b) {
  const ah = createHash('sha256').update(a).digest();
  const bh = createHash('sha256').update(b).digest();
  return timingSafeEqual(ah, bh);
}

export function checkBasicAuthorization(header, password) {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  const encoded = header.slice(6);
  if (encoded.length > 2048 || !/^[A-Za-z0-9+/]+=*$/.test(encoded)) return false;
  let decoded;
  try { decoded = Buffer.from(encoded, 'base64').toString('utf8'); }
  catch { return false; }
  const separator = decoded.indexOf(':');
  return separator > 0 && equalSecret(decoded.slice(0, separator), 'aha') && equalSecret(decoded.slice(separator + 1), password);
}

export function assertSafeProductionConfig(env = process.env) {
  if (env.NODE_ENV === 'production' && env.OPENAI_API_KEY?.trim() && !needsSitePassword(env)) {
    throw new Error('Refusing public AI deployment without SITE_ACCESS_PASSWORD. Add an access password or remove OPENAI_API_KEY to run the public offline-only demo.');
  }
  if (needsSitePassword(env) && env.SITE_ACCESS_PASSWORD.trim().length < 12) {
    throw new Error('SITE_ACCESS_PASSWORD must be at least 12 characters long.');
  }
}

export function siteAccessMiddleware({ env = process.env } = {}) {
  const password = env.SITE_ACCESS_PASSWORD?.trim();
  return (req, res, next) => {
    // Render's health checks must work without an interactive Basic Auth prompt.
    if (req.method === 'GET' && req.path === '/api/health') return next();
    if (!password || checkBasicAuthorization(req.headers.authorization, password)) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Aha Private Preview", charset="UTF-8"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).type('text/plain').send('Aha! is currently a private preview.');
  };
}
