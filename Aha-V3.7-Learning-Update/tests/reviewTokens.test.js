import test from 'node:test';
import assert from 'node:assert/strict';
import {sealReviewStep,unsealReviewStep} from '../server/reviewTokens.js';
const step={question:'Which equation?',options:[{label:'a'},{label:'b'},{label:'c'},{label:'d'}],correctIndex:2};
test('encrypted review tokens conceal answer and resist tampering',()=>{
 const token=sealReviewStep(step,{secret:'test-secret',now:1000});
 assert.deepEqual(unsealReviewStep(token,{secret:'test-secret',now:1001}),step);
 assert.equal(Buffer.from(token,'base64url').includes(Buffer.from('correctIndex')),false);
 assert.throws(()=>unsealReviewStep(token,{secret:'different',now:1001}));
 assert.throws(()=>unsealReviewStep(token,{secret:'test-secret',now:1000+86400001}));
});
test('feedback contract accepts encrypted review keys, not supplied solution keys',async()=>{
 const {validateFeedbackInput}=await import('../server/apiContract.js');
 const token=sealReviewStep(step);
 assert.equal(unsealReviewStep(token).correctIndex,2);
 assert.equal(validateFeedbackInput({reviewToken:token,selectedIndex:2,why:'The relevant relationship matches.'}).step.correctIndex,2);
 assert.throws(()=>validateFeedbackInput({reviewToken:'fake',selectedIndex:2,why:'some reason'}));
});
