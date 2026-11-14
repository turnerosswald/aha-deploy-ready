/** Single-process, best-effort API cost guard for local/private deployments.
 * Use an external persistent limiter + authenticated quotas for public launch.
 */
export function createAiLimiter({ now = Date.now, max = 36, windowMs = 60 * 60 * 1000 } = {}) {
  const requests = new Map();
  return (req, res, next) => {
    const time = now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    if (requests.size > 3000) {
      for (const [id, state] of requests) if (state.resetAt <= time) requests.delete(id);
    }
    let state = requests.get(key);
    if (!state || state.resetAt <= time) state = { count: 0, resetAt: time + windowMs };
    state.count++;
    requests.set(key, state);
    res.setHeader('X-Aha-RateLimit-Remaining', String(Math.max(0, max - state.count)));
    if (state.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((state.resetAt - time) / 1000)));
      return res.status(429).json({ error: 'The AI tutor has had a lot of requests. Please come back in a little while, or keep practicing a demo.' });
    }
    next();
  };
}
