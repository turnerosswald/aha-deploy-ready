import 'dotenv/config';
import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeProductionConfig, siteAccessMiddleware } from './server/siteAccess.js';
import multer from 'multer';
// PDF parsing is loaded only when a PDF is uploaded. Importing pdf-parse eagerly
// can crash unrelated Vercel routes when optional canvas/DOMMatrix APIs are absent.
import { generateLesson, evaluateReasoning, generateHint, assessAhaReflection, explainDifferently, generateReviewQuestion } from './server/ai.js';
import { issueStepToken } from './server/stepTokens.js';
import { sealReviewStep } from './server/reviewTokens.js';
import { getTrustedStep } from './server/apiContract.js';
import { reserveAiRequest, getUsageSnapshot } from './server/usage.js';
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
const durableBudget = async (_req, res, next) => {
  const allowance = await reserveAiRequest();
  if (!allowance.allowed) return res.status(allowance.status).json({error: allowance.message});
  next();
};
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

app.post('/api/lesson', requireAi, limiter, durableBudget, upload.single('pdf'), async (req, res, next) => {
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
      // pdf-parse v2 documents loading its worker support before its main entry.
      // More importantly, these imports must happen ONLY for PDF requests so a
      // PDF.js runtime incompatibility cannot crash /api/health or text lessons.
      try {
        const { CanvasFactory } = await import('pdf-parse/worker');
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(req.file.buffer), CanvasFactory });
        try { pdfText = (await parser.getText()).text?.trim() || ''; }
        finally { await parser.destroy(); }
      } catch (pdfError) {
        console.error('Aha PDF extraction error:', pdfError?.name || 'Error', pdfError?.message || 'unknown');
        return res.status(422).json({ error: 'This server could not extract text from that PDF. Paste the question as text while PDF compatibility is being checked.' });
      }
      if (!pdfText) return res.status(422).json({ error: 'The PDF has no readable text. Scanned PDFs need OCR (not included in this version).' });
    }
    const lesson = await generateLesson({ question, referenceText, pdfText, difficulty, sourceName: req.file?.originalname || 'Text input' });
    const {usageReceipt,...lessonData}=lesson;
    const secured = {
      ...lessonData,
      steps: lesson.steps.map(step => ({ ...step, evaluationToken: issueStepToken(step) })),
    };
    res.json({ lesson: secured,usage:usageReceipt });
  } catch (error) { next(error); }
});

app.post('/api/feedback', requireAi, limiter, durableBudget, async (req, res, next) => {
  try {
    let input;
    try { input = validateFeedbackInput(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const grade = await evaluateReasoning(input);
    const feedback = normalizeFeedback(grade, input.selectedIndex, input.step.correctIndex);
    res.json({ feedback,usage:grade.usageReceipt });
  } catch (error) { next(error); }
});

app.post('/api/hint', requireAi, limiter, durableBudget, async (req, res, next) => {
  try {
    let input;
    try { input = validateHintInput(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const help = await generateHint(input);
    res.json({ help:{hint:help.hint,tinyQuestion:help.tinyQuestion},usage:help.usageReceipt });
  } catch (error) { next(error); }
});

// V3.7: small, explicitly-scoped tutoring endpoints. All paid routes use the
// same private site access gate, limiter, and optional shared daily request cap.
app.post('/api/reflection', requireAi, limiter, durableBudget, async (req, res, next) => {
  try {
    const { subject, lessonTitle, summary, reflection } = req.body || {};
    if (typeof reflection !== 'string' || reflection.trim().length < 3 || reflection.length > 1600 ||
        typeof summary !== 'string' || summary.length > 2000 ||
        typeof subject !== 'string' || subject.length > 120 ||
        typeof lessonTitle !== 'string' || lessonTitle.length > 200) {
      return res.status(400).json({error:'Please write a short reflection about what you understood.'});
    }
    const result = await assessAhaReflection({subject,lessonTitle,summary,reflection});
    res.json({reflection:{understood:Boolean(result.understood),feedback:String(result.feedback).slice(0,400),followUp:String(result.followUp).slice(0,320)},usage:result.usageReceipt});
  } catch(error) { next(error); }
});
app.post('/api/explain',requireAi,limiter,durableBudget,async(req,res,next)=>{
  try {
    if(!['simpler','analogy','example'].includes(req.body?.mode))return res.status(400).json({error:'Choose a supported explanation style.'});
    let step;try{step=getTrustedStep(req.body);}catch(e){return res.status(400).json({error:e.message});}
    const help=await explainDifferently({step,mode:req.body.mode});
    res.json({help:{explanation:String(help.explanation).slice(0,1300),checkQuestion:String(help.checkQuestion).slice(0,400)},usage:help.usageReceipt});
  }catch(error){next(error);}
});
app.post('/api/review',requireAi,limiter,durableBudget,async(req,res,next)=>{
  try {
    const {subject,concept,originalQuestion,misconception,takeaway}=req.body||{};
    if(typeof subject!=='string'||subject.length>120||typeof concept!=='string'||concept.length>160||
       typeof originalQuestion!=='string'||originalQuestion.length>1200||
       typeof misconception!=='string'||misconception.length>500||
       typeof takeaway!=='string'||takeaway.length>500||!concept.trim()||!originalQuestion.trim()){
      return res.status(400).json({error:'The review needs a valid learning concept and question.'});
    }
    const review=await generateReviewQuestion({subject,concept,originalQuestion,misconception,takeaway});
    const {correctIndex,explanation,whyKeywords,usageReceipt,...safe}=review;
    res.json({practice:{...safe,reviewToken:sealReviewStep(review)},usage:usageReceipt});
  }catch(error){next(error);}
});
app.get('/api/usage', async (_req,res,next)=>{
  try { res.json({usage:await getUsageSnapshot()}); }
  catch(error){next(error);}
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
