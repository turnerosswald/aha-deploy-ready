# Deployment + API readiness checklist

The guided educational demo can run locally without a paid key. Before offering Aha! publicly:

1. **Build verification.** Install packages, run `npm run check` and `npm run build`, and test both demos end to end on desktop and mobile.
2. **AI tutoring API integrated locally.** V3.6 adds signed steps, input sizes, a single-process limiter and personalized hints. Before launching publicly: configure a private `OPENAI_API_KEY`, complete live model + PDF tests, add authenticated user budgets and distributed rate limiting; never rely on the current in-memory limiter alone.
3. **Authentication.** Add login/sign-up, verified user IDs, session management, account recovery and account deletion. Do not use untrusted client-supplied friend IDs as authorization.
4. **Persistent storage.** Store users, sessions, progress, friend relationships and messages in a database (e.g. Postgres). Add migrations, indexes and backup policy. Implement an explicit local-progress import flow.
5. **Social permissions.** Authenticated friend requests and approval, privacy settings for XP/streaks/profile, secure block enforcement on API queries and messages, report/moderation controls.
6. **Chat and homework sharing.** Implement actual message delivery (polling/WebSocket), per-conversation access controls, permissioned chat/document sharing, attachment security, retention and delete controls. Never send a student's explanations without an explicit share action.
7. **Deployment.** V3.6.3 supports a single Render web service: Express serves Vite-built static files and `/api` from one origin. See `DEPLOY_RENDER.md`. No cross-origin CORS is necessary in this arrangement. The single shared password is for a private preview, not a replacement for public-user accounts.
8. **Accessibility and security.** Review focus handling in modal dialogs, keyboard-only use, reduced motion, privacy policy and abuse scenarios; test cross-device sync and block rules.

**Current social view is a local demonstration only.** It is not live online messaging. The visual API-ready UI is not a substitute for server-side services.
