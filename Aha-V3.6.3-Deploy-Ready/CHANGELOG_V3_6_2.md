# Aha! V3.6.2 — Math answer choices fix

**Bug fixed:** Generic `.choice span` and `.choice.chosen span` rules applied the 34×34 letter-badge box to every nested KaTeX `<span>`, collapsing equations into tiny scrollbar boxes. The CSS now targets ONLY direct child `.choice-letter` badges, and the choice check icon is scoped as well.

**Readability:** Dense TeX and matrix choices automatically expand to single-column full-width cards. Inline equations are no longer scrollers. Short text/short equations stay in the usual two-column layout, including on previously saved AI lessons.

**Regression coverage:** New tests verify that answer math remains structurally unstyled by letter badges and that expression-heavy options use the wide layout.

**Running:** `npm install`, then `npm run dev` (without a port argument). Vite prints the frontend URL; Express defaults to port 3001. Do not commit your `.env` API key.
