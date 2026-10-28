import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_POST_IMAGE_BYTES, validatePostImages } from '../src/services/community-images.js';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16]);
const dimensions = async () => ({ width: 1200, height: 800 });
const file = (name = 'anh.png', bytes = png, type = 'image/png') => new File([bytes], name, { type });

test('accepts JPG, JPEG and PNG with matching extension, MIME and content', async () => {
  for (const image of [file(), file('ẢNH.PNG'), file('photo.jpg', jpeg, 'image/jpeg'), file('photo.JPEG', jpeg, 'image/jpeg')]) {
    assert.equal(await validatePostImages([image], 0, dimensions), '');
  }
  assert.equal(await validatePostImages([], 6, dimensions), '');
  assert.equal(await validatePostImages(Array.from({ length: 6 }, () => file()), 0, dimensions), '');
});

test('rejects unsupported files, false extensions, empty content and corrupt images with a named error', async () => {
  for (const image of [file('a.webp', png, 'image/webp'), file('a.gif', png, 'image/gif'), file('a.heic', png, 'image/heic'),
    file('a.svg', png, 'image/svg+xml'), file('a.pdf', png, 'application/pdf'), file('a.mp4', png, 'video/mp4'), file('a.png.exe'),
    file('wrong.png', jpeg), file('wrong.jpg', png, 'image/jpeg'), file('empty.png', []), file('wrong-mime.png', png, 'image/jpeg')]) {
    const error = await validatePostImages([image], 0, dimensions);
    assert.ok(error.includes(image.name), error);
  }
  assert.match(await validatePostImages([file()], 0, async () => { throw new Error('Corrupt data'); }), /bị hỏng/);
});

test('enforces count, exact byte limit and decoded dimensions including retained images', async () => {
  assert.match(await validatePostImages([file(), file()], 5, dimensions), /tối đa 6 ảnh/);
  const exact = new Uint8Array(MAX_POST_IMAGE_BYTES); exact.set(png);
  assert.equal(await validatePostImages([file('exact.png', exact)], 0, dimensions), '');
  assert.match(await validatePostImages([file('too-large.png', new Uint8Array(MAX_POST_IMAGE_BYTES + 1))], 0, dimensions), /5 MB/);
  assert.equal(await validatePostImages([file()], 0, async () => ({ width: 5000, height: 4000 })), '');
  for (const size of [{ width: 5001, height: 4000 }, { width: 10001, height: 1 }, { width: 0, height: 20 }]) {
    assert.match(await validatePostImages([file()], 0, async () => size), /20 megapixel/);
  }
});
