import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Eye, FilePenLine, FileText, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { StaffLoadState, StaffStatus, StaffThumbnail, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';
import { staffApi } from '../../services/staff.js';
import { AMENITIES, RULES } from '../../services/property-registration.js';

function Fields({ rows }) { return <dl className="sw-detail-fields">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Chưa cung cấp'}</dd></div>)}</dl>; }

export default function StaffPropertyVerificationDetailPage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const state = useStaffLoad('detail',id);
  const notify = useToast();
  const [preview,setPreview] = useState(null);
  const [fileError,setFileError] = useState('');
  const [fileLoading,setFileLoading] = useState(false);
  const [decision,setDecision] = useState(null);
  const [note,setNote] = useState('');
  const [reviewError,setReviewError] = useState('');
  const [busy,setBusy] = useState(false);
  const fileRequest = useRef();
  const reviewRequest = useRef();
  const previewUrl = useRef();
  useEffect(()=>{setPreview(null);setDecision(null);setFileError('');setFileLoading(false);setBusy(false);return()=>{fileRequest.current?.abort();reviewRequest.current?.abort();if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);};},[id]);
  const closePreview = () => { setPreview(null); if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=null; };
  const openFile = async file => {
    fileRequest.current?.abort();
    const controller = new AbortController();fileRequest.current=controller;
    setFileLoading(true);setFileError('');
    try { const blob=await staffApi.file(id,file.documentId,controller.signal);if(controller.signal.aborted)return;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);const url=URL.createObjectURL(blob);previewUrl.current=url;setPreview({url,type:blob.type,name:file.fileName || 'tai-lieu'}); }
    catch(error){if(!controller.signal.aborted)setFileError(error.message);}
    finally{if(!controller.signal.aborted)setFileLoading(false);}
  };
  const review = async event => {
    event.preventDefault();
    if(reviewRequest.current)return;
    if(decision!=='APPROVE' && (note.trim().length<10 || note.trim().length>2000)){setReviewError('Vui lòng nhập nội dung từ 10 đến 2000 ký tự.');return;}
    const controller=new AbortController();reviewRequest.current=controller;setBusy(true);setReviewError('');
    try{const data=await staffApi.review(id,decision,note.trim(),controller.signal);if(controller.signal.aborted)return;state.replace(data);setDecision(null);setNote('');notify?.(decision==='REQUEST_SUPPLEMENT'?'Đã gửi yêu cầu bổ sung. Chủ trọ có thể xem nội dung tại Nhà trọ của tôi.':decision==='APPROVE'?'Đã phê duyệt hồ sơ. Nhà trọ được chuyển sang trạng thái Đang hiển thị.':'Đã từ chối hồ sơ và lưu lý do cho chủ trọ.','success');window.dispatchEvent(new Event('hlrcs:staff-updated'));}
    catch(error){if(!controller.signal.aborted){setReviewError(error.message);if(error.status===409){setDecision(null);state.reload();notify?.(error.message,'error');}}}
    finally{if(reviewRequest.current===controller)reviewRequest.current=null;if(!controller.signal.aborted)setBusy(false);}
  };
  if(state.loading || state.error)return <div className="sw-page"><Link className="sw-back" to="/staff/verifications"><ArrowLeft size={16}/>Danh sách hồ sơ</Link><StaffLoadState state={state}/></div>;
  const {summary,submission:form,photos,documents,history,reasonNote}=state.data;
  const editable=['PENDING','NEEDS_SUPPLEMENT'].includes(summary.status);
  const supplement=decision==='REQUEST_SUPPLEMENT';
  return <div className="sw-page"><Link className="sw-back" to="/staff/verifications"><ArrowLeft size={16}/>Danh sách hồ sơ</Link><header className="sw-page-heading"><div><h2>{summary.name}</h2><p>Hồ sơ HS-{summary.registrationId} · Gửi lúc {staffDate(summary.createdAt)}</p></div><div className="sw-heading-actions"><StaffStatus status={summary.status}/><button className="p-icon" title="Tải lại hồ sơ" aria-label="Tải lại hồ sơ" onClick={state.reload}><RefreshCw size={17}/></button></div></header>
    <div className="sw-detail-layout"><div>
      <section className="sw-panel"><h3>Thông tin nhà trọ chủ trọ đã gửi</h3>{!form&&<p className="sw-warning">Hồ sơ cũ chưa có dữ liệu chi tiết theo cấu trúc mới. Các thông tin không có trong database được để trống.</p>}<Fields rows={[["Tên nhà trọ",form?.name || summary.name],['Loại hình',form?.propertyType],['Mô tả nhà trọ',form?.description],['Địa chỉ chi tiết',form?.addressDetail || summary.address],['Xã / Khu vực',form?.commune],['Địa điểm lân cận',form?.nearby],['Vĩ độ',form?.latitude],['Kinh độ',form?.longitude]]}/><h4>Tiện ích chung</h4><div className="sw-detail-tags">{(form?.amenities||[]).map(key=><span key={key}><Check size={12}/>{AMENITIES.find(([value])=>value===key)?.[1]||key}</span>)}{!form?.amenities?.length&&<p>Chưa cung cấp tiện ích.</p>}</div><h4>Quy định chung</h4><div className="sw-detail-tags">{(form?.selectedRules||[]).map(key=><span key={key}><Check size={12}/>{RULES.find(([value])=>value===key)?.[1]||key}</span>)}{!form?.selectedRules?.length&&<p>Chưa cung cấp quy định.</p>}</div><Fields rows={[["Nội quy bổ sung",form?.rules],['Cam kết thông tin',form ? form.termsAccepted?'Chủ trọ đã xác nhận cam kết':'Chưa xác nhận cam kết' : null]]}/></section>
      <section className="sw-panel"><h3>Hình ảnh nhà trọ ({photos.length})</h3><div className="sw-photo-gallery">{photos.map((file,index)=><button type="button" key={file.documentId} onClick={()=>openFile(file)} title="Xem ảnh nhà trọ"><StaffThumbnail registrationId={summary.registrationId} fileId={file.documentId} name={`Ảnh ${index+1}: ${summary.name}`}/><span>{index===0?'Ảnh đại diện':`Ảnh ${index+1}`}</span></button>)}</div>{!photos.length&&<p className="sw-empty">Chưa có ảnh trong hồ sơ này.</p>}</section>
      <section className="sw-panel"><h3>Hồ sơ xác minh & Tài liệu đính kèm</h3><p className="sw-private-note"><ShieldCheck size={16}/>Tài liệu riêng tư, chỉ phục vụ thẩm định. Không hiển thị công khai tới người thuê.</p><div className="sw-doc-list">{[['OWNERSHIP','Giấy tờ sở hữu / Hợp đồng ủy quyền'],['ID_CARD','CCCD người đại diện'],['FIRE_SAFETY','Biên bản / Cam kết an toàn PCCC']].map(([type,label])=>{const file=documents.find(item=>item.type===type);return <div key={type}><FileText size={22}/><div><strong>{label}</strong><p>{file?.fileName || 'Chưa đính kèm'}</p><small>{file?.verificationStatus==='APPROVED'?'Đã xác minh':file?'Đã tiếp nhận · Chờ kiểm tra':type==='FIRE_SAFETY'?'Tài liệu khuyến khích':'Tài liệu bắt buộc'}</small></div><button className="sw-outline small" disabled={!file || fileLoading} onClick={()=>openFile(file)}><Eye size={15}/>Xem tài liệu</button></div>;})}</div>{fileLoading&&<p role="status">Đang tải tài liệu...</p>}{fileError&&<p className="sw-error" role="alert">{fileError}</p>}</section>
      <section className="sw-panel"><h3>Lịch sử thẩm định</h3><ol className="sw-activity">{history.map(item=><li key={item.logId}><strong>{item.staffName}: {item.action==='REQUESTED_SUPPLEMENT'?'Yêu cầu bổ sung':item.action==='APPROVED'?'Phê duyệt':item.action==='REJECTED'?'Từ chối':item.action}</strong><p>{item.note}</p><time>{staffDate(item.createdAt)}</time></li>)}</ol>{!history.length&&<p className="sw-empty">Hồ sơ chưa được xử lý.</p>}</section>
    </div><aside><section className="sw-panel"><h3>Chủ trọ / Người đại diện</h3><Fields rows={[["Tên tài khoản",summary.ownerName],['Email',summary.ownerEmail],['SĐT tài khoản',summary.ownerPhone],['Người quản lý',form?.managerName],['Hotline',form?.contactPhone],['Zalo',form?.zaloPhone]]}/></section><section className="sw-panel"><h3>Quyết định xét duyệt</h3><StaffStatus status={summary.status}/><Fields rows={[["Người xử lý",summary.reviewerName],['Thời gian xử lý',summary.reviewedAt?staffDate(summary.reviewedAt):null],['Phản hồi xét duyệt',reasonNote]]}/><div className="sw-review-actions"><button className="sw-primary" disabled={!editable || busy} onClick={()=>{setDecision('APPROVE');setNote('');setReviewError('');}}><Check size={16}/>Phê duyệt hồ sơ</button><button className="sw-amber-outline" disabled={summary.status!=='PENDING' || busy} onClick={()=>{setDecision('REQUEST_SUPPLEMENT');setNote('');setReviewError('');}}><FilePenLine size={16}/>Yêu cầu bổ sung</button><button className="sw-danger" disabled={!editable || busy} onClick={()=>{setDecision('REJECT');setNote('');setReviewError('');}}><X size={16}/>Từ chối hồ sơ</button></div>{summary.status==='NEEDS_SUPPLEMENT'&&<p className="sw-private-note">Đã gửi yêu cầu bổ sung cho chủ trọ. Hồ sơ chưa được phê duyệt.</p>}{!editable&&<p className="sw-private-note">Hồ sơ đã có quyết định; không thể xử lý lại.</p>}</section></aside></div>
    {preview&&<Modal title={preview.name} onClose={closePreview}>{preview.type==='application/pdf'?<iframe className="sw-document-preview" src={preview.url} title="Xem tài liệu PDF" sandbox="allow-same-origin"/>:<img className="sw-image-preview" src={preview.url} alt={preview.name}/>}<a className="sw-outline" href={preview.url} download={preview.name}><Download size={16}/>Tải tài liệu</a></Modal>}
    {decision&&<Modal className={`sw-review-modal ${supplement?'sw-supplement-modal':''}`} title={supplement?<><FilePenLine size={24}/>Yêu cầu Chủ trọ Bổ sung thông tin / Hồ sơ</>:decision==='APPROVE'?'Phê duyệt hồ sơ nhà trọ':'Từ chối hồ sơ nhà trọ'} onClose={()=>{if(!busy)setDecision(null);}}>
      <form onSubmit={review} noValidate aria-busy={busy}>
        <div className="sw-review-body"><p>{supplement?'Vui lòng nêu rõ các giấy tờ hoặc thông tin còn thiếu / mờ để Chủ trọ nắm được và nộp lại hồ sơ:':decision==='APPROVE'?'Xác nhận đã kiểm tra đầy đủ thông tin và tài liệu. Nhà trọ sẽ được tạo và hiển thị sau khi phê duyệt.':'Lý do từ chối sẽ được lưu và hiển thị cho chủ trọ.'}</p>
          <label className="sw-review-label" htmlFor="staff-review-note">{supplement?'Nội dung yêu cầu bổ sung':decision==='REJECT'?'Lý do từ chối':'Ghi chú xét duyệt (tùy chọn)'}{decision!=='APPROVE'&&<span className="sw-required"> *</span>}</label>
          <textarea id="staff-review-note" autoFocus rows={4} maxLength={2000} required={decision!=='APPROVE'} aria-invalid={Boolean(reviewError)} aria-describedby={reviewError?'staff-review-error':'staff-review-count'} placeholder={supplement?'Ví dụ: Vui lòng chụp lại rõ nét giấy tờ quyền sử dụng đất và bổ sung biên bản nghiệm thu PCCC có mộc đỏ...':decision==='REJECT'?'Nêu rõ lý do hồ sơ chưa đáp ứng yêu cầu...':'Nhập ghi chú xét duyệt...'} value={note} disabled={busy} onChange={event=>{setNote(event.target.value);setReviewError('');}}/>
          <small id="staff-review-count">{note.trim().length}/2000 ký tự{decision!=='APPROVE'?' · Tối thiểu 10 ký tự':''}</small>{reviewError&&<p id="staff-review-error" className="sw-error" role="alert">{reviewError}</p>}
        </div>
        <footer className="sw-review-footer"><button type="button" className="p-button" disabled={busy} onClick={()=>setDecision(null)}>Hủy bỏ</button><button type="submit" className={supplement?'sw-amber':decision==='APPROVE'?'sw-primary':'sw-danger'} disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/>Đang lưu...</>:supplement?'Gửi yêu cầu bổ sung':'Xác nhận quyết định'}</button></footer>
      </form>
    </Modal>}
  </div>;
}
