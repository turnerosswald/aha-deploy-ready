# Aha! V3.6.5 — Deploy to Vercel

See [VERCEL_API_FIX.md](VERCEL_API_FIX.md) for the API startup diagnosis and exact steps to update your current `aha-deploy-ready` repository.

The app is currently located under `Aha-V3.6.3-Deploy-Ready/` in your Git repository. Keep that as the Vercel **Root Directory** until you deliberately reorganize the repo.

## Vercel project settings

- Git repository: `turnerosswald/aha-deploy-ready`
- Production branch: `main`
- Root Directory: `Aha-V3.6.3-Deploy-Ready`
- Framework preset: **Vite**
- Install command: `npm install --include=dev`
- Build command: `npm run check && npm run build`
- Output directory: `dist`

## Production environment variables

Set `OPENAI_API_KEY` and `OPENAI_MODEL` on Vercel, not in the Git repository. If the API key is configured, also set a strong unique `SITE_ACCESS_PASSWORD` of at least 12 characters and optionally a stable `AI_SIGNING_SECRET`. Never commit a `.env` file or disclose values in screenshots.

## Smoke test

Open the newest Production deployment's `/api/health` URL. A normal response is JSON with `ok: true`. A startup failure now returns `503` and a diagnostic code, while details are logged in private **Runtime Logs**. Check `VERCEL_API_FIX.md` for interpretation. The frontend might still load even when `/api/*` fails.

## Limitations

Friends/social is still local-only. The health check confirms server initialization and configured key presence, not actual OpenAI billing or model access. A model request still needs testing. PDF uploads might need additional Vercel runtime compatibility work.
