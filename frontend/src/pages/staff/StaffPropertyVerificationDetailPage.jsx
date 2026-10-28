import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Eye, FilePenLine, FileText, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Modal, useToast } from '../../components/PortalUI.jsx';
import { StaffLoadState, StaffStatus, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';
import { staffApi } from '../../services/staff.js';
import {VerificationDocuments,VerificationFields,VerificationHistory,VerificationOwnerInfo,VerificationPropertyInfo} from '../../components/VerificationDetailSections.jsx';
import '../../styles/staff-verification-detail.css';
import SupplementRequestFields from '../../components/SupplementRequestFields.jsx';
import {composeSupplementNote,supplementGroups} from '../../services/supplement-request.js';
import VerificationChangeComparison from '../../components/VerificationChangeComparison.jsx';


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
  const [selectedFields,setSelectedFields] = useState([]);
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
    const supplement=decision==='REQUEST_SUPPLEMENT';
    if(supplement&&!selectedFields.length){setReviewError('Vui lòng chọn ít nhất một mục cần chủ trọ bổ sung.');return;}
    const reviewNote=supplement?composeSupplementNote(supplementGroups(state.data),selectedFields,note):note.trim();
    if(decision!=='APPROVE' && (reviewNote.length<10 || reviewNote.length>2000)){setReviewError('Nội dung yêu cầu và ghi chú cần từ 10 đến 2000 ký tự. Vui lòng rút gọn ghi chú nếu quá dài.');return;}
    const controller=new AbortController();reviewRequest.current=controller;setBusy(true);setReviewError('');
    try{const data=await staffApi.review(id,decision,reviewNote,controller.signal,supplement?selectedFields:undefined);if(controller.signal.aborted)return;state.replace(data);setDecision(null);setNote('');notify?.(decision==='REQUEST_SUPPLEMENT'?'Đã gửi yêu cầu bổ sung. Chủ trọ có thể xem nội dung tại Nhà trọ của tôi.':decision==='APPROVE'?'Đã phê duyệt hồ sơ. Nhà trọ được chuyển sang trạng thái Đang hiển thị.':'Đã từ chối hồ sơ và lưu lý do cho chủ trọ.','success');window.dispatchEvent(new Event('hlrcs:staff-updated'));}
    catch(error){if(!controller.signal.aborted){setReviewError(error.message);if(error.status===409){setDecision(null);state.reload();notify?.(error.message,'error');}}}
    finally{if(reviewRequest.current===controller)reviewRequest.current=null;if(!controller.signal.aborted)setBusy(false);}
  };
  if(state.loading || state.error)return <div className="sw-page"><Link className="sw-back" to="/staff/verifications"><ArrowLeft size={16}/>Danh sách hồ sơ</Link><StaffLoadState state={state}/></div>;
  const {summary,submission:form,photos,documents,history,reasonNote}=state.data;
  const editable=['PENDING','NEEDS_SUPPLEMENT'].includes(summary.status);
  const supplement=decision==='REQUEST_SUPPLEMENT';
  return <div className="sw-page svd-page">
    <nav className="svd-breadcrumbs" aria-label="Đường dẫn hồ sơ"><Link to="/staff">HL_RCS</Link><span>/</span><Link to="/staff/verifications">Xác minh nhà trọ</Link><span>/</span><strong>HS-{summary.registrationId} · {summary.name}</strong></nav>
    <header className="sw-page-heading svd-page-toolbar"><Link className="sw-back" to="/staff/verifications"><ArrowLeft size={15}/>Quay lại danh sách xác minh</Link><div className="sw-heading-actions"><span className="svd-record-code">HS-{summary.registrationId}</span><StaffStatus status={summary.status}/><MotionButton className="p-icon" title="Tải lại hồ sơ" aria-label="Tải lại hồ sơ" onClick={state.reload}><RefreshCw size={16}/></MotionButton></div></header>
    <div className="sw-detail-layout svd-grid"><div className="svd-main">
      <VerificationChangeComparison previous={state.data.publishedSubmission} current={form} propertyId={summary.targetPropertyId}/>
      <VerificationPropertyInfo summary={summary} submission={form} photos={photos} onOpen={openFile}/>
      <VerificationOwnerInfo summary={summary} submission={form}/>
      <VerificationDocuments documents={documents} onOpen={openFile} loading={fileLoading} error={fileError}/>
      <VerificationHistory summary={summary} history={history} submissionEvents={state.data.submissionEvents}/>
    </div><aside className="svd-decision-column"><section className="sw-panel svd-decision-card">
      <header><h3>Quyết định thẩm định</h3><span className="svd-reviewer-tag">Staff Portal</span></header>
      <div className="svd-current-status"><span>Trạng thái hồ sơ:</span><StaffStatus status={summary.status}/></div>
      <VerificationFields rows={[['Mã hồ sơ',`HS-${summary.registrationId}`],['Ngày nộp ban đầu',staffDate(summary.createdAt)],['Gửi lại gần nhất',staffDate(summary.submittedAt||summary.createdAt)],['Cập nhật xét duyệt',staffDate(summary.reviewedAt||summary.createdAt)],['Người xử lý',summary.reviewerName||'Chưa có người xử lý']]}/>
      <h4 className="svd-label">Lựa chọn quyết định</h4><div className="sw-review-actions">
        <MotionButton className="sw-primary" disabled={!editable||busy} onClick={()=>{setDecision('APPROVE');setNote('');setReviewError('');}}><Check size={16}/>Phê duyệt hồ sơ</MotionButton>
        <MotionButton className="sw-amber-outline" disabled={summary.status!=='PENDING'||busy} onClick={()=>{setDecision('REQUEST_SUPPLEMENT');setSelectedFields([]);setNote('');setReviewError('');}}><FilePenLine size={16}/>Yêu cầu bổ sung</MotionButton>
        <MotionButton className="sw-danger" disabled={!editable||busy} onClick={()=>{setDecision('REJECT');setNote('');setReviewError('');}}><X size={16}/>Từ chối hồ sơ</MotionButton>
      </div>
      {reasonNote&&<div className="svd-review-note"><strong>Phản hồi xét duyệt</strong><p>{reasonNote}</p></div>}
      {summary.status==='NEEDS_SUPPLEMENT'&&<p className="sw-private-note">Đã gửi yêu cầu bổ sung cho chủ trọ. Hồ sơ chưa được phê duyệt.</p>}
      {!editable&&<p className="sw-private-note"><ShieldCheck size={14}/>Hồ sơ đã có quyết định; không thể xử lý lại.</p>}
    </section></aside></div>
    <AnimatePresence>{preview&&<Modal title={preview.name} onClose={closePreview}>{preview.type==='application/pdf'?<iframe className="sw-document-preview" src={preview.url} title="Xem tài liệu PDF" sandbox="allow-same-origin"/>:<img className="sw-image-preview" src={preview.url} alt={preview.name}/>}<a className="sw-outline" href={preview.url} download={preview.name}><Download size={16}/>Tải tài liệu</a></Modal>}</AnimatePresence>
    <AnimatePresence>{decision&&<Modal className={`sw-review-modal ${supplement?'sw-supplement-modal':''}`} title={supplement?<><FilePenLine size={24}/>Yêu cầu Chủ trọ Bổ sung thông tin / Hồ sơ</>:decision==='APPROVE'?'Phê duyệt hồ sơ nhà trọ':'Từ chối hồ sơ nhà trọ'} onClose={()=>{if(!busy)setDecision(null);}}>
      <form onSubmit={review} noValidate aria-busy={busy}>
        {supplement?<SupplementRequestFields detail={state.data} selected={selectedFields} onChange={value=>{setSelectedFields(value);setReviewError('');}} note={note} onNoteChange={value=>{setNote(value);setReviewError('');}} busy={busy} error={reviewError}/>:<div className="sw-review-body"><p>{decision==='APPROVE'?'Xác nhận đã kiểm tra đầy đủ thông tin và tài liệu. Nếu là đề nghị thay đổi, bản mới sẽ được áp dụng cho nhà trọ hiện tại sau khi phê duyệt.':'Lý do từ chối sẽ được lưu và hiển thị cho chủ trọ.'}</p>
          <label className="sw-review-label" htmlFor="staff-review-note">{supplement?'Nội dung yêu cầu bổ sung':decision==='REJECT'?'Lý do từ chối':'Ghi chú xét duyệt (tùy chọn)'}{decision!=='APPROVE'&&<span className="sw-required"> *</span>}</label>
          <textarea id="staff-review-note" autoFocus rows={4} maxLength={2000} required={decision!=='APPROVE'} aria-invalid={Boolean(reviewError)} aria-describedby={reviewError?'staff-review-error':'staff-review-count'} placeholder={supplement?'Ví dụ: Vui lòng chụp lại rõ nét giấy tờ quyền sử dụng đất và bổ sung biên bản nghiệm thu PCCC có mộc đỏ...':decision==='REJECT'?'Nêu rõ lý do hồ sơ chưa đáp ứng yêu cầu...':'Nhập ghi chú xét duyệt...'} value={note} disabled={busy} onChange={event=>{setNote(event.target.value);setReviewError('');}}/>
          <small id="staff-review-count">{note.trim().length}/2000 ký tự{decision!=='APPROVE'?' · Tối thiểu 10 ký tự':''}</small>{reviewError&&<p id="staff-review-error" className="sw-error" role="alert">{reviewError}</p>}
        </div>}
        <footer className="sw-review-footer"><MotionButton type="button" className="p-button" disabled={busy} onClick={()=>setDecision(null)}>Hủy bỏ</MotionButton><MotionButton type="submit" className={supplement?'sw-amber':decision==='APPROVE'?'sw-primary':'sw-danger'} disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/>Đang lưu...</>:supplement?'Gửi yêu cầu bổ sung':'Xác nhận quyết định'}</MotionButton></footer>
      </form>
    </Modal>}</AnimatePresence>
  </div>;
}
