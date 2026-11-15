import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldStackChoices} from '../src/choiceLayout.js';

const opt = label => ({label});
test('short answer choices keep compact two-column layout', () => {
  assert.equal(shouldStackChoices([opt('No'),opt('Yes'),opt(String.raw`\(x+1\)`),opt('Maybe')]),false);
});
test('matrix answer choices get readable full-width rows', () => {
  assert.equal(shouldStackChoices([opt('None'),opt(String.raw`\(\mathbf{a} = \begin{bmatrix}1\\2\end{bmatrix}\)`),opt('Other')]),true);
});
test('lengthy linear combination options get full-width rows', () => {
  assert.equal(shouldStackChoices([opt(String.raw`\(\mathbf{v}=c_1\mathbf{a}_1+c_2\mathbf{a}_2\)`)]),true);
});
test('display equations get full-width rows', () => {
  assert.equal(shouldStackChoices([opt(String.raw`\[x^2=1\]`)]),true);
});
test('ordinary long prose gets full-width rows', () => {
  assert.equal(shouldStackChoices([opt('a'.repeat(112))]),true);
});
