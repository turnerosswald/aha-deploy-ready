/** Safe, actionable startup diagnostics for Vercel. Never echo secret values. */
export function classifyBootError(error) {
  const message = String(error?.message || '');
  if (message.includes('SITE_ACCESS_PASSWORD must be at least 12')) {
    return { code: 'SITE_PASSWORD_TOO_SHORT', error: 'SITE_ACCESS_PASSWORD must contain at least 12 characters. Update the Vercel Production variable and redeploy.' };
  }
  if (message.includes('Refusing public AI deployment without SITE_ACCESS_PASSWORD')) {
    return { code: 'SITE_PASSWORD_MISSING', error: 'The AI key is configured, but SITE_ACCESS_PASSWORD is missing. Add a strong Production password and redeploy.' };
  }
  if (/DOMMatrix|Path2D|pdf-parse|canvas/i.test(message)) {
    return { code: 'PDF_LIBRARY_STARTUP', error: 'A PDF processing dependency failed to initialize. PDF imports must be deferred until an upload.' };
  }
  if (error?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find (module|package)/i.test(message)) {
    return { code: 'MODULE_MISSING', error: 'A server dependency failed to load. Check Vercel runtime logs for the package name.' };
  }
  return { code: 'BACKEND_STARTUP_FAILED', error: 'The API failed to initialize. Open Vercel Runtime Logs for the /api/health request and inspect its startup exception.' };
}
