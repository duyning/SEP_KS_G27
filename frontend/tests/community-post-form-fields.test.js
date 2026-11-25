import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePost, postPayload } from '../src/services/community.js';
import { validatePostImages } from '../src/services/community-images.js';
import { validatePostVideos } from '../src/services/community-videos.js';

// Shared form values are also checked by the real backend DTO and services.
const cases = JSON.parse(fs.readFileSync(new URL('../../src/test/resources/community-post-form-cases.json', import.meta.url), 'utf8'));
const result = new URL('../../target/community-form-frontend.json', import.meta.url);
const output = [];
function imageFiles(profile) {
  if (profile === 'none') return [];
  const header = profile === 'jpg' ? [255,216,255,0,0,0,0,0] : [137,80,78,71,13,10,26,10];
  return Array.from({length: profile === 'six' ? 6 : profile === 'seven' ? 7 : 1}, (_,i) => ({
    name:`phong-${i+1}.${profile === 'jpg' ? 'jpg' : profile === 'gif' ? 'gif' : 'png'}`,
    type:profile === 'jpg' ? 'image/jpeg' : profile === 'gif' ? 'image/gif' : 'image/png',
    size:profile === 'empty' ? 0 : profile === 'size-limit' ? 5*1024*1024 : profile === 'size-over' ? 5*1024*1024+1 : 128,
    slice:() => new Blob([new Uint8Array(profile === 'corrupt' ? [1,2,3] : header)]),
  }));
}
function videoFiles(profile) {
  if (profile === 'none') return [];
  const header=new Uint8Array(32);header.set([0,0,0,32]);header.set(new TextEncoder().encode('ftypisom'),4);
  return Array.from({length:profile === 'two' ? 2 : 1},(_,i)=>({
    name:`phong-${i+1}.${profile === 'mov' ? 'mov' : 'mp4'}`,type:profile === 'mov' ? 'video/quicktime' : 'video/mp4',
    size:profile === 'empty' ? 0 : profile === 'size-limit' ? 50*1024*1024 : profile === 'size-over' ? 50*1024*1024+1 : 512,
    slice:()=>new Blob([profile === 'corrupt' ? new Uint8Array([1,2,3]) : header]),
  }));
}
for (const c of cases) test(`${c.id} ${c.title}`,async()=>{
  const errors=validatePost(c.values);
  if (!Object.keys(errors).length) {
    const imageError=await validatePostImages(imageFiles(c.values.images),0,async()=>({width:c.values.images === 'wide' ? 10001 : 32,height:32}));
    if(imageError) errors.images=imageError;
    else {
      const videoError=await validatePostVideos(videoFiles(c.values.videos),0,async()=>({width:32,height:32,duration:c.values.videos === 'duration-over' ? 181 : c.values.videos === 'duration-limit' ? 180 : 1}));
      if(videoError) errors.videos=videoError;
    }
  }
  assert.deepEqual(Object.keys(errors),c.errorField?[c.errorField]:[]);
  const payload=postPayload(c.values);
  if(!c.errorField) for(const [key,value] of Object.entries(c.payloadChecks)) assert.equal(payload[key],value);
  // Numeric malformed values are tested as direct API attempts separately from form blocking.
  if(Number.isNaN(payload.price) && /^-?\d+(?:\.\d+)?$/.test(c.values.price)) payload.price=c.values.price;
  output.push({...c,request:payload,frontendStatus:'Passed',frontendMessage:c.errorField?errors[c.errorField]:'Không có lỗi. Cho phép gửi bài.'});
});
test.after(()=>{
  fs.mkdirSync(new URL('../../target/',import.meta.url),{recursive:true});
  fs.writeFileSync(result,JSON.stringify(output,null,2));
});
