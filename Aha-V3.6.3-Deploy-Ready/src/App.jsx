import React, {useEffect,useMemo,useRef,useState} from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, BookOpenCheck, Check, CheckCircle2,
  ChevronRight, CircleHelp, Flame, Home, LibraryBig, Lightbulb,
  LockKeyhole, Menu, Paperclip, Play, Plus, RotateCcw, Send, Settings2,
  Sparkles, Star, Target, Trophy, UnlockKeyhole, WandSparkles, X, Zap, Users, UserRound, Share2,
} from 'lucide-react';
import {demoLesson, ladderLesson} from './demo.js';
import {assessOfflineReasoning} from './validation.js';
import mascot from './assets/lockin-mascot.webp';
import SpaceGame,{AmbientSky,RockSprite,AchievementModal} from './SpaceGame.jsx';
import FriendsHub from './FriendsHub.jsx';
import {earnedXp,momentumFromEvents,masteryReward} from './momentum.js';
import {milestones,hasUnlocked} from './rewards.js';
import {getLevel,equippedAvatar} from './rewards.js';
import {feedbackHeading,feedbackSubtext} from './learningFeedback.js';
import {apiRequest,stepReference} from './apiClient.js';
import MathText from './MathText.jsx';
import {hasMath} from './mathTokens.js';
import {shouldStackChoices} from './choiceLayout.js';

const STORAGE_KEY='aha-learning-mvp-v1'; // Migrate V2 local data instead of discarding it.
const defaults={name:'Learner',difficulty:'Standard',dailyGoal:3,avatarId:'pebble',reduceMotion:false,useAiForDemos:true,events:[],sessions:[],activeId:null};
const nav=[{id:'home',label:'Start learning',icon:Home},{id:'library',label:'My library',icon:LibraryBig},{id:'progress',label:'My progress',icon:Target},{id:'game',label:'Rock galaxy',icon:Trophy},{id:'friends',label:'Friends',icon:Users},{id:'profile',label:'My profile',icon:UserRound},{id:'settings',label:'Settings',icon:Settings2}];
const localDate=(date=new Date())=>{
  const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const shiftedDate=n=>{const d=new Date();d.setDate(d.getDate()+n);return localDate(d);};
const makeId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
function loadStored(){
  try {
    const old=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const migrate=Array.isArray(old.library)?old.library.filter(x=>Array.isArray(x.steps)).map((lesson,i)=>({id:`migrated-${i}-${lesson.id}`,lesson,createdAt:lesson.savedAt||new Date().toISOString(),updatedAt:lesson.savedAt||new Date().toISOString(),stepIndex:0,responses:{},completed:false})):[];
    return {...defaults,...old,events:Array.isArray(old.events)?old.events:[],sessions:Array.isArray(old.sessions)?old.sessions:migrate,activeId:old.activeId||null};
  } catch{return {...defaults};}
}
function getStats(events,day){
  const attempts=events.filter(e=>e.type==='attempt');
  const strong=attempts.filter(e=>e.mastered||(!('mastered' in e)&&e.correct));
  const wrong=attempts.filter(e=>e.choiceCorrect===false||(!('choiceCorrect' in e)&&e.correct===false));
  const partial=attempts.filter(e=>e.choiceCorrect===true&&!e.mastered).length;
  const completed=events.filter(e=>e.type==='complete');
  const guided=events.filter(e=>e.type==='guided').length;
  const practiceDays=new Set(attempts.filter(x=>x.mastered||x.correct).map(x=>localDate(x.at)));
  let streak=0,offset=practiceDays.has(day)?0:1;
  while(practiceDays.has(shiftedDate(-offset))){streak++;offset++;}
  const conceptMap=new Map();
  for (const item of attempts){
    const key=item.concept||'Other';const current=conceptMap.get(key)||{name:key,attempts:0,mastered:0,wrong:0};
    current.attempts++;current.mastered+=Number(Boolean(item.mastered||(!('mastered' in item)&&item.correct)));
    current.wrong+=Number(item.choiceCorrect===false||(!('choiceCorrect' in item)&&item.correct===false));
    conceptMap.set(key,current);
  }
  const concepts=[...conceptMap.values()].map(x=>({...x,score:Math.round(x.mastered/x.attempts*100)}));
  const ranked=[...concepts].filter(x=>x.attempts>0).sort((a,b)=>b.score-a.score||b.attempts-a.attempts);
  const todayAttempts=attempts.filter(e=>localDate(e.at)===day);
  const topicCounts={};todayAttempts.forEach(e=>{const key=e.subject||e.concept||'Your next idea';topicCounts[key]=(topicCounts[key]||0)+1;});
  const dailyTopic=Object.entries(topicCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Trigonometry';
  const recent=Array.from({length:7},(_,i)=>({day:shiftedDate(i-6),count:attempts.filter(x=>localDate(x.at)===shiftedDate(i-6)).length}));
  return {attempts:attempts.length,strong:strong.length,wrong:wrong.length,partial,completed:completed.length,
    hints:events.filter(e=>e.type==='hint').length,skips:events.filter(e=>e.type==='skip').length,guided,
    xp:earnedXp(events),momentum:momentumFromEvents(events),streak,recent,concepts,ranked,dailyTopic,
    accuracy:attempts.length?Math.round(strong.length/attempts.length*100):0,
    todayCount:todayAttempts.length};
}
function Brand({onClick}){
 return <button className="brand" onClick={onClick} aria-label="Aha! home"><span className="brand-mark"><Sparkles size={22}/></span><span>aha<span className="punctuation">!</span></span></button>;
}
const colors=['#FFB800','#FF593E','#713BFF','#3BD6BD','#397BFF','#F957B4'];
function Confetti({active}){
 if(!active)return null;
 return <div className="confetti" aria-hidden="true">{Array.from({length:45},(_,i)=><span key={i} style={{'--x':`${(i*39+11)%100}%`,'--delay':`${i%8*-.12}s`,'--rotate':`${i*79}deg`,'--color':colors[i%colors.length]}}/>)}</div>;
}
function BubbleField({extraClass=''}){return <div className={`bubble-field ${extraClass}`} aria-hidden="true">{Array.from({length:13},(_,i)=><span key={i} style={{'--i':i,'--color':colors[i%colors.length],width:25+(i%4)*24,left:`${(i*23+4)%96}%`,top:`${(i*17+8)%90}%`}}/>)}</div>;}
function Mascot({className=''}){return <img className={className} src={mascot} alt="A determined purple study buddy wearing yellow headphones and scribbling notes"/>;}
function Label({children}){return <span className="eyebrow">{children}</span>;}
function Stat({label,value,detail,icon:Icon}){return <div className="stat"><div className="stat-heading"><Icon size={18}/><span>{label}</span></div><strong>{value}</strong><small>{detail}</small></div>;}

export default function App(){
 const [data,setData]=useState(loadStored);
 const [page,setPage]=useState('home');
 const [menuOpen,setMenuOpen]=useState(false);
 const [focus,setFocus]=useState(false);
 const [focusPrompt,setFocusPrompt]=useState(false);
 const [focusFullscreen,setFocusFullscreen]=useState(true);
 const focusDialogRef=useRef(null);
 const focusStartRef=useRef(null);
 const lockTriggerRef=useRef(null);
 const focusRef=useRef(false);
 const [today,setToday]=useState(localDate);
 const [aiReady,setAiReady]=useState(false);
 const [aiConnectionError,setAiConnectionError]=useState('');
 const [aiModel,setAiModel]=useState(null);
 const [aiChecking,setAiChecking]=useState(false);
 const [tutorOpen,setTutorOpen]=useState(false);
 const [tutorQuestion,setTutorQuestion]=useState('');
 const [tutorReply,setTutorReply]=useState(null);
 const [tutorBusy,setTutorBusy]=useState(false);
 const [tutorError,setTutorError]=useState('');
 const [question,setQuestion]=useState('');
 const [notes,setNotes]=useState('');
 const [file,setFile]=useState(null);
 const [advanced,setAdvanced]=useState(false);
 const uploadRef=useRef(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [choice,setChoice]=useState(null);
 const [why,setWhy]=useState('');
 const [showHint,setShowHint]=useState(false);
 const [showExplanation,setShowExplanation]=useState(false);
 const [burst,setBurst]=useState(false);
 const [checking,setChecking]=useState(false);
 const [sharingSession,setSharingSession]=useState(null);
 const [profileAchievement,setProfileAchievement]=useState(null);
 const inputRef=useRef(null);
 const session=data.sessions.find(s=>s.id===data.activeId);
 const lesson=session?.lesson;
 const index=session?.stepIndex||0;
 const step=lesson?.steps?.[index];
 const outcome=session?.responses?.[index]?.feedback||null;
 const stats=useMemo(()=>getStats(data.events,today),[data.events,today]);
 const gameLevel=useMemo(()=>getLevel(stats.xp),[stats.xp]);
 const equipped=useMemo(()=>equippedAvatar(stats.xp,data.avatarId),[stats.xp,data.avatarId]);
 const momentum=stats.momentum;
 const hasCompleted=Boolean(session?.completed);
 const update=patch=>setData(d=>({...d,...patch}));
 const record=(type,extra={})=>setData(d=>{
   const reward=type==='attempt'&&extra.mastered?masteryReward(d.events).xp:type==='guided'?10:type==='complete'&&extra.qualified?35:0;
   const entry={id:makeId(),type,at:new Date().toISOString(),...extra};
   if(reward>0)entry.xpAwarded=reward;
   return {...d,events:[...d.events,entry].slice(-4000)};
 });
 const modifySession=(id,fn)=>setData(d=>({...d,sessions:d.sessions.map(s=>s.id===id?fn(s):s)}));
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch{}},[data]);
 const refreshAi=async()=>{
   setAiChecking(true);
   try{const state=await apiRequest('/api/health',{timeoutMs:7000});setAiReady(Boolean(state.aiReady));setAiModel(state.model||null);setAiConnectionError('');}
   catch(error){setAiReady(false);setAiModel(null);setAiConnectionError(error?.message||'The API is not responding.');}
   finally{setAiChecking(false);}
 };
 useEffect(()=>{refreshAi();},[]);
 useEffect(()=>{document.documentElement.classList.toggle('reduce-motion',Boolean(data.reduceMotion));return()=>document.documentElement.classList.remove('reduce-motion');},[data.reduceMotion]);
 useEffect(()=>{const timer=setInterval(()=>setToday(localDate()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!burst)return;const timer=setTimeout(()=>setBurst(false),2300);return()=>clearTimeout(timer);},[burst]);
 useEffect(()=>{setChoice(null);setWhy('');setShowHint(false);setShowExplanation(false);setError('');setTutorOpen(false);setTutorQuestion('');setTutorReply(null);setTutorError('');},[data.activeId,index]);
 useEffect(()=>{const onFullScreen=()=>{if(!document.fullscreenElement&&focusRef.current){setFocus(false);focusRef.current=false;}};document.addEventListener('fullscreenchange',onFullScreen);return()=>document.removeEventListener('fullscreenchange',onFullScreen);},[]);
 // Keep the confirmation popup keyboard-accessible, dismissible and contained.
 useEffect(()=>{
   if(!focusPrompt)return;
   const previousOverflow=document.body.style.overflow;
   document.body.style.overflow='hidden';
   focusStartRef.current?.focus();
   const onKey=e=>{
     if(e.key==='Escape'){e.preventDefault();setFocusPrompt(false);return;}
     if(e.key!=='Tab')return;
     const controls=[...focusDialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])')||[]];
     if(!controls.length)return;
     const first=controls[0],last=controls.at(-1);
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   };
   document.addEventListener('keydown',onKey);
   return ()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKey);lockTriggerRef.current?.focus();};
 },[focusPrompt]);
 const go=target=>{
   if(focusRef.current&&target!=='learn')return;
   setPage(target);setFocusPrompt(false);setMenuOpen(false);setError('');setNotice('');window.scrollTo({top:0,behavior:'smooth'});
 };
 const startLesson=source=>{
   const id=makeId(),now=new Date().toISOString();
   const saved={id,lesson:source,createdAt:now,updatedAt:now,stepIndex:0,responses:{},completed:false};
   setData(d=>({...d,activeId:id,sessions:[saved,...d.sessions].slice(0,100),events:[...d.events,{id:makeId(),type:'start',at:now,subject:source.subject,lessonId:id}]}));
   setPage('learn');setFocusPrompt(false);setMenuOpen(false);setError('');setNotice('');
 };
 const resume=id=>{update({activeId:id});go('learn');};
 const enterFocus=async()=>{
   setFocusPrompt(false);focusRef.current=true;setFocus(true);setMenuOpen(false);
   // Fullscreen is optional. The in-app no-distractions layout works even if denied.
   if(focusFullscreen){try{await document.documentElement.requestFullscreen?.();}catch{}}
 };
 const exitFocus=async()=>{
   focusRef.current=false;setFocus(false);
   try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}
 };
 const startGenerated=async e=>{
   e.preventDefault();setError('');setNotice('');
   if(!question.trim()&&!notes.trim()&&!file){setError('Add a question, notes, or a PDF first.');return;}
   if(file&&(file.size>3*1024*1024||!file.name.toLowerCase().endsWith('.pdf'))){setError('Please choose a PDF under 3 MB.');return;}
   if(!aiReady){setError('Add OPENAI_API_KEY to the backend .env to generate your own lesson. The two guided demos work without one.');return;}
   setBusy(true);
   try{
     const body=new FormData();body.append('question',question);body.append('referenceText',notes);body.append('difficulty',data.difficulty);if(file)body.append('pdf',file);
     const payload=await apiRequest('/api/lesson',{form:body,timeoutMs:65000});
     if(!Array.isArray(payload.lesson?.steps)||!payload.lesson.steps.length)throw new Error('The AI did not return a usable lesson.');
     setQuestion('');setNotes('');setFile(null);startLesson(payload.lesson);
   }catch(e){setError(e.message||'Could not create the lesson.');}finally{setBusy(false);}
 };
 const submit=async()=>{
   if(!lesson||!step||hasCompleted||checking||outcome?.mastered)return;
   if(choice===null){setError('Choose one of the answers first.');return;}
   if(!why.trim()){setError('Write a quick reason before checking.');inputRef.current?.focus();return;}
   setChecking(true);setError('');
   const selected=choice;let result;
   const reference=stepReference(lesson,step,index);
   const useAi=aiReady && (lesson.generated || data.useAiForDemos!==false) && Boolean(reference);
   if(useAi){
     try{
       const payload=await apiRequest('/api/feedback',{body:{...reference,selectedIndex:selected,why},timeoutMs:38000});
       const feedback=payload.feedback;
       const choiceCorrect=selected===step.correctIndex;
       result={
         choiceCorrect,
         mastered:choiceCorrect&&feedback?.level==='strong',
         level:choiceCorrect?(feedback?.level==='strong'?'strong':'partial'):'retry',
         message:feedback?.message||'That’s a good start. Tell me one clue from the problem that supports your choice.',
         nextHint:feedback?.nextHint||step.hint,
       };
     }catch(e){
       if(lesson.generated){
         result={choiceCorrect:selected===step.correctIndex,mastered:false,level:'partial',message:'The AI tutor is temporarily unavailable, so I can’t verify this explanation yet. You can try again or continue with a guided step.',nextHint:step.hint};
         setError(e.message||'AI tutor unavailable.');
       }else{
         result=assessOfflineReasoning(step,selected,why);
         setNotice('AI feedback was unavailable; this answer was checked with the built-in lesson instead.');
       }
     }
   }else if(!lesson.generated){
     result=assessOfflineReasoning(step,selected,why);
   }else{
     result={choiceCorrect:selected===step.correctIndex,mastered:false,level:'partial',message:'This saved AI-generated lesson needs a working tutor connection. Reconnect or keep learning with guidance.',nextHint:step.hint};
   }
   const response={selectedIndex:selected,why,feedback:result,at:new Date().toISOString()};
   modifySession(session.id,s=>({...s,responses:{...s.responses,[index]:response},updatedAt:new Date().toISOString()}));
   record('attempt',{lessonId:session.id,stepIndex:index,subject:lesson.subject,concept:step.concept,choiceCorrect:result.choiceCorrect,mastered:result.mastered});
   if(result.mastered&&!data.reduceMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){setBurst(false);requestAnimationFrame(()=>setBurst(true));}
   setChecking(false);
 };
 const askTutor=async()=>{
   if(!lesson||!step||tutorBusy||!aiReady)return;
   const reference=stepReference(lesson,step,index);
   if(!reference){setTutorError('This older lesson needs to be regenerated for personalized AI hints.');return;}
   setTutorError('');setTutorReply(null);setTutorBusy(true);
   try{
     const payload=await apiRequest('/api/hint',{body:{...reference,studentQuestion:tutorQuestion},timeoutMs:38000});
     setTutorReply(payload.help);
     record('hint',{lessonId:session.id,concept:step.concept,source:'ai'});
   }catch(e){setTutorError(e.message||'Aha! couldn’t answer right now. Try the regular hint instead.');}
   finally{setTutorBusy(false);}
 };
 const clearResponse=()=>{
   if(!session||outcome?.mastered)return;
   modifySession(session.id,s=>({...s,responses:Object.fromEntries(Object.entries(s.responses||{}).filter(([k])=>Number(k)!==index))}));
   setError('');
 };
 const next=(mode='mastered')=>{
   if(!session)return;
   if(mode==='mastered'&&!outcome?.mastered)return;
   if(mode==='guided'&&(!outcome?.choiceCorrect||outcome?.mastered))return;
   const now=new Date().toISOString();
   if(mode==='skip')record('skip',{lessonId:session.id,concept:step.concept,subject:lesson.subject});
   if(mode==='guided')record('guided',{lessonId:session.id,concept:step.concept,subject:lesson.subject});
   if(index>=lesson.steps.length-1){
     modifySession(session.id,s=>({...s,completed:true,updatedAt:now}));
     const masteredCount=Object.values(session.responses||{}).filter(r=>r.feedback?.mastered).length;
     const alreadyCounted=Boolean(session.responses?.[index]?.feedback?.mastered);
     record('complete',{lessonId:session.id,subject:lesson.subject,stepCount:lesson.steps.length,qualified:masteredCount+Number(Boolean(outcome?.mastered&&!alreadyCounted))===lesson.steps.length});
   }else modifySession(session.id,s=>({...s,stepIndex:index+1,updatedAt:now}));
   setChoice(null);setWhy('');setError('');setShowHint(false);setShowExplanation(false);
 };
 useEffect(()=>{
   if(page!=='learn'||focusPrompt||!outcome?.mastered)return;
   const handle=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.repeat&&!e.isComposing&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();next();}};
   document.addEventListener('keydown',handle);return()=>document.removeEventListener('keydown',handle);
 },[page,focusPrompt,outcome?.mastered,session?.id,index]);
 const keyPress=e=>{
   if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent?.isComposing){e.preventDefault();if(outcome?.mastered)next();else if(outcome?.level==='retry'||outcome?.level==='partial'){clearResponse();inputRef.current?.focus();}else submit();}
 };
 const showHelp=kind=>{if(kind==='hint'&&!showHint)record('hint',{lessonId:session.id,concept:step.concept});setShowHint(x=>kind==='hint'?!x:x);setShowExplanation(x=>kind==='explanation'?!x:x);};
 const stepSubtitle=`STEP ${index+1} / ${lesson?.steps?.length||0}`;

 return <div className={`app ${focus?'focus-active':''}`}>
   <AmbientSky/>
   <Confetti active={burst}/>
   {!focus&&<div className="edge-hotspot" onMouseEnter={()=>setMenuOpen(true)} aria-hidden="true"/>}
   {menuOpen&&!focus&&<button className="drawer-shade" aria-label="Close menu" onClick={()=>setMenuOpen(false)}/>}
   <aside className={`sidebar ${menuOpen&&!focus?'open':''}`} onMouseLeave={()=>setMenuOpen(false)} aria-hidden={focus||focusPrompt} inert={focusPrompt}>
     <BubbleField extraClass="side-bubbles"/>
     <div className="sidebar-top"><Brand onClick={()=>go('home')}/><button className="icon-button" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
     <span className="sidebar-heading">YOUR SPACE</span>
     <nav className="sidebar-links" aria-label="App navigation">{nav.map(({id,label,icon:Icon})=><button disabled={focus} key={id} className={`nav-item ${page===id?'selected':''}`} onClick={()=>go(id)}><Icon size={21}/><span>{label}</span>{page===id&&<ChevronRight size={18}/>}</button>)}{session&&!session.completed&&<button disabled={focus} className="nav-item" onClick={()=>go('learn')}><Play size={21}/><span>Continue lesson</span></button>}</nav>
     <div className="side-footer"><div className="side-level"><Star size={18} fill="currentColor"/> LEVEL {gameLevel.number} <strong>{stats.xp} XP</strong></div><p>Little steps. Big brain energy.</p></div>
   </aside>
   {!focus&&<header className="header" inert={focusPrompt} aria-hidden={focusPrompt}><div className="header-left"><button className="menu-launch" aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><Brand onClick={()=>go('home')}/><span className="header-divide"/><span className="header-page">{page==='learn'?'Your guided lesson':nav.find(n=>n.id===page)?.label}</span></div><div className="header-right"><button className="header-momentum" onClick={()=>go('progress')} title="Momentum increases with mastered answers. Wrong answers never block learning."><Zap size={18}/><strong>×{momentum.multiplier.toFixed(2)}</strong><span className="header-momentum-track"><i style={{width:`${momentum.percent}%`}}/></span></button><button className="header-xp" onClick={()=>go('game')} title="See your XP and rocks"><Star size={16}/>{stats.xp} XP</button><span className="header-streak"><Flame size={17}/> {stats.streak} day streak</span><button type="button" className="header-avatar avatar-button" title={`Your profile: ${equipped.avatar}`} aria-label={`Open profile, equipped avatar: ${equipped.avatar}`} onClick={()=>go('profile')}><RockSprite rock={equipped} size={43}/></button></div></header>}
   <main className="content" inert={focusPrompt} aria-hidden={focusPrompt}>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={17}/></button></div>}
    {page==='home'&&<>
      <section className="hero"><BubbleField extraClass="hero-bubbles"/><div className="hero-words"><Label>YOUR NEXT AHA! STARTS HERE</Label><h1>Less scrolling.<br/><em>More getting it.</em></h1><p>Homework doesn't have to be a guessing game. We'll work through it together, one good question at a time.</p><div className="hero-pills"><span>✦ Think for yourself</span><span>✦ Get gentle nudges</span><span>✦ Collect aha! moments</span></div></div><Mascot className="hero-mascot"/></section>
      <section className="home-workspace" aria-labelledby="get-started"><div className="section-head"><div><Label>START HERE</Label><h2 id="get-started">What are we figuring out today?</h2><p>Drop a homework question below. Or try a guided example first.</p></div><div className="spark-sticker" aria-hidden="true">✳</div></div>
        <form className="create-form" onSubmit={startGenerated}><label className="field-label" htmlFor="home-question">YOUR QUESTION</label><textarea id="home-question" rows={3} placeholder="Paste a question you're stuck on..." value={question} onChange={e=>setQuestion(e.target.value)} maxLength={5000}/>
          {question.trim()&&hasMath(question)&&<div className="math-preview" role="region" aria-label="Formatted LaTeX preview"><div className="math-preview-label"><Sparkles size={15}/> FORMATTED MATH PREVIEW <small>Preview only · editable LaTeX stays above</small></div><MathText text={question}/></div>}
          <div className="composer-bottom"><div className="composer-tools"><button type="button" onClick={()=>setAdvanced(v=>!v)} aria-expanded={advanced}><Plus size={16}/> {advanced?'Hide study materials':'Add notes or a PDF'}</button><span className={`ai-dot ${aiReady?'ready':''}`}/><small>{aiReady?'AI key configured · tutor available':aiConnectionError?'API connection issue · check Settings':'Demo mode · API key not configured'}</small></div><button className="action-button" type="submit" disabled={busy}>{busy?'Making your lesson...':'Build my lesson'}<ArrowRight size={19}/></button></div>
          {advanced&&<div className="more-inputs"><label className="field-label" htmlFor="support-notes">STUDY NOTES OR WORKED SOLUTION</label><textarea id="support-notes" value={notes} rows={3} onChange={e=>setNotes(e.target.value)} placeholder="Optional supporting notes or reference text..." maxLength={12000}/>{notes.trim()&&hasMath(notes)&&<div className="math-preview" role="region" aria-label="Formatted study notes"><div className="math-preview-label">FORMATTED NOTES</div><MathText text={notes}/></div>}<div className="upload-line"><input type="file" accept="application/pdf,.pdf" ref={uploadRef} hidden onChange={e=>setFile(e.target.files?.[0]||null)}/><button type="button" className="secondary-button" onClick={()=>uploadRef.current?.click()}><Paperclip size={17}/>{file?file.name:'Attach a PDF (max 3 MB)'}</button><label>Difficulty <select value={data.difficulty} onChange={e=>update({difficulty:e.target.value})}><option>Beginner</option><option>Standard</option><option>Challenge</option></select></label></div></div>}
          {error&&<p className="form-error" role="alert">{error}</p>}
        </form>
        <div className="demo-intro"><span>NO SETUP NEEDED</span><strong>Or try a real lesson right now</strong></div>
        <div className="sample-row"><button className="sample-tile ladder" onClick={()=>startLesson(ladderLesson)}><span className="sample-symbol">∠</span><div><small>7 SMALL STEPS · TRIGONOMETRY</small><strong>The 25-foot ladder mystery</strong><span>Can you uncover the angle? Start at the diagram.</span></div><ArrowRight size={23}/></button><button className="sample-tile physics" onClick={()=>startLesson(demoLesson)}><span className="sample-symbol">↑</span><div><small>4 SMALL STEPS · PHYSICS</small><strong>A ball at its highest point</strong><span>Let's make sense of gravity, one choice at a time.</span></div><ArrowRight size={23}/></button></div>
      </section>
      <section className="home-bottom"><div className="home-bottom-title"><Label>YOUR GROWTH</Label><h2>Every little win counts.</h2></div><div className="stats-trio"><Stat label="Mastered steps" value={stats.strong} detail="Reasoned through, not guessed" icon={CheckCircle2}/><Stat label="Day streak" value={`${stats.streak} days`} detail="Keep your curious streak going" icon={Flame}/><Stat label="Learning XP" value={stats.xp} detail="Earn points for understanding" icon={Star}/></div></section>
    </>}

    {page==='learn'&&session&&<>
      <div className="learn-head"><div><button className="back-text" onClick={()=>go('home')} disabled={focus}><ArrowLeft size={17}/> Back to start</button><Label>{lesson.subject} · GUIDED LESSON</Label><h1><MathText text={lesson.title}/></h1><p><MathText text={lesson.overview}/></p></div><div className="learn-buttons"><span className="lesson-momentum" title="Momentum rewards consecutive mastered steps; practice is unlimited"><Zap size={19}/><strong>×{momentum.multiplier.toFixed(2)}</strong><small>MOMENTUM</small></span>{!focus&&<button className="lesson-share" onClick={()=>{setSharingSession(session);go('friends')}} title="Share homework preview"><Share2 size={18}/> Share</button>}<button className="lock-button" ref={lockTriggerRef} onClick={focus?exitFocus:()=>setFocusPrompt(true)}>{focus?<UnlockKeyhole size={20}/>:<LockKeyhole size={20}/>} {focus?'Exit Lock In':'LOCK IN!'}</button></div></div>
      {focus&&<div className="focus-banner"><div className="focus-mascot"><Mascot/></div><div><Label>FOCUS MODE ACTIVATED</Label><h2>Brain is ON. Let's get this! ⚡</h2><p>One question at a time. No wandering into other pages.</p></div><span className="focus-star">✦</span></div>}
      {hasCompleted?<div className="complete-scene"><Mascot className="complete-mascot"/><div><Label>LESSON COMPLETE!</Label><h2>BIG AHA! ENERGY.</h2><p>You reached the end of <strong><MathText text={lesson.title}/></strong>. The steps you genuinely mastered are in your progress.</p><div className="final-notes"><strong>What you learned</strong><p><MathText text={lesson.finalSummary}/></p></div><div className="button-line"><button className="action-button" onClick={()=>{if(focus)exitFocus();go('progress');}}>See your progress <ArrowRight size={18}/></button><button className="secondary-button" onClick={()=>{if(focus)exitFocus();startLesson(lesson);}}><RotateCcw size={17}/> Practice again</button></div></div></div>:
      <div className="lesson-wrapper"><div className="lesson-track"><div className="track-label"><strong>{stepSubtitle}</strong><span>{Math.round(index/lesson.steps.length*100)}% of the journey</span></div><div className="track"><div style={{width:`${index/lesson.steps.length*100}%`}}/></div><div className="momentum-track-line"><span><Zap size={14}/> {momentum.chain} mastered in a row · ×{momentum.multiplier.toFixed(2)} XP multiplier</span><span>Unlimited attempts · no hearts</span></div><div className="tiny-steps">{lesson.steps.map((s,i)=><span title={`Step ${i+1}: ${s.concept}`} className={i<index?'done':i===index?'now':''} key={i}/>)}</div></div>
        <div className="conversation"><div className="coach-id"><span className="coach-face">✦</span><strong>AHA! YOUR LEARNING BUDDY</strong><span>· Step {index+1}</span>{lesson.generated&&<span className="ai-step-note">AI-GENERATED · CHECK IMPORTANT RESULTS</span>}</div>
          {lesson.problem&&<div className="problem-note"><span className="problem-stamp">THE HOMEWORK</span><p><MathText text={lesson.problem}/></p></div>}
          <section className="read-first" aria-label="Read first learning material"><div className="read-head"><BookOpenCheck size={24}/><strong>READ FIRST!</strong><span>THE KNOW-HOW</span></div><p><MathText text={step?.referenceText||lesson.overview}/></p><div className="read-tape">↓ THEN TRY THE STEP BELOW ↓</div></section>
          <div className="coach-message"><div className="message-top"><span className="step-number">{String(index+1).padStart(2,'0')}</span><span>LET'S THINK · <MathText text={step.concept}/></span></div><h2><MathText text={step.question}/></h2><p>Pick the answer that makes sense to you. A quick sentence about why is plenty — we'll figure it out together.</p></div>
          <div className={`choices ${shouldStackChoices(step.options)?'math-heavy':''}`} role="group" aria-label="Answer options">{step.options.map((option,i)=><button disabled={checking||Boolean(outcome?.mastered)} aria-pressed={choice===i} key={i} onClick={()=>{if(outcome&&!outcome.mastered)clearResponse();setChoice(i);setError('');}} className={`choice ${choice===i?'chosen':''} ${outcome&&choice===i?(outcome.choiceCorrect?'correct':'incorrect'):''}`}><span className="choice-letter">{String.fromCharCode(65+i)}</span><strong className="choice-content"><MathText text={option.label}/></strong>{choice===i&&<Check className="choice-check" size={19}/>}</button>)}</div>
          <div className="reasoning"><label htmlFor="reasoning-input"><Lightbulb size={20}/><strong>YOUR TURN — WHY DOES IT WORK?</strong></label><p><MathText text={step.reasoningPrompt||'Show the idea behind your choice in your own words.'}/></p><textarea ref={inputRef} id="reasoning-input" disabled={checking||outcome?.mastered} rows={3} value={why} placeholder="I think this works because..." onChange={e=>{setWhy(e.target.value);if(outcome&&!outcome.mastered)clearResponse();}} onKeyDown={keyPress} maxLength={1600}/><div className="keyboard-tip"><span><kbd>Enter</kbd> check / next step</span><span><kbd>Shift</kbd> + <kbd>Enter</kbd> new line</span></div></div>
          {outcome&&<div className={`feedback ${outcome.mastered?'strong':outcome.level==='retry'?'retry':'partial'}`} role="status"><span className="feedback-icon">{outcome.mastered?<CheckCircle2 size={25}/>:<Lightbulb size={24}/>}</span><div><strong>{feedbackHeading(outcome)}</strong><p><MathText text={outcome.message}/></p><p className="feedback-gentle">{feedbackSubtext(outcome)}</p>{!outcome.mastered&&outcome.nextHint&&<small>Clue: <MathText text={outcome.nextHint}/></small>}</div></div>}
          {error&&<div className="form-error" role="alert">{error}</div>}
          {showHint&&<div className="reveal hint"><Lightbulb size={20}/><div><strong>A NUDGE, NOT A SPOILER</strong><p><MathText text={step.hint}/></p></div></div>}
          {showExplanation&&<div className="reveal explanation"><BookOpen size={20}/><div><strong>LET'S UNPACK IT</strong><p><MathText text={step.explanation}/></p><small><MathText text={step.takeaway}/></small></div></div>}
          {aiReady&&<div className="tutor-area">
            <button className="tutor-toggle" type="button" aria-expanded={tutorOpen} onClick={()=>{setTutorOpen(v=>!v);setTutorError('');}}><Sparkles size={18}/> {tutorOpen?'Close Aha! tutor':'Ask Aha! for a personal hint'} <ChevronRight size={16}/></button>
            {tutorOpen&&<div className="tutor-body"><label htmlFor="tutor-question">What part is confusing? <small>Optional — Aha! won’t give away the answer.</small></label><div className="tutor-controls"><input id="tutor-question" maxLength={500} value={tutorQuestion} onChange={e=>setTutorQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();askTutor();}}} placeholder="e.g., Why is this the adjacent side?"/><button type="button" onClick={askTutor} disabled={tutorBusy}>{tutorBusy?'Thinking…':'Get hint'}<Sparkles size={15}/></button></div>{tutorReply&&<div className="tutor-reply" role="status"><strong>✨ A little clue</strong><p><MathText text={tutorReply.hint}/></p><small><MathText text={tutorReply.tinyQuestion}/></small></div>}{tutorError&&<p className="tutor-error" role="alert">{tutorError}</p>}</div>}
          </div>}
          <div className="conversation-actions"><div className="help-actions"><button onClick={()=>showHelp('hint')}><Lightbulb size={17}/> {showHint?'Hide hint':'Give me a hint'}</button><button onClick={()=>showHelp('explanation')}><CircleHelp size={17}/> {showExplanation?'Hide explanation':'Teach me why'}</button></div><div className="primary-actions">{outcome?.mastered?<button className="action-button" onClick={()=>next()}>{index===lesson.steps.length-1?'Finish lesson':'Next step'}<ArrowRight size={19}/></button>:<><button className="action-button" onClick={()=>outcome?clearResponse():submit()} disabled={checking||(!outcome&&(choice===null||!why.trim()))}>{checking?'Checking your thinking...':outcome?.choiceCorrect?'Polish my explanation':outcome?'Try another choice':'Check my thinking'}<Send size={19}/></button>{outcome?.choiceCorrect&&!outcome.mastered&&<button className="guided-button" onClick={()=>next('guided')}>Keep going with a nudge <ArrowRight size={17}/></button>}</>}</div></div>
          {!outcome?.mastered&&<div className="skip-hint"><button onClick={()=>next('skip')}>Need to move on? Skip this step <ChevronRight size={15}/></button><span>Guided: +10 XP. Mastery builds momentum. You can always keep learning.</span></div>}
        </div><div className="lesson-footer">✦ It's not about being fast. It's about finding your <strong>aha!</strong></div>
      </div>}
    </>}
    {page==='learn'&&!session&&<div className="empty"><h2>Ready for your first step?</h2><button className="action-button" onClick={()=>go('home')}>Choose a lesson <ArrowRight size={19}/></button></div>}

    {page==='library'&&<section className="simple-page"><div className="section-head"><div><Label>THE WORK YOU'VE STARTED</Label><h1>My library<span className="title-dot">.</span></h1><p>Your existing homework and conversations, all in one place. Nothing extra.</p></div><span className="count-pill">{data.sessions.length} saved</span></div>{data.sessions.length===0?<div className="empty"><span className="empty-scribble">✎</span><h2>Nothing saved. Yet!</h2><p>Start a lesson from the home page and it'll land here automatically.</p><button className="secondary-button" onClick={()=>go('home')}>Go to start <ArrowRight size={18}/></button></div>:<div className="session-list">{data.sessions.map((s,i)=><div className="session-item" key={s.id}><span className={`session-icon ${i%3===0?'yellow':i%3===1?'purple':'blue'}`}><BookOpen size={24}/></span><button className="session-open" onClick={()=>resume(s.id)}><span className="session-title"><strong><MathText text={s.lesson.title}/></strong><small>{s.lesson.subject} · {s.completed?'Completed':`${(s.stepIndex||0)+1} of ${s.lesson.steps.length} steps`} · {new Date(s.updatedAt||s.createdAt).toLocaleDateString()}</small></span><span className={`session-state ${s.completed?'done':''}`}>{s.completed?'DONE':'IN PROGRESS'}</span><ArrowRight size={20}/></button><button className="session-share" aria-label={`Share ${s.lesson.title}`} onClick={()=>{setSharingSession(s);go('friends');}}><Share2 size={18}/> Share</button></div>)}</div>}</section>}

    {page==='progress'&&<section className="simple-page"><div className="section-head"><div><Label>THE GROWTH PAGE</Label><h1>Look at that brain <span className="progress-emoji">⚡</span></h1><p>Not how many questions you saw—how many ideas you truly understood.</p></div><button className="progress-level" onClick={()=>go('game')}><Star size={22} fill="currentColor"/> LVL {gameLevel.number} · VISIT GALAXY <ArrowRight size={16}/></button></div><div className="progress-hero"><div className="topic-day"><span>✦ TODAY'S TOPIC</span><h2>{stats.dailyTopic}</h2><p>{stats.todayCount?`You've tried ${stats.todayCount} thinking step${stats.todayCount!==1?'s':''} today. Keep connecting the dots.`:'Your ladder adventure is ready whenever you are.'}</p></div><div className="xp-feature"><span>YOUR LEARNING XP · MOMENTUM ×{momentum.multiplier.toFixed(2)}</span><strong>{stats.xp}</strong><small>{gameLevel.next?`${gameLevel.remaining} XP to next level`:'All eight galaxy levels unlocked!'}</small><div className="xp-line"><i style={{width:`${gameLevel.progress}%`}}/></div><div className="momentum-explain"><Zap size={15}/> {momentum.chain} mastered in a row · Next fully explained answer: +{masteryReward(data.events).xp} XP</div></div></div><div className="progress-cards"><Stat icon={CheckCircle2} label="Steps mastered" value={stats.strong} detail="Right choice + real reasoning"/><Stat icon={Flame} label="Your streak" value={`${stats.streak} days`} detail="Days you mastered a step"/><Stat icon={Target} label="Mastery rate" value={`${stats.accuracy}%`} detail="Across your attempts"/><Stat icon={Lightbulb} label="Hints used" value={stats.hints} detail="Asking for help is learning"/><Stat icon={Zap} label="Momentum" value={`×${momentum.multiplier.toFixed(2)}`} detail="Mastery gives bonus XP"/></div><div className="mastery-layout"><section className="mastery-panel"><div className="panel-title"><div><Label>SKILL MAP</Label><h2>What you're getting good at</h2></div><span className="skill-mark">✴</span></div>{stats.concepts.length?<div className="mastery-list">{[...stats.concepts].sort((a,b)=>b.attempts-a.attempts).slice(0,8).map(c=><div className="mastery-item" key={c.name}><div><strong>{c.name}</strong><small>{c.mastered} mastered / {c.attempts} tries</small></div><div className="meter"><span style={{width:`${c.score}%`}}/></div><b>{c.score}%</b></div>)}</div>:<p className="progress-empty">Your map starts forming when you try a few steps. Every explanation counts!</p>}</section><section className="insight-panel"><div className="insight-block strong"><span>★ STRONGEST IDEA</span><h3>{stats.ranked[0]?.name||'Waiting for your first win'}</h3><p>{stats.ranked[0]?`${stats.ranked[0].score}% mastery in the steps you've tried.`:'Try the ladder lesson to discover what sticks.'}</p></div><div className="insight-block weak"><span>↗ NEXT TO PRACTICE</span><h3>{stats.ranked.length>1?stats.ranked.at(-1).name:stats.ranked[0]?.score<100?stats.ranked[0]?.name:'A fresh concept'}</h3><p>{stats.ranked.length>1?'This is where another careful explanation could help.':'You’ll see a new area for growth as you explore different concepts.'}</p></div><div className="small-insights"><span><RotateCcw size={17}/>{stats.wrong} wrong choices</span><span><Lightbulb size={17}/>{stats.partial} reasons to refine</span><span><Trophy size={17}/>{stats.completed} lessons completed</span></div></section></div><p className="local-note">Your learning record is saved locally in this browser. It is not shared with other devices.</p></section>}

    {page==='game'&&<SpaceGame xp={stats.xp} stats={stats} avatarId={data.avatarId} onEquip={avatarId=>update({avatarId})} onPractice={()=>go('home')}/>}

    {page==='friends'&&<FriendsHub self={{name:data.name,avatar:equipped,xp:stats.xp,streak:stats.streak}} sessionToShare={sharingSession} onClearShare={()=>setSharingSession(null)}/>}

    {page==='profile'&&<section className="profile-page simple-page"><div className="section-head"><div><Label>THE PERSON BEHIND THE AHA!</Label><h1>My profile<span className="title-dot">.</span></h1><p>All the little discoveries that make your learning galaxy yours.</p></div><button className="secondary-button" onClick={()=>go('game')}>Go to rock galaxy <ArrowRight size={17}/></button></div><div className="profile-hero"><div className="profile-avatar-art"><RockSprite rock={equipped} size={155}/></div><div className="profile-hero-text"><span className="eyebrow">YOUR EQUIPPED STUDY BUDDY</span><h2>{data.name||'Learner'}</h2><strong>{equipped.avatar} · Level {gameLevel.number}</strong><p>{stats.xp} XP earned · {stats.streak}-day streak · {stats.strong} mastered steps</p><div className="profile-xp-rail"><span style={{width:`${gameLevel.progress}%`}}/></div><small>{gameLevel.next?`${gameLevel.remaining} XP to your next rock`:'All available rocks unlocked!'}</small></div></div><div className="profile-achievement-head"><h2>Achievement shelf</h2><p>Tap a rock to see how it was earned. Earned rocks become your profile avatar when selected.</p></div><div className="profile-achievement-grid">{milestones.map(m=><button key={m.id} className={`profile-achievement ${hasUnlocked(stats.xp,m.id)?'ready':'unearned'} ${equipped.id===m.id?'on':''}`} onClick={()=>{if(hasUnlocked(stats.xp,m.id))update({avatarId:m.id});setProfileAchievement(m);}}><RockSprite rock={m} size={70}/><strong>{m.name}</strong><small>{hasUnlocked(stats.xp,m.id)?equipped.id===m.id?'EQUIPPED':'UNLOCKED':`${m.xp} XP needed`}</small></button>)}</div><AchievementModal rock={profileAchievement} xp={stats.xp} avatarId={data.avatarId} onEquip={avatarId=>update({avatarId})} onClose={()=>setProfileAchievement(null)}/></section>}

    {page==='settings'&&<section className="simple-page"><div className="section-head"><div><Label>KEEP IT SIMPLE</Label><h1>Your space, your rules.</h1><p>A couple of preferences. That's it.</p></div></div><div className="settings-panel"><div className="setting-line"><div><strong>Your name</strong><p>What should your learning buddy call you?</p></div><input aria-label="Display name" maxLength={35} value={data.name} onChange={e=>update({name:e.target.value})}/></div><div className="setting-line"><div><strong>Challenge level</strong><p>For your future AI-generated lessons.</p></div><select aria-label="Difficulty" value={data.difficulty} onChange={e=>update({difficulty:e.target.value})}><option>Beginner</option><option>Standard</option><option>Challenge</option></select></div><div className="setting-line"><div><strong>Reduce animation</strong><p>For a calmer, more accessible experience.</p></div><input type="checkbox" aria-label="Reduce motion" checked={data.reduceMotion} onChange={e=>update({reduceMotion:e.target.checked})}/></div><div className="setting-line"><div><strong>AI feedback on demo lessons</strong><p>When the API is configured, use it to review your written explanations in the sample lessons too. This makes paid AI requests; offline checks remain available.</p></div><input type="checkbox" aria-label="Use AI on sample lessons" checked={data.useAiForDemos!==false} onChange={e=>update({useAiForDemos:e.target.checked})}/></div><div className="setting-line api-connection"><div><strong>AI tutor connection</strong><p>{aiReady?`Server key detected · ${aiModel||'selected model'}. The first real request confirms provider access.`:aiConnectionError?`API connection error: ${aiConnectionError}`:'Demo mode — no API key configured. Set OPENAI_API_KEY on the server and recheck.'}</p><small><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Get an OpenAI API key</a> · Never paste it into this page or share it in chat.</small></div><button type="button" className="secondary-button" disabled={aiChecking} onClick={refreshAi}>{aiChecking?'Checking…':'Check API status'}</button></div><div className="settings-note"><LockKeyhole size={18}/><span>Sessions, XP, momentum and achievements are saved in your browser. Add <code>OPENAI_API_KEY</code> to the backend <code>.env</code> to enable custom AI lessons, personalized hints and semantic reasoning checks. API use may incur charges. Never put the key in frontend variables. PDF text is processed in memory, not stored by this demo server.</span></div><button className="secondary-button danger" onClick={()=>{if(window.confirm('Delete all local lessons, progress and settings?')){localStorage.removeItem(STORAGE_KEY);setData({...defaults});setNotice('Local progress cleared.');go('home');}}}>Reset my local data</button></div></section>}
   </main>
   {focusPrompt&&page==='learn'&&session&&<div className="lock-dialog-layer">
     <button type="button" className="lock-dialog-scrim" aria-label="Close Lock In popup" tabIndex={-1} onClick={()=>setFocusPrompt(false)}/>
     <section className="lock-dialog" role="dialog" aria-modal="true" aria-labelledby="lock-dialog-title" aria-describedby="lock-dialog-description" ref={focusDialogRef}>
       <div className="lock-dialog-top"><span><Zap size={18}/> FOCUS MODE</span><button type="button" className="lock-dialog-close" onClick={()=>setFocusPrompt(false)} aria-label="Close popup"><X size={20}/></button></div>
       <div className="lock-dialog-art"><Mascot/><span className="lock-dialog-orbit orbit-a"/><span className="lock-dialog-orbit orbit-b"/><span className="lock-dialog-spark star-a">✦</span><span className="lock-dialog-spark star-b">✧</span></div>
       <div className="lock-dialog-copy"><span className="eyebrow">THE LITTLE STUDY RITUAL</span><h2 id="lock-dialog-title">Time to <em>LOCK IN!</em></h2><p id="lock-dialog-description">One problem at a time. Less noise, more little aha! moments. We'll hide Aha!'s menus while you focus — you can leave whenever you want.</p></div>
       <label className="lock-dialog-check"><input type="checkbox" checked={focusFullscreen} onChange={e=>setFocusFullscreen(e.target.checked)}/><span><strong>Use fullscreen too</strong><small>Optional. Your browser may ask for permission; you can always exit.</small></span></label>
       <div className="lock-dialog-actions"><button type="button" className="secondary-button" onClick={()=>setFocusPrompt(false)}>Not right now</button><button type="button" className="action-button" onClick={enterFocus} ref={focusStartRef}><LockKeyhole size={18}/> Let's lock in <ArrowRight size={18}/></button></div>
       <div className="lock-dialog-foot">✦ You can keep learning even if you don't lock in.</div>
     </section>
   </div>}
  </div>;
}
