# V3.6.3 — private deployment preparation

- One Render web service serves built Vite app (`dist/`) and the existing Express `/api` endpoints.
- `npm start` runs a production web server and respects Render `PORT`. `npm run dev` continues to run Vite and the API separately for local use.
- A password-protected preview is available through `SITE_ACCESS_PASSWORD`; uses HTTP Basic on HTTPS hosting. The username is `aha`.
- Production start with `OPENAI_API_KEY` but no password **fails closed** to prevent unexpected API spending.
- Added Render Blueprint and detailed GitHub/Render deployment checklist.
- All existing features, offline demos, animated cards, LaTeX, momentum, rocks, and local Friends preview are retained.
- Not a public social platform: sign-in, per-user quotas, synced progress, real messaging, moderation, and a database still need implementation.
