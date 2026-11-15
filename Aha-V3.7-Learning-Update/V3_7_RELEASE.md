# Aha! V3.7 — The Learning Update

**Source base:** Aha! V3.6.5 (Vercel API startup/PDF diagnostics fix) plus V3.7 additions.

## What changed

- **Aha! Moment** — optional post-lesson reflection, assessed by the configured AI tutor for conceptual understanding. Short answers are allowed. One-time **+20 XP** reward per lesson, even after refresh or repeated submissions. Draft and feedback persist in the existing local session.
- **Mistake Museum** — when an answer is wrong or the reasoning is incomplete, a unique misconception card is added to **Progress**. A learner can request a NEW, related AI practice problem and explain their answer. Only a correct choice with strong reasoning polishes the card and awards **+15 XP**, once. The review answer key stays encrypted in a temporary server-issued token (not plain signed base64).
- **Explain it differently** — small inline choice of **simpler / analogy / new worked example**. Does not reset the current lesson and instructs the tutor not to reveal the active answer. AI responses render math through existing KaTeX.
- **Daily mini quests** — three automatic, one-time reward quests in **Rock Galaxy**. The set stays stable within a browser-local day, resets the next day, and awards **+12 XP + one rock shard** per quest; no punishment for skipping days. Rock shards are a collectible counter for now, **not a spendable currency**.
- **AI usage panel** — in **Settings**. API responses report actual input/output token usage receipts, saved to the browser's local record. With a configured shared Upstash Redis REST store, the panel shows a persistent site-wide daily total, and the server can enforce an optional shared daily request limit. Without Upstash, the panel explicitly labels the browser-only record as incomplete; it does **not** pretend to show total platform spend.

No extra navigation tabs. Previous sessions, XP, momentum, rock avatars, Friends local preview, Lock In, PDF input and Vercel API endpoints are preserved.

## Deploy safely: use a NEW branch first

**Do not overwrite your currently working live deployment while testing.** In the existing Git checkout, update the contents of its configured Vercel Root Directory with the contents of this ZIP's `Aha-V3.7-Learning-Update/` folder (do not put one project folder inside another). Make a `feature/aha-v3-7` branch, commit, and push it, allowing Vercel to create a Preview deployment.

```bash
git switch -c feature/aha-v3-7
git add -A
git commit -m "Add Aha V3.7 learning update"
git push -u origin feature/aha-v3-7
```

Keep Vercel's existing project Root Directory setting; do not change it just because this ZIP has a nicer folder name. The Vercel config is `vercel.json`, with Vite output `dist` and individual API files under `api/`.

Build command: `npm run check && npm run build`.
Install command: `npm install --include=dev`.

### Secrets

Preserve the WORKING model and key in Vercel Environment Variables. Do not place secrets in `.env` in the Git repo or in `VITE_` variables. Add any new variables for *Preview* if you intend to test AI on a Preview deployment. Production-only credentials do not automatically apply to Preview.

- `OPENAI_API_KEY` — private server key, already in your working deployment.
- `OPENAI_MODEL` — keep your currently working provider model ID.
- `SITE_ACCESS_PASSWORD` — your own 12+ character private preview password.
- `AI_SIGNING_SECRET` — stable random secret recommended for encrypted, cross-function review tokens; use the **same value** across all Vercel functions of the same environment.
- `AI_REQUESTS_PER_HOUR` — existing best-effort per-instance rate limiter, **not a shared production budget**.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — *optional* shared persistent usage store. Must both be set, server-side. Use a private Redis database for this project.
- `AI_DAILY_REQUEST_LIMIT` — *optional* positive integer daily **request** budget (not dollars). **Only set when shared Redis is configured**; otherwise paid requests fail closed with an explanation. Limits reset UTC; learning quests reset on the student's browser-local day.
- `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION` — optional **verified** pricing per million tokens in US dollars for your exact configured model. Without both, the app intentionally does not invent a dollar estimate. These may become stale if provider pricing changes.

For actual financial ceilings, set spending safeguards in the AI provider dashboard as well; a request quota is not an exact dollar limit and Redis/store availability can affect usage visibility. Serverless instances do not share in-memory counters reliably.

### Persistence and social features

Learner profiles, sessions, museum cards, quest progress and rewards are still stored in the *browser*. There is no account synchronization and Friends remains a clearly labeled local preview. Do not claim it delivers messages or syncs users across devices. If switching from `localhost` to a new Vercel domain, old localStorage does not automatically transfer.

### Test checklist

1. `npm install --include=dev`, `npm run check`, and `npm run build`.
2. Open the browser, finish a demo lesson, submit a thoughtful Aha! reflection and confirm the optional +20 XP is awarded **once**. Retry/refesh and verify it does not award twice.
3. Deliberately choose a wrong answer or give vague reasoning, open Progress -> Mistake Museum, generate a new practice problem, try incorrect and correct reasoning. Only an AI-confirmed correct, reasoned response should polish the rock.
4. In a lesson choose each of the three Explain it differently modes. Check that original answer input/lesson step remains unchanged and equations render correctly.
5. Visit Rock Galaxy -> Daily mini quests. Start and complete a lesson; confirm each quest pays once without resetting on reload, and the day resets locally.
6. Open Settings -> AI usage. With no Redis, the browser receipts should show only this device's known interactions and label the scope. With Redis, inspect persistent server totals and test the optional cap in a nonproduction environment.
7. Visit `/api/health` and `/api/usage` on the Preview deployment and test authentication. Verify errors never disclose API credentials.
8. Only after the Preview works, merge the branch to `main` and let Vercel deploy the new version.

## Verification caveat

The source-level Node tests and JSX syntax checks were run when this artifact was prepared. A full `npm run build` could not be completed in the artifact environment because dependency downloads timed out; the user must verify the build on Vercel or a machine with npm network access before promoting to Production. No real paid OpenAI calls were made during these tests.
