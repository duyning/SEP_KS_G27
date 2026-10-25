import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformWithEsbuild } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/components/HostPropertyRegistration.jsx', import.meta.url), 'utf8');
const compiled = (await transformWithEsbuild(source, 'HostPropertyRegistration.jsx', { format: 'cjs', jsx: 'automatic' })).code;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
const Prompt = module.exports.default;
const render = hasProperty => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Prompt, { hasProperty })));

test('unregistered hosts retain registration navigation', () => {
  const html = render(false);
  assert.match(html, /Bạn chưa đăng ký nhà trọ/);
  assert.match(html, /href="\/host\/property\/new"/);
  assert.match(html, /Đăng ký nhà trọ/);
});
test('verified registered hosts do not see the registration prompt', () => assert.equal(render(true), ''));
test('unknown ownership retains navigation without claiming no property exists', () => {
  assert.match(render(undefined), /href="\/host\/property\/new"/);
  assert.doesNotMatch(render(undefined), /Bạn chưa đăng ký nhà trọ/);
});
