import { MotionButton } from '../../components/motion/MotionUI.jsx';
// Layout and static content preserved from Code/giao_dien/html/home.html.
import {Link} from 'react-router-dom';
export default function HomePrototype({listings,more,account,filters,savedCount,mobileOpen,onClick,onSubmit,onChange}) {
 return <div className="prototype-home" onClick={onClick} onSubmit={onSubmit} onChange={onChange}>


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


        <ul className={`nav-menu ${mobileOpen ? "show" : ""}`} id="navMenu">
          <li><Link className="nav-item" to="/search">Tìm phòng</Link></li>
          <li><Link className="nav-item" to="/map">Bản đồ</Link></li>
          <li><Link className="nav-item" to="/favorites">Đã lưu (<span className="menu-fav-count">{savedCount}</span>)</Link></li>
          <li><Link className="nav-item" to="/bookings">Lịch xem phòng</Link></li>
          <li><Link className="nav-item" to="/services">Dịch vụ</Link></li>
          <li><Link className="nav-item" to="/community">Cộng đồng</Link></li>
          <li><Link className="nav-item" to="/profile">Hồ sơ cá nhân</Link></li>
        </ul>


        <div className="nav-actions">{account || <>
          <Link className="btn-wishlist-top" id="topWishlistBtn" aria-label="Danh sách phòng yêu thích" title="Nhà trọ đã lưu" style={{"textDecoration": "none"}} to="/favorites">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
            <span className="wishlist-count" id="wishlistCount">{savedCount}</span>
          </Link>
          <Link className="btn-ghost" to="/login">Đăng nhập</Link>
          <Link className="btn-primary-sm" to="/register">Đăng ký ngay</Link>
        </>}</div>


        <MotionButton className="mobile-toggle" id="mobileMenuBtn" aria-label="Mở thực đơn" aria-expanded={mobileOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </MotionButton>
      </div>
    </nav>
  </header>


  <section className="hero-section">
    <div className="hero-backdrop">
      <div className="hero-overlay"></div>
    </div>

    <div className="container hero-container">
      <div className="hero-badge">
        <span className="badge-pulse"></span>
        <span>Nền tảng kết nối phòng trọ trực tiếp số 1 tại Hòa Lạc</span>
      </div>
      <h1 className="hero-headline">
        Tìm phòng trọ an tâm,<br/>
        <span className="highlight-text">minh bạch &amp; chính chủ</span> tại Hòa Lạc
      </h1>
      <p className="hero-description">
        Hệ thống dữ liệu phòng trọ xác thực 100%, hình ảnh thật, định vị chính xác và bảng giá điện nước niêm yết công khai quanh ĐH FPT &amp; Khu Công nghệ cao.
      </p>


      <div className="search-box-card">
        <form id="searchForm" className="search-form-grid">

          <div className="search-field">
            <div className="search-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div className="search-field-content">
              <label htmlFor="filterLocation" className="search-label">Khu vực</label>
              <select id="filterLocation" className="search-select" value={filters.location}>
                <option value="all">Tất cả khu vực Hòa Lạc</option>
                <option value="tan-xa">Tân Xã (Gần ĐH FPT)</option>
                <option value="thach-hoa">Thạch Hòa (Gần chợ &amp; bus)</option>
                <option value="binh-yen">Bình Yên (Khu yên tĩnh)</option>
                <option value="cnc">Gần Khu Công nghệ cao</option>
              </select>
            </div>
          </div>


          <div className="search-field">
            <div className="search-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div className="search-field-content">
              <label htmlFor="filterPrice" className="search-label">Mức giá thuê</label>
              <select id="filterPrice" className="search-select" value={filters.price}>
                <option value="all">Mọi mức giá</option>
                <option value="under-15">Dưới 1.5 triệu / tháng</option>
                <option value="15-25">1.5 - 2.5 triệu / tháng</option>
                <option value="25-35">2.5 - 3.5 triệu / tháng</option>
                <option value="above-35">Trên 3.5 triệu (CCMN)</option>
              </select>
            </div>
          </div>


          <div className="search-field">
            <div className="search-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div className="search-field-content">
              <label htmlFor="filterType" className="search-label">Loại phòng</label>
              <select id="filterType" className="search-select" value={filters.type}>
                <option value="all">Tất cả loại phòng</option>
                <option value="khep-kin">Phòng khép kín</option>
                <option value="gac-lung">Có gác lửng</option>
                <option value="chung-cu-mini">Chung cư mini (Studio)</option>
                <option value="o-ghep">Tìm bạn ở ghép</option>
              </select>
            </div>
          </div>


          <div className="search-action">
            <MotionButton type="submit" className="btn-search-submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <span>Tìm phòng ngay</span>
            </MotionButton>
          </div>
        </form>


        <div className="quick-tags-row">
          <span className="quick-tags-title">Gợi ý lọc nhanh:</span>
          <MotionButton type="button" className={`tag-chip ${filters.chip === "all" ? "active" : ""}`} aria-pressed={filters.chip === "all"} data-chip="all">Tất cả</MotionButton>
          <MotionButton type="button" className={`tag-chip ${filters.chip === "dieu-hoa" ? "active" : ""}`} aria-pressed={filters.chip === "dieu-hoa"} data-chip="dieu-hoa">Có điều hòa</MotionButton>
          <MotionButton type="button" className={`tag-chip ${filters.chip === "tu-do" ? "active" : ""}`} aria-pressed={filters.chip === "tu-do"} data-chip="tu-do">Giờ tự do</MotionButton>
          <MotionButton type="button" className={`tag-chip ${filters.chip === "ban-cong" ? "active" : ""}`} aria-pressed={filters.chip === "ban-cong"} data-chip="ban-cong">Có ban công</MotionButton>
          <MotionButton type="button" className={`tag-chip ${filters.chip === "gan-fpt" ? "active" : ""}`} aria-pressed={filters.chip === "gan-fpt"} data-chip="gan-fpt">Cách ĐH FPT &lt; 1km</MotionButton>
        </div>
      </div>
    </div>
  </section>


  <section className="metrics-bar">
    <div className="container metrics-grid">
      <div className="metric-item">
        <div className="metric-number">1,250+</div>
        <div className="metric-text">Phòng trọ đã khảo sát thực địa</div>
      </div>
      <div className="metric-divider"></div>
      <div className="metric-item">
        <div className="metric-number">100%</div>
        <div className="metric-text">Chính chủ • Giá điện nước minh bạch</div>
      </div>
      <div className="metric-divider"></div>
      <div className="metric-item">
        <div className="metric-number">6,800+</div>
        <div className="metric-text">Sinh viên FPT &amp; người thuê tin dùng</div>
      </div>
      <div className="metric-divider"></div>
      <div className="metric-item">
        <div className="metric-number">0 đ</div>
        <div className="metric-text">Không phí môi giới trung gian</div>
      </div>
    </div>
  </section>


  <section className="section-wrapper" id="explore">
    <div className="container">
      <div className="section-header">
        <div>
          <span className="section-eyebrow">Dữ liệu kiểm duyệt 2026</span>
          <h2 className="section-title">Phòng trọ nổi bật còn trống tại Hòa Lạc</h2>
          <p className="section-desc">Tất cả phòng đều được xác minh hình ảnh, tiện nghi và tình trạng thực tế trước khi hiển thị.</p>
        </div>
        <div className="filter-tabs" role="tablist">
          <MotionButton type="button" className={`tab-btn ${filters.tab === "all" ? "active" : ""}`} role="tab" aria-selected={filters.tab === "all"} data-tab="all">Tất cả phòng</MotionButton>
          <MotionButton type="button" className={`tab-btn ${filters.tab === "tan-xa" ? "active" : ""}`} role="tab" aria-selected={filters.tab === "tan-xa"} data-tab="tan-xa">Tân Xã</MotionButton>
          <MotionButton type="button" className={`tab-btn ${filters.tab === "thach-hoa" ? "active" : ""}`} role="tab" aria-selected={filters.tab === "thach-hoa"} data-tab="thach-hoa">Thạch Hòa</MotionButton>
          <MotionButton type="button" className={`tab-btn ${filters.tab === "studio" ? "active" : ""}`} role="tab" aria-selected={filters.tab === "studio"} data-tab="studio">Studio cao cấp</MotionButton>
        </div>
      </div>


      <div className="rooms-grid" id="roomsContainer">{listings}</div>


      <div className="load-more-wrap">{more}</div>
    </div>
  </section>


  <section className="section-wrapper bg-subtle" id="locations">
    <div className="container">
      <div className="section-header center">
        <span className="section-eyebrow">Bản đồ khu vực sinh sống</span>
        <h2 className="section-title">Khu vực thuê trọ thuận tiện nhất Hòa Lạc</h2>
        <p className="section-desc">Lựa chọn vị trí phù hợp với nhu cầu đi học tại ĐH FPT hoặc đi làm tại Khu Công nghệ cao.</p>
      </div>

      <div className="locations-grid">

        <article className="location-card">
          <div className="location-img-wrap">
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" alt="Khu vực Tân Xã Hòa Lạc" loading="lazy"/>
            <span className="location-tag">Cách FPT 500m - 1.2km</span>
          </div>
          <div className="location-content">
            <h3 className="location-name">Khu vực Tân Xã &amp; Hồ Tân Xã</h3>
            <p className="location-info">Vị trí đông sinh viên nhất, nhiều hàng quán, cafe học bài, đi bộ hoặc xe bus tới trường trong 5 phút.</p>
            <div className="location-meta">
              <span>🏠 420+ Phòng trọ</span>
              <span>💵 Từ 1.8tr - 3.2tr/tháng</span>
            </div>
            <Link className="location-link" to="/search?location=tan-xa">Khám phá phòng tại Tân Xã →</Link>
          </div>
        </article>


        <article className="location-card">
          <div className="location-img-wrap">
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" alt="Khu vực Thạch Hòa" loading="lazy"/>
            <span className="location-tag">Gần Chợ &amp; Tuyến Bus</span>
          </div>
          <div className="location-content">
            <h3 className="location-name">Khu vực Thạch Hòa</h3>
            <p className="location-info">Gần chợ truyền thống, siêu thị, phòng rộng rãi, yên tĩnh và chi phí sinh hoạt cực kỳ hợp lý.</p>
            <div className="location-meta">
              <span>🏠 310+ Phòng trọ</span>
              <span>💵 Từ 1.4tr - 2.5tr/tháng</span>
            </div>
            <Link className="location-link" to="/search?location=thach-hoa">Khám phá phòng tại Thạch Hòa →</Link>
          </div>
        </article>


        <article className="location-card">
          <div className="location-img-wrap">
            <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80" alt="Khu Công nghệ cao Hòa Lạc" loading="lazy"/>
            <span className="location-tag">Studio &amp; CCMN Mới 2026</span>
          </div>
          <div className="location-content">
            <h3 className="location-name">Bình Yên &amp; Trục Khu CNC</h3>
            <p className="location-info">Nhiều tòa nhà căn hộ mini mới xây, thang máy, an ninh camera 24/7, phù hợp làm việc tại Viettel, FPT Software.</p>
            <div className="location-meta">
              <span>🏠 250+ Căn hộ studio</span>
              <span>💵 Từ 2.2tr - 4.5tr/tháng</span>
            </div>
            <Link className="location-link" to="/search?location=binh-yen">Khám phá phòng tại Bình Yên →</Link>
          </div>
        </article>
      </div>
    </div>
  </section>


  <section className="section-wrapper" id="services-highlight" style={{"padding": "48px 0", "background": "#ffffff", "borderTop": "1px solid var(--slate-100)", "borderBottom": "1px solid var(--slate-100)"}}>
    <div className="container">
      <div className="section-header" style={{"marginBottom": "24px"}}>
        <div>
          <span className="section-eyebrow" style={{"color": "var(--primary)"}}>Tiện ích cuộc sống Hòa Lạc</span>
          <h2 className="section-title">Dịch vụ quanh trọ thiết yếu</h2>
          <p className="section-desc">Kết nối dịch vụ chuyển trọ, giặt là và vệ sinh phòng uy tín để cuộc sống thuê trọ thuận tiện hơn.</p>
        </div>
        <div>
          <Link className="btn-outline-lg" style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "padding": "10px 18px", "fontSize": "13.5px", "textDecoration": "none"}} to="/services">
            <span>Xem tất cả dịch vụ</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"></path></svg>
          </Link>
        </div>
      </div>

      <div className="svc-cat-cards-grid" style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(260px, 1fr))", "gap": "16px"}}>
        <Link style={{"display": "flex", "alignItems": "center", "gap": "14px", "padding": "16px", "background": "var(--slate-50)", "border": "1.5px solid var(--slate-200)", "borderRadius": "var(--radius-lg)", "textDecoration": "none", "transition": "all 0.2s"}} to="/services?category=moving">
          <div style={{"width": "44px", "height": "44px", "borderRadius": "var(--radius-md)", "background": "#ecfdf5", "color": "#059669", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"></rect><path d="m16 8 5 3-5 3v-6z"></path><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div>
            <h3 style={{"fontSize": "15px", "fontWeight": "700", "color": "var(--slate-900)", "margin": "0 0 2px"}}>Chuyển trọ</h3>
            <span style={{"fontSize": "12.5px", "color": "var(--slate-500)"}}>Xe tải nhỏ, chuyển đồ sinh viên →</span>
          </div>
        </Link>

        <Link style={{"display": "flex", "alignItems": "center", "gap": "14px", "padding": "16px", "background": "var(--slate-50)", "border": "1.5px solid var(--slate-200)", "borderRadius": "var(--radius-lg)", "textDecoration": "none", "transition": "all 0.2s"}} to="/services?category=laundry">
          <div style={{"width": "44px", "height": "44px", "borderRadius": "var(--radius-md)", "background": "#eff6ff", "color": "#2563eb", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"></circle><path d="M8 9h8"></path><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"></path></svg>
          </div>
          <div>
            <h3 style={{"fontSize": "15px", "fontWeight": "700", "color": "var(--slate-900)", "margin": "0 0 2px"}}>Giặt là</h3>
            <span style={{"fontSize": "12.5px", "color": "var(--slate-500)"}}>Giặt sấy theo ký, giặt chăn ga →</span>
          </div>
        </Link>

        <Link style={{"display": "flex", "alignItems": "center", "gap": "14px", "padding": "16px", "background": "var(--slate-50)", "border": "1.5px solid var(--slate-200)", "borderRadius": "var(--radius-lg)", "textDecoration": "none", "transition": "all 0.2s"}} to="/services?category=cleaning">
          <div style={{"width": "44px", "height": "44px", "borderRadius": "var(--radius-md)", "background": "#fef3c7", "color": "#d97706", "display": "flex", "alignItems": "center", "justifyContent": "center", "flexShrink": "0"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12 2 22h20l-2-10H4z"></path><path d="M12 2c-3 0-5 2-5 5v5h10V7c0-3-2-5-5-5z"></path></svg>
          </div>
          <div>
            <h3 style={{"fontSize": "15px", "fontWeight": "700", "color": "var(--slate-900)", "margin": "0 0 2px"}}>Vệ sinh</h3>
            <span style={{"fontSize": "12.5px", "color": "var(--slate-500)"}}>Dọn phòng định kỳ, tổng vệ sinh →</span>
          </div>
        </Link>
      </div>
    </div>
  </section>


  <section className="section-wrapper" id="features">
    <div className="container">
      <div className="section-header center">
        <span className="section-eyebrow">Cam kết chất lượng</span>
        <h2 className="section-title">Vì sao hơn 6,000+ sinh viên tin chọn HL_RCS?</h2>
        <p className="section-desc">Giải quyết triệt để vấn đề tin ảo, ép giá điện nước và phát sinh phụ phí khi thuê trọ tại Hòa Lạc.</p>
      </div>

      <div className="features-grid">
        <div className="feat-box">
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 11 3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
          <h3 className="feat-title">100% Ảnh thật &amp; Khảo sát thực tế</h3>
          <p className="feat-desc">Đội ngũ vận hành trực tiếp chụp ảnh, quay video và đo diện tích thực tế. Không chỉnh sửa gây hiểu nhầm.</p>
        </div>

        <div className="feat-box">
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3 className="feat-title">Cập nhật phòng trống liên tục</h3>
          <p className="feat-desc">Chủ nhà trọ xác nhận tình trạng phòng hàng tuần. Không còn tình trạng đến nơi mới báo vừa hết phòng.</p>
        </div>

        <div className="feat-box">
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h3 className="feat-title">Minh bạch điện nước &amp; hợp đồng</h3>
          <p className="feat-desc">Toàn bộ giá phòng, tiền điện (theo số), tiền nước và phí dịch vụ đều được cam kết niêm yết rõ ràng.</p>
        </div>

        <div className="feat-box">
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </div>
          <h3 className="feat-title">Kết nối Zalo/SĐT không qua môi giới</h3>
          <p className="feat-desc">Trao đổi trực tiếp với chủ trọ chính chủ. Sinh viên và người thuê không bao giờ phải trả phí môi giới.</p>
        </div>
      </div>
    </div>
  </section>


  <section className="host-banner-section" id="host-section">
    <div className="container">
      <div className="host-banner-card">
        <div className="host-banner-content">
          <span className="host-badge">Hợp tác chủ nhà trọ</span>
          <h2 className="host-title">Bạn có phòng trọ trống tại khu vực Hòa Lạc?</h2>
          <p className="host-desc">
            Tiếp cận hơn <strong>6,000+ sinh viên ĐH FPT</strong> và kỹ sư Khu CNC đang có nhu cầu tìm phòng mỗi tháng. Đăng tin nhanh chóng, quản lý trạng thái phòng dễ dàng và hoàn toàn miễn phí.
          </p>
          <div className="host-actions">
            <Link className="btn-host-primary" to="/register">Đăng tin phòng trọ miễn phí</Link>
            <Link className="btn-host-secondary" to="/login">Đăng nhập tài khoản Chủ trọ</Link>
          </div>
          <div className="host-guarantee">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Hỗ trợ nhân viên tới chụp ảnh phòng thực tế tận nơi miễn phí</span>
          </div>
        </div>
        <div className="host-banner-visual">
          <div className="host-stat-card">
            <div className="host-stat-val">3 - 5 ngày</div>
            <div className="host-stat-label">Thời gian trung bình lấp đầy phòng trống</div>
          </div>
        </div>
      </div>
    </div>
  </section>


  <section className="section-wrapper bg-subtle" id="reviews">
    <div className="container">
      <div className="section-header center">
        <span className="section-eyebrow">Trải nghiệm thực tế</span>
        <h2 className="section-title">Sinh viên &amp; Người thuê nói gì về HL_RCS?</h2>
        <p className="section-desc">Đánh giá thực tế từ các bạn sinh viên đã tìm được phòng ưng ý thông qua nền tảng.</p>
      </div>

      <div className="reviews-grid">

        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="review-text">"Mình là sinh viên K18 ĐH FPT, lúc mới lên Hòa Lạc tìm trọ rất sợ bị môi giới với cọc ảo. Nhờ HL_RCS mà mình tìm được phòng ở Tân Xã cách trường có 700m, giá điện nước chuẩn 100% như trên web."</p>
          <div className="reviewer">
            <div className="reviewer-avatar">NA</div>
            <div className="reviewer-info">
              <span className="reviewer-name">Nguyễn Tuấn Anh</span>
              <span className="reviewer-role">Sinh viên K18 ĐH FPT • Thuê tại Tân Xã</span>
            </div>
          </div>
        </div>


        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="review-text">"Giao diện trực quan, có đầy đủ chi tiết tiền phòng và tiện nghi. Mình thích nhất tính năng xem tình trạng phòng còn trống theo thời gian thực, gọi chủ trọ cái là hẹn qua xem phòng ngay."</p>
          <div className="reviewer">
            <div className="reviewer-avatar">ML</div>
            <div className="reviewer-info">
              <span className="reviewer-name">Trần Mai Linh</span>
              <span className="reviewer-role">Kỹ sư FPT Software • Thuê tại Thạch Hòa</span>
            </div>
          </div>
        </div>


        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="review-text">"Nhà trọ của cô có 14 phòng, đợt sinh viên mới vào trường đăng lên HL_RCS được các bạn hỗ trợ chụp ảnh rất đẹp. Chỉ trong 1 tuần là đã kín phòng mà không mất phí môi giới nào."</p>
          <div className="reviewer">
            <div className="reviewer-avatar host-av">CH</div>
            <div className="reviewer-info">
              <span className="reviewer-name">Cô Hoàng Lan</span>
              <span className="reviewer-role">Chủ nhà trọ An Phú • Tân Xã, Hòa Lạc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>


  <footer className="footer-wrapper">
    <div className="container footer-grid">

      <div className="footer-col col-brand">
        <Link className="nav-brand white" to="/">
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name">HL_RCS</span>
            <span className="brand-sub">Rental Connection System</span>
          </div>
        </Link>
        <p className="footer-desc">
          Nền tảng công nghệ kết nối trực tiếp người thuê và chủ nhà trọ tại khu vực ĐH FPT và Khu Công nghệ cao Hòa Lạc. Minh bạch thông tin, cam kết không môi giới.
        </p>
        <div className="footer-socials">
          <a href="#" className="social-link" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
          <a href="#" className="social-link" aria-label="Zalo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></a>
          <a href="#" className="social-link" aria-label="Hotline"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
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
          <li><Link to="/login">Đăng nhập tài khoản</Link></li>
          <li><Link to="/register">Đăng ký thành viên mới</Link></li>
          <li><a href="#host-section">Hợp tác cho thuê nhà trọ</a></li>
          <li><a href="#features">Quy trình xác minh chính chủ</a></li>
          <li><a href="tel:0912345678">Báo cáo tin đăng sai sự thật</a></li>
        </ul>
      </div>


      <div className="footer-col">
        <h4 className="footer-col-title">Trụ sở hỗ trợ sinh viên</h4>
        <p className="footer-contact-item">
          📍 Văn phòng hỗ trợ: Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội
        </p>
        <p className="footer-contact-item">
          📞 Hotline: <strong>0912 345 678</strong> (8:00 - 21:00)
        </p>
        <p className="footer-contact-item">
          ✉️ Email: support@hlrcs.vn
        </p>
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
