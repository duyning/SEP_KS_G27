import test from 'node:test';
import assert from 'node:assert/strict';
import { formatServiceMoney, parseServiceMoney } from '../src/services/service-form.js';

test('Vietnamese money display preserves the unformatted amount sent to the API', () => {
  for (const [raw, display] of [['200000', '200.000'], ['200000.50', '200.000,50'], ['9999999999.99', '9.999.999.999,99'], ['', ''], ['0.01', '0,01']]) {
    assert.equal(formatServiceMoney(raw), display);
    assert.equal(parseServiceMoney(display), raw);
  }
  assert.equal(parseServiceMoney('200.000 VNĐ'), '200000');
  for (const invalid of ['-100', 'abc', '1,2,3', '1,234', '10000000000']) assert.equal(parseServiceMoney(invalid), null);
});
