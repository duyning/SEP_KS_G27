import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_POST_VIDEO_BYTES, validatePostVideos } from '../src/services/community-videos.js';

const header = Uint8Array.from([0, 0, 0, 24, ...Buffer.from('ftypisom'), 0, 0, 0, 0, ...Buffer.from('isommp42')]);
const file = (name = 'video.mp4', bytes = header, type = 'video/mp4') => new File([bytes], name, { type });
const decoded = async () => ({ duration: 30, width: 1920, height: 1080 });

test('accepts one MP4 including portrait Full HD, with optional retained video', async () => {
  assert.equal(await validatePostVideos([file()], 0, decoded), '');
  assert.equal(await validatePostVideos([file('CLIP.MP4')], 0, async () => ({ duration: 180, width: 1080, height: 1920 })), '');
  assert.equal(await validatePostVideos([], 1, decoded), '');
  assert.match(await validatePostVideos([file()], 1, decoded), /tối đa 1 video/);
  assert.match(await validatePostVideos([file(), file()], 0, decoded), /tối đa 1 video/);
});

test('rejects wrong extensions, MIME, spoofed/empty/corrupt files with the file name', async () => {
  for (const image of [file('a.mov', header, 'video/quicktime'), file('a.avi'), file('a.mkv'), file('a.webm'),
    file('a.mp4.exe'), file('a.mp4', header, 'application/octet-stream'), file('empty.mp4', []), file('fake.mp4', Buffer.from('not video'))]) {
    const error = await validatePostVideos([image], 0, decoded);
    assert.ok(error.includes(image.name), error);
  }
  assert.match(await validatePostVideos([file()], 0, async () => { throw new Error('Decoder failed'); }), /bị hỏng/);
});

test('enforces byte limit, duration and resolution using decoded video metadata', async () => {
  const exact = new Uint8Array(MAX_POST_VIDEO_BYTES); exact.set(header);
  assert.equal(await validatePostVideos([file('limit.mp4', exact)], 0, decoded), '');
  assert.match(await validatePostVideos([file('large.mp4', new Uint8Array(MAX_POST_VIDEO_BYTES + 1))], 0, decoded), /50 MB/);
  for (const duration of [0, -1, 180.01, Infinity, NaN]) {
    assert.match(await validatePostVideos([file()], 0, async () => ({ duration, width: 320, height: 180 })), /3 phút/);
  }
  for (const size of [{ width: 3840, height: 2160 }, { width: 1920, height: 1200 }, { width: 0, height: 1080 }]) {
    assert.match(await validatePostVideos([file()], 0, async () => ({ duration: 30, ...size })), /Full HD/);
  }
});
