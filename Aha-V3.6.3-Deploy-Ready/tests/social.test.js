import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySocial,normalizeHandle,addPendingRequest,blockFriend,unblockFriend,previewMessage,sessionShareText,sessionSharePayload} from '../src/social.js';
test('friend handles normalize safely and cannot duplicate',()=>{
 let state=emptySocial();
 assert.equal(normalizeHandle(' @Hello.World! '),'hello.world');
 const added=addPendingRequest(state,'@Someone');
 assert.equal(added.error,null);
 assert.equal(added.state.requests[0].handle,'someone');
 assert.ok(addPendingRequest(added.state,'@someone').error);
 assert.ok(addPendingRequest(state,'x').error);
});
test('blocking hides user from friend list and chat destination',()=>{
 let state=emptySocial();const id=state.friends[0].id;
 state=blockFriend(state,id);
 assert.equal(state.friends.some(f=>f.id===id),false);
 assert.equal(state.blocked.some(f=>f.id===id),true);
 assert.equal(previewMessage(state,id,'hey'),state);
 state=unblockFriend(state,id);
 assert.equal(state.friends.some(f=>f.id===id),true);
});
test('homework and messages remain local preview state',()=>{
 let state=emptySocial();const id=state.friends[0].id;
 state=previewMessage(state,id,'Can you help?',{title:'Ladder',subject:'Trig',problem:'Angle?'});
 assert.equal(state.messages[id][0].text,'Can you help?');
 assert.equal(state.messages[id][0].lesson.title,'Ladder');
 assert.equal(state.messages[id].length,1);
});

test('sharing conversation requires explicit includeReasoning choice',()=>{
 const session={lesson:{title:'Ladder',subject:'Trigonometry',problem:'25 ft ladder',steps:[{question:'Which ratio?',options:[{label:'Cosine'}]}]},responses:{0:{selectedIndex:0,why:'Adjacent over hypotenuse'}}};
 assert.ok(!sessionShareText(session).includes('Adjacent over hypotenuse'));
 assert.ok(!sessionSharePayload(session).reasoning);
 assert.match(sessionShareText(session,{includeReasoning:true}),/Adjacent over hypotenuse/);
});
