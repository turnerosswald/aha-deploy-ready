import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeMath,hasMath} from '../src/mathTokens.js';

const maths = s => tokenizeMath(s).filter(x=>x.type==='math');

test('AI-generated linear algebra text renders inline vectors and R-squared',()=>{
  const s=String.raw`A vector \(\mathbf{v}\) is in \(\mathbb{R}^2\), and \(\mathbf{a}_1\) is a basis vector.`;
  assert.equal(maths(s).length,3);
  assert.deepEqual(maths(s).map(p=>p.value),[String.raw`\mathbf{v}`,String.raw`\mathbb{R}^2`,String.raw`\mathbf{a}_1`]);
});
test('a bmatrix with two rows stays inside one math segment',()=>{
  const s=String.raw`\(\mathbf{a}_1 = \begin{bmatrix}1 \\ 1\end{bmatrix}\)`;
  assert.equal(maths(s).length,1);
  assert.ok(maths(s)[0].value.includes(String.raw`\\ 1`));
});
test('display equations using bracket syntax and double dollars',()=>{
  const s=String.raw`\[x = \frac{13.5}{25}\] and $$\theta=57^\circ$$`;
  assert.deepEqual(maths(s).map(p=>p.display),[true,true]);
});
test('single dollar math and raw environment work',()=>{
  const s=String.raw`Let $x^2+y^2=1$. Then \begin{pmatrix}1\\2\end{pmatrix}.`;
  assert.equal(maths(s).length,2);
  assert.deepEqual(maths(s).map(p=>p.display),[false,true]);
});
test('money, escaped dollars, unmatched delimiters and ordinary prose stay text',()=>{
  for(const s of ['The API costs $5 and $10.',String.raw`Pay \$5, not \$9.`,String.raw`A half-finished \(x^2`,'A simple normal question']){
    assert.equal(hasMath(s),false,s);
    assert.equal(tokenizeMath(s).map(p=>p.value).join(''),s);
  }
});
test('some copied double-escaped LaTeX delimiters are recognized',()=>{
  const s=String.raw`The set \\(\\mathbb{R}^2\\) is two-dimensional.`;
  assert.equal(maths(s).length,1);
  assert.equal(maths(s)[0].value,String.raw`\mathbb{R}^2`);
});
test('regular content stays intact around math',()=>{
  const s=String.raw`A vector \(\mathbf{v}\) in \(\mathbb{R}^2\).`;
  assert.equal(tokenizeMath(s).filter(p=>p.type==='text').map(p=>p.value).join(''),'A vector  in .');
});
