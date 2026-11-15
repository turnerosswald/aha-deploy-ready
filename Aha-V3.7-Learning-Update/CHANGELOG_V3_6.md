# Aha! V3.6 — AI Tutor API

- Finished frontend-to-backend wiring for three AI features: guided lesson generation (prompt / notes / PDF), explanation evaluation, and on-demand Socratic hints.
- Added a small **Ask Aha!** hint field right in the lesson flow. It does not replace the step-by-step learning interface.
- Enabled optional AI reasoning feedback for the built-in ladder and physics demos; offline grading remains available and is the automatic fallback when live AI fails.
- Added trusted demo-step lookup and **HMAC-signed generated lesson tokens** to avoid accepting client-manipulated correct answer indices for grading requests.
- Added a best-effort request budget, input limits, safe errors, provider timeouts, and health/configuration indicator. Not yet hardened for public anonymous deployment.
- Added API connection check, model label and optional "AI feedback on demo lessons" toggle in Settings; never enter a secret key in the browser.
- Preserved previous V3.5.1 rock Galaxy, momentum, local Friends demo, progress and session storage schema.
- Added tests for signatures, expiry, tampering, trusted demo source, rate limiting, response normalization, and browser API client.
- See `API_SETUP.md` for step-by-step local setup, costs/security limitations and exact API endpoints.
