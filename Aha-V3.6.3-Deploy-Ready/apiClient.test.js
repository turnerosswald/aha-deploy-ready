/**
 * Splits AI/user-written educational copy into ordinary text and safe TeX spans.
 * Supports common Markdown / MathJax delimiters without assuming text is HTML.
 * This module has no DOM or package dependencies so it can be unit tested in Node.
 */
const PAIRS = [
  { open: '\\\\[', close: '\\\\]', display: true }, // double-escaped delimiters from copied JSON
  { open: '\\\\(', close: '\\\\)', display: false },
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
];
const ENV_NAMES = ['align*', 'align', 'gather*', 'gather', 'equation*', 'equation', 'bmatrix', 'pmatrix', 'vmatrix', 'matrix', 'cases'];

function escaped(source, at) {
  let count = 0;
  for (let j = at - 1; j >= 0 && source[j] === '\\'; j--) count++;
  return count % 2 === 1;
}

function matchingDelimiter(source, at) {
  for (const pair of PAIRS) {
    if (!source.startsWith(pair.open, at)) continue;
    if (pair.open === '$' && escaped(source, at)) continue;
    // A lone dollar sign followed by a space usually denotes currency, not TeX.
    if (pair.open === '$' && (/\s/.test(source[at + 1] || '') || source[at + 1] === '$')) continue;
    const start = at + pair.open.length;
    let end = source.indexOf(pair.close, start);
    while (end !== -1 && (pair.close[0] === '$' && escaped(source, end) || pair.open === '$' && /\s/.test(source[end - 1] || ''))) {
      end = source.indexOf(pair.close, end + pair.close.length);
    }
    if (end < 0 || end === start) continue;
    // Dollar math cannot cross paragraphs, and shouldn't swallow normal prose.
    if (pair.open === '$' && source.slice(start, end).includes('\n')) continue;
    // JSON-pasted questions can contain double-escaped \( and \mathbb tokens.
    // Only normalize commands in that case; preserve matrix row breaks \\ 1.
    const content = pair.open.startsWith('\\\\')
      ? source.slice(start, end).replace(/\\\\(?=[A-Za-z])/g, '\\')
      : source.slice(start, end);
    return { start: at, end: end + pair.close.length, content, display: pair.display };
  }
  for (const name of ENV_NAMES) {
    const open = `\\begin{${name}}`, close = `\\end{${name}}`;
    if (!source.startsWith(open, at)) continue;
    const end = source.indexOf(close, at + open.length);
    if (end !== -1) return { start: at, end: end + close.length, content: source.slice(at, end + close.length), display: true };
  }
  return null;
}

export function tokenizeMath(value) {
  const source = String(value ?? '');
  const parts = [];
  let cursor = 0, textStart = 0;
  while (cursor < source.length) {
    const match = matchingDelimiter(source, cursor);
    if (!match) {cursor++; continue;}
    if (cursor > textStart) parts.push({type:'text', value:source.slice(textStart, cursor)});
    parts.push({type:'math', value:match.content, display:match.display});
    cursor = match.end;
    textStart = cursor;
  }
  if (textStart < source.length) parts.push({type:'text', value:source.slice(textStart)});
  return parts.length ? parts : [{type:'text', value:source}];
}

export function hasMath(value) {
  return tokenizeMath(value).some(part => part.type === 'math');
}
