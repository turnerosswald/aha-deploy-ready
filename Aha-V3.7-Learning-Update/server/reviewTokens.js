/** Encrypted, expiring review steps. Unlike signed base64 payloads, these do not
 * expose the answer key to the learner or the browser's developer tools. */
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {signingSecret} from './stepTokens.js';
const TTL=24*60*60*1000;
const keyFrom=secret=>createHash('sha256').update(`aha:private-review:v1:${secret}`).digest();
export function sealReviewStep(step,{secret=signingSecret(),now=Date.now()}={}){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyFrom(secret),iv);
 const text=JSON.stringify({exp:now+TTL,step});
 const body=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
export function unsealReviewStep(token,{secret=signingSecret(),now=Date.now()}={}){
 if(typeof token!=='string'||!token||token.length>16000)throw new Error('Invalid review token.');
 try{
  const raw=Buffer.from(token,'base64url');if(raw.length<30)throw new Error('Invalid review token.');
  const dec=createDecipheriv('aes-256-gcm',keyFrom(secret),raw.subarray(0,12));
  dec.setAuthTag(raw.subarray(12,28));
  const parsed=JSON.parse(Buffer.concat([dec.update(raw.subarray(28)),dec.final()]).toString('utf8'));
  if(!Number.isFinite(parsed.exp)||parsed.exp<=now||parsed.exp>now+TTL||
   typeof parsed.step?.question!=='string'||!Array.isArray(parsed.step?.options)||
   parsed.step.options.length!==4||!Number.isInteger(parsed.step?.correctIndex)||
   parsed.step.correctIndex<0||parsed.step.correctIndex>3)throw new Error('Review expired or invalid.');
  return parsed.step;
 }catch{throw new Error('Review expired or invalid. Start a new review.');}
}
