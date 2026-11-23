/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function compile(file: string, bindings: Record<string, unknown> = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, setTimeout, clearTimeout, ...bindings }
  );
  return module.exports;
}

const loading = compile('../src/services/loading-manager.ts') as typeof import('../src/services/loading-manager');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('overlay skips flicker for fast tasks completing within showDelayMs', async () => {
  const manager = new loading.LoadingManager({ showDelayMs: 40, minVisibleMs: 60 });
  const id = manager.start({ message: 'Đang tải nhanh...' });
  assert.equal(manager.getSnapshot().visible, false);
  assert.equal(manager.getSnapshot().activeCount, 1);

  await sleep(15);
  manager.stop(id);
  assert.equal(manager.getSnapshot().visible, false);
  assert.equal(manager.getSnapshot().activeCount, 0);

  await sleep(40);
  assert.equal(manager.getSnapshot().visible, false);
  manager.dispose();
});

test('overlay shows after showDelayMs and maintains minVisibleMs to prevent visual jitter', async () => {
  const manager = new loading.LoadingManager({ showDelayMs: 25, minVisibleMs: 70 });
  const id = manager.start({ message: loading.LOADING_MESSAGES.loadingData });
  assert.equal(manager.getSnapshot().visible, false);

  await sleep(35);
  assert.equal(manager.getSnapshot().visible, true);

  manager.stop(id);
  // Still visible during minVisibleMs window
  assert.equal(manager.getSnapshot().visible, true);
  assert.equal(manager.getSnapshot().activeCount, 0);

  await sleep(90);
  assert.equal(manager.getSnapshot().visible, false);
  manager.dispose();
});

test('concurrent tasks never cancel each other and fullscreen takes precedence over overlay', () => {
  const manager = new loading.LoadingManager({ showDelayMs: 0, minVisibleMs: 0 });
  const t1 = manager.start({ message: 'Tác vụ 1', mode: 'overlay' });
  const t2 = manager.start({ message: 'Tác vụ 2', mode: 'fullscreen' });

  assert.equal(manager.getSnapshot().visible, true);
  assert.equal(manager.getSnapshot().mode, 'fullscreen');
  assert.equal(manager.getSnapshot().message, 'Tác vụ 2');
  assert.equal(manager.getSnapshot().activeCount, 2);

  // Stopping overlay task does not turn off fullscreen task
  manager.stop(t1);
  assert.equal(manager.getSnapshot().visible, true);
  assert.equal(manager.getSnapshot().activeCount, 1);

  // Updating message updates active snapshot cleanly
  manager.updateMessage(t2, 'Đang chuyển không gian làm việc...');
  assert.equal(manager.getSnapshot().message, 'Đang chuyển không gian làm việc...');

  manager.stop(t2);
  assert.equal(manager.getSnapshot().visible, false);
  assert.equal(manager.getSnapshot().activeCount, 0);
  manager.dispose();
});

test('withLoading always clears task state even when async request fails', async () => {
  const manager = new loading.LoadingManager({ showDelayMs: 0, minVisibleMs: 0 });
  await assert.rejects(
    manager.withLoading(
      async update => {
        update('Đang kết nối máy chủ...');
        assert.equal(manager.getSnapshot().message, 'Đang kết nối máy chủ...');
        throw new Error('Network error');
      },
      { message: 'Bắt đầu...' }
    )
  );
  assert.equal(manager.getSnapshot().visible, false);
  assert.equal(manager.getSnapshot().activeCount, 0);
  manager.dispose();
});

test('mobile GlobalLoading uses NestHub brand tokens, reduced motion and zero role leaks', () => {
  const componentSrc = readFileSync(
    new URL('../src/components/loading/global-loading.tsx', import.meta.url),
    'utf8'
  );
  const layoutSrc = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');

  assert.match(componentSrc, /#F8FAFC/i);
  assert.match(componentSrc, /#0D9488/i);
  assert.match(componentSrc, /useReducedMotionPreference/);
  assert.match(componentSrc, /accessibilityRole="progressbar"/);
  assert.match(componentSrc, /accessibilityRole="alert"/);
  assert.match(layoutSrc, /LoadingProvider/);
  assert.match(layoutSrc, /GlobalSplashLoading/);
  assert.match(layoutSrc, /GlobalLoadingOverlay/);

  const roleLeak = /\b(ADMIN|STAFF|ROOM_HOST)\b|Quản trị viên|Nhân viên/i;
  assert.doesNotMatch(componentSrc, roleLeak);
});
