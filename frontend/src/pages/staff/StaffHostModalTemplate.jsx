// Preserved from Code/giao_dien/html/staff-host-registrations.html and staff-host-registration-detail.html.
import {Link} from 'react-router-dom';
export default function StaffHostModalTemplate(props){return <div className="hr-content-fragment" onClick={props.onClick} onChange={props.onChange}><div id="modalApproveRegistration" className="staff-modal-overlay" aria-labelledby="modalApproveTitle" style={{display:props.modal === "approve" ? "block" : "none"}}>
    <div className="staff-modal-box">
      <div className="staff-modal-header modal-header-success">
        <div className="modal-icon-badge success-badge">✓</div>
        <div>
          <h3 className="modal-title" id="modalApproveTitle">Xác nhận Phê duyệt đăng ký Chủ trọ</h3>
          <p className="modal-sub">Cấp quyền trở thành Chủ trọ đối tác trên hệ thống HL_RCS</p>
        </div>
        <button type="button" className="btn-close-modal" id="btnCloseModalApprove" aria-label="Đóng" disabled={props.busy}>×</button>
      </div>

      <div className="staff-modal-body">
        <div className="modal-applicant-summary">
          <span>Người đăng ký: <strong id="modalApproveApplicantName">{props.application.userName}</strong></span>
        </div>

        <div className="modal-info-alert success-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div className="alert-text">
            Khi phê duyệt, tài khoản của người dùng sẽ lập tức nhận được quyền <strong>Chủ trọ (Room Host)</strong>. Hệ thống sẽ tự động gửi thông báo chúc mừng và người dùng có thể truy cập Host Portal để bắt đầu đăng tin và quản lý phòng.
          </div>
        </div>

        <div className="modal-form-group">
          <label htmlFor="txtApproveNote" className="modal-label">Ghi chú phê duyệt của chuyên viên (tùy chọn):</label>
          <textarea id="txtApproveNote" className="modal-textarea" rows="3" placeholder="Nhập ghi chú hoặc lời nhắn đến chủ trọ mới (nếu có)..." maxLength="2000" name="approveNote" value={props.values.approveNote} disabled={props.busy}></textarea>
          <span className="modal-hint">Ghi chú này sẽ được lưu vào lịch sử thẩm định và gửi kèm trong thông báo hệ thống.</span>
        </div>
      </div>

      <div className="staff-modal-footer">
        <button type="button" className="btn-modal-secondary" id="btnCancelApprove" disabled={props.busy}>Hủy bỏ</button>
        <button type="button" className="btn-modal-confirm success-btn" id="btnConfirmApprove" disabled={props.busy}>
          <span>✓ Xác nhận Phê duyệt</span>
        </button>
      </div>
    </div>
  </div>


  <div id="modalRejectRegistration" className="staff-modal-overlay" aria-labelledby="modalRejectTitle" style={{display:props.modal === "reject" ? "block" : "none"}}>
    <div className="staff-modal-box">
      <div className="staff-modal-header modal-header-danger">
        <div className="modal-icon-badge danger-badge">✕</div>
        <div>
          <h3 className="modal-title" id="modalRejectTitle">Từ chối hồ sơ đăng ký làm Chủ trọ</h3>
          <p className="modal-sub">Không phê duyệt cấp quyền Chủ trọ cho tài khoản này</p>
        </div>
        <button type="button" className="btn-close-modal" id="btnCloseModalReject" aria-label="Đóng" disabled={props.busy}>×</button>
      </div>

      <div className="staff-modal-body">
        <div className="modal-applicant-summary">
          <span>Người đăng ký: <strong id="modalRejectApplicantName">{props.application.userName}</strong></span>
        </div>

        <div className="modal-form-group">
          <label htmlFor="txtRejectReason" className="modal-label required-label">Lý do từ chối cụ thể:</label>
          <textarea id="txtRejectReason" className="modal-textarea" rows="4" placeholder="Nêu rõ lý do từ chối (ví dụ: thông tin liên hệ không có thực, khu vực nằm ngoài phạm vi phục vụ, thông tin giới thiệu vi phạm quy định cộng đồng,...)..." maxLength="2000" name="rejectReason" value={props.values.rejectReason} disabled={props.busy}></textarea>
          <div className="modal-error-text" id="errRejectReason" style={{display:props.error ? "block" : "none"}} role="alert">{props.error}</div>
          <span className="modal-hint">Lý do này sẽ được hiển thị trực tiếp cho người dùng trong trang đăng ký và thông báo.</span>
        </div>

        <div className="modal-checkbox-group">
          <label className="modal-checkbox-label">
            <input type="checkbox" id="chkAllowResubmit" name="allowResubmit" checked={props.values.allowResubmit} disabled={props.busy}/>
            <span>Cho phép người dùng chỉnh sửa và nộp lại hồ sơ sau khi khắc phục nguyên nhân</span>
          </label>
        </div>
      </div>

      <div className="staff-modal-footer">
        <button type="button" className="btn-modal-secondary" id="btnCancelReject" disabled={props.busy}>Hủy bỏ</button>
        <button type="button" className="btn-modal-confirm danger-btn" id="btnConfirmReject" disabled={props.busy}>
          <span>✕ Xác nhận Từ chối</span>
        </button>
      </div>
    </div>
  </div>


  <div id="modalRequestChangesRegistration" className="staff-modal-overlay" aria-labelledby="modalReqChangesTitle" style={{display:props.modal === "supplement" ? "block" : "none"}}>
    <div className="staff-modal-box modal-box-large">
      <div className="staff-modal-header modal-header-warning">
        <div className="modal-icon-badge warning-badge">📝</div>
        <div>
          <h3 className="modal-title" id="modalReqChangesTitle">Yêu cầu bổ sung thông tin hồ sơ</h3>
          <p className="modal-sub">Chọn chính xác các trường thông tin cần người dùng cập nhật lại</p>
        </div>
        <button type="button" className="btn-close-modal" id="btnCloseModalReqChanges" aria-label="Đóng" disabled={props.busy}>×</button>
      </div>

      <div className="staff-modal-body">
        <div className="modal-applicant-summary">
          <span>Người đăng ký: <strong id="modalReqChangesApplicantName">{props.application.userName}</strong></span>
          <span className="selected-count-tag" id="selectedCountBadge">{'Đã chọn: ' + props.selectedCount + ' mục'}</span>
        </div>

        <div className="modal-info-alert warning-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div className="alert-text">
            Chỉ tích chọn các trường cần sửa và nhập hướng dẫn chi tiết cho từng trường. Trên form người dùng, các trường này sẽ được gắn huy hiệu cảnh báo màu cam kèm hướng dẫn của bạn.
          </div>
        </div>

        <div className="modal-error-text" id="errRequestChangesGeneral" style={{display:props.error ? "block" : "none"}} role="alert">{props.error}</div>


        <div className="schema-checklist-container" id="schemaChecklistContainer">{props.checklist}</div>


        <div className="modal-form-group" style={{"marginTop": "16px"}}>
          <label htmlFor="txtCommonNote" className="modal-label">Ghi chú chung của Chuyên viên (tùy chọn):</label>
          <textarea id="txtCommonNote" className="modal-textarea" rows="2" placeholder="Nhập thêm lời nhắn hoặc thời hạn người dùng cần hoàn thiện bổ sung..." maxLength="2000" name="commonNote" value={props.values.commonNote} disabled={props.busy}></textarea>
        </div>
      </div>

      <div className="staff-modal-footer">
        <button type="button" className="btn-modal-secondary" id="btnCancelReqChanges" disabled={props.busy}>Hủy bỏ</button>
        <button type="button" className="btn-modal-confirm warning-btn" id="btnConfirmReqChanges" disabled={props.busy}>
          <span>Gửi yêu cầu bổ sung</span>
        </button>
      </div>
    </div>
  </div>


  </div>;}
