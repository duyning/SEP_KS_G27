const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path'); const vm=require('node:vm'); const ts=require('typescript');
const email=process.env.HLRCS_TEST_EMAIL,password=process.env.HLRCS_TEST_PASSWORD;
if(!email||!password)throw new Error('Set credentials of an existing local test account.');
const moduleState={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/services/auth.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 module:moduleState,exports:moduleState.exports,require:name=>name==='react-native'?{Platform:{OS:'web'}}:{},process:{env:{EXPO_PUBLIC_API_URL:process.env.HLRCS_TEST_API_URL||'http://192.168.10.148:8081'}},URL,AbortController,setTimeout,clearTimeout,fetch,
});
(async()=>{
 const api=moduleState.exports.authApi; const session=await api.login({email,password}); const me=await api.me(session.accessToken);
 const saved=await api.updateProfile({fullName:me.fullName,phoneNumber:me.phoneNumber,organization:me.organization,preferredArea:me.preferredArea},session.accessToken);
 assert.equal(saved.userId,me.userId); assert.equal(saved.fullName,me.fullName); assert.equal(saved.email,me.email);
 await assert.rejects(api.changePassword({oldPassword:'intentionally-wrong-local-smoke-password',newPassword:'different-smoke-password',confirmNewPassword:'different-smoke-password'},session.accessToken),error=>error.status===400);
 await api.logout(session.accessToken);
 console.log(JSON.stringify({result:'passed',profileRead:true,profileWriteSameValues:true,emailUnchanged:true,wrongPasswordRejected:true,changedRealPassword:false,logout:true}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
