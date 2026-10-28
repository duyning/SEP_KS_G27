import test from 'node:test';
import assert from 'node:assert/strict';
import { detailDate, detailPhone, moveInEstimate, ratingPercent, zaloLink } from '../src/services/accommodation-detail.js';

test('cost estimate counts only known rent and deposit, including an explicit zero deposit', () => {
  assert.equal(moveInEstimate(2200000,2200000),4400000);
  assert.equal(moveInEstimate(2200000,0),2200000);
  for (const value of [null,undefined,-1,NaN]) assert.equal(moveInEstimate(2200000,value),null);
});
test('contact links accept Vietnamese phone numbers and reject arbitrary URL/content injection', () => {
  assert.equal(detailPhone('0987 654 321'),'0987654321');
  assert.equal(zaloLink('0987654321'),'https://zalo.me/84987654321');
  assert.equal(zaloLink('+84987654321'),'https://zalo.me/84987654321');
  for (const value of [null,'javascript:alert(1)','https://example.com','abc','123']) assert.equal(zaloLink(value),null);
});
test('empty reviews display zero-length bars and missing dates remain explicitly missing', () => {
  assert.equal(ratingPercent(0,0),0);
  assert.equal(ratingPercent(2,3),67);
  assert.equal(ratingPercent(20,3),100);
  assert.equal(detailDate(null),'Chưa cập nhật');
  assert.equal(detailDate('bad date'),'Chưa cập nhật');
});
