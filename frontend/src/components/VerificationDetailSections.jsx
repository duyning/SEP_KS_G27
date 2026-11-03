import {useEffect,useState} from 'react';
import {Check,Clock3,Eye,FileCheck2,FileText,History,House,ImageOff,LockKeyhole,ShieldCheck,UserRound} from 'lucide-react';
import {staffApi} from '../services/staff.js';
import {AMENITIES,RULES} from '../services/property-registration.js';
import {attachmentSize,reviewActionLabels} from '../services/verification-detail.js';
import {staffDate} from './StaffUI.jsx';
import VerificationLocationMap from './VerificationLocationMap.jsx';

function SectionHeading({number,title,icon:Icon,children}){return <header className="svd-section-heading"><h3><span><Icon size={18}/></span>{number}. {title}</h3>{children}</header>;}
export function VerificationFields({rows}){return <dl className="sw-detail-fields svd-fields">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Chưa cung cấp'}</dd></div>)}</dl>;}

function VerificationGallery({registrationId,photos,onOpen}){
 const [selected,setSelected]=useState(photos[0]?.documentId);const [images,setImages]=useState({});
 useEffect(()=>{
  setSelected(photos[0]?.documentId);setImages({});const controller=new AbortController();const urls=[];
  for(const file of photos)staffApi.file(registrationId,file.documentId,controller.signal).then(blob=>{
   if(controller.signal.aborted)return;if(!blob.type.startsWith('image/'))throw Error('Invalid image');const url=URL.createObjectURL(blob);urls.push(url);setImages(previous=>({...previous,[file.documentId]:url}));
  }).catch(()=>{if(!controller.signal.aborted)setImages(previous=>({...previous,[file.documentId]:null}));});
  return()=>{controller.abort();urls.forEach(url=>URL.revokeObjectURL(url));};
 },[registrationId,photos]);
 if(!photos.length)return <div className="svd-gallery-empty"><ImageOff size={30}/><p>Chủ trọ chưa gửi hình ảnh nhà trọ.</p></div>;
 const active=photos.find(file=>file.documentId===selected)||photos[0];
 return <div className="svd-gallery"><button type="button" className="svd-gallery-main" disabled={!images[active.documentId]} aria-label="Phóng to ảnh nhà trọ" onClick={()=>onOpen(active)}>{images[active.documentId]?<img src={images[active.documentId]} alt={`Ảnh nhà trọ ${active.fileName||''}`}/>:<span className="svd-image-missing"><ImageOff size={30}/>{images[active.documentId]===null?'Không tải được ảnh.':'Đang tải ảnh...'}</span>}</button><div className="sw-photo-gallery svd-gallery-thumbnails" aria-label="Chọn ảnh nhà trọ">{photos.map((file,index)=><button type="button" key={file.documentId} aria-label={`Chọn ảnh nhà trọ ${index+1}`} aria-pressed={file.documentId===active.documentId} onClick={()=>setSelected(file.documentId)}>{images[file.documentId]?<img src={images[file.documentId]} alt={`Ảnh ${index+1}`}/>:<ImageOff size={18}/>}</button>)}</div><p className="svd-gallery-caption">Ảnh {photos.indexOf(active)+1}/{photos.length} · {active.fileName||'Ảnh nhà trọ'}</p></div>;
}

export function VerificationPropertyInfo({summary,submission:form,photos,onOpen}){
 return <section className="sw-panel svd-section"><SectionHeading number={1} title="Thông tin Nhà trọ thẩm định" icon={House}>{form?.propertyType&&<span className="svd-type-badge">{form.propertyType}</span>}</SectionHeading>
  <h2 className="svd-property-name">{summary.name}</h2><p className="svd-property-address">{summary.address||'Chưa cung cấp địa chỉ'}</p>
  {!form&&<p className="sw-warning">Hồ sơ cũ chưa có đầy đủ thông tin theo cấu trúc mới. Các mục chưa được lưu sẽ hiển thị là chưa cung cấp.</p>}
  <VerificationLocationMap summary={summary} submission={form}/>
  <VerificationGallery registrationId={summary.registrationId} photos={photos} onOpen={onOpen}/>
  <div className="svd-property-copy"><h4>Mô tả tổng quan của nhà trọ</h4><p>{form?.description||'Chưa cung cấp mô tả nhà trọ.'}</p></div>
  <h4 className="svd-label">Tiện ích &amp; Cơ sở vật chất khai báo</h4><div className="sw-detail-tags svd-tags">{(form?.amenities||[]).map(key=><span key={key}><Check size={12}/>{AMENITIES.find(([value])=>value===key)?.[1]||key}</span>)}{!form?.amenities?.length&&<p>Chưa cung cấp tiện ích.</p>}</div>
  <h4 className="svd-label">Quy định chung của nhà trọ</h4><div className="sw-detail-tags svd-tags rules">{(form?.selectedRules||[]).map(key=><span key={key}><Check size={12}/>{RULES.find(([value])=>value===key)?.[1]||key}</span>)}{!form?.selectedRules?.length&&<p>Chưa cung cấp quy định.</p>}</div>
  {form?.rules&&<p className="svd-custom-rules">{form.rules}</p>}
  <p className="svd-consent"><ShieldCheck size={14}/>{form?.termsAccepted?'Chủ trọ đã xác nhận cam kết thông tin và tài liệu chính xác.':'Hồ sơ chưa lưu xác nhận cam kết thông tin.'}</p>
 </section>;
}
export function VerificationOwnerInfo({summary,submission:form}){
 return <section className="sw-panel svd-section"><SectionHeading number={2} title="Thông tin Chủ trọ & Người đại diện quản lý" icon={UserRound}><span className="svd-owner-role">Room Host</span></SectionHeading><div className="svd-owner"><span className="svd-owner-avatar">{summary.ownerName?.trim()?.charAt(0)||<UserRound size={22}/>}</span><div><strong>{summary.ownerName||'Chưa cung cấp tên chủ trọ'}</strong><span className="svd-account-tag">Tài khoản chủ trọ</span></div></div>
  <VerificationFields rows={[["Số điện thoại tài khoản",summary.ownerPhone||null],['Địa chỉ email',summary.ownerEmail||null],['Mã tài khoản chủ trọ',summary.ownerId!=null?`#${summary.ownerId}`:null],['Người quản lý / Đại diện',form?.managerName||null],['Hotline tiếp khách',form?.contactPhone||null],['Zalo liên hệ',form?.zaloPhone||null]]}/>
 </section>;
}
const documentTypes=[['OWNERSHIP','Giấy tờ quyền sở hữu đất / nhà ở','Sổ đỏ, sổ hồng hoặc hợp đồng ủy quyền quản lý hợp lệ.'],['ID_CARD','CCCD người đại diện quản lý','Giấy tờ định danh chủ trọ hoặc người đại diện được ủy quyền.'],['FIRE_SAFETY','Biên bản / Bản cam kết an toàn PCCC','Biên bản kiểm tra hoặc bản cam kết an toàn phòng cháy chữa cháy.']];
export function VerificationDocuments({documents,onOpen,loading,error}){
 return <section className="sw-panel svd-section"><SectionHeading number={3} title="Hồ sơ tài liệu xác minh đính kèm" icon={FileText}><span className="svd-private-badge"><LockKeyhole size={12}/>Bảo mật Staff</span></SectionHeading><p className="svd-security-notice"><ShieldCheck size={17}/><span><strong>Bảo mật hồ sơ tư nhân:</strong> Tài liệu phục vụ xác minh quyền sở hữu và nhân thân, chỉ xem qua quyền truy cập nội bộ; không hiển thị công khai cho người thuê.</span></p>
  <div className="svd-document-list">{documentTypes.map(([type,label,description])=>{
   const file=documents.find(item=>item.type===type);const approved=file&&['APPROVED','VERIFIED'].includes(file.verificationStatus);const rejected=file?.verificationStatus==='REJECTED';
   return <article className="svd-document" key={type}><header><FileCheck2 size={24}/><div><h4>{label}</h4><p>{description}</p></div></header><div className={`svd-document-file ${!file?'missing':rejected?'rejected':''}`}><FileText size={18}/><div><strong>{file?.fileName||'Chưa đính kèm tài liệu'}</strong>{file&&<small>{attachmentSize(file.fileSize)||'Dung lượng chưa được lưu'} · Tải lên: {file.uploadedAt?staffDate(file.uploadedAt):'Chưa lưu thời điểm'}</small>}</div><span>{approved?'Đã xác minh':rejected?'Chưa hợp lệ':file?'Đã nộp':'Chưa nộp'}</span></div><footer><button type="button" className="sw-outline small" disabled={!file||loading} onClick={()=>onOpen(file)}><Eye size={14}/>Xem tài liệu</button></footer></article>;
  })}</div>{loading&&<p className="svd-file-loading" role="status">Đang tải tài liệu...</p>}{error&&<p className="sw-error" role="alert">{error}</p>}
 </section>;
}
export function VerificationHistory({summary,history,submissionEvents=[]}){
 const sorted=[...history,...submissionEvents.filter(event=>event.action!=='CHANGE_REQUESTED').map(event=>({logId:`submission-${event.eventId}`,staffName:event.actorName,action:event.action,createdAt:event.createdAt}))].sort((a,b)=>(Date.parse(a.createdAt)||0)-(Date.parse(b.createdAt)||0));
 return <section className="sw-panel svd-section"><SectionHeading number={4} title="Nhật ký xử lý & Lịch sử thẩm định" icon={History}/><ol className="sw-activity svd-history"><li><strong>Chủ trọ gửi hồ sơ xác minh</strong><p>Thực hiện bởi: {summary.ownerName||'Chủ trọ'}</p><time>{staffDate(summary.createdAt)}</time></li>{sorted.map(item=><li key={item.logId}><strong>{reviewActionLabels[item.action]||item.action}</strong><p>Thực hiện bởi: {item.staffName||'Chưa lưu người xử lý'}</p>{item.note&&<blockquote>{item.note}</blockquote>}<time>{staffDate(item.createdAt)}</time></li>)}</ol></section>;
}
