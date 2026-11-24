const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const base = process.env.HLRCS_TEST_API_URL || 'http://192.168.10.148:8081';
const email = process.env.HLRCS_TEST_EMAIL;
const password = process.env.HLRCS_TEST_PASSWORD;
if (!email || !password) throw new Error('Set HLRCS_TEST_EMAIL and HLRCS_TEST_PASSWORD for an existing local test account.');
const moduleState = { exports: {} };
const source = fs.readFileSync(path.resolve(__dirname, '../src/services/auth.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  module: moduleState, exports: moduleState.exports,
  require: name => name === 'react-native' ? { Platform: { OS: 'web' } } : {},
  process: { env: { EXPO_PUBLIC_API_URL: base } }, URL, AbortController, setTimeout, clearTimeout, fetch,
});
(async () => {
  const { authApi } = moduleState.exports;
  const session = await authApi.login({ email, password });
  assert.ok(session.accessToken); const me = await authApi.me(session.accessToken);
  assert.equal(me.userId, session.user.userId);
  await assert.rejects(authApi.googleLogin('invalid-google-id-token'), { status: 401 });
  await authApi.logout(session.accessToken);
  console.log(JSON.stringify({ result: 'passed', api: base, emailLogin: true, me: true, logout: true, rejectsInvalidGoogleToken: true, role: me.role }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
