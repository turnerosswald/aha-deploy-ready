import {tokenizeMath} from './mathTokens.js';

/** A single dense formula should not be squeezed into a half-width answer card. */
export function shouldStackChoices(options) {
  return (options || []).some(option => {
    const text = String(option?.label ?? option ?? '');
    const math = tokenizeMath(text).filter(part => part.type === 'math');
    // A matrix, piecewise expression, long TeX equation or lengthy option
    // gets its own line. Text-only and short math options remain two-column.
    return math.some(part =>
      /\\begin\s*\{(?:[pbvBV]?matrix|array|cases)\}/.test(part.value) ||
      part.display || part.value.length > 35
    ) || text.length > 110;
  });
}
