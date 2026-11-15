# Aha! V3.5 · Rock Galaxy

- Added Game / Rock Galaxy tab with eight XP-based levels, rock collectibles and selectable reward avatars.
- Added ambient CSS stars, bubbles and meteors (reduced-motion supported).
- Mixed paper, pixel-cut and softly rounded surface styles for more cohesive card art.
- Made explanation checking kinder and recognize short natural phrasing, including “At the top the ball stops moving.”
- Added a guided continuation for correct choices needing more explanation, worth 10 XP without granting mastery.
- Preserved the existing session localStorage key and optional OpenAI API/PDF workflow.
- Completion XP for new lessons is only awarded when all steps are mastered.

## Verified

- 13 Node.js unit tests pass.
- `npm run check` passes.
- App and SpaceGame JSX parse without syntax errors via the TypeScript parser.
- Full Vite production build NOT verified: `npm install` timed out, and `vite` was not available here. Run `npm install && npm run build` locally before deployment.
