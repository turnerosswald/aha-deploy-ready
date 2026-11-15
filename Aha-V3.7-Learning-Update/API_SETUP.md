> **Public hosting warning:** Never deploy an OPENAI_API_KEY on an unrestricted public endpoint. V3.6.3 requires SITE_ACCESS_PASSWORD (12+ characters) whenever OPENAI_API_KEY is configured with NODE_ENV=production. For deployment instructions see [DEPLOY_RENDER.md](DEPLOY_RENDER.md).

# Aha! V3.6 — AI Tutor API setup

The interactive app **already works without a paid API key**. The two demos remain local/offline, and saved sessions, XP and collectibles remain in localStorage.

## 1. Get an OpenAI API key

1. Open https://platform.openai.com/api-keys and create a secret key for **your own** API project.
2. Make sure that API billing / credits and access to your chosen model are configured. **ChatGPT Plus does not automatically include API credits.**
3. **Never send your key in chat, commit it to GitHub, paste it into a public UI, or put it in a `VITE_` variable.**

## 2. Configure your backend

From the unzipped project's root:

```bash
cp .env.example .env
```

On Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Open `.env` in a plain-text editor and enter your secret:

```dotenv
OPENAI_API_KEY=sk-YOUR-REAL-KEY-HERE
OPENAI_MODEL=gpt-4.1-mini
AI_REQUESTS_PER_HOUR=36
API_PORT=3001
```

`.env` is gitignored and is **NOT included in the ZIP**. For production, add an independent `AI_SIGNING_SECRET` (use a long random value) via your host's server environment variables.

## 3. Run and test

Requires Node.js 22.12+:

```bash
npm install
npm run check
npm run dev
```

Go to http://localhost:5173. `npm run dev` starts both the Vite web frontend on port 5173 and Express API on port 3001.

1. Open **Settings** → **Check API status**. It should say *server key detected*. That means a key is configured, **not** that provider credentials/billing were validated yet.
2. On **Start learning**, enter a problem such as: "A 25-foot ladder is 13.5 feet from a building; find the angle with the ground". Click **Build my lesson**. A successful response confirms live API access.
3. Select an option, enter a short explanation and choose **Check my thinking**. The server checks your reasoning and returns kind, specific feedback.
4. Choose **Ask Aha! for a personal hint** to ask for a small next clue without getting the answer.
5. Built-in demos also use AI evaluation when the API is configured. Disable this in **Settings → AI feedback on demo lessons** to use only the offline deterministic checker and avoid AI charges while testing.
6. Optional: add readable PDF study notes (up to 3 MB). PDF text extraction happens in the backend; scanned image-only PDFs are not supported yet.

**Local health endpoint:** http://localhost:3001/api/health. The `aiReady` flag only indicates whether a key is present.

## What the API actually does

- `POST /api/lesson` — accept a question, study notes and optional PDF, then ask OpenAI to generate **5–7 guided steps** with four choices and a READ FIRST passage per step.
- `POST /api/feedback` — evaluate the **chosen option + explanation**, allowing short good reasoning but rejecting meaningless explanations. The server determines option correctness using a signed step token or trusted built-in demo step.
- `POST /api/hint` — provide an on-demand tiny, supportive hint tied to the current step.
- `GET /api/health` — show demo/configured mode, model label and the fact that Friends is still a local preview.

The API uses OpenAI's **Responses API** (`responses.parse`, structured outputs, `store: false`). Correctness can still make mistakes; students should check important results and reference materials. Student-submitted prompts/PDF text are sent to the OpenAI API when used, so do not upload private or sensitive documents without appropriate consent and a privacy plan.

## Budget and security

**Do not deploy this as an open public API with your key yet.** This release has input validation, 3 MB PDF limits, 30-second provider timeouts, signed lesson-step tokens and a *best-effort single-process* request limit. For public use, implement real authentication, per-account budgets, persistent/distributed rate limiting, audit and abuse controls, HTTPS, and privacy/retention policies. A new ephemeral serverless function could reset the current limiter. Anyone with access to an unprotected deployment could still cause API charges.

- Aha! only sends requests to **your backend**, which holds the key. Never call the OpenAI API directly from browser JavaScript.
- The server doesn't save raw PDFs to disk. The app does save generated study lessons and student responses to the browser's localStorage.
- Existing V3.5.1 *offline* lessons and progress still work. Previously generated lessons that lack signed step tokens should be regenerated to enable secure AI checking; their prior progress is not deleted.
- Friends/chat are **still a local demo**. Actual messages between users require real account registration, a database, access control and moderation. This version is specifically the **AI tutoring API phase**, not the multiplayer backend.

## Common errors

- **Demo mode:** copy `.env.example` to `.env`, fill the key on the server, and restart `npm run dev`.
- **Key rejected:** check that `OPENAI_API_KEY` is correct and billing/project access is enabled.
- **Out of quota/rate-limited:** check your API billing dashboard or wait. A paid ChatGPT subscription and API billing are separate.
- **Can't reach backend:** make sure `npm run dev` is running both processes and visit `/api/health`.
- **PDF not readable:** use a text-based PDF, or paste the question into the composer.
- **Saved AI lesson says regenerate:** older generated lessons did not include signed evaluation tokens. Start a fresh AI lesson from your question.

## Build validation status

The code includes unit tests and can be checked without API credentials. A full live-provider end-to-end test requires the user to configure their own key. Do not treat the `aiReady` flag as a billable-API connectivity test.
