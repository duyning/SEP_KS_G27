import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyEditForm,restoreEditDraft,validatePropertyEdit} from '../src/services/property-edit.js';
const details={name:'Nhà trọ đã lưu',propertyType:'Chung cư mini',description:'Mô tả đầy đủ về thông tin nhà trọ và các tiện ích xung quanh.',managerName:'Chủ trọ',contactPhone:'0912345678',zaloPhone:'',addressDetail:'Số 12, thôn 2, Tân Xã',commune:'Tân Xã',nearby:'',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:'',termsAccepted:true};
test('Edit draft restores only authorized fields at matching server version and never restores consent',()=>{
 const snapshot={details,versionToken:'fresh',editableFields:['description']};
 const result=restoreEditDraft(snapshot,{versionToken:'fresh',fields:{name:'Attempted bypass',description:'Mô tả nháp được phép chỉnh sửa theo yêu cầu staff.',termsAccepted:true}});
 assert.equal(result.name,details.name);assert.match(result.description,/Mô tả nháp/);assert.equal(result.termsAccepted,false);
 assert.equal(restoreEditDraft(snapshot,{versionToken:'stale',fields:{description:'stale draft'}}).description,details.description);
 assert.equal(propertyEditForm({...details,rules:null}).rules,'');
});
test('Resubmission accepts retained mandatory attachments and requires new consent',()=>{
 const form=propertyEditForm(details);const files=[{type:'OWNERSHIP'},{type:'ID_CARD'}];
 assert.ok(validatePropertyEdit(form,[1],[],{},files).termsAccepted);
 form.termsAccepted=true;assert.deepEqual(validatePropertyEdit(form,[1],[],{},files),{});
 assert.ok(validatePropertyEdit(form,[],[],{},files).photos);
 assert.ok(validatePropertyEdit(form,[1],[],{},[]).ownership);
});
