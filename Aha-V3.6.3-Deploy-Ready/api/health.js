/** Diagnose import/configuration failure without crashing the health route.
 * Import the actual Express app only inside the handler so an import-time
 * exception can be reported as safe JSON rather than FUNCTION_INVOCATION_FAILED.
 */
import { classifyBootError } from '../server/bootDiagnostics.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }
  try {
    const { default: app } = await import('../server.js');
    return app(req, res);
  } catch (error) {
    // The complete traceback belongs in private Vercel Runtime Logs only.
    console.error('Aha backend startup failed:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, aiReady: false, ...classifyBootError(error) });
  }
}
