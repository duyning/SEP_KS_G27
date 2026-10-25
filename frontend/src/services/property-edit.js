import {createPropertyForm,validatePropertyStep} from './property-registration.js';
export function propertyEditForm(details){const {photos,documents,...base}=createPropertyForm();const form={...base,...details,termsAccepted:false};for(const key of Object.keys(base)){if(form[key]==null)form[key]=base[key];}return form;}
export function restoreEditDraft(snapshot,draft){
 const base=propertyEditForm(snapshot.details);
 if(draft?.versionToken!==snapshot.versionToken)return base;
 for(const key of snapshot.editableFields)if(key in base&&key!=='termsAccepted'&&key in (draft.fields||{}))base[key]=draft.fields[key];
 return base;
}
export function validatePropertyEdit(form,retained,photos,documents,existingDocuments){
 const errors={...validatePropertyStep(form,0),...validatePropertyStep(form,1),...validatePropertyStep(form,2)};
 if(retained.length+photos.length<1||retained.length+photos.length>10)errors.photos='Cần từ 1 đến 10 ảnh nhà trọ.';
 for(const [key,type] of [['ownership','OWNERSHIP'],['idCard','ID_CARD']])if(!documents[key]&&!existingDocuments.some(file=>file.type===type))errors[key]='Vui lòng bổ sung tài liệu bắt buộc.';
 if(!form.termsAccepted)errors.termsAccepted='Vui lòng xác nhận thông tin trước khi gửi lại xét duyệt.';
 return errors;
}
