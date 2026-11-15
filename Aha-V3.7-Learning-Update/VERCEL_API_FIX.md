# Aha! V3.6.5 — Vercel startup fix

## Why this update exists

The V3.6.4 app imported `pdf-parse` at the top of `server.js`, which also runs on GET `/api/health`. Some Vercel/Node environments fail while importing the PDF.js dependency (`DOMMatrix is not defined`), even when no PDF is being processed. Separately, `SITE_ACCESS_PASSWORD` validation intentionally throws during startup when incorrectly configured. Either condition can cause a `500 FUNCTION_INVOCATION_FAILED` with no useful browser response.

**This is a plausible fix, not a confirmed diagnosis of your deployed 500.** The exact exception should be read from Vercel Runtime Logs.

Changes:
- PDF worker and parser are imported on demand only when a PDF is uploaded.
- `/api/health` catches Express import/startup failures and returns a **safe 503 JSON diagnostic** (code + actionable message), instead of a generic function crash.
- Frontend Settings now displays the API error instead of always saying to add `.env`.
- No API keys or passwords are included.

## Updating the existing GitHub repo

Your repository `turnerosswald/aha-deploy-ready` currently tracks the app inside **`Aha-V3.6.3-Deploy-Ready/`**. Keep using this nested name. Copy the **contents of this ZIP's app folder** into that tracked subfolder, not alongside it. From the Git repo root:

```bash
git status
git add -A
git commit -m "Fix Vercel API startup and diagnostics"
git push origin main
```

Your Vercel root directory should remain `Aha-V3.6.3-Deploy-Ready`. Production variables `OPENAI_API_KEY`, `SITE_ACCESS_PASSWORD` (at least 12 characters), and optionally `AI_SIGNING_SECRET` need to be configured in Vercel, not Git.

## Test

1. Open the newly deployed URL plus `/api/health`.
2. `200` JSON with `ok: true` means Express initialized and the key presence can be checked with `aiReady`.
3. `503` JSON with `code: SITE_PASSWORD_TOO_SHORT` or `SITE_PASSWORD_MISSING` means update Production variables and redeploy.
4. `503` with `code: MODULE_MISSING` or `BACKEND_STARTUP_FAILED` means check **Vercel project → Logs** (runtime logs, not build logs) for the exact exception on that `/api/health` request.
5. If PDF uploads return a helpful 422 error, paste text temporarily and check server-side PDF module warnings; normal lessons should keep working.

Do not paste secret values or `.env` in chat, and don't expose a paid AI endpoint without an access gate. A successful health check confirms server setup, NOT live OpenAI billing or model access. Test a small generated lesson after authenticating.

## What was tested

Local Node built-in test suite, syntax checks, and ZIP integrity. A full Vercel runtime test requires deploying the new commit and cannot be verified from an offline ZIP alone.
