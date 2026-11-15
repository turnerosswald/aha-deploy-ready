import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeUsage,estimatedMicroUSD,getPriceConfig,reserveAiRequest,getUsageSnapshot} from '../server/usage.js';
test('usage estimates require explicitly configured prices',()=>{
 assert.equal(getPriceConfig({}),null);
 assert.equal(estimatedMicroUSD({inputTokens:500,outputTokens:100},{input:0.4,output:1.6}),360);
 assert.deepEqual(tokenizeUsage({usage:{input_tokens:500,output_tokens:100}}),{inputTokens:500,outputTokens:100});
});
test('budget fail closed without durable store only when a cap is configured',async()=>{
 assert.deepEqual(await reserveAiRequest({}),{allowed:true});
 const result=await reserveAiRequest({AI_DAILY_REQUEST_LIMIT:'50'});
 assert.equal(result.allowed,false);assert.equal(result.status,503);
});
test('usage snapshot makes ephemeral accounting transparent',async()=>{
 const row=await getUsageSnapshot({});assert.equal(row.scope,'instance-only');assert.equal(row.pricingConfigured,false);
});
