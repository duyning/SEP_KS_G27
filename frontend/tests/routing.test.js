import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canAccess, landingFor, legacyTarget, screens } from '../src/routing/screens.js';

test('every source page has one explicit React migration target', () => {
  const inventory = JSON.parse(fs.readFileSync(new URL('../migration/inventory.json', import.meta.url)));
  const migrated = screens.filter(item => item.source);
  assert.equal(migrated.length, 32);
  assert.deepEqual(migrated.map(item => `html/${item.source}`).sort(), inventory.html.map(item => item.file).sort());
  assert.equal(new Set(screens.map(item => item.path)).size, screens.length);
  for (const item of migrated) assert.equal(legacyTarget(item.source), item.path);
  assert.equal(screens.find(item => item.path === '/staff/service-applications').portal, 'staff');
});
test('role guards match backend host/staff/admin permissions', () => {
  for (const role of ['USER', 'ROOM_HOST', 'STAFF', 'ADMIN']) {
    assert.equal(canAccess('public', { role }), true);
    assert.equal(canAccess('member', { role }), true);
    assert.equal(canAccess('host', { role }), ['ROOM_HOST', 'ADMIN'].includes(role));
    assert.equal(canAccess('staff', { role }), ['STAFF', 'ADMIN'].includes(role));
    assert.equal(canAccess('admin', { role }), role === 'ADMIN');
  }
  assert.equal(canAccess('public', null), true);
  assert.equal(canAccess('unknown', { role: 'ADMIN' }), false);
  for (const portal of ['member', 'host', 'staff', 'admin']) {
    assert.equal(canAccess(portal, null), false);
    assert.equal(canAccess(portal, { role: 'UNKNOWN' }), false);
  }
});
test('availability merges into rooms rather than a duplicate module', () => {
  const availability = screens.find(item => item.source === 'host-room-availability.html');
  assert.equal(availability.kind, 'redirect');
  assert.equal(availability.to, '/host/rooms');
  assert.equal(screens.find(item => item.source === 'home.html').to, '/');
});
test('actor landing routes and unsupported modules are explicit', () => {
  assert.equal(landingFor({ role: 'USER' }), '/');
  assert.equal(landingFor({ role: 'ROOM_HOST' }), '/host');
  assert.equal(landingFor({ role: 'STAFF' }), '/staff');
  assert.equal(landingFor({ role: 'ADMIN' }), '/admin');
  for (const item of screens.filter(item => item.source && !['auth', 'redirect', 'profile'].includes(item.kind))) assert.equal(item.integration, 'blocked');
  assert.equal(screens.find(item => item.path === '/staff/service-applications').integration, 'connected');
});
test('active source contains no prototype storage identities or unsafe HTML', () => {
  const root = new URL('../src/', import.meta.url);
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) inspect(url);
      else if (/\.(jsx?|css)$/.test(entry.name)) {
        const content = fs.readFileSync(url, 'utf8');
        assert.doesNotMatch(content, /dangerouslySetInnerHTML|\.innerHTML\s*=|hlrcs_current_user|hlrcs_accounts|currentHost\s*=/, entry.name);
        assert.doesNotMatch(content, /href=["']#['"]/, entry.name);
      }
    }
  }
  inspect(root);
});
