import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginCommunityLoad,
  failCommunityLoad,
  initialCommunityLoadState,
  shouldRefreshCommunityOnFocus,
} from '../src/services/community-load.js';

test('background refresh preserves rendered community data and reports refresh failures separately', () => {
  const scope = 'published::7';
  const data = [{ id: 1, title: 'Bài đang hiển thị' }];
  const ready = { ...initialCommunityLoadState(scope), loading: false, data };

  assert.deepEqual(beginCommunityLoad(ready, scope), {
    ...ready,
    refreshing: true,
  });
  assert.deepEqual(failCommunityLoad(ready, scope, 'Mất kết nối'), {
    ...ready,
    refreshError: 'Mất kết nối',
  });
  assert.deepEqual(beginCommunityLoad(ready, 'mine::7'), initialCommunityLoadState('mine::7'));
});

test('window focus refresh waits for stale data and throttles repeated attempts', () => {
  const scope = 'published::7';
  const base = { visibility: 'visible', requestActive: false, scope, now: 60_000 };

  assert.equal(shouldRefreshCommunityOnFocus({ ...base, lastSuccess: { scope, at: 29_999 }, lastAttempt: { scope, at: 29_999 } }), true);
  assert.equal(shouldRefreshCommunityOnFocus({ ...base, lastSuccess: { scope, at: 40_000 }, lastAttempt: { scope, at: 0 } }), false);
  assert.equal(shouldRefreshCommunityOnFocus({ ...base, lastSuccess: { scope, at: 0 }, lastAttempt: { scope, at: 40_000 } }), false);
  assert.equal(shouldRefreshCommunityOnFocus({ ...base, visibility: 'hidden', lastSuccess: { scope, at: 0 }, lastAttempt: { scope, at: 0 } }), false);
  assert.equal(shouldRefreshCommunityOnFocus({ ...base, requestActive: true, lastSuccess: { scope, at: 0 }, lastAttempt: { scope, at: 0 } }), false);
});
