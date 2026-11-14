import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
test('answer letter styling cannot apply to nested KaTeX spans',()=>{
  assert.match(css,/\.choice\s*>\s*\.choice-letter\s*\{/);
  assert.match(css,/\.choice\.chosen\s*>\s*\.choice-letter\s*\{/);
  assert.doesNotMatch(css,/\.choice\s+span\s*\{/);
  assert.doesNotMatch(css,/\.choice\.chosen\s+span\s*\{/);
});
test('choice markup labels badges and supports wide math',()=>{
  assert.match(app,/className="choice-letter"/);
  assert.match(app,/className="choice-content"/);
  assert.match(app,/shouldStackChoices\(step\.options\)/);
});
