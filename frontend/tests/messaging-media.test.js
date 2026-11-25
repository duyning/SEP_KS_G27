import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMessageFiles} from '../src/services/messaging-media.js';

test('chat media rejects unsupported, oversized and fake files before starting upload',async()=>{
 assert.match(await validateMessageFiles([new File(['<svg/>'],'x.svg',{type:'image/svg+xml'})]),/JPG/);
 assert.match(await validateMessageFiles([new File(['not a png'],'x.png',{type:'image/png'})]),/khớp định dạng/);
 assert.match(await validateMessageFiles([new File(['not mp4'],'x.mp4',{type:'video/mp4'})]),/MP4/);
 assert.match(await validateMessageFiles(Array.from({length:7},()=>new File(['x'],'x.png',{type:'image/png'}))),/6 ảnh/);
 assert.match(await validateMessageFiles([new File(['x'],'a.mp4',{type:'video/mp4'}),new File(['x'],'b.mp4',{type:'video/mp4'})]),/1 video/);
 assert.match(await validateMessageFiles([{size:81*1024*1024}]),/80 MB/);
 assert.equal(await validateMessageFiles([]),'');
});
