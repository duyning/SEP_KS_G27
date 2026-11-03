import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { MotionDialog } from '../../components/motion/MotionUI.jsx';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {StateView,useToast} from '../../components/PortalUI.jsx';
import {staffHostApi} from '../../services/staff-host-applications.js';
import StaffHostShell,{HostApplicationStatus,date,applicationLabels} from './StaffHostShell.jsx';
import StaffHostDetailTemplate from './StaffHostDetailTemplate.jsx';
import {applicantCapacities,rentalExperiences,applicationFieldLabel} from '../../services/host-applications.js';
import StaffHostModalTemplate from './StaffHostModalTemplate.jsx';
const fields=[
 ['targetCommune','Khu vực hoạt động chính','Vui lòng làm rõ khu vực dự kiến quản lý nhà trọ.'],
 ['expectedScale','Quy mô phòng dự kiến','Vui lòng xác nhận số phòng dự kiến vận hành.'],
 ['introduction','Giới thiệu bản thân & cơ sở cho thuê','Vui lòng mô tả rõ kinh nghiệm, địa chỉ sơ bộ và tiện ích cơ sở.'],
 ['applicantCapacity','Tư cách cho thuê','Vui lòng xác nhận bạn là chủ sở hữu, người được ủy quyền hay người thuê để cho thuê lại.'],
 ['rentalExperience','Kinh nghiệm quản lý','Vui lòng xác nhận kinh nghiệm quản lý cho thuê của bạn.'],
 ['accPhone','Số điện thoại liên hệ chính chủ','Vui lòng cập nhật số điện thoại chính chủ tại Hồ sơ cá nhân.'],
 ['accFullName','Họ và tên người đăng ký','Vui lòng cập nhật họ và tên thật tại Hồ sơ cá nhân.'],
 ['accEmail','Email tài khoản','Email đăng nhập được quản lý riêng; cần liên hệ hỗ trợ khi thay đổi.']
];
const supplementNote=(selected,commonNote)=>Object.keys(selected).map(key=>`${fields.find(([id])=>id===key)[1]}: ${selected[key].trim()}`).concat(commonNote.trim()?[`Ghi chú chung: ${commonNote.trim()}`]:[]).join('\n\n');
function DecisionDialog({children,modal,busy,onClose}){
 return <MotionDialog className="hr-native-modal hr-decision-dialog" aria-describedby="hostDecisionDescription" aria-labelledby={{approve:'modalApproveTitle',reject:'modalRejectTitle',supplement:'modalReqChangesTitle'}[modal]} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>{children}</MotionDialog>;
}
export default function StaffHostRegistrationDetailPage(){
 const [params]=useSearchParams(),id=Number(params.get('id')),notify=useToast();
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[modal,setModal]=useState(null),[values,setValues]=useState({approveNote:'',rejectReason:'',commonNote:'',allowResubmit:true}),[selected,setSelected]=useState({}),[modalError,setModalError]=useState(''),[busy,setBusy]=useState(false),[stale,setStale]=useState(false);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setStale(false);if(!Number.isSafeInteger(id)||id<1){setError('Mã hồ sơ không hợp lệ.');setLoading(false);return()=>controller.abort();}staffHostApi.detail(id,controller.signal).then(detail=>{if(!controller.signal.aborted)setData(detail);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[id,revision]);
 if(loading||error||!data)return <StaffHostShell><section className="staff-content"><StateView kind={loading?'loading':'error'} message={error}>{!loading&&<MotionButton className="p-button" onClick={()=>setRevision(value=>value+1)}>Thử lại</MotionButton>}</StateView></section></StaffHostShell>;
 const a=data.application;
 function openModal(kind){if(a.status!=='PENDING_REVIEW'||busy)return;setValues({approveNote:'',rejectReason:'',commonNote:'',allowResubmit:true});setSelected({});setModalError('');setModal(kind);}
 const onClick=event=>{const target=event.target;if(target.closest('#btnTriggerApprove'))openModal('approve');if(target.closest('#btnTriggerReject'))openModal('reject');if(target.closest('#btnTriggerRequestChanges'))openModal('supplement');};
 async function submit(){
  if(busy)return;let note='',requestedFields=[];
  if(modal==='approve')note=values.approveNote.trim();
  else if(modal==='reject'){note=values.rejectReason.trim();if(note.length<10){setModalError('Vui lòng nêu lý do từ chối cụ thể, ít nhất 10 ký tự.');return;}}
  else{
   requestedFields=Object.keys(selected);
   if(!requestedFields.length){setModalError('Vui lòng tích chọn ít nhất một mục cần bổ sung.');return;}
   if(requestedFields.some(key=>selected[key].trim().length<5)){setModalError('Vui lòng nhập hướng dẫn cụ thể cho từng mục đã chọn.');return;}
   note=supplementNote(selected,values.commonNote);
  }
  if(note.length>2000){setModalError('Tổng nội dung gửi tối đa 2000 ký tự.');return;}
  setBusy(true);setModalError('');
  try{const result=await staffHostApi.review(id,{decision:{approve:'APPROVED',reject:'REJECTED',supplement:'NEEDS_CHANGES'}[modal],note,allowResubmit:modal==='reject'?values.allowResubmit:true,version:a.version,requestedFields});setData(previous=>({...previous,application:result}));setModal(null);notify(result.status==='APPROVED'?'Đã phê duyệt và cấp quyền Chủ trọ.':result.status==='NEEDS_CHANGES'?'Đã gửi yêu cầu bổ sung cho người đăng ký.':'Đã từ chối hồ sơ đăng ký.');window.dispatchEvent(new Event('hlrcs:staff-updated'));setRevision(value=>value+1);}
  catch(error){setModalError(error.message);if(error.status===409){setStale(true);setModal(null);}}finally{setBusy(false);}
 }
 function modalClick(event){if(event.target.closest('.btn-close-modal,.btn-modal-secondary')&&!busy)setModal(null);if(event.target.closest('#btnConfirmApprove,#btnConfirmReject,#btnConfirmReqChanges'))submit();}
 function onChange(event){const {name,value,type,checked}=event.target;if(!name)return;setValues(previous=>({...previous,[name]:type==='checkbox'?checked:value}));setModalError('');}
 const currentValue=key=>key==='applicantCapacity'?applicationFieldLabel(applicantCapacities,a.applicantCapacity):key==='rentalExperience'?applicationFieldLabel(rentalExperiences,a.rentalExperience):a[{accPhone:'userPhone',accFullName:'userName',accEmail:'userEmail'}[key]||key]||'Chưa cung cấp';
 const checklist=<>{[['Thông tin nguyện vọng đối tác',fields.slice(0,5)],['Thông tin tài khoản chính chủ',fields.slice(5)]].map(([group,items])=><section className="shrd-schema-group" key={group}><header className="shrd-schema-group-header"><strong>{group}</strong><small>{items.length} mục</small></header><div className="shrd-schema-fields-list">{items.map(([key,label,instruction])=><div className="shrd-schema-field-item" key={key}><label className="shrd-field-checkbox-row"><input type="checkbox" checked={Object.hasOwn(selected,key)} disabled={busy||key==='accEmail'} onChange={event=>{const checked=event.target.checked;setSelected(previous=>{const next={...previous};if(checked)next[key]=instruction;else delete next[key];return next;});setModalError('');}}/><span className="shrd-field-info"><span className="shrd-field-name">{label}</span><span className="shrd-field-curr-val">Giá trị hiện tại: <strong>{currentValue(key)}</strong>{key==='accEmail'&&<small>Địa chỉ đăng nhập cố định; thay đổi qua hỗ trợ tài khoản.</small>}</span></span></label>{Object.hasOwn(selected,key)&&<div className="shrd-field-instruction-wrap hr-instruction-visible"><label className="shrd-instruction-label" htmlFor={'instruction-'+key}>Hướng dẫn bổ sung *</label><textarea id={'instruction-'+key} className="shrd-instruction-input" value={selected[key]} maxLength={600} disabled={busy} onChange={event=>{const value=event.target.value;setSelected(previous=>({...previous,[key]:value}));setModalError('');}}/></div>}</div>)}</div></section>)}</>;
 const events=[...data.history,{action:'SUBMITTED',note:'Người dùng gửi hồ sơ xin cấp quyền Chủ trọ.',reviewer:a.userName,createdAt:a.submittedAt}].sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt));
 const history=events.map((event,index)=><article className="shrd-timeline-item" key={index}><div className="shrd-timeline-node"/><header className="shrd-timeline-header"><strong className="shrd-timeline-title">{event.action==='SUBMITTED'?'Gửi hồ sơ đăng ký':applicationLabels[event.action]||event.action}</strong><span className="shrd-timeline-time">{date(event.createdAt)}</span></header><p className="shrd-timeline-actor">Bởi: <strong>{event.reviewer}</strong></p>{event.note&&<div className="shrd-timeline-note">{event.note}</div>}</article>);
 const terminal=<div className="shrd-terminal-box"><h4 className="shrd-terminal-title">{applicationLabels[a.status]}</h4>{a.reviewerNote&&<p className="hr-preserve-lines">{a.reviewerNote}</p>}<p className="shrd-terminal-meta">{a.reviewedBy?`Đã xử lý bởi ${a.reviewedBy}`:'Đang chờ người đăng ký cập nhật'} · {date(a.reviewedAt)}</p></div>;
 return <StaffHostShell><StaffHostDetailTemplate application={a} {...{date,onClick,history,terminal}} statusBadge={<HostApplicationStatus status={a.status}/>}/>{stale&&<p className="hr-stale" role="alert">Hồ sơ đã thay đổi. <MotionButton onClick={()=>{setModal(null);setRevision(value=>value+1);}}>Tải lại dữ liệu</MotionButton></p>}<AnimatePresence>{modal&&<DecisionDialog {...{modal,busy}} onClose={()=>setModal(null)}><StaffHostModalTemplate {...{modal,values,busy,checklist}} application={a} selectedCount={Object.keys(selected).length} error={modalError} totalCharacters={supplementNote(selected,values.commonNote).length} onClick={modalClick} onChange={onChange}/></DecisionDialog>}</AnimatePresence></StaffHostShell>;
}
