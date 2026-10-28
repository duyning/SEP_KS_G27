import { MotionButton } from '../../components/motion/MotionUI.jsx';
import {Check,ClipboardPen,LoaderCircle,ShieldCheck,X,XCircle} from 'lucide-react';

const configurations={
 approve:{container:'modalApproveRegistration',titleId:'modalApproveTitle',title:'Phê duyệt đăng ký Chủ trọ',subtitle:'Xác nhận cấp quyền sử dụng Host Portal cho người đăng ký.',tone:'success',Icon:ShieldCheck,close:'btnCloseModalApprove',cancel:'btnCancelApprove',confirm:'btnConfirmApprove',nameId:'modalApproveApplicantName',confirmText:'Xác nhận phê duyệt',busyText:'Đang phê duyệt...'},
 supplement:{container:'modalRequestChangesRegistration',titleId:'modalReqChangesTitle',title:'Yêu cầu bổ sung hồ sơ',subtitle:'Chọn nội dung chưa đầy đủ và hướng dẫn người đăng ký cập nhật.',tone:'warning',Icon:ClipboardPen,close:'btnCloseModalReqChanges',cancel:'btnCancelReqChanges',confirm:'btnConfirmReqChanges',nameId:'modalReqChangesApplicantName',confirmText:'Gửi yêu cầu bổ sung',busyText:'Đang gửi yêu cầu...'},
 reject:{container:'modalRejectRegistration',titleId:'modalRejectTitle',title:'Từ chối đăng ký Chủ trọ',subtitle:'Nêu rõ lý do và quyết định người dùng có được nộp lại hồ sơ hay không.',tone:'danger',Icon:XCircle,close:'btnCloseModalReject',cancel:'btnCancelReject',confirm:'btnConfirmReject',nameId:'modalRejectApplicantName',confirmText:'Xác nhận từ chối',busyText:'Đang xử lý...'}
};

export default function StaffHostModalTemplate({modal,application,values,busy,checklist,selectedCount,error,totalCharacters=0,onClick,onChange}){
 const config=configurations[modal];
 if(!config)return null;
 const {Icon}=config;
 const errorId={approve:'errApproveNote',reject:'errRejectReason',supplement:'errRequestChangesGeneral'}[modal];
 const description={
  approve:<>Tài khoản sẽ được cấp quyền <strong>Chủ trọ</strong> để tạo và quản lý cơ sở lưu trú. Nhà trọ cụ thể vẫn phải gửi hồ sơ xác minh riêng trước khi được hiển thị công khai.</>,
  supplement:<>Hồ sơ sẽ chuyển sang <strong>Cần bổ sung</strong>; quyền Chủ trọ chưa được cấp. Người đăng ký sẽ thấy các mục cần sửa và hướng dẫn trên trang đăng ký, sau đó gửi lại để xét duyệt.</>,
  reject:<>Hồ sơ sẽ chuyển sang <strong>Đã từ chối</strong>; tài khoản vẫn giữ quyền hiện tại. Lý do từ chối được hiển thị trên trang đăng ký để người dùng biết kết quả xét duyệt.</>
 }[modal];
 return <div id={config.container} className={`staff-modal-overlay hr-decision-modal tone-${config.tone}`} onClick={onClick} onChange={onChange} aria-busy={busy}>
  <div className="staff-modal-box">
   <header className={`staff-modal-header modal-header-${config.tone}`}>
    <span className={`modal-icon-badge ${config.tone}-badge`}><Icon size={22}/></span>
    <div className="hr-modal-heading"><h3 className="modal-title" id={config.titleId}>{config.title}</h3><p className="modal-sub">{config.subtitle}</p></div>
    <MotionButton type="button" className="btn-close-modal" id={config.close} aria-label="Đóng" disabled={busy}><X size={18}/></MotionButton>
   </header>
   <div className="staff-modal-body">
    <section className="modal-applicant-summary" aria-label="Hồ sơ đang xét duyệt">
     <div className="hr-applicant-identity"><span className="hr-summary-label">Người đăng ký</span><strong id={config.nameId}>{application.userName||'Chưa cập nhật họ tên'}</strong><span className="hr-summary-contact">{application.userEmail||application.userPhone||'Chưa cập nhật liên hệ'}</span></div>
     <span className="hr-application-code">HREG-{application.id}</span>
    </section>
    <div className={`modal-info-alert ${config.tone}-alert`} id="hostDecisionDescription"><Icon size={18}/><p className="alert-text">{description}</p></div>
    {error&&<div className="hr-decision-error" id={errorId} role="alert">{error}</div>}
    {modal==='approve'&&<div className="modal-form-group">
     <div className="hr-field-heading"><label htmlFor="txtApproveNote" className="modal-label">Ghi chú xét duyệt <span className="hr-optional">(không bắt buộc)</span></label><span className="hr-character-count">{values.approveNote.length}/2000</span></div>
     <textarea id="txtApproveNote" className="modal-textarea" rows={4} placeholder="Ghi lại căn cứ phê duyệt hoặc lưu ý đã trao đổi với người đăng ký..." maxLength={2000} name="approveNote" value={values.approveNote} disabled={busy} aria-describedby="approveNoteHint"/>
     <p className="modal-hint" id="approveNoteHint">Ghi chú được lưu vào lịch sử xét duyệt để phục vụ tra cứu.</p>
    </div>}
    {modal==='supplement'&&<>
     <div className="hr-checklist-heading"><h4>Nội dung cần bổ sung</h4><span className="selected-count-tag" id="selectedCountBadge">Đã chọn: {selectedCount} mục</span></div>
     <p className="modal-hint hr-checklist-hint">Chỉ chọn các mục chưa đạt và ghi hướng dẫn cụ thể cho từng mục.</p>
     <div className="schema-checklist-container" id="schemaChecklistContainer">{checklist}</div>
     <div className="modal-form-group"><label htmlFor="txtCommonNote" className="modal-label">Ghi chú chung <span className="hr-optional">(không bắt buộc)</span></label><textarea id="txtCommonNote" className="modal-textarea" rows={3} placeholder="Bổ sung cách liên hệ hoặc lưu ý để người đăng ký hoàn thiện hồ sơ..." maxLength={2000} name="commonNote" value={values.commonNote} disabled={busy}/><p className={`modal-hint hr-total-count ${totalCharacters>2000?'is-over-limit':''}`} role={totalCharacters>2000?'status':undefined}>Tổng hướng dẫn và ghi chú: {totalCharacters}/2000 ký tự</p></div>
    </>}
    {modal==='reject'&&<>
     <div className="modal-form-group"><div className="hr-field-heading"><label htmlFor="txtRejectReason" className="modal-label">Lý do từ chối <span className="hr-required" aria-hidden="true">*</span></label><span className="hr-character-count">{values.rejectReason.length}/2000</span></div><textarea id="txtRejectReason" className="modal-textarea" rows={4} placeholder="Nêu rõ thông tin chưa đáp ứng và căn cứ từ chối để người đăng ký hiểu được kết quả..." maxLength={2000} name="rejectReason" value={values.rejectReason} disabled={busy} aria-required="true" aria-invalid={!!error} aria-describedby={`rejectReasonHint${error?' '+errorId:''}`}/><p className="modal-hint" id="rejectReasonHint">Bắt buộc từ 10 đến 2000 ký tự. Sử dụng nội dung cụ thể, khách quan và lịch sự.</p></div>
     <div className={`modal-checkbox-group ${values.allowResubmit?'allows-resubmission':'blocks-resubmission'}`}><label className="modal-checkbox-label" htmlFor="chkAllowResubmit"><input type="checkbox" id="chkAllowResubmit" name="allowResubmit" checked={values.allowResubmit} disabled={busy}/><span><strong>Cho phép chỉnh sửa và nộp lại hồ sơ</strong><small>Người dùng có thể khắc phục các nội dung chưa đạt và gửi lại để xét duyệt.</small></span></label>{!values.allowResubmit&&<p className="hr-resubmission-warning" role="status">Người dùng sẽ không thể gửi lại hồ sơ này. Chỉ tắt khi có căn cứ rõ ràng không tiếp nhận đăng ký lại.</p>}</div>
    </>}
   </div>
   <footer className="staff-modal-footer"><span className="hr-decision-footer-note">{modal==='approve'?'Kiểm tra hồ sơ trước khi cấp quyền.':modal==='supplement'?'Chưa cấp quyền khi yêu cầu bổ sung.':values.allowResubmit?'Cho phép nộp lại sau khi khắc phục.':'Không tiếp nhận nộp lại hồ sơ này.'}</span><div className="hr-decision-buttons"><MotionButton type="button" className="btn-modal-secondary" id={config.cancel} disabled={busy}>Hủy bỏ</MotionButton><MotionButton type="button" className={`btn-modal-confirm ${config.tone}-btn`} id={config.confirm} disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:modal==='approve'?<Check size={16}/>:modal==='reject'?<X size={16}/>:<ClipboardPen size={16}/>}<span>{busy?config.busyText:config.confirmText}</span></MotionButton></div></footer>
  </div>
 </div>;
}
