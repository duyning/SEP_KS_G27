import { MotionButton } from '../../components/motion/MotionUI.jsx';
// Preserved from Code/giao_dien/html/staff-host-registrations.html and staff-host-registration-detail.html.
import {Link} from 'react-router-dom';
export default function StaffHostDetailTemplate(props){return <div className="hr-content-fragment" onClick={props.onClick} onChange={props.onChange}><section className="staff-content">


        <nav className="dashboard-breadcrumbs" aria-label="Đường dẫn">
          <Link to="/staff">HL_RCS</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/staff">Staff Portal</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/staff/host-registrations">Xác minh đăng ký chủ trọ</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Chi tiết hồ sơ</span>
        </nav>


        <div className="detail-top-nav detail-top-nav-bar">
          <Link className="btn-detail-back btn-back-link" title="Quay lại danh sách đăng ký làm chủ trọ" to="/staff/host-registrations">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Quay lại danh sách đăng ký</span>
          </Link>

          <div className="detail-header-badges">
            <span className="verif-id-pill large-id" id="headerDetailId">{'HREG-' + props.application.id}</span>
            <span className="applicant-name-tag" id="headerApplicantName">{props.application.userName}</span>
            <div id="headerStatusBadgeSlot">{props.statusBadge}</div>
          </div>
        </div>














        <div id="detailMainGrid" className="verif-detail-grid shrd-detail-grid">


          <div className="verif-detail-main shrd-detail-main">


            <section className="dashboard-section-card verif-card shrd-card">
              <div className="section-card-header shrd-card-header">
                <div className="section-title-wrap shrd-card-title-wrap">
                  <span className="section-icon-pill shrd-card-icon">👤</span>
                  <h3 className="section-title shrd-card-title">1. Thông tin Người đăng ký (Ứng viên Chủ trọ)</h3>
                </div>
                <span className="host-role-badge">Tài khoản cá nhân</span>
              </div>


              <div className="applicant-profile-card">
                <div className="applicant-profile-header">
                  <div className="applicant-avatar-box">
                    <span id="detailApplicantAvatar">{(props.application.userName || 'U').charAt(0)}</span>
                  </div>
                  <div className="applicant-details">
                    <div className="applicant-name-row">
                      <span className="applicant-name-text" id="detailApplicantName">{props.application.userName}</span>
                      <span className="badge-role-tag" id="detailApplicantRole">{props.application.status === 'APPROVED' ? 'Chủ trọ' : 'Người dùng'}</span>
                    </div>
                    <div className="applicant-meta-row">
                      <span>Mã tài khoản: <strong id="detailApplicantUserId">{props.application.userId}</strong></span>
                      <span>·</span>
                      <span>Số điện thoại tài khoản: <strong>{props.application.userPhone ? "Đã cung cấp" : "Chưa cung cấp"}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="applicant-contact-grid">
                  <div className="contact-box">
                    <div className="contact-box-label">Số điện thoại liên hệ:</div>
                    <div className="contact-box-value" id="detailApplicantPhone">{props.application.userPhone || '—'}</div>
                  </div>
                  <div className="contact-box">
                    <div className="contact-box-label">Địa chỉ Email:</div>
                    <div className="contact-box-value" id="detailApplicantEmail">{props.application.userEmail || '—'}</div>
                  </div>
                </div>

                <div className="profile-sync-note">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>
                    Thông tin liên hệ được đồng bộ tự động từ tài khoản đăng nhập lúc gửi hồ sơ. Khi được duyệt, tài khoản này sẽ được nâng quyền lên <strong>Chủ trọ (Room Host)</strong>.
                  </span>
                </div>
              </div>
            </section>


            <section className="dashboard-section-card verif-card shrd-card">
              <div className="section-card-header shrd-card-header">
                <div className="section-title-wrap shrd-card-title-wrap">
                  <span className="section-icon-pill shrd-card-icon">📋</span>
                  <h3 className="section-title shrd-card-title">2. Kế hoạch &amp; Thông tin đăng ký làm Chủ trọ</h3>
                </div>
                <span className="verif-type-pill">Phiếu đăng ký</span>
              </div>

              <div className="application-content-box">

                <div className="app-fields-grid shrd-scope-highlight-row">
                  <div className="app-field-item shrd-scope-box">
                    <span className="app-field-label shrd-info-label">Khu vực dự kiến kinh doanh / vận hành:</span>
                    <div className="app-field-val shrd-scope-val strong-val" id="detailTargetCommune">{props.application.targetCommune}</div>
                    <span className="app-field-sub">Địa bàn xã/phường thuộc khu vực Hòa Lạc - Thạch Thất</span>
                  </div>

                  <div className="app-field-item shrd-scope-box">
                    <span className="app-field-label shrd-info-label">Quy mô số phòng trọ dự kiến:</span>
                    <div className="app-field-val shrd-scope-val strong-val" id="detailExpectedScale">{props.application.expectedScale}</div>
                    <span className="app-field-sub">Số phòng chuẩn bị đưa vào khai thác trên hệ thống</span>
                  </div>
                </div>


                <div className="app-intro-item">
                  <span className="app-field-label shrd-info-label">Giới thiệu bản thân &amp; Cam kết chất lượng phục vụ:</span>
                  <div className="app-intro-box shrd-intro-text-box" id="detailIntroduction">{props.application.introduction}</div>
                </div>
              </div>


              <div className="boundary-callout-box shrd-scope-notice">
                <div className="callout-icon">📌</div>
                <div className="callout-body">
                  <div className="callout-title">Ranh giới thẩm định nghiệp vụ HL_RCS:</div>
                  <div className="callout-text">
                    Đây là bước <strong>xét duyệt cấp quyền Chủ trọ (Role Registration)</strong> cho tài khoản. Sau khi được phê duyệt, người dùng mới có quyền truy cập Host Portal để <em>thêm nhà trọ cụ thể</em> và <em>gửi hồ sơ xác minh cơ sở nhà trọ (Property Verification)</em> riêng biệt.
                  </div>
                </div>
              </div>
            </section>


            <section className="dashboard-section-card verif-card shrd-card">
              <div className="section-card-header shrd-card-header">
                <div className="section-title-wrap shrd-card-title-wrap">
                  <span className="section-icon-pill shrd-card-icon">⏱️</span>
                  <h3 className="section-title shrd-card-title">3. Tiến trình &amp; Lịch sử thẩm định hồ sơ</h3>
                </div>
                <span className="timeline-count-badge">Nhật ký kiểm duyệt</span>
              </div>

              <div className="timeline-container" id="detailTimelineContainer">{props.history}</div>
            </section>

          </div>


          <div className="verif-detail-sidebar shrd-detail-sidebar">


            <div className="sidebar-summary-card">
              <div className="summary-card-header">
                <span className="summary-icon">📊</span>
                <h4 className="summary-card-title">Tổng quan hồ sơ</h4>
              </div>

              <div className="summary-metrics-list">
                <div className="metric-row">
                  <span className="metric-label">Thời điểm gửi:</span>
                  <strong className="metric-value" id="overviewSubmittedAt">{props.date(props.application.submittedAt)}</strong>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Cập nhật gần nhất:</span>
                  <strong className="metric-value" id="overviewUpdatedAt">{props.date(props.application.updatedAt)}</strong>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Trạng thái hiện tại:</span>
                  <div id="overviewStatusBadge">{props.statusBadge}</div>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Chuyên viên phụ trách:</span>
                  <strong className="metric-value" id="overviewReviewer">{props.application.reviewedBy || 'Chưa xử lý'}</strong>
                </div>
              </div>
            </div>


            <div className="sidebar-decision-card shrd-decision-card">
              <div className="decision-card-header shrd-decision-header">
                <span className="decision-icon">⚡</span>
                <h4 className="decision-card-title">Quyết định xét duyệt</h4>
              </div>


              <div id="decisionActionGroup" className="decision-actions-wrap shrd-action-group" style={{display:props.application.status === "PENDING_REVIEW" ? "flex" : "none"}}>
                <p className="decision-actions-intro">
                  Xem xét các điều kiện và đưa ra một trong ba quyết định thẩm định cho hồ sơ này:
                </p>


                <MotionButton type="button" className="btn-decision-approve shrd-btn-action shrd-btn-approve" id="btnTriggerApprove" title="Phê duyệt hồ sơ và nâng quyền thành Chủ trọ">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Phê duyệt đăng ký</span>
                </MotionButton>


                <MotionButton type="button" className="btn-decision-request-changes shrd-btn-action shrd-btn-supplement" id="btnTriggerRequestChanges" title="Yêu cầu người dùng chỉnh sửa hoặc bổ sung các trường thông tin">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Yêu cầu bổ sung thông tin</span>
                </MotionButton>


                <MotionButton type="button" className="btn-decision-reject shrd-btn-action shrd-btn-reject" id="btnTriggerReject" title="Từ chối yêu cầu đăng ký làm chủ trọ">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Từ chối hồ sơ</span>
                </MotionButton>
              </div>


              <div id="decisionTerminalGroup" className="decision-terminal-wrap" style={{display:props.application.status !== "PENDING_REVIEW" ? "block" : "none"}}>{props.terminal}</div>
            </div>


            <div className="sidebar-guidance-card">
              <div className="guidance-header">
                <span className="guidance-icon">💡</span>
                <h5 className="guidance-title">Nguyên tắc xét duyệt Staff:</h5>
              </div>
              <ul className="guidance-list">
                <li><strong>Khu vực hợp lệ:</strong> Ưu tiên các xã thuộc khu vực Hòa Lạc (Thạch Hòa, Tân Xã, Bình Yên, Hạ Bằng, Đồng Trúc,...).</li>
                <li><strong>Quy mô thực tế:</strong> Thông tin số phòng dự kiến khai thác cần tương xứng với nhu cầu thực tế.</li>
                <li><strong>Thái độ &amp; cam kết:</strong> Phần giới thiệu phải rõ ràng, nghiêm túc, không chứa nội dung spam hay vi phạm thuần phong mỹ tục.</li>
                <li><strong>Khi yêu cầu bổ sung:</strong> Chỉ chọn đúng các trường cần chỉnh sửa và ghi hướng dẫn cụ thể để người dùng biết cách hoàn thiện.</li>
              </ul>
            </div>

          </div>

        </div>

      </section></div>;}
