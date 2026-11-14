# Aha! V3.6.1 — Math + Lock In

## Fixed
- Render LaTeX across learning surfaces with KaTeX (`\(...\)`, `\[...\]`, `$...$`, `$$...$$`, common environments); no more literal `\mathbb` / `\mathbf` in question headings.
- Added LaTeX preview beneath question and notes editors while preserving original text input.
- Prompt AI lesson generation to use valid paired math delimiters.
- Kept content safe: untrusted plain copy is never interpreted as HTML; KaTeX `trust:false`.
- Lock In now displays an accessible confirmation dialog with mascot, optional fullscreen setting, cancellation and keyboard dismissal.
- Added parser tests for vectors, matrices, fractions, math delimiters, dollars and malformed input.

## Notes
- This version requires `katex` (installed by `npm install`).
- Local sessions are preserved on the same browser and origin; API keys are **not included**.
- The packaging environment cannot access the npm registry; the full production build and browser rendering need verification locally.
