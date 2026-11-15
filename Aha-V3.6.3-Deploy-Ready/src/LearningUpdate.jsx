import React,{useEffect,useState} from 'react';
import {ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronUp,Lightbulb,RotateCcw,Sparkles,Star,RefreshCcw,Zap} from 'lucide-react';
import MathText from './MathText.jsx';
import {apiRequest} from './apiClient.js';
import {questStatus,rockFragments} from './learningUpdate.js';

/** An optional, genuinely checked one-sentence reflection after a lesson. */
export function AhaMoment({session,aiReady,onAssessed,onDraft,onUsage}){
 const [draft,setDraft]=useState(session.reflection?.text||'');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{setDraft(session.reflection?.text||'');setError('');},[session.id]);
 const result=session.reflection;
 const submit=async()=>{
  if(busy||draft.trim().length<3)return;
  if(!aiReady){setError('Your AI tutor needs to be connected to check an Aha! moment. You can still save the reflection.');return;}
  setBusy(true);setError('');
  try{
   const reply=await apiRequest('/api/reflection',{body:{subject:session.lesson.subject||'',lessonTitle:session.lesson.title||'',summary:session.lesson.finalSummary||session.lesson.overview||'',reflection:draft.trim()},timeoutMs:40000});
   onUsage?.(reply.usage);onAssessed(draft.trim(),reply.reflection);
  }catch(e){setError(e.message||'Could not check that reflection. Try again later.');}
  finally{setBusy(false);}
 };
 return <section className="aha-moment" aria-labelledby="aha-moment-title">
  <div className="aha-head"><span className="aha-glow">✳</span><div><span className="eyebrow">A LITTLE BONUS ROUND · OPTIONAL</span><h3 id="aha-moment-title">What was your <em>aha!</em> moment?</h3><p>What finally clicked? One thoughtful sentence is enough.</p></div></div>
  <textarea aria-label="Explain your aha moment" rows={3} maxLength={1600} value={draft} placeholder="I realized that..." onChange={e=>{setDraft(e.target.value);onDraft(e.target.value);}}/>
  {result?.feedback&&<div className={`aha-assessment ${result.understood?'got-it':'keep-thinking'}`} role="status"><strong>{result.understood?'✦ You made the connection!':'✦ Almost there — keep exploring'}</strong><p><MathText text={result.feedback}/></p>{!result.understood&&result.followUp&&<small><MathText text={result.followUp}/></small>}{result.rewarded&&<span className="aha-earned"><Star size={15}/> +20 XP earned once</span>}</div>}
  {error&&<p className="tutor-error" role="alert">{error}</p>}
  <div className="aha-actions"><button className="action-button" type="button" disabled={busy||draft.trim().length<3} onClick={submit}>{busy?'Thinking with you…':result?.rewarded?'Check my new reflection':'Check my Aha! moment'}<Sparkles size={17}/></button><span>Your reflection is saved here. Checking it uses one AI request.</span></div>
 </section>;
}

/** Alternative explanations use the existing signed lesson reference and don't move the lesson. */
export function ExplainDifferently({reference,aiReady,onUsage}){
 const [expanded,setExpanded]=useState(false);
 const [choice,setChoice]=useState(null);
 const [results,setResults]=useState({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const modes=[['simpler','Make it simpler'],['analogy','Give an analogy'],['example','Show another example']];
 const request=async mode=>{
  setChoice(mode);setError('');
  if(results[mode]||busy)return;
  setBusy(true);
  try{
   const payload=await apiRequest('/api/explain',{body:{...reference,mode},timeoutMs:40000});
   onUsage?.(payload.usage);setResults(x=>({...x,[mode]:payload.help}));
  }catch(e){setError(e.message||'Try again in a moment.');}
  finally{setBusy(false);}
 };
 if(!aiReady)return null;
 return <div className="alternate-explain">
  <button className="alternate-trigger" type="button" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}><RefreshCcw size={18}/> Explain it differently {expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>
  {expanded&&<div className="alternate-body"><p>Same idea, a new way to see it. Your current answer and progress won't change.</p><div className="alternate-modes">{modes.map(([id,label])=><button key={id} type="button" className={choice===id?'active':''} disabled={busy||!reference} onClick={()=>request(id)}>{label}</button>)}</div>
  {busy&&<p role="status" className="alternate-wait">✦ Your buddy is finding a different angle…</p>}
  {choice&&results[choice]&&<div className="alternate-result" role="status"><strong>✦ A different perspective</strong><p><MathText text={results[choice].explanation}/></p><small>Think about this: <MathText text={results[choice].checkQuestion}/></small></div>}
  {error&&<p className="tutor-error" role="alert">{error}</p>}<small>Uses your private AI tutor. Does not reveal the active answer.</small></div>}
 </div>;
}

export function DailyQuests({plan,events,onPractice}){
 if(!plan)return null;
 const quests=questStatus(plan,events);
 const claimed=quests.filter(q=>q.claimed).length;
 return <section className="daily-quests" aria-labelledby="quest-heading"><div className="daily-quest-head"><div><span className="eyebrow">THE TINY ADVENTURES BOARD</span><h2 id="quest-heading">Daily mini quests <span>✷</span></h2><p>Three little challenges. No punishment for missing a day.</p></div><div className="quest-fraction"><b>{claimed}/{quests.length}</b><span>COMPLETE</span></div></div>
  <div className="quest-rail" aria-label={`${claimed} of ${quests.length} quests completed`}><span style={{width:`${quests.length?100*claimed/quests.length:0}%`}}/></div>
  <div className="quest-items">{quests.map((quest,i)=><div className={`quest-card ${quest.claimed?'complete':''}`} key={quest.id}><div className="quest-glyph">{quest.icon}</div><div><strong>{quest.title}</strong><p>{quest.detail}</p><small>{quest.claimed?'✦ +12 XP & 1 rock shard earned':'+12 XP · 1 rock shard'}</small></div><div className="quest-check" aria-label={quest.claimed?'Quest complete':'Quest available'}>{quest.claimed?<CheckCircle2 size={22}/>:<span>{i+1}</span>}</div></div>)}</div>
  <div className="quest-footer"><span>◆ {rockFragments(events)} rock shards collected</span><button className="secondary-button" type="button" onClick={onPractice}>Keep learning <ArrowRight size={16}/></button></div>
 </section>;
}

/** Voluntary, AI-verified fresh practice. No "mark done" button or pre-shown key. */
export function MistakeMuseum({mistakes=[],aiReady,onResolve,onUsage}){
 const [selected,setSelected]=useState(null);
 const [practice,setPractice]=useState(null);
 const [answer,setAnswer]=useState(null);
 const [why,setWhy]=useState('');
 const [feedback,setFeedback]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const item=mistakes.find(m=>m.id===selected);
 const open=id=>{setSelected(selected===id?null:id);setPractice(null);setAnswer(null);setWhy('');setFeedback(null);setError('');};
 const start=async()=>{
  if(!item||busy||!aiReady)return;
  setBusy(true);setError('');setFeedback(null);setAnswer(null);setWhy('');
  try{
   const reply=await apiRequest('/api/review',{body:{subject:item.subject,concept:item.concept,originalQuestion:item.question,misconception:item.misconception,takeaway:item.takeaway},timeoutMs:42000});
   onUsage?.(reply.usage);setPractice(reply.practice);
  }catch(e){setError(e.message||'Could not create practice right now.');}
  finally{setBusy(false);}
 };
 const grade=async()=>{
  if(!practice||answer===null||why.trim().length<2||busy)return;
  setBusy(true);setError('');
  try{
   const reply=await apiRequest('/api/feedback',{body:{reviewToken:practice.reviewToken,selectedIndex:answer,why},timeoutMs:42000});
   onUsage?.(reply.usage);const response=reply.feedback;setFeedback(response);
   if(response.correct&&response.level==='strong')onResolve(item.id);
  }catch(e){setError(e.message||'Could not check your practice answer.');}
  finally{setBusy(false);}
 };
 return <section className="mistake-museum" aria-labelledby="museum-heading"><div className="museum-heading"><div><span className="eyebrow">TURN ROUGH EDGES INTO SPARKLES</span><h2 id="museum-heading">Mistake Museum <span>◆</span></h2><p>Past confusions are clues, not failures. Polish them when you're ready.</p></div><span className="museum-count">{mistakes.filter(m=>m.status==='resolved').length}/{mistakes.length} POLISHED</span></div>
  {!mistakes.length?<div className="museum-empty">✦ No saved misunderstandings yet. When something feels tricky, we'll keep it here for optional practice.</div>:
   <div className="museum-grid">{mistakes.slice(0,24).map(m=><button type="button" key={m.id} onClick={()=>open(m.id)} aria-expanded={selected===m.id} className={`museum-tile ${m.status==='resolved'?'polished':''} ${selected===m.id?'selected':''}`}><span className="museum-rock">{m.status==='resolved'?'💎':'🪨'}</span><span><strong><MathText text={m.concept}/></strong><small>{m.subject} · {m.status==='resolved'?'POLISHED':'READY FOR A REVISIT'}</small></span>{selected===m.id?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>)}</div>}
  {item&&<div className="museum-detail"><div className="museum-detail-head"><strong>{item.status==='resolved'?'✦ Polished concept':'✦ Let’s explore this one'}</strong><button className="museum-close" type="button" onClick={()=>open(item.id)}>Close</button></div>
  <p className="museum-question"><MathText text={item.question}/></p><div className="museum-history"><div><small>YOUR EARLIER IDEA</small><p><MathText text={item.originalAnswer}/></p><p><MathText text={item.originalReason}/></p></div><div><small>THE CONCEPT TO REMEMBER</small><p><MathText text={item.takeaway}/></p></div></div>
  {item.status==='resolved'?<p className="museum-success"><CheckCircle2 size={18}/> You demonstrated this idea with a fresh practice question. +15 XP earned!</p>:<>
   {!aiReady?<p className="museum-disabled">You can review your notes now. Reconnect your AI tutor to get a fresh practice question and earn a polished rock.</p>:<button className="secondary-button" disabled={busy} onClick={start}><RotateCcw size={16}/>{busy?'Preparing your review…':practice?'Try a different practice question':'Try a fresh question'}</button>}
   {practice&&<div className="museum-practice"><span className="eyebrow">A NEW SCENARIO · SAME CONCEPT</span><div className="practice-read"><strong>READ FIRST</strong><p><MathText text={practice.referenceText}/></p></div><h3><MathText text={practice.question}/></h3><div className="practice-choices" role="group" aria-label="Review answer choices">{practice.options.map((o,i)=><button className={answer===i?'chosen':''} disabled={busy||feedback?.level==='strong'} key={i} type="button" aria-pressed={answer===i} onClick={()=>{setAnswer(i);setFeedback(null);}}><span>{String.fromCharCode(65+i)}</span><MathText text={o.label}/></button>)}</div><label htmlFor="museum-reason">Explain why in your own words</label><textarea id="museum-reason" value={why} onChange={e=>{setWhy(e.target.value);setFeedback(null);}} rows={2} maxLength={1600} placeholder="My reasoning is..." disabled={busy||feedback?.level==='strong'}/><button className="action-button" disabled={busy||answer===null||why.trim().length<2||feedback?.level==='strong'} onClick={grade}>{busy?'Checking…':'Check my understanding'} <ArrowRight size={17}/></button>{feedback&&<div className={`museum-feedback ${feedback.level}`} role="status"><strong>{feedback.level==='strong'?'That idea is polished! ✦':'Good practice — one more connection'}</strong><p><MathText text={feedback.message}/></p>{feedback.level!=='strong'&&<small><MathText text={feedback.nextHint}/></small>}</div>}</div>}
  </>}
  {error&&<p className="tutor-error" role="alert">{error}</p>}</div>}
 </section>;
}

/** Server-reported token usage; no misleading account-wide cost claims. */
export function UsagePanel({localReceipts=[]}){
 const [usage,setUsage]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=async()=>{setBusy(true);setError('');try{const result=await apiRequest('/api/usage',{timeoutMs:8000});setUsage(result.usage);}catch(e){setError(e.message||'Usage unavailable.');}finally{setBusy(false);}};
 useEffect(()=>{refresh();},[]);
 return <section className="ai-usage-panel"><div className="usage-head"><div><strong>AI usage · today</strong><p>Understand the cost of tutoring without tracking your homework text.</p></div><button type="button" onClick={refresh} disabled={busy}><RotateCcw size={16}/>{busy?'Checking…':'Refresh'}</button></div>
  {error&&<p className="tutor-error" role="alert">{error}</p>}
  {usage&&(()=>{const today=usage.day;const own=localReceipts.filter(r=>r.at&&new Date(r.at).toISOString().slice(0,10)===today);const isShared=usage.scope==='shared-durable';
   const shown=isShared?usage:{requests:own.length,inputTokens:own.reduce((n,r)=>n+r.inputTokens,0),outputTokens:own.reduce((n,r)=>n+r.outputTokens,0),categories:own.reduce((obj,r)=>({...obj,[r.category]:(obj[r.category]||0)+1}),{})};
   const rates=usage.priceRates;const estimated=isShared?usage.estimatedCostUSD:rates?((shown.inputTokens*rates.input+shown.outputTokens*rates.output)/1e6):null;
   return <><div className="usage-stats"><div><small>API requests</small><strong>{shown.requests}</strong></div><div><small>Input tokens</small><strong>{shown.inputTokens.toLocaleString()}</strong></div><div><small>Output tokens</small><strong>{shown.outputTokens.toLocaleString()}</strong></div><div><small>Estimated cost</small><strong>{estimated==null?'Not configured':`$${estimated.toFixed(4)}`}</strong></div></div>
   <p className="usage-disclaimer"><b>{isShared?'Shared server usage across the app':'Only requests tracked in this browser'}</b> — {isShared?usage.note:'Local receipt history is generated by real server API responses, but it can miss other devices, users, failed requests, and sessions before this update. Not a security limit or provider invoice.'} {estimated===null?'Server pricing was not configured, so dollar estimates are unavailable.':''}</p>
   <div className="usage-categories">{Object.entries(shown.categories||{}).filter(([,n])=>n>0).map(([kind,n])=><span key={kind}>{kind}: {n}</span>)}</div>
   <small>Model setting: {usage.model} · {usage.requestLimit?`Shared daily request limit: ${usage.requestLimit}`:'No shared daily limit configured'}. Costs are estimates, not invoices.</small>
  </>})()}
 </section>;
}
