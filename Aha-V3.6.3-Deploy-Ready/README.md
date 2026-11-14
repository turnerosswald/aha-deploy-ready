> **Deploying Aha! online?** Read [DEPLOY_RENDER.md](DEPLOY_RENDER.md). This V3.6.3 preview serves React and Express on one Render service and can optionally be password-gated for private AI testing. It does not include live Friends messaging or accounts.

> **Latest update: V3.6.2.** Fixed broken LaTeX rendering specifically inside AI answer choices. Read `CHANGELOG_V3_6_2.md`.

# Aha! V3.6.1 — AI Tutor + LaTeX + Lock In

A distinctive, cheerful, guided-learning web app, built with **React 19 + Vite** and an optional **Node/Express API**. This version is based on the functional V3.5 source and retains saved lesson sessions and avatars.

## Run it

Requirements: **Node.js 22.12+**, npm, and access to the npm registry.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. `npm run dev` launches the Vite web app and Express API in parallel. You can try the ladder and physics demos **without an API key**.

```bash
npm test         # 37 offline tests, including math parsing and the AI contract
npm run check    # Node syntax checks + offline tests
npm run build    # Vite production frontend build; requires installed dependencies
```

The ZIP intentionally excludes `node_modules` and `dist`.

## What's new in V3.5.1

- **No hearts, daily strikes, or answer lockouts.** Keep studying, retrying, requesting hints, or moving ahead as often as you need. Wrong answers do not subtract XP.
- **Learning momentum.** Each newly *mastered* step (correct option **and** meaningful reasoning) increases the chain and boosts the XP awarded. The multiplier starts at ×1.00, the first mastered step awards 31 XP at ×1.25, and it is capped at ×3.00. Wrong choices reset only the momentum chain, not earned XP. Guided answers award 10 XP; full-mastery lesson completion awards 35 XP.
- **More visible XP.** Header badge, lesson momentum indicator, progress graph, and rock level rail make rewards easy to see. Old V3.5 XP records are preserved as their original values.
- **16 unlockable rocks** (up from 8), with collectible avatar art and animated level cards. Click a rock to open an **achievement explanation** showing exactly how it unlocks. Clicking an unlocked rock also equips it as your visible avatar.
- **My Profile.** Larger equipped avatar, name, level, XP, streak and an achievement shelf. The header avatar opens this page.
- **Animated visual system.** Independently animated gradient cards, softly shifting space backgrounds, XP rails, level selectors and mastery meters. Animation can be reduced in Settings, or through the OS reduced-motion preference.
- **Friends tab (local preview, not a deployed service).** Three clearly identified example profiles with XP/avatars/streaks, local add-request and block/unblock prototypes, messaging UI, invitation copy, and sharing homework or (by explicit opt-in) your written answers. The UI persists its demo state in localStorage. **No real people receive messages or friend requests yet.**
- **Existing learning flow remains.** Library lists saved lessons only, PDF/question input, offline 25-foot ladder and vertical-motion demos, semantic answer checking (with optional AI), Enter to check or advance, Lock In focus mode and confetti on mastery.

## Important: what requires the next API/deployment pass

**Friends, invitations, profiles, and messages are not a functioning online network yet.** Only the sender's browser saves demo messages, and example friend stats are sample data. This is deliberate: real friend features require accounts, authentication, privacy permissions, a database, verified user IDs, API access controls, real-time message delivery, and abuse prevention. Do not market this demo as a live multi-user social platform.

The AI tutoring routes in `server.js` now support AI lesson creation, explanation checking, and personalized hints when `OPENAI_API_KEY` is configured. See `API_SETUP.md`. Create `.env` from `.env.example` in the **server working directory**, keep the API key on the server, and **never place it in `VITE_*` browser environment variables**. API routes also need production auth, quotas, input constraints and deployment testing before public use.

For a deployment checklist, see `DEPLOYMENT_NEXT_STEPS.md`.

## Your existing data

Lesson sessions, XP, equipped avatar and settings use the same `localStorage` key, `aha-learning-mvp-v1`, so upgrading the project while using the **same browser and origin** preserves progress. Friend preview state uses `aha-friends-preview-v351`. If you change domains, browsers do not automatically migrate storage. Export your old data before switching origins if you need to retain it.

## Code map

- `src/App.jsx` — app navigation, learning flow, progress, momentum, profile, local storage
- `src/SpaceGame.jsx` — animated Galaxy level map, SVG rocks, achievement details
- `src/rewards.js` — rock milestone thresholds and unlocks
- `src/momentum.js` — multiplier rules and backwards-compatible XP totals
- `src/FriendsHub.jsx`, `src/social.js` — clearly labeled local social prototype, previews and sharing tools
- `src/styles.css` — styling, animated surfaces and reduced-motion styles
- `src/demo.js`, `src/validation.js` — bundled educational demos and offline answer checks
- `server.js`, `server/ai.js` — optional AI routes, server-side key handling
- `tests/` — offline tests for demos, levels, XP, momentum and social sharing

## Test disclosure

**37 offline tests and Node syntax checks passed in the packaging environment.** A full React/Vite production build was *not* completed because the npm registry was unreachable in the packaging environment. Please run `npm install && npm run build` locally or in CI prior to deploying. This is a source ZIP, not a compiled deployable bundle.

## What's new in V3.6 — AI Tutor API

**See [API_SETUP.md](API_SETUP.md) for step-by-step instructions.** The AI tutor uses a backend-held `OPENAI_API_KEY` and OpenAI Responses API. You can generate guided lessons from homework questions or readable PDFs, get AI review of natural-language explanations, and request a personal, answer-free hint for any current step. Settings includes an API status check and lets you switch built-in demo lessons back to purely offline checking.

All existing Galaxy, momentum, sessions, rock avatars and local Friends preview features remain intact. **Real friends, authentication and messaging are not deployed yet.** An API key is *not included* and must be configured yourself. A paid ChatGPT subscription does not provide API credits automatically.

The backend now uses signed per-step tokens, trusted demo step references, bounded inputs, provider timeouts and a single-process request cap. These improve the private prototype but **do not make it safe for an unprotected public deployment** without authentication and persistent per-user budgets.

## What's new in V3.6.1 — Formatted math and a better Lock In ritual

- **Actual KaTeX rendering.** Inline `\(...\)`, block `\[...\]`, `$...$`, `$$...$$`, and common TeX environments render as math in the lesson title, overview, homework, READ FIRST panel, questions, answer choices, feedback, hints, worked explanations, Library, and homework sharing preview. Matrices (including `bmatrix`), vectors (`\mathbf{v}`), fractions and Greek letters are supported by KaTeX.
- **Safe rendering.** The app parses math spans instead of inserting the original question as raw HTML. KaTeX is configured with `trust:false`. Malformed TeX should show an error marker rather than crashing the lesson. Plain text remains plain text.
- **Live question/notes preview.** Paste LaTeX into the question textarea, and a formatted preview appears under it while the original editable text stays untouched.
- **More consistent AI formatting.** The generation prompt asks the AI to wrap math in standard matched delimiters throughout generated fields, for cleaner new lessons.
- **Lock In confirmation popup.** The yellow LOCK IN! button now opens a playful study-buddy popup explaining the distraction-free learning experience. You can choose optional fullscreen, cancel, dismiss with Escape, or enter and exit focus. The dialog traps keyboard focus and honors reduce-motion settings. Fullscreen and platform-level notifications are controlled by your browser/device, not by Aha!.
- **Backward compatible.** Existing sessions and XP keep the same browser localStorage key, so stored AI lessons should display their TeX after this update without regeneration.

The new `katex` dependency installs during `npm install`; its styles and local font assets are bundled with the Vite app. If you used the old ZIP, extract this new one into a separate folder, copy your existing **server-side** `.env` securely, then run `npm install` and `npm run dev`.
