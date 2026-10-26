// Preserved from Code/giao_dien/html/staff-host-registrations.html and staff-host-registration-detail.html.
import {Link} from 'react-router-dom';
export default function StaffHostListTemplate(props){return <div className="hr-content-fragment" onClick={props.onClick} onChange={props.onChange}><main className="staff-content" role="main">


        <nav className="dashboard-breadcrumbs" aria-label="Đường dẫn">
          <Link to="/staff">HL_RCS</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/staff">Staff Portal</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Xác minh đăng ký chủ trọ</span>
        </nav>


        <section className="dashboard-header-row">
          <div>
            <h2 className="dashboard-headline">Hồ sơ đăng ký làm chủ trọ</h2>
            <p className="dashboard-subtext">
              Thẩm định nguyện vọng và năng lực của người dùng xin cấp quyền Chủ trọ trước khi mở quyền sử dụng Host Portal.
            </p>
          </div>
          <div className="header-actions-col">
            <button type="button" className="btn-refresh-dashboard" id="btnRefreshList" title="Làm mới danh sách">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              <span>Làm mới</span>
            </button>
          </div>
        </section>








        <section className="staff-kpi-grid" aria-label="Thống kê hồ sơ đăng ký làm chủ trọ">

          <div className="kpi-card kpi-blue" id="cardKpiAll" style={{"cursor": "pointer"}} title="Nhấp để xem tất cả">
            <div className="kpi-header">
              <span className="kpi-title">Tổng hồ sơ</span>
              <div className="kpi-icon-badge">📁</div>
            </div>
            <div className="kpi-body">
              <span className="kpi-number" id="kpiTotal">{props.data.stats.total}</span>
              <span className="kpi-pill">Tất cả đăng ký</span>
            </div>
            <div className="kpi-footer">
              <span className="kpi-cta-link">Xem tất cả →</span>
            </div>
          </div>


          <div className="kpi-card kpi-amber" id="cardKpiPending" style={{"cursor": "pointer"}} title="Nhấp để lọc hồ sơ Chờ xét duyệt">
            <div className="kpi-header">
              <span className="kpi-title">Chờ xét duyệt</span>
              <div className="kpi-icon-badge">⏳</div>
            </div>
            <div className="kpi-body">
              <span className="kpi-number" id="kpiPending">{props.data.stats.pending}</span>
              <span className="kpi-pill">Cần thẩm định</span>
            </div>
            <div className="kpi-footer">
              <span className="kpi-cta-link">Lọc Chờ duyệt →</span>
            </div>
          </div>


          <div className="kpi-card kpi-purple" id="cardKpiNeedsChanges" style={{"cursor": "pointer"}} title="Nhấp để lọc hồ sơ Cần bổ sung">
            <div className="kpi-header">
              <span className="kpi-title">Cần bổ sung</span>
              <div className="kpi-icon-badge">📝</div>
            </div>
            <div className="kpi-body">
              <span className="kpi-number" id="kpiNeedsChanges">{props.data.stats.needsChanges}</span>
              <span className="kpi-pill">Chờ người dùng gửi</span>
            </div>
            <div className="kpi-footer">
              <span className="kpi-cta-link">Lọc Cần bổ sung →</span>
            </div>
          </div>


          <div className="kpi-card kpi-teal" id="cardKpiProcessed" style={{"cursor": "pointer"}} title="Nhấp để lọc hồ sơ Đã xử lý">
            <div className="kpi-header">
              <span className="kpi-title">Đã xử lý</span>
              <div className="kpi-icon-badge">✅</div>
            </div>
            <div className="kpi-body">
              <span className="kpi-number" id="kpiProcessed">{props.data.stats.approved + props.data.stats.rejected}</span>
              <span className="kpi-pill">Duyệt &amp; Từ chối</span>
            </div>
            <div className="kpi-footer">
              <span className="kpi-cta-link">Lọc Đã xử lý →</span>
            </div>
          </div>
        </section>


        <section className="dashboard-section-card" id="tableCard">


          <div className="verif-toolbar" role="search" aria-label="Bộ lọc hồ sơ đăng ký">

            <div className="verif-search-box">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="searchHostReg" className="verif-search-input" placeholder="Tìm theo tên người nộp, số điện thoại, email hoặc mã HREG-..." autoComplete="off" value={props.filters.search}/>
              <button type="button" id="btnClearSearch" className="btn-clear-search" title="Xóa tìm kiếm" style={{display:props.filters.search ? "block" : "none"}}>✕</button>
            </div>


            <div className="filter-field-wrap">
              <label htmlFor="selectStatusFilter" className="filter-field-label">Trạng thái:</label>
              <select id="selectStatusFilter" className="verif-select" value={props.filters.status}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING_REVIEW">Chờ xét duyệt (Pending)</option>
                <option value="NEEDS_CHANGES">Cần bổ sung (Needs Changes)</option>
                <option value="PROCESSED">Đã xử lý (Duyệt &amp; Từ chối)</option><option value="APPROVED">Đã phê duyệt (Approved)</option>
                <option value="REJECTED">Đã từ chối (Rejected)</option>
              </select>
            </div>


            <div className="filter-field-wrap">
              <label htmlFor="selectSortFilter" className="filter-field-label">Sắp xếp:</label>
              <select id="selectSortFilter" className="verif-select" value={props.filters.sort}>
                <option value="NEWEST">Gửi gần nhất (Mới nhất trước)</option>
                <option value="OLDEST">Ưu tiên xử lý (Cũ nhất trước)</option>
                <option value="UPDATED">Cập nhật gần nhất</option>
                <option value="NAME_ASC">Tên người nộp (A - Z)</option>
              </select>
            </div>


            <button type="button" id="btnResetFilter" className="btn-reset-filters" title="Xóa các bộ lọc về mặc định">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>Đặt lại</span>
            </button>


            <div className="verif-results-count" id="resultCountText">{'Hiển thị: ' + props.data.totalElements + ' hồ sơ'}</div>
          </div>


          <div id="activeFilterDisplay" className="active-filter-bar" style={{"display": "none"}}></div>


          <div className="table-responsive" style={{"marginTop": "16px"}}>
            <table className="staff-table host-reg-table" id="registrationsTable" aria-label="Bảng danh sách hồ sơ đăng ký làm chủ trọ">
              <thead><tr><th>Mã &amp; Người đăng ký</th><th>Liên hệ</th><th>Khu vực &amp; Quy mô</th><th>Ngày gửi</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead>
              <tbody id="registrationsTableBody">{props.rows}</tbody>
            </table>
          </div>


          <div id="mobileCardsContainer" className="host-reg-mobile-cards">{props.cards}</div>


          <div id="emptyStateBox" className="empty-queue-box" style={{display:props.data.totalElements === 0 ? "block" : "none"}}>
            <div className="empty-queue-icon">🔍</div>
            <h4 className="empty-queue-title" id="emptyStateTitle">Không tìm thấy hồ sơ đăng ký nào</h4>
            <p id="emptyStateDesc" style={{"color": "var(--staff-text-muted)", "fontSize": "13.5px", "margin": "0 0 16px"}}>
              Không có hồ sơ nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
            </p>
            <button type="button" className="btn-queue-action" id="btnEmptyReset" style={{"margin": "0 auto"}}>
              Xóa bộ lọc &amp; Tải lại tất cả
            </button>
          </div>


          <div className="verif-pagination" id="paginationWrapper" style={{"display": "flex"}}>
            <div className="pagination-info" id="paginationInfo">{props.paginationInfo}</div>
            <div className="pagination-controls" id="paginationButtons">{props.pagination}</div>
          </div>

        </section>

      </main></div>;}
