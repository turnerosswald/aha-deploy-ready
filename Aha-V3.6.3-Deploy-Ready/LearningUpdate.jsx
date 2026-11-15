/** Aha! API usage ledger. Redis is optional for durable, cross-function accounting.
 * Without Redis the counters are explicitly instance-only and NOT a quota.
 * Never store prompts, student answers, API keys, or passwords in this ledger.
 */
const ALLOWED = new Set(['lesson','feedback','hint','reflection','explain','review']);
const memory = new Map();
const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const positive = value => { if(value==null||String(value).trim()==='')return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; };

export function getPriceConfig(env = process.env) {
  const input = positive(env.OPENAI_INPUT_USD_PER_MILLION);
  const output = positive(env.OPENAI_OUTPUT_USD_PER_MILLION);
  return input === null || output === null ? null : { input, output };
}
export function tokenizeUsage(response) {
  const usage = response?.usage || {};
  const inputTokens = Math.max(0, Number(usage.input_tokens) || 0);
  const outputTokens = Math.max(0, Number(usage.output_tokens) || 0);
  return { inputTokens, outputTokens };
}
export function estimatedMicroUSD({ inputTokens, outputTokens }, price) {
  if (!price) return null;
  return Math.round(inputTokens * price.input + outputTokens * price.output);
}
export function redisConfigured(env = process.env) {
  return Boolean(env.UPSTASH_REDIS_REST_URL?.startsWith('https://') && env.UPSTASH_REDIS_REST_TOKEN);
}
async function redisPipeline(commands, env = process.env) {
  if (!redisConfigured(env)) throw new Error('Durable usage storage not configured.');
  const endpoint = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '') + '/pipeline';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Usage store temporarily unavailable.');
  const payload = await response.json();
  if (!Array.isArray(payload) || payload.some(p => p.error)) throw new Error('Usage store returned an error.');
  return payload.map(x => x.result);
}
const redisKey = day => `aha:usage:v1:${day}`;
const limitKey = day => `aha:quota:v1:${day}`;
function getOrCreate(day) {
  if (!memory.has(day)) memory.set(day, { requests: 0, inputTokens: 0, outputTokens: 0, costMicroUSD: 0, categories: {} });
  for (const key of memory.keys()) if (key !== day) memory.delete(key);
  return memory.get(day);
}

/** Apply a daily request cap only with shared Redis backing. If configured and
 * Redis is absent/down, fail closed instead of silently allowing spending. */
export async function reserveAiRequest(env = process.env) {
  const limit = Math.min(100000, Math.max(0, Math.trunc(Number(env.AI_DAILY_REQUEST_LIMIT) || 0)));
  if (!limit) return { allowed: true };
  if (!redisConfigured(env)) return { allowed: false, status: 503, message: 'Daily AI budget needs a shared usage store. Configure Upstash Redis or remove AI_DAILY_REQUEST_LIMIT.' };
  try {
    const [count] = await redisPipeline([['INCR', limitKey(utcDay())], ['EXPIRE', limitKey(utcDay()), 172800]], env);
    return Number(count) <= limit
      ? { allowed: true }
      : { allowed: false, status: 429, message: 'The private Aha! daily AI request budget has been reached. The guided demos still work offline.' };
  } catch {
    return { allowed: false, status: 503, message: 'The shared AI budget checker is unavailable. Please retry later.' };
  }
}
export async function recordAiUsage(category, response, env = process.env) {
  if (!ALLOWED.has(category)) return;
  const day = utcDay();
  const { inputTokens, outputTokens } = tokenizeUsage(response);
  const micro = estimatedMicroUSD({ inputTokens, outputTokens }, getPriceConfig(env));
  const bucket = getOrCreate(day);
  bucket.requests++;
  bucket.inputTokens += inputTokens;
  bucket.outputTokens += outputTokens;
  bucket.costMicroUSD += micro || 0;
  bucket.categories[category] = (bucket.categories[category] || 0) + 1;
  if (redisConfigured(env)) {
    try {
      await redisPipeline([
        ['HINCRBY',redisKey(day),'requests',1],
        ['HINCRBY',redisKey(day),'inputTokens',inputTokens],
        ['HINCRBY',redisKey(day),'outputTokens',outputTokens],
        ['HINCRBY',redisKey(day),'costMicroUSD',micro || 0],
        ['HINCRBY',redisKey(day),`cat:${category}`,1],
        ['EXPIRE',redisKey(day),60*60*24*40],
      ],env);
    } catch (error) {
      console.warn('Aha usage ledger could not persist counters:',error.message);
    }
  }
  return {category,inputTokens,outputTokens,at:new Date().toISOString()};
}

export async function getUsageSnapshot(env = process.env) {
  const day = utcDay();
  const price = getPriceConfig(env);
  let row = getOrCreate(day);
  let scope = 'instance-only';
  if (redisConfigured(env)) {
    try {
      const [flat] = await redisPipeline([['HGETALL', redisKey(day)]],env);
      const fields = Array.isArray(flat) ? Object.fromEntries(Array.from({length:Math.floor(flat.length/2)},(_,i)=>[flat[i*2],flat[i*2+1]])) : (flat || {});
      row = {
        requests: Number(fields.requests)||0,
        inputTokens: Number(fields.inputTokens)||0,
        outputTokens: Number(fields.outputTokens)||0,
        costMicroUSD: Number(fields.costMicroUSD)||0,
        categories: Object.fromEntries([...ALLOWED].map(c=>[c,Number(fields[`cat:${c}`])||0])),
      };
      scope = 'shared-durable';
    } catch { scope = 'store-unavailable'; }
  }
  const cap = Math.max(0,Math.trunc(Number(env.AI_DAILY_REQUEST_LIMIT)||0));
  return { day, scope, categories: row.categories, requests: row.requests,
    inputTokens: row.inputTokens, outputTokens: row.outputTokens,
    estimatedCostUSD: price ? Number((row.costMicroUSD/1e6).toFixed(6)) : null,
    pricingConfigured: Boolean(price), priceRates: price, model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    requestLimit: cap || null,
    note: scope === 'shared-durable' ? 'Daily totals across functions, stored in Upstash Redis.' :
      scope === 'store-unavailable' ? 'Shared usage store unavailable; displayed numbers may be incomplete.' :
      'Instance-only counters reset when a serverless function restarts and are NOT a spending cap.' };
}
