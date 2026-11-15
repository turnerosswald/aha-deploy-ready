/** Same-origin browser API client. Never put a provider API key in this file. */
export async function apiRequest(path, { body, form, timeoutMs = 40000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: form || body ? 'POST' : 'GET',
      signal: controller.signal,
      ...(form ? { body: form } : body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch { throw new Error('The API server returned something unexpected. Make sure npm run dev is running both servers.'); }
    if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`);
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The AI tutor took too long to respond. Please retry.');
    if (error instanceof TypeError) throw new Error('Could not reach the AI API. Check that the backend is running.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function stepReference(lesson, step, stepIndex) {
  if (typeof step?.evaluationToken === 'string' && step.evaluationToken) return { evaluationToken: step.evaluationToken };
  if (!lesson?.generated && typeof lesson?.id === 'string' && Number.isInteger(stepIndex)) {
    return { demo: { lessonId: lesson.id, stepIndex } };
  }
  return null;
}
