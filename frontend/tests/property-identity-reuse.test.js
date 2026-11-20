import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {hostApi} from '../src/services/host.js';
import {createPropertyForm,propertyDraft,restorePropertyDraft,validatePropertyStep} from '../src/services/property-registration.js';
const originalFetch=globalThis.fetch;
after(()=>globalThis.fetch=originalFetch);
test('saved CCCD satisfies the document step but is never placed in browser drafts',()=>{
 const form=createPropertyForm();
 form.documents={idCard:{name:'CCCD đã nộp',savedIdentity:true},ownership:{name:'license.pdf'},fireSafety:{name:'fire.pdf'}};
 assert.deepEqual(validatePropertyStep(form,4),{});
 const draft=JSON.stringify(propertyDraft(form));
 assert.ok(!draft.includes('savedIdentity'));assert.deepEqual(restorePropertyDraft(draft,{}).documents,{});
});
test('saved CCCD is resolved by backend and never serialized as a fake uploaded file',async()=>{
 globalThis.sessionStorage={getItem:()=>null};globalThis.localStorage={getItem:()=>null};
 const form=createPropertyForm();form.name='Nhà trọ';
 const file=new File(['%PDF-test'],'document.pdf',{type:'application/pdf'});
 form.documents={ownership:file,fireSafety:file,idCard:{name:'CCCD đã nộp',savedIdentity:true}};
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'/api/host/property-registrations');
  assert.equal(options.body.has('idCard'),false);assert.equal(options.body.has('ownership'),true);assert.equal(options.body.has('fireSafety'),true);
  assert.equal(JSON.parse(await options.body.get('details').text()).documents,undefined);
  return new Response(JSON.stringify({success:true,data:{registrationId:25,name:form.name,status:'PENDING'}}));
 };
 await hostApi.submitRegistration(form);
 form.documents.idCard=file;
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.body.get('idCard').name,'document.pdf');
  return new Response(JSON.stringify({success:true,data:{registrationId:26,name:form.name,status:'PENDING'}}));
 };
 await hostApi.submitRegistration(form);
});
