import { MotionButton } from '../components/motion/MotionUI.jsx';
// Original user-facing markup from Code/giao_dien/html/become-host.html.
import {Link} from 'react-router-dom';
import {applicantCapacities,rentalExperiences,applicationFieldLabel} from '../services/host-applications.js';
export default function BecomeHostPrototype({user,roleLabel,application,values,errors,state,alert,busy,mobileOpen,account,missingContact,formatDate,stepClass,stepLabel,onClick,onSubmit,onChange}) {
return <div className="prototype-home prototype-become-host" onClick={onClick} onSubmit={onSubmit} onChange={onChange}>
<header className="navbar-wrapper">
    <div className="top-announcement">
      <div className="container top-announcement-inner">
        <div className="announcement-left">
          <span className="badge-tag">Hòa Lạc Campus</span>
          <span className="announcement-text">Hệ thống phòng trọ đã xác thực 100% quanh ĐH FPT &amp; Khu Công nghệ cao Hòa Lạc</span>
        </div>
        <div className="announcement-right">
          <a href="tel:0912345678" className="contact-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>Hotline hỗ trợ: 0912 345 678</span>
          </a>
          <span className="sep">•</span>
          <span className="status-live"><span className="live-dot"></span>Cập nhật phòng trống hôm nay</span>
        </div>
      </div>
    </div>

    <nav className="main-navbar">
      <div className="container navbar-container">

        <Link className="nav-brand" aria-label="Trang chủ HL_RCS" to="/">
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name">HL_RCS</span>
            <span className="brand-sub">Rental Connection System</span>
          </div>
        </Link>


        <ul id="navMenu" className={`nav-menu ${mobileOpen ? "show" : ""}`}>
          <li><Link className="nav-item" to="/search">Tìm phòng</Link></li>
          <li><Link className="nav-item" to="/map">Bản đồ</Link></li>
          <li><Link className="nav-item" to="/favorites">Đã lưu (<span className="menu-fav-count">0</span>)</Link></li>
          <li><Link className="nav-item" to="/bookings">Lịch xem phòng</Link></li>
          <li><Link className="nav-item" to="/services">Dịch vụ</Link></li>
          <li><Link className="nav-item" to="/community">Cộng đồng</Link></li>
          <li><Link className="nav-item" to="/profile">Hồ sơ cá nhân</Link></li>
        </ul>


        <div className="nav-actions">{account}</div>


        <MotionButton className="mobile-toggle" id="mobileMenuBtn" aria-label="Mở thực đơn" aria-expanded={mobileOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </MotionButton>
      </div>
    </nav>
  </header>


  <section className="bh-page-intro container" aria-labelledby="become-host-title">
    <div><span className="bh-page-eyebrow">DÀNH CHO CHỦ NHÀ</span><h1 id="become-host-title">Đăng ký làm chủ trọ</h1><p>Hoàn thiện hồ sơ để sử dụng không gian quản lý nhà trọ trên HL_RCS.</p></div>
  </section>
  <div className="bh-application-workspace container">
  <section className="bh-stepper-wrapper">
    <div className="bh-stepper-card" id="bhStepperCard">
      <div className="bh-stepper-title">
        <span>Tiến trình đăng ký</span>

      </div>
      <div className="bh-stepper-steps">
        <div data-step="1" className={`bh-step-item ${stepClass(1)}`}>
          <div className="bh-step-node">{stepLabel(1)}</div>
          <span className="bh-step-label">Điền thông tin</span>
          <span className="bh-step-sub">Đăng ký nguyện vọng</span>
        </div>

        <div data-step="2" className={`bh-step-item ${stepClass(2)}`}>
          <div className="bh-step-node">{stepLabel(2)}</div>
          <span className="bh-step-label">Gửi hồ sơ</span>
          <span className="bh-step-sub">Ghi nhận yêu cầu</span>
        </div>

        <div data-step="3" className={`bh-step-item ${stepClass(3)}`}>
          <div className="bh-step-node">{stepLabel(3)}</div>
          <span className="bh-step-label">Staff thẩm định</span>
          <span className="bh-step-sub">Đối soát thông tin</span>
        </div>

        <div data-step="4" className={`bh-step-item ${stepClass(4)}`}>
          <div className="bh-step-node">{stepLabel(4)}</div>
          <span className="bh-step-label">Cấp quyền Chủ trọ</span>
          <span className="bh-step-sub">Bắt đầu đăng tin</span>
        </div>
      </div>
    </div>
    <div className="bh-process-note"><h2>Sau khi được duyệt</h2><p>Bạn có thể đăng ký nhà trọ, thiết lập loại phòng và quản lý lịch xem phòng tại Host Portal.</p><p className="bh-process-private">Hồ sơ nhà trọ và giấy tờ xác minh sẽ được gửi riêng sau khi tài khoản được cấp quyền.</p></div>
  </section>


  <main className="bh-main-content" id="bhMainContent">
    <div className="bh-container-narrow">


      <div id="stateLoading" style={{display:state === "loading" ? "block" : "none"}}>
        <div className="bh-skeleton-card">
          <div className="bh-sk-line bh-sk-title"></div>
          <div className="bh-sk-line bh-sk-sub"></div>
          <div className="bh-sk-line bh-sk-box"></div>
          <div className="bh-sk-line bh-sk-input"></div>
          <div className="bh-sk-line bh-sk-input"></div>
          <div className="bh-sk-line bh-sk-textarea"></div>
          <div className="bh-sk-line bh-sk-actions"></div>
        </div>
      </div>


      <div id="stateAuthGuard" style={{display:state === "not_logged_in" ? "block" : "none"}}>
        <div className="bh-auth-guard">
          <div className="bh-guard-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h2 className="bh-state-title">Yêu cầu đăng nhập tài khoản</h2>
          <p className="bh-state-desc">
            Bạn cần đăng nhập tài khoản người dùng trên hệ thống HL-RCS trước khi gửi hồ sơ đăng ký làm chủ trọ để chúng tôi có thể liên kết quyền hạn với tài khoản của bạn.
          </p>
          <div className="bh-state-actions">
            <Link className="bh-btn-primary" to="/login?redirect=become-host.html">Đăng nhập tài khoản ngay</Link>
            <Link className="bh-btn-secondary" to="/register">Đăng ký tài khoản mới</Link>
            <Link className="bh-btn-secondary" to="/">Về trang chủ</Link>
          </div>


          <div className="bh-guard-demo-box">
            <span>Trải nghiệm nhanh cho đánh giá / thẩm định: </span>
            <MotionButton type="button" id="btnGuardDemoLogin" className="bh-guard-demo-btn">
              Đăng nhập tự động với tài khoản Sinh viên FPT (Nguyễn Minh Anh)
            </MotionButton>
          </div>
        </div>
      </div>


      <div id="stateUnregistered" style={{display:state === "unregistered" ? "block" : "none"}}>
        <div className="bh-form-card">
          <div className="bh-form-header">
            <h2 className="bh-form-title">Đơn xin cấp quyền Chủ trọ</h2>
            <p className="bh-form-desc" id="bhFormSectionNotice">
              Vui lòng kiểm tra thông tin liên hệ và cung cấp lời giới thiệu để gửi yêu cầu trở thành chủ trọ.
            </p>
          </div>


          <div className="bh-missing-contact-warning" id="bhMissingContactWarning" style={{display:missingContact ? "flex" : "none"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{"flexShrink": "0"}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div>
              <strong>Lưu ý về thông tin liên hệ: </strong>
              <span id="bhMissingContactDesc">Tài khoản của bạn chưa có đủ Họ tên hoặc Số điện thoại. Ban Quản Trị cần thông tin liên hệ chính chủ để xác thực trước khi duyệt hồ sơ.</span>
              <div style={{"marginTop": "6px"}}>
                <Link to="/profile">Cập nhật thông tin trong Hồ sơ cá nhân →</Link>
              </div>
            </div>
          </div>

          {application?.status === "NEEDS_CHANGES" && <aside className="bh-review-note"><strong>Yêu cầu bổ sung từ Staff</strong><p>{application.reviewerNote}</p></aside>}<form id="becomeHostForm" noValidate>

            <div className="bh-form-section">
              <div className="bh-section-title-wrap">
                <span className="bh-section-num">1</span>
                <h3 className="bh-section-title">Thông tin tài khoản</h3>
              </div>

              <div className="bh-account-summary-box">
                <div className="bh-account-grid">
                  <div className="bh-acc-field">
                    <span className="bh-acc-label">Họ và tên</span>
                    <span className="bh-acc-val" id="accFullName" data-requested={application?.status === "NEEDS_CHANGES" && application?.requestedFields?.includes("accFullName") === true}>{user.fullName || '—'}</span>
                  </div>
                  <div className="bh-acc-field">
                    <span className="bh-acc-label">Số điện thoại liên hệ</span>
                    <span className="bh-acc-val" id="accPhone" data-requested={application?.status === "NEEDS_CHANGES" && application?.requestedFields?.includes("accPhone") === true}>{user.phoneNumber || '—'}</span>
                  </div>
                  <div className="bh-acc-field">
                    <span className="bh-acc-label">Email tài khoản</span>
                    <span className="bh-acc-val" id="accEmail">{user.email || '—'}</span>
                  </div>
                  <div className="bh-acc-field">
                    <span className="bh-acc-label">Vai trò hiện tại</span>
                    <span className="bh-acc-val role" id="accRole">{roleLabel}</span>
                  </div>
                </div>
              </div>

              <div className="bh-account-tip">
                <span>Thông tin liên hệ được lấy từ tài khoản của bạn. Cập nhật tại <Link to="/profile">Hồ sơ cá nhân</Link>.</span>
              </div>
            </div>


            <div className="bh-form-section">
              <div className="bh-section-title-wrap">
                <span className="bh-section-num">2</span>
                <h3 className="bh-section-title">Kế hoạch cho thuê</h3>
              </div>

              <div className="bh-form-row">
                <div className="bh-form-group"><label htmlFor="applicantCapacity" className="bh-form-label"><span>Tư cách cho thuê <span className="bh-req-star">*</span></span></label><select id="applicantCapacity" name="applicantCapacity" className="bh-form-select" value={values.applicantCapacity} required disabled={busy} aria-invalid={!!errors.applicantCapacity} aria-describedby="capacityHint errCapacity" data-requested={application?.requestedFields?.includes('applicantCapacity')===true}><option value="">Chọn tư cách cho thuê</option>{applicantCapacities.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><span id="capacityHint" className="bh-field-hint">Nếu được ủy quyền hoặc cho thuê lại, bạn cần có quyền cho thuê hợp lệ và cung cấp giấy tờ khi đăng ký nhà trọ.</span><span id="errCapacity" className={`bh-field-error ${errors.applicantCapacity?'show':''}`} role="alert">{errors.applicantCapacity||''}</span></div>
                <div className="bh-form-group"><label htmlFor="rentalExperience" className="bh-form-label"><span>Kinh nghiệm quản lý cho thuê <span className="bh-req-star">*</span></span></label><select id="rentalExperience" name="rentalExperience" className="bh-form-select" value={values.rentalExperience} required disabled={busy} aria-invalid={!!errors.rentalExperience} aria-describedby="experienceHint errExperience" data-requested={application?.requestedFields?.includes('rentalExperience')===true}><option value="">Chọn kinh nghiệm quản lý</option>{rentalExperiences.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><span id="experienceHint" className="bh-field-hint">Bạn có thể đăng ký ngay cả khi chưa từng quản lý nhà trọ.</span><span id="errExperience" className={`bh-field-error ${errors.rentalExperience?'show':''}`} role="alert">{errors.rentalExperience||''}</span></div>
              </div>
              <div className="bh-form-row">

                <div className="bh-form-group">
                  <label htmlFor="targetCommune" className="bh-form-label">
                    <span>Khu vực hoạt động chính <span className="bh-req-star">*</span></span>
                  </label>
                  <select id="targetCommune" data-requested={application?.status === "NEEDS_CHANGES" && application?.requestedFields?.includes("targetCommune") === true} className="bh-form-select" required name="targetCommune" value={values.targetCommune} disabled={busy} aria-invalid={!!errors.targetCommune} aria-describedby="errCommune">
                    <option value="">-- Chọn xã / khu vực hoạt động --</option>
                    <option value="Tân Xã">Xã Tân Xã (Gần ĐH FPT, Hồ Tân Xã)</option>
                    <option value="Thạch Hòa">Xã Thạch Hòa (Cổng số 1, Ký túc xá CNC)</option>
                    <option value="Bình Yên">Xã Bình Yên (Khu trung tâm Thạch Thất)</option>
                    <option value="Hạ Bằng">Xã Hạ Bằng (Khu Công nghệ cao Hòa Lạc)</option>
                    <option value="Đồng Trúc">Xã Đồng Trúc (Đường Đại lộ Thăng Long)</option>
                    <option value="Tiến Xuân">Xã Tiến Xuân (Khu vực ĐHQG Hà Nội)</option>
                    <option value="Khác">Khu vực khác lân cận Khu CNC Hòa Lạc</option>
                  </select>
                  <span className="bh-field-hint">Địa bàn xã bạn dự kiến quản lý hoặc cho thuê phòng trọ.</span>
                  <span id="errCommune" className={`bh-field-error ${errors.targetCommune ? "show" : ""}`} role="alert">{errors.targetCommune || ''}</span>
                </div>


                <div className="bh-form-group">
                  <label htmlFor="expectedScale" className="bh-form-label">
                    <span>Quy mô phòng dự kiến <span className="bh-req-star">*</span></span>
                  </label>
                  <select id="expectedScale" data-requested={application?.status === "NEEDS_CHANGES" && application?.requestedFields?.includes("expectedScale") === true} className="bh-form-select" required name="expectedScale" value={values.expectedScale} disabled={busy} aria-invalid={!!errors.expectedScale} aria-describedby="errScale">
                    <option value="">-- Chọn quy mô số phòng --</option>
                    <option value="Dưới 5 phòng">Dưới 5 phòng (Nhà riêng cho thuê / Dãy phòng nhỏ)</option>
                    <option value="5 - 15 phòng">5 - 15 phòng (Nhà trọ quy mô vừa phải)</option>
                    <option value="16 - 30 phòng">16 - 30 phòng (Tòa nhà trọ trung cấp)</option>
                    <option value="31 - 50 phòng">31 - 50 phòng (Chung cư mini sinh viên)</option>
                    <option value="Trên 50 phòng">Trên 50 phòng (Hệ thống chuỗi căn hộ)</option>
                  </select>
                  <span className="bh-field-hint">Ước tính tổng số phòng bạn đang vận hành hoặc sắp cho thuê.</span>
                  <span id="errScale" className={`bh-field-error ${errors.expectedScale ? "show" : ""}`} role="alert">{errors.expectedScale || ''}</span>
                </div>
              </div>


              <div className="bh-form-group">
                <label htmlFor="introduction" className="bh-form-label">
                  <span>Giới thiệu bản thân &amp; cơ sở cho thuê <span className="bh-req-star">*</span></span>
                  <span className="bh-char-counter" id="introCharCounter">{values.introduction.length + ' / 1000 ký tự'}</span>
                </label>
                <textarea id="introduction" data-requested={application?.status === "NEEDS_CHANGES" && application?.requestedFields?.includes("introduction") === true} className="bh-form-textarea" rows="4" maxLength="1000" placeholder="Giới thiệu kinh nghiệm quản lý, khu vực nhà trọ và kế hoạch cho thuê của bạn..." required name="introduction" value={values.introduction} disabled={busy} aria-invalid={!!errors.introduction} aria-describedby="errIntro"></textarea>
                <span className="bh-field-hint">Từ 20 đến 1000 ký tự. Staff sẽ sử dụng thông tin này để thẩm định yêu cầu của bạn.</span>
                <span id="errIntro" className={`bh-field-error ${errors.introduction ? "show" : ""}`} role="alert">{errors.introduction || ''}</span>
              </div>
            </div>


            <div className="bh-agreement-card">
              <label className="bh-checkbox-label">
                <input type="checkbox" id="agreementCheck" required name="agreementAccepted" checked={values.agreementAccepted} disabled={busy} aria-invalid={!!errors.agreementAccepted} aria-describedby="errAgreement"/>
                <span>
                  Tôi cam kết thông tin cung cấp là chính xác, đồng ý tuân thủ <strong>Quy chế hoạt động đối tác HL-RCS</strong>, bảo đảm cung cấp giá điện nước minh bạch và tạo môi trường lưu trú an toàn, văn minh cho sinh viên.
                </span>
              </label>
              <span id="errAgreement" style={{"marginLeft": "27px", "marginTop": "6px"}} className={`bh-field-error ${errors.agreementAccepted ? "show" : ""}`} role="alert">{errors.agreementAccepted || ''}</span>
            </div>


            <div id="formGeneralError" className="bh-feedback-banner rejected" style={{display:!!alert ? "flex" : "none"}}>
              <span className="bh-fb-icon">⚠️</span>
              <div>
                <div className="bh-fb-title">Không thể gửi hồ sơ</div>
                <div className="bh-fb-desc" id="formGeneralErrorText">{alert}</div>
              </div>
            </div>


            <div className="bh-form-actions">
              <MotionButton type="button" id="btnCancelForm" className="bh-btn-cancel" disabled={busy || false}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Hủy bỏ</span>
              </MotionButton>
              <MotionButton type="submit" id="btnSubmitForm" className="bh-btn-submit" disabled={busy || missingContact}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span id="btnSubmitFormText">{busy ? 'Đang gửi hồ sơ...' : 'Gửi đăng ký xét duyệt'}</span>
              </MotionButton>
            </div>
          </form>
        </div>
      </div>


      <div id="statePending" style={{display:state === "pending" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap pending">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div className="bh-status-pill pending">
            <span className="dot"></span>
            <span>Đang chờ xét duyệt</span>
          </div>
          <h2 className="bh-state-title">Hồ sơ đang chờ xét duyệt</h2>
          <p className="bh-state-desc">
            Hồ sơ xin cấp quyền Chủ trọ đã được tiếp nhận thành công. Đội ngũ kiểm duyệt HL-RCS đang đối soát thông tin tài khoản và sẽ thông báo kết quả cho bạn trong thời gian sớm nhất.
          </p>


          <div className="bh-submitted-info-card">
            <div className="bh-sic-header">
              <span>Thông tin hồ sơ đã ghi nhận</span>
              <span className="bh-sic-meta">Thời gian gửi: <strong id="pendingSubmittedDate">{formatDate(application?.submittedAt)}</strong></span>
            </div>
            <div className="bh-sic-grid"><div className="bh-sic-item"><span className="bh-sic-label">Tư cách cho thuê</span><span className="bh-sic-val">{applicationFieldLabel(applicantCapacities,application?.applicantCapacity)}</span></div><div className="bh-sic-item"><span className="bh-sic-label">Kinh nghiệm quản lý</span><span className="bh-sic-val">{applicationFieldLabel(rentalExperiences,application?.rentalExperience)}</span></div>
              <div className="bh-sic-item">
                <span className="bh-sic-label">Họ và tên đăng ký</span>
                <span className="bh-sic-val" id="pendingUserName">{application?.userName || '—'}</span>
              </div>
              <div className="bh-sic-item">
                <span className="bh-sic-label">Số điện thoại liên hệ</span>
                <span className="bh-sic-val" id="pendingUserPhone">{application?.userPhone || '—'}</span>
              </div>
              <div className="bh-sic-item">
                <span className="bh-sic-label">Email tài khoản</span>
                <span className="bh-sic-val" id="pendingUserEmail">{application?.userEmail || '—'}</span>
              </div>
              <div className="bh-sic-item">
                <span className="bh-sic-label">Khu vực hoạt động</span>
                <span className="bh-sic-val" id="pendingTargetCommune">{application?.targetCommune || '—'}</span>
              </div>
              <div className="bh-sic-item full">
                <span className="bh-sic-label">Quy mô phòng dự kiến</span>
                <span className="bh-sic-val" id="pendingExpectedScale">{application?.expectedScale || '—'}</span>
              </div>
              <div className="bh-sic-item full">
                <span className="bh-sic-label">Lời giới thiệu &amp; Kinh nghiệm</span>
                <div className="bh-sic-intro-text" id="pendingIntroduction">{application?.introduction || '—'}</div>
              </div>
            </div>
          </div>

          <div className="bh-state-actions">
            <Link className="bh-btn-secondary" to="/profile">Về hồ sơ cá nhân</Link>
            <Link className="bh-btn-secondary" to="/">Về trang chủ</Link>
          </div>
        </div>
      </div>


      <div id="stateNeedsChanges" style={{display:state === "needs_changes" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap warning">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div className="bh-status-pill warning">
            <span className="dot"></span>
            <span>Cần bổ sung thông tin</span>
          </div>
          <h2 className="bh-state-title">Yêu cầu bổ sung thông tin hồ sơ</h2>
          <p className="bh-state-desc">
            Ban Quản Trị đã xem xét hồ sơ của bạn và phát hiện một số nội dung cần làm rõ thêm trước khi có thể cấp quyền Chủ trọ chính thức.
          </p>


          <div className="bh-feedback-banner warning">
            <div className="bh-fb-icon">📝</div>
            <div>
              <div className="bh-fb-title">Hướng dẫn từ Ban Quản Trị Staff:</div>
              <div className="bh-fb-desc" id="ncNote">{application?.reviewerNote || '—'}</div>
              <div className="bh-fb-meta">
                <span>Người xét duyệt: <strong id="ncReviewer">{application?.reviewedBy || 'Ban Quản Trị HL_RCS'}</strong></span>
                <span style={{"margin": "0 6px"}}>•</span>
                <span>Thời gian: <span id="ncTime">{formatDate(application?.reviewedAt)}</span></span>
              </div>
            </div>
          </div>

          <div className="bh-state-actions">
            <MotionButton type="button" id="btnStartSupplement" className="bh-btn-primary" disabled={!application?.allowResubmit || busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Chỉnh sửa &amp; Gửi lại hồ sơ</span>
            </MotionButton>
            <Link className="bh-btn-secondary" to="/profile">Để sau</Link>
          </div>
        </div>
      </div>


      <div id="stateRejected" style={{display:state === "rejected" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap rejected">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
          <div className="bh-status-pill rejected">
            <span className="dot"></span>
            <span>Chưa được phê duyệt</span>
          </div>
          <h2 className="bh-state-title">Hồ sơ chưa được phê duyệt</h2>
          <p className="bh-state-desc">
            Rất tiếc, hồ sơ đăng ký quyền Chủ trọ của bạn hiện chưa đáp ứng đủ tiêu chuẩn hợp tác đối tác lưu trú của HL-RCS.
          </p>


          <div className="bh-feedback-banner rejected">
            <div className="bh-fb-icon">❌</div>
            <div>
              <div className="bh-fb-title">Lý do từ Ban Quản Trị:</div>
              <div className="bh-fb-desc" id="rejReason">{application?.reviewerNote || '—'}</div>
              <div className="bh-fb-meta">
                <span>Người thẩm định: <strong id="rejReviewer">{application?.reviewedBy || 'Ban Quản Trị HL_RCS'}</strong></span>
                <span style={{"margin": "0 6px"}}>•</span>
                <span>Thời gian: <span id="rejTime">{formatDate(application?.reviewedAt)}</span></span>
              </div>
            </div>
          </div>

          <div id="rejResubmitNotice" style={{display:!application?.allowResubmit ? "block" : "none"}}>
            Tài khoản hiện bị tạm khóa gửi lại hồ sơ do vi phạm quy chế hoặc gửi nhiều lần không hợp lệ. Vui lòng liên hệ Hotline: <strong>0912 345 678</strong> để được hỗ trợ.
          </div>

          <div className="bh-state-actions">
            <MotionButton type="button" id="btnResubmitAfterReject" className="bh-btn-primary" disabled={!application?.allowResubmit || busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
              <span>Tạo và gửi lại hồ sơ mới</span>
            </MotionButton>
            <Link className="bh-btn-secondary" to="/profile">Về hồ sơ cá nhân</Link>
            <Link className="bh-btn-secondary" to="/">Về trang chủ</Link>
          </div>
        </div>
      </div>


      <div id="stateApproved" style={{display:state === "approved" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap approved">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="bh-status-pill approved">
            <span className="dot"></span>
            <span>Đã phê duyệt</span>
          </div>
          <h2 className="bh-state-title">Chúc mừng! Bạn đã chính thức là Chủ trọ</h2>
          <p className="bh-state-desc">
            Hồ sơ đăng ký của bạn đã được Ban Quản Trị HL-RCS phê duyệt vào lúc <strong id="appReviewedTime">{formatDate(application?.reviewedAt)}</strong>. Tài khoản của bạn hiện có toàn quyền sử dụng Host Portal để đăng tải nhà trọ, thiết lập loại phòng và tiếp nhận sinh viên.
          </p>

          <div className="bh-state-actions">
            <Link className="bh-btn-primary" to="/host">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Vào Bảng điều khiển Chủ trọ (Host Portal) →</span>
            </Link>
            <Link className="bh-btn-secondary" to="/profile">Xem hồ sơ của tôi</Link>
          </div>
        </div>
      </div>


      <div id="stateAlreadyHost" style={{display:state === "already_host" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap already">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div className="bh-status-pill approved">
            <span className="dot"></span>
            <span>Tài khoản Chủ trọ</span>
          </div>
          <h2 className="bh-state-title">Tài khoản đã có quyền Chủ trọ</h2>
          <p className="bh-state-desc">
            Tài khoản hiện tại của bạn đã được kích hoạt vai trò Chủ trọ (Host). Bạn không cần thực hiện thêm bước đăng ký này nữa.
          </p>

          <div className="bh-state-actions">
            <Link className="bh-btn-primary" to="/host">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Truy cập Bảng điều khiển Chủ trọ (Host Portal) →</span>
            </Link>
            <Link className="bh-btn-secondary" to="/profile">Về hồ sơ cá nhân</Link>
          </div>
        </div>
      </div>


      <div id="stateError" style={{display:state === "error" ? "block" : "none"}}>
        <div className="bh-state-card">
          <div className="bh-state-icon-wrap rejected">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="bh-state-title">Không thể tải hồ sơ</h2>
          <p className="bh-state-desc" id="errorMessageText">{alert}</p>
          <div className="bh-state-actions">
            <MotionButton type="button" id="btnRetryError" className="bh-btn-primary">Thử lại ngay</MotionButton>
            <Link className="bh-btn-secondary" to="/">Về trang chủ</Link>
          </div>
        </div>
      </div>

    </div>
  </main>
  </div>



  <footer className="footer-wrapper">
    <div className="container footer-grid">

      <div className="footer-col col-brand">
        <Link className="nav-brand" style={{"marginBottom": "16px"}} to="/">
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name" style={{"color": "#ffffff"}}>HL_RCS</span>
            <span className="brand-sub" style={{"color": "var(--slate-400)"}}>Rental Connection System</span>
          </div>
        </Link>
        <p className="footer-desc">
          Nền tảng kết nối phòng trọ sinh viên minh bạch, bảo vệ quyền lợi người thuê và hỗ trợ chủ nhà số hóa vận hành nhà trọ tại Đô thị vệ tinh Hòa Lạc.
        </p>
        <div className="footer-socials">
          <a href="#" className="social-btn" aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
          <a href="#" className="social-btn" aria-label="YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#0f172a"></polygon></svg></a>
        </div>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Khu vực phòng trọ</h4>
        <ul className="footer-links">
          <li><Link to="/search?location=tan-xa">Phòng trọ Tân Xã (Gần ĐH FPT)</Link></li>
          <li><Link to="/search?location=thach-hoa">Phòng trọ Thạch Hòa</Link></li>
          <li><Link to="/search?location=binh-yen">Căn hộ mini Bình Yên</Link></li>
          <li><Link to="/search?location=cnc">Phòng gần Khu Công nghệ cao</Link></li>
          <li><Link to="/search?price=under-15">Phòng trọ giá rẻ sinh viên &lt; 2tr</Link></li>
        </ul>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Tiện ích hệ thống</h4>
        <ul className="footer-links">
          <li><Link to="/profile">Hồ sơ cá nhân</Link></li>
          <li><Link to="/favorites">Nhà trọ đã lưu</Link></li>
          <li><Link to="/search">Tìm kiếm phòng trọ</Link></li>
          <li><Link to="/become-host">Đăng ký làm chủ trọ</Link></li>
          <li><a href="/#features">Quy trình xác minh chính chủ</a></li>
        </ul>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Trụ sở hỗ trợ sinh viên</h4>
        <p className="footer-contact-item">📍 Văn phòng: Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội</p>
        <p className="footer-contact-item">📞 Hotline: <strong>0912 345 678</strong> (8:00 - 21:00)</p>
        <p className="footer-contact-item">✉️ Email: support@hlrcs.vn</p>
        <div className="verified-badge-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Bảo vệ quyền lợi người thuê phòng trọ</span>
        </div>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="container footer-bottom-inner">
        <p>© 2026 HL_RCS (Rental Connection System). Bản quyền thuộc về Dự án công nghệ HL_RCS.</p>
        <div className="bottom-links">
          <a href="#">Điều khoản sử dụng</a>
          <span className="dot">•</span>
          <a href="#">Chính sách bảo mật</a>
          <span className="dot">•</span>
          <a href="#">Quy chế hoạt động</a>
        </div>
      </div>
    </div>
  </footer>



</div>;
}
