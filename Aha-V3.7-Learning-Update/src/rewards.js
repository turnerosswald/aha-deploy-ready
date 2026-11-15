/**
 * Tiny, deterministic rewards model. Rewards reflect *verified* learning XP,
 * not random spending or engagement tricks. Used by the game map and avatar picker.
 */
export const milestones = [
  {id:'pebble',name:'Hello, Pebble!',rock:'Pocket Pebble',avatar:'Pebble Pal',title:'Takeoff',xp:0,color:'#B6A1FF',dark:'#6245AE',accent:'#F8ECFF',description:'Every big brain starts somewhere.'},
  {id:'copper',name:'First Spark',rock:'Copper Comet',avatar:'Spark Scout',title:'Little Lift',xp:50,color:'#FFAB55',dark:'#C25A37',accent:'#FFE4A2',description:'You kept asking why. That counts.'},
  {id:'mint',name:'Orbit Explorer',rock:'Mint Meteor',avatar:'Orbit Buddy',title:'Into Orbit',xp:125,color:'#65E1B7',dark:'#15957E',accent:'#DAFFF3',description:'Your thinking is getting sharper.'},
  {id:'blue',name:'Starlight Solver',rock:'Blue Moonstone',avatar:'Moon Mover',title:'Moonwalk',xp:225,color:'#74ADFF',dark:'#365BC4',accent:'#DFEEFF',description:'You can connect the dots.'},
  {id:'rose',name:'Heart of Stone',rock:'Ruby Ripple',avatar:'Ruby Runner',title:'Comet Dash',xp:350,color:'#FF829B',dark:'#C63B74',accent:'#FFE5E6',description:'Tough steps, stronger explanations.'},
  {id:'gold',name:'Golden Mind',rock:'Solar Nugget',avatar:'Sunbeam',title:'Golden Hour',xp:500,color:'#FFD45E',dark:'#BA7520',accent:'#FFF3B6',description:'Curiosity looks good on you.'},
  {id:'violet',name:'Galaxy Brain',rock:'Nebula Quartz',avatar:'Galaxy Guardian',title:'Nebula Rush',xp:700,color:'#BA87FF',dark:'#7C40D4',accent:'#F0DFFF',description:'Ideas are starting to click.'},
  {id:'cosmic',name:'Aha! Legend',rock:'Cosmic Core',avatar:'Aha! Legend',title:'Final Frontier',xp:950,color:'#88F0ED',dark:'#284B9C',accent:'#F7FFCB',description:'A constellation of real learning wins.'},
  {id:'ember',name:'Glow Getter',rock:'Ember Orbit',avatar:'Magma Munchkin',title:'Fire Trail',xp:1250,color:'#FF8451',dark:'#AB3451',accent:'#FFE2AA',description:'You turned mistakes into fuel and kept thinking.'},
  {id:'ice',name:'Cool Head',rock:'Frost Comet',avatar:'Chill Champion',title:'Ice Drift',xp:1600,color:'#9DEAFF',dark:'#407DB3',accent:'#F0FFFF',description:'You stayed curious when an answer got tricky.'},
  {id:'lime',name:'Curiosity Bloom',rock:'Lime Stardust',avatar:'Sprout Scout',title:'Green Galaxy',xp:2050,color:'#BDF26D',dark:'#4A9364',accent:'#F4FFD1',description:'Your questions are growing into great ideas.'},
  {id:'pink',name:'Bright Mind',rock:'Bubble Quartz',avatar:'Pop Princess',title:'Pop Planet',xp:2600,color:'#FF9AD8',dark:'#B446A3',accent:'#FFF1FC',description:'You explained a tough idea in your own words.'},
  {id:'midnight',name:'Night Owl',rock:'Midnight Moon',avatar:'Orbit Owl',title:'Dark Side',xp:3250,color:'#7784E7',dark:'#35367A',accent:'#DFE8FF',description:'Late or early, your discoveries keep stacking up.'},
  {id:'sunset',name:'Color Burst',rock:'Sunset Shard',avatar:'Ray Rider',title:'Solar Sprint',xp:4050,color:'#FFBC83',dark:'#D85E80',accent:'#FFF3C6',description:'You connected what you learned across many steps.'},
  {id:'prism',name:'Crystal Clear',rock:'Prism Pebble',avatar:'Rainbow Brain',title:'Prism Run',xp:5000,color:'#B8A9FF',dark:'#396BD5',accent:'#FEF5FF',description:'You found a new way to look at an old problem.'},
  {id:'supernova',name:'Supernova Scholar',rock:'Nova Nugget',avatar:'Stellar Genius',title:'Supernova',xp:6200,color:'#FFE46C',dark:'#BC4C91',accent:'#FFFFFF',description:'A whole galaxy of ideas lights up when you learn.'},
];

export function getLevel(xp){
  const score=Number.isFinite(xp)?Math.max(0,xp):0;
  let current=0;
  for(let i=0;i<milestones.length;i++){if(score>=milestones[i].xp)current=i;else break;}
  const next=milestones[current+1]||null;
  const start=milestones[current].xp;
  return {number:current+1,current:milestones[current],next,progress:next?Math.max(0,Math.min(100,Math.round((score-start)/(next.xp-start)*100))):100,remaining:next?Math.max(0,next.xp-score):0,unlocked:current+1};
}
export function hasUnlocked(xp,id){const item=milestones.find(m=>m.id===id);return Boolean(item&&Number(xp)>=item.xp);}
export function equippedAvatar(xp,id){return hasUnlocked(xp,id)?milestones.find(m=>m.id===id):milestones[0];}
