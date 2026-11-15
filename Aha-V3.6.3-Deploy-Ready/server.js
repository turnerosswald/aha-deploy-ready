import 'dotenv/config';
import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeProductionConfig, siteAccessMiddleware } from './server/siteAccess.js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { generateLesson, evaluateReasoning, generateHint } from './server/ai.js';
import { issueStepToken } from './server/stepTokens.js';
import { createAiLimiter } from './server/rateLimit.js';
import { validateFeedbackInput, validateHintInput, normalizeFeedback } from './server/apiContract.js';

assertSafeProductionConfig();
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(siteAccessMiddleware());
app.use(express.json({ limit: '24kb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 3, parts: 4 },
  fileFilter(_req, file, cb) {
    const safePdf = file.originalname.toLowerCase().endsWith('.pdf') &&
      (file.mimetype === 'application/pdf' || file.mimetype === 'application/octet-stream');
    cb(safePdf ? null : new Error('Only PDF uploads are supported.'), safePdf);
  },
});

function positiveBoundedNumber(value, fallback, max) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}
const limiter = createAiLimiter({ max: positiveBoundedNumber(process.env.AI_REQUESTS_PER_HOUR, 36, 200) });
const requireAi = (_req, res, next) => process.env.OPENAI_API_KEY ? next() :
  res.status(503).json({ error: 'AI tutor is in demo mode. Add OPENAI_API_KEY to the backend .env and restart the server.' });

// Navigate to /api/access once to sign in with HTTP Basic before testing private AI.
// The HTML frontend itself is static on Vercel; this protects paid API endpoints.
app.get('/api/access', (_req, res) => res.json({ ok: true, privateApi: Boolean(process.env.SITE_ACCESS_PASSWORD) }));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  aiReady: Boolean(process.env.OPENAI_API_KEY),
  mode: process.env.OPENAI_API_KEY ? 'configured' : 'demo',
  // Key presence does not prove billing, permission or model access.
  model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : null,
  socialMode: 'local-preview',
}));

app.post('/api/lesson', requireAi, limiter, upload.single('pdf'), async (req, res, next) => {
  try {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 5000) : '';
    const referenceText = typeof req.body?.referenceText === 'string' ? req.body.referenceText.trim().slice(0, 12000) : '';
    const difficulty = ['Beginner', 'Standard', 'Challenge'].includes(req.body?.difficulty) ? req.body.difficulty : 'Standard';
    if (!question && !referenceText && !req.file) return res.status(400).json({ error: 'Add a question, notes, or a PDF first.' });
    let pdfText = '';
    if (req.file) {
      if (!req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        return res.status(400).json({ error: 'That file does not look like a valid PDF.' });
      }
      const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
      try { pdfText = (await parser.getText()).text?.trim() || ''; }
      finally { await parser.destroy(); }
      if (!pdfText) return res.status(422).json({ error: 'The PDF has no readable text. Scanned PDFs need OCR (not included in this version).' });
    }
    const lesson = await generateLesson({ question, referenceText, pdfText, difficulty, sourceName: req.file?.originalname || 'Text input' });
    const secured = {
      ...lesson,
      steps: lesson.steps.map(step => ({ ...step, evaluationToken: issueStepToken(step) })),
    };
    res.json({ lesson: secured });
  } catch (error) { next(error); }
});

app.post('/api/feedback', requireAi, limiter, async (req, res, next) => {
  try {
    let input;
    try { input = validateFeedbackInput(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const grade = await evaluateReasoning(input);
    const feedback = normalizeFeedback(grade, input.selectedIndex, input.step.correctIndex);
    res.json({ feedback });
  } catch (error) { next(error); }
});

app.post('/api/hint', requireAi, limiter, async (req, res, next) => {
  try {
    let input;
    try { input = validateHintInput(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const help = await generateHint(input);
    res.json({ help });
  } catch (error) { next(error); }
});

// Serve the Vite production build from the same Express origin as /api.
// No second static hosting account, proxy URL, or client-side API key required.
if (process.env.NODE_ENV === 'production') {
  const dist = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) return next();
    if (!req.accepts('html')) return next();
    res.sendFile(join(dist, 'index.html'), (error) => { if (error) next(error); });
  });
}

app.use((error, _req, res, _next) => {
  // Never surface provider errors or API keys to the browser.
  console.error('Aha API:', error?.status || 'error', error?.message || 'unknown');
  if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'PDF upload limit: one file, maximum 3 MB.' });
  if (error.message?.includes('Only PDF')) return res.status(400).json({ error: error.message });
  if (error.status === 401) return res.status(503).json({ error: 'The server API key was rejected. Check OPENAI_API_KEY in .env.' });
  if (error.status === 429) return res.status(429).json({ error: 'The AI provider is rate-limited or out of quota. Check your API billing and try again.' });
  if (error.status === 403) return res.status(503).json({ error: 'This API project does not have access to the selected model.' });
  if (error.status === 400) return res.status(502).json({ error: 'The AI model rejected this request. Check the model setting or try simpler study material.' });
  if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') return res.status(504).json({ error: 'The AI tutor took too long to respond. Please try again.' });
  res.status(502).json({ error: 'The AI tutor could not finish that request. Please try again shortly.' });
});

// Reusable Express app for local and hosted starts.
export default app;
