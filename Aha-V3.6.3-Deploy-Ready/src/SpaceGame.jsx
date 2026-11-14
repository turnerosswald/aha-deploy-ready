import React,{useState,useEffect,useRef} from 'react';
import {ArrowRight,Check,LockKeyhole,Mountain, Sparkles,Star,Trophy,Zap,X,Info} from 'lucide-react';
import {milestones,getLevel,hasUnlocked,equippedAvatar} from './rewards.js';

/** Crisp original SVG rock mascot — deliberately pixel/block shaped, not a third-party sprite. */
export function RockSprite({rock=milestones[0],size=68,face=true}){
  return <svg className="pixel-rock" viewBox="0 0 72 72" width={size} height={size} role="img" aria-label={`${rock.rock} pixel rock`} shapeRendering="crispEdges">
    <path d="M22 5h26v7h12v9h7v27h-7v10H48v8H23v-7H12v-8H5V22h7v-9h10z" fill="#1E1743"/>
    <path d="M24 9h22v7h11v9h6v21h-7v9H45v7H25v-7H15v-9H9V25h7v-9h8z" fill={rock.color}/>
    <path d="M25 10h20v7H29v7H18v19h-8V25h7v-9h8z" fill={rock.accent}/>
    <path d="M45 55h11v-9h7V25h-7v17h-7v7H35v6H23v7h22z" fill={rock.dark}/>
    <path d="M22 23h7v-7h10v6H29v8h-7z" fill="white" opacity=".55"/>
    {face&&<><rect x="23" y="35" width="7" height="8" rx="1" fill="#1E1743"/><rect x="43" y="35" width="7" height="8" rx="1" fill="#1E1743"/><path d="M31 47h12v4h-3v3h-6v-3h-3z" fill="#1E1743"/><rect x="17" y="45" width="5" height="4" fill="#FF819D" opacity=".85"/><rect x="51" y="45" width="5" height="4" fill="#FF819D" opacity=".85"/></>}
    {rock.id==='cosmic'&&<><rect x="7" y="8" width="7" height="7" fill="#FFD744"/><rect x="59" y="7" width="6" height="6" fill="#FFD744"/></>}
    {rock.id==='gold'&&<path d="M36 4v10M30 9h12" stroke="#FFF9CB" strokeWidth="4"/>}
    {['ember','sunset','supernova'].includes(rock.id)&&<><path d="M35 4v12l6-7v12" fill="none" stroke="#ffdd68" strokeWidth="5"/><rect x="58" y="15" width="5" height="5" fill="#ffec9a"/></>}
    {['ice','midnight','prism'].includes(rock.id)&&<><path d="M15 10h8M19 6v8M51 10h8M55 6v8" stroke="#e6faff" strokeWidth="3"/><rect x="11" y="56" width="4" height="4" fill="#fff"/></>}
    {['pink','lime'].includes(rock.id)&&<><rect x="9" y="5" width="6" height="6" fill="#FFE573"/><rect x="56" y="7" width="6" height="6" fill="#FFE573"/></>}
    {rock.id==='supernova'&&<circle cx="35" cy="34" r="31" stroke="#FFF3B3" strokeWidth="2" strokeDasharray="3 5" fill="none"/>}
  </svg>;
}

export function AmbientSky(){
  const stars=Array.from({length:27},(_,i)=>({x:(i*41+13)%98,y:(i*29+7)%96,delay:(i*7)%12,size:2+i%3}));
  const bubbles=Array.from({length:10},(_,i)=>({x:i%2===0?1+i*1.7:94-(i%5)*1.6,y:(i*22+9)%90,diameter:14+i%4*10,delay:(i*11)%13}));
  return <div className="ambient-sky" aria-hidden="true">
    {stars.map((s,i)=><span className={`ambient-star ${i%5===0?'four-point':''}`} key={`s${i}`} style={{'--x':`${s.x}%`,'--y':`${s.y}%`,'--size':`${s.size}px`,'--delay':`${s.delay}s`}}/>)}
    {bubbles.map((b,i)=><span className="ambient-orb" key={`b${i}`} style={{'--x':`${b.x}%`,'--y':`${b.y}%`,'--diameter':`${b.diameter}px`,'--delay':`${b.delay}s`}}/>)}
    {Array.from({length:4},(_,i)=><span className="ambient-meteor" key={`m${i}`} style={{'--top':`${16+i*22}%`,'--delay':`${i*8+2}s`}}/>)}
  </div>;
}

export function AchievementModal({rock,xp,avatarId,onEquip,onClose}){
 const closeRef=useRef(null);
 const unlocked=rock?hasUnlocked(xp,rock.id):false;
 useEffect(()=>{
  if(!rock)return;
  closeRef.current?.focus();
  const escape=e=>{if(e.key==='Escape')onClose?.();};document.addEventListener('keydown',escape);
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',escape);document.body.style.overflow=old;};
 },[rock,onClose]);
 if(!rock)return null;
 return <div className="achievement-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}>
  <section className="achievement-dialog" role="dialog" aria-modal="true" aria-labelledby="achievement-name" style={{'--achievement-tint':rock.color}}>
    <button ref={closeRef} className="achievement-close" aria-label="Close achievement details" onClick={onClose}><X size={21}/></button>
    <span className="eyebrow">{unlocked?'✦ ACHIEVEMENT UNLOCKED':'✦ ACHIEVEMENT TO DISCOVER'}</span>
    <div className="achievement-hero"><RockSprite rock={rock} size={125}/></div>
    <h2 id="achievement-name">{rock.name}</h2><p className="achievement-rock-name">{rock.rock} · {rock.avatar}</p>
    <p>{rock.description}</p>
    <div className="achievement-explain"><strong><Info size={17}/> HOW YOU EARN {rock.rock.toUpperCase()}</strong><p>{rock.xp===0?'You earned your starter pebble just by beginning your learning galaxy.':`Reach ${rock.xp.toLocaleString()} total learning XP by mastering steps, explaining your thinking, and keeping your learning momentum going.`}</p><span>{unlocked?`Unlocked! You have ${xp.toLocaleString()} XP.`:`${Math.max(0,rock.xp-xp).toLocaleString()} XP left to unlock.`}</span></div>
    {unlocked?<button className="achievement-equip" onClick={()=>{onEquip?.(rock.id);onClose?.();}}><Check size={18}/>{avatarId===rock.id?'This is your profile avatar':'Equip as my profile avatar'}</button>:<div className="achievement-locked"><LockKeyhole size={17}/> Keep practicing to unlock this one!</div>}
  </section>
 </div>;
}

export default function SpaceGame({xp,stats,avatarId,onEquip,onPractice}){
  const level=getLevel(xp);
  const [inspected,setInspected]=useState(level.current.id);
  const [achievementOpen,setAchievementOpen]=useState(null);
  const selected=milestones.find(item=>item.id===inspected)||level.current;
  const equipped=equippedAvatar(xp,avatarId);
  return <section className="game-page" aria-labelledby="game-title">
    <div className="game-hero">
      <span className="game-kicker"><Sparkles size={16}/> THE AHA! ARCADE</span>
      <div className="game-hero-text"><h1 id="game-title">Your brain.<br/><em>Your galaxy.</em></h1><p>Every good explanation powers your spaceship. Collect silly little rocks and unlock new buddy avatars as your learning levels rise.</p>
      <div className="game-tags"><span><Zap size={16}/> {xp} earned XP</span><span><Trophy size={16}/> {level.unlocked}/{milestones.length} levels unlocked</span><span><Star size={16}/> {stats.strong} thinking wins</span></div></div>
      <div className="game-hero-figure"><div className="orbit-ring"><RockSprite rock={equipped} size={140}/></div><div className="figure-label">YOUR BUDDY<br/><strong>{equipped.avatar}</strong></div></div>
    </div>
    <div className="game-heading"><div><span className="eyebrow">LEVEL SELECT</span><h2>The learning galaxy</h2><p>A level unlocks automatically when you've earned enough learning XP. No purchases, no random loot.</p></div><div className="level-badge">LEVEL {level.number}<span>{level.next?`${level.remaining} XP to ${level.next.title}`:'GALAXY COMPLETE!'}</span></div></div>
    <div className="game-track-head"><span>JOURNEY TO THE NEXT ROCK</span><b>{level.progress}%</b></div><div className="game-progress-rail"><div style={{width:`${level.progress}%`}}/></div>
    <div className="galaxy-map" role="group" aria-label="Your learning level map">
      <div className="galaxy-guide" aria-hidden="true"/>
      {milestones.map((m,i)=>{
        const unlocked=hasUnlocked(xp,m.id);const active=inspected===m.id;
        return <button key={m.id} className={`galaxy-node ${unlocked?'unlocked':'locked'} ${active?'active':''} ${i%2===0?'branch-left':'branch-right'}`} onClick={()=>{setInspected(m.id);if(unlocked)onEquip(m.id);setAchievementOpen(m);}} aria-pressed={active} style={{'--node-color':m.color,'--node-dark':m.dark}}>
          <span className="galaxy-count">{String(i+1).padStart(2,'0')}</span><span className="galaxy-node-art">{unlocked?<RockSprite rock={m} size={74}/>:<LockKeyhole size={27}/>}</span><span className="galaxy-node-copy"><b>{m.title}</b><small>{unlocked?'UNLOCKED':`${m.xp} XP required`}</small></span>{unlocked&&<span className="galaxy-tick"><Check size={13}/></span>}
        </button>;
      })}
    </div>
    <div className="game-discovery" style={{'--feature-color':selected.color}}><div className="discovery-art"><RockSprite rock={selected} size={112}/></div><div className="discovery-copy"><span className="eyebrow">{hasUnlocked(xp,selected.id)?'YOU FOUND THIS ONE!':'COMING UP NEXT'}</span><h3>{selected.name}</h3><p>{selected.description}</p><small>{hasUnlocked(xp,selected.id)?`${selected.rock} & ${selected.avatar} unlocked`:`Earn ${Math.max(0,selected.xp-xp)} more XP to unlock this rock and its avatar.`}</small></div><button className="game-practice" onClick={onPractice}>Keep learning <ArrowRight size={17}/></button></div>
    <div className="game-heading collection-heading"><div><span className="eyebrow">THE ROCK COLLECTION</span><h2>Meet your little weirdos</h2><p>Each rock comes with an avatar. Choose one you've earned to show up beside your name.</p></div><div className="collected-count"><Mountain size={20}/>{level.unlocked} collected</div></div>
    <div className="rock-collection">{milestones.map((m,i)=>{
      const unlocked=hasUnlocked(xp,m.id),isEquipped=equipped.id===m.id;
      return <button type="button" key={m.id} className={`rock-card ${unlocked?'found':'unfound'} ${isEquipped?'equipped':''}`} onClick={()=>{if(unlocked)onEquip(m.id);setInspected(m.id);setAchievementOpen(m);}} aria-label={`${m.avatar}, ${unlocked?(isEquipped?'equipped; see achievement':'equip avatar and see achievement'):`locked until ${m.xp} XP; see achievement`}`}>
        <span className="rock-index">{String(i+1).padStart(2,'0')}</span><span className="rock-card-art"><RockSprite rock={m} size={83}/>{!unlocked&&<LockKeyhole className="rock-lock" size={23}/>}</span><strong>{m.rock}</strong><small>{unlocked?m.avatar:`Unlock at ${m.xp} XP`}</small><span className={`rock-tag ${isEquipped?'on':''}`}>{isEquipped?'✓ EQUIPPED':unlocked?'TAP TO EQUIP':'???'}</span>
      </button>;
    })}</div>
    <p className="game-note">✦ Every rock tells a learning story. Tap any rock to see the achievement; earned rocks change your profile avatar.</p><AchievementModal rock={achievementOpen} xp={xp} avatarId={avatarId} onEquip={onEquip} onClose={()=>setAchievementOpen(null)}/>
  </section>;
}
