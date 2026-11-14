# Deploy Aha! V3.6.3 on Render — private test or offline showcase

This repo is a full-stack React + Vite + Express app. In production, Vite generates `dist/`; Express serves both `dist/` and `/api` from **one Render web service**. Do **not** use `npm run dev` as the Render start command; `npm start` runs the production server.

## First: local verification

Requires Node 22.12+.

```bash
npm install
npm run check
npm run build
npm run dev
```

Open the URL printed by Vite. To test the built version separately, stop the dev server, then use:

```bash
# Git Bash
NODE_ENV=production npm start
# Or PowerShell
# $env:NODE_ENV="production"; npm start
```

Open http://localhost:3001 and http://localhost:3001/api/health. Note: Production start with a configured OpenAI key **requires** SITE_ACCESS_PASSWORD. A locally configured SITE_ACCESS_PASSWORD also triggers a browser Basic Auth prompt when browsing the app.

## Push the code to GitHub

1. Create an empty repository, such as `aha-learning-app`.
2. Open Git Bash in **this folder** (where `package.json` and `render.yaml` are located).
3. Check that `.env` is ignored (`git check-ignore .env`, if you have one). Never upload your secret API key.
4. Run:

```bash
git init
git add .
git status
git commit -m "Prepare Aha for private Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aha-learning-app.git
git push -u origin main
```

Use your actual GitHub username and an existing repo URL. If the folder already has a Git remote, use `git remote -v` to check it first and use `git remote set-url origin ACTUAL_URL` if needed.

## Create the Render service

1. Log into https://dashboard.render.com/.
2. Choose **New → Web Service**, connect GitHub, and select the repository.
3. Select **Free** for development (Render may ask you to confirm a plan). Choose **Node** runtime.
4. Leave **Root Directory** blank if `package.json` is at the repo root.
5. Specify **Build Command:** `npm install --include=dev && npm run check && npm run build`.
6. Specify **Start Command:** `npm start`.
7. **Health Check Path:** `/api/health`.
8. **Environment Variables**:
   - `NODE_ENV=production`
   - `OPENAI_MODEL=gpt-6-luna` (or your verified working model)
   - `AI_REQUESTS_PER_HOUR=12`

Alternatively, use the included `render.yaml` via **New → Blueprint** and connect the repo.

### Choose one of two modes

**Mode A: public portfolio/demo preview — safest and costs no AI tokens**

* Do **not** configure `OPENAI_API_KEY` on Render. The built-in physics and trigonometry lessons work offline. AI-generated lessons, hint API, and grading show demo mode. You can share the web link publicly, though no authentication or cross-device storage exists.

**Mode B: private AI tutor preview**

In Render's **Environment** page, add secret environment variables (not in the Git repo):

* `OPENAI_API_KEY` = your *new, private* OpenAI API key
* `SITE_ACCESS_PASSWORD` = a strong password of 12+ characters (different from your API key)
* `AI_SIGNING_SECRET` = random 32+ character secret; optional but recommended (generate locally, never commit)

When this mode is enabled, visiting the site prompts you for a login:

* **Username:** `aha`
* **Password:** the value you set for `SITE_ACCESS_PASSWORD`

The server **refuses to start** in production if `OPENAI_API_KEY` is present but `SITE_ACCESS_PASSWORD` is missing. This protects against accidentally exposing an unmetered, paid API endpoint. This is **not a substitute for real authentication**: only share the password with trusted testers; HTTPS is required and is supplied by Render. Keep your project API spending alerts/limits conservative.

## After deployment

1. Visit the `https://YOUR-APP.onrender.com/` URL supplied by Render.
2. Verify `/api/health` reports `{ "ok": true, ... }`.
3. Check the home page and built-in lessons, choice formatting, Lock In, Galaxy, and profile.
4. In private AI mode, test one lesson and one hint; monitor API usage.
5. Open the same URL after refreshing to confirm pages work; try on phone.
6. Free Render services may sleep after 15 minutes of inactivity and take about a minute to wake. That is normal.

## Important limitations before a public launch

* **Friends, private messages, requests and sharing are local UI demos**. They are not delivered to other users.
* Homework, rewards, and user profiles are stored in each browser's localStorage; **not synchronized across devices or origins**. Moving from localhost to Render starts with a fresh browser profile.
* The optional HTTP Basic gate is appropriate only for *small private testing*, not a multi-user account system. It provides one shared password, no sign-up, no password recovery, no per-user permissions and no robust user-specific usage quotas.
* The in-memory API request limiter resets if Render restarts, and serverless/multi-instance scaling would require a shared limiter. Do **not** remove the password gate and expose billable AI endpoints publicly.
* PDF submissions and typed student answers are sent to the OpenAI API when AI features are enabled. Add user-facing privacy disclosures before involving students or public users.
* A production build and actual deployed URL must be verified by you (or a deployment connector) using your Render/GitHub access. This ZIP by itself does not create a live website.
