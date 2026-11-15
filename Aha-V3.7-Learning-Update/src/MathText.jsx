import React from 'react';
import katex from 'katex';
import {tokenizeMath} from './mathTokens.js';

const OPTIONS = {throwOnError:false, trust:false, strict:'ignore', output:'htmlAndMathml'};

/** Render all math in learner-facing copy; never render untrusted source as HTML. */
export default function MathText({text, className='', as:Tag='span'}) {
  return <Tag className={`math-copy ${className}`.trim()}>{tokenizeMath(text).map((part,i) => {
    if (part.type !== 'math') return <React.Fragment key={i}>{part.value}</React.Fragment>;
    // KaTeX outputs both accessible MathML and safe formatted HTML. trust:false
    // disables dangerous HTML/URL commands from student or AI-generated TeX.
    const html = katex.renderToString(part.value,{...OPTIONS,displayMode:part.display});
    return <span key={i} className={`math-piece ${part.display?'math-display':'math-inline'}`} dangerouslySetInnerHTML={{__html:html}}/>;
  })}</Tag>;
}
