/** Local-only Friends UI preview. No real identities, accounts, or message delivery. */
export const DEMO_FRIENDS=[
 {id:'demo-nova',handle:'nova_aster',name:'Nova',avatarId:'mint',xp:735,streak:7,subject:'Geometry',sample:true},
 {id:'demo-kai',handle:'kailovesmath',name:'Kai',avatarId:'copper',xp:285,streak:3,subject:'Physics',sample:true},
 {id:'demo-luna',handle:'moonlit_luna',name:'Luna',avatarId:'blue',xp:1420,streak:12,subject:'Trigonometry',sample:true},
];
export const SOCIAL_STORAGE_KEY='aha-friends-preview-v351';
export const emptySocial=()=>({friends:DEMO_FRIENDS.map(x=>({...x})),requests:[],blocked:[],messages:{}});
export function normalizeHandle(value){return String(value||'').trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,26);}
export function addPendingRequest(social,input){
 const handle=normalizeHandle(input);
 if(handle.length<3)return {state:social,error:'Use at least three letters or numbers for a handle.'};
 if([...social.friends,...social.requests,...social.blocked].some(x=>x.handle===handle))return {state:social,error:'That handle is already in your local list.'};
 return {state:{...social,requests:[...social.requests,{id:`req-${handle}`,handle,name:handle,sample:false}]},error:null};
}
export function blockFriend(social,id){
 const target=social.friends.find(f=>f.id===id);
 if(!target)return social;
 return {...social,friends:social.friends.filter(f=>f.id!==id),blocked:[...social.blocked,target]};
}
export function unblockFriend(social,id){
 const target=social.blocked.find(f=>f.id===id);
 if(!target)return social;
 return {...social,blocked:social.blocked.filter(f=>f.id!==id),friends:[...social.friends,target]};
}
export function previewMessage(social,friendId,text,lesson=null){
 if(!social.friends.some(f=>f.id===friendId))return social;
 const content=String(text||'').trim().slice(0,2000);
 if(!content&&!lesson)return social;
 const entry={id:`msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,at:new Date().toISOString(),from:'me',text:content,lesson:lesson?{title:lesson.title,subject:lesson.subject,problem:String(lesson.problem||'').slice(0,800),reasoning:lesson.reasoning?String(lesson.reasoning).slice(0,4000):null}:null};
 return {...social,messages:{...social.messages,[friendId]:[...(social.messages[friendId]||[]),entry].slice(-120)}};
}

/** Users explicitly choose whether to include their answers when copying/sharing. */
export function sessionShareText(session,{includeReasoning=false}={}){
 if(!session?.lesson)return '';
 const l=session.lesson;
 const chunks=[`Aha! learning session: ${l.title}`,`Subject: ${l.subject||'Homework'}`,l.problem||l.overview||''];
 if(includeReasoning&&Array.isArray(l.steps)){
  for(let i=0;i<l.steps.length;i++){
   const r=session.responses?.[i];
   if(!r)continue;
   const answer=l.steps[i].options?.[r.selectedIndex]?.label;
   chunks.push(`Step ${i+1}: ${l.steps[i].question}`,answer?`Choice: ${answer}`:'',r.why?`My thinking: ${r.why}`:'');
  }
 }
 return chunks.filter(Boolean).join('\n');
}
export function sessionSharePayload(session,{includeReasoning=false}={}){
 if(!session?.lesson)return null;
 const l=session.lesson;
 return {title:l.title,subject:l.subject,problem:String(l.problem||l.overview||'').slice(0,800),
   reasoning:includeReasoning?sessionShareText(session,{includeReasoning:true}).slice(0,4000):null};
}
