import test from 'node:test';
import assert from 'node:assert/strict';
import {milestones,getLevel,hasUnlocked,equippedAvatar} from '../src/rewards.js';

test('game levels are ascending and start unlocked',()=>{
 assert.equal(milestones[0].xp,0);
 assert.equal(new Set(milestones.map(x=>x.id)).size,milestones.length);
 assert.ok(milestones.every((m,i)=>i===0||m.xp>milestones[i-1].xp));
});
test('xp unlocks rocks and avatars at milestones',()=>{
 assert.equal(getLevel(0).number,1);
 assert.equal(getLevel(49).number,1);
 assert.equal(getLevel(50).number,2);
 assert.equal(getLevel(125).number,3);
 assert.equal(getLevel(10000).number,milestones.length);
 assert.equal(getLevel(50).progress,0);
 assert.equal(getLevel(100).progress,Math.round(50/75*100));
 assert.equal(getLevel(milestones.at(-1).xp).progress,100);
});
test('locked avatars cannot be equipped through stale local storage',()=>{
 assert.equal(hasUnlocked(0,'cosmic'),false);
 assert.equal(equippedAvatar(0,'cosmic').id,'pebble');
 assert.equal(equippedAvatar(350,'rose').id,'rose');
 assert.equal(equippedAvatar(350,'fake').id,'pebble');
});
