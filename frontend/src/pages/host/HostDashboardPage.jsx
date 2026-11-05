import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, FileText, Home, Layers, Plus, RefreshCw, MessagesSquare } from 'lucide-react';
import { hostApi } from '../../services/host.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { StateView, StatusBadge } from '../../components/PortalUI.jsx';
import HostHeaderSlot from '../../components/HostHeaderSlot.jsx';
import HostEmptyState from '../../components/HostEmptyState.jsx';
import '../../styles/host-dashboard.css';
import '../../styles/host-dashboard-mobile.css';

const bookingLabels = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
const money = value => value == null ? 'Chưa có giá niêm yết' : `${new Intl.NumberFormat('vi-VN').format(value)} đ / tháng`;

export function HostOnboarding({canRegister=false,checking=false,error='',pendingCount=0}) {
 const pending=pendingCount>0;
 const action=pending?{to:'/host/property',label:'Theo dõi hồ sơ'}:canRegister?{to:'/host/property/new',label:'Đăng ký nhà trọ'}:!checking&&!error?{to:'/host/property',label:'Xem hồ sơ nhà trọ'}:null;
 return <HostEmptyState id="newHostOnboardingState" title={pending?'Hồ sơ nhà trọ chưa được phê duyệt':'Bạn chưa có nhà trọ nào'}
  description={pending?`Bạn có ${pendingCount} hồ sơ chưa hoàn tất xét duyệt. Theo dõi phản hồi để bổ sung thông tin khi được yêu cầu.`:'Đăng ký nhà trọ để bắt đầu quản lý phòng, giá thuê và lịch xem phòng.'}
  action={action} pending={pending}>
  {checking&&<div className="host-empty-message" role="status">Đang kiểm tra quyền đăng ký…</div>}
  {error&&<div className="host-empty-error" role="alert">Chưa kiểm tra được quyền đăng ký. {error} Vui lòng làm mới để thử lại.</div>}
 </HostEmptyState>;
}

export function HostDashboardContent({ data, onRefresh, loading }) {
  const { user } = useAuth();
  const [canRegister,setCanRegister] = useState(false);
  const [eligibility,setEligibility] = useState({loading:true,error:''});
  useEffect(() => {
    const controller = new AbortController();
    setCanRegister(false);
    setEligibility({loading:true,error:''});
    hostApi.registrationEligibility(controller.signal).then(policy=>{if(!controller.signal.aborted){setCanRegister(policy.canRegister);setEligibility({loading:false,error:''});}}).catch(error=>{if(!controller.signal.aborted)setEligibility({loading:false,error:error.message});});
    return ()=>controller.abort();
  },[user?.userId,data]);
  const properties = data?.properties || [];
  const roomTypeCount = data?.roomTypeCount ?? 0;
  const pendingViewingCount = data?.pendingViewingCount ?? 0;
  const pendingRegistrationCount = data?.pendingRegistrationCount ?? 0;
  const recentViewings = data?.recentViewings || [];
  const totalRoomCount = data?.totalRoomCount ?? 0;
  const availableRoomCount = data?.availableRoomCount ?? 0;
  const occupancyRate = data?.occupancyRate ?? '0%';
  const activeListingCount = data?.activeListingCount ?? properties.filter(p => p.status === 'ACTIVE').length;
  const hasProperty = properties.length > 0;

  if(!hasProperty) return <div className="dashboard-data-container hd-start-page">
    <HostOnboarding canRegister={canRegister} checking={eligibility.loading} error={eligibility.error} pendingCount={pendingRegistrationCount}/>
  </div>;

  return (
    <div className="dashboard-data-container">
      {/* 2. 4 Primary KPI Cards */}
      <section className="kpi-cards-grid" aria-label="Chỉ số hiệu quả chính">
        <Link to="/host/property" className="kpi-card" id="kpiCardProperties" title="Bấm để xem danh sách nhà trọ">
          <div className="kpi-card-top">
            <span className="kpi-label">Nhà trọ</span>
            <div className="kpi-icon-wrap teal">
              <Home size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number" id="kpiPropertyCount">{properties.length}</span>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-sub" id="kpiPropertySub">
              {properties.length === 0 ? 'Chưa đăng ký' : 'Đang quản lý'}
            </span>
            <span className="kpi-arrow">→</span>
          </div>
        </Link>

        <Link to="/host/rooms" className="kpi-card" id="kpiCardRooms" title="Bấm để xem tình trạng phòng">
          <div className="kpi-card-top">
            <span className="kpi-label">Phòng còn trống</span>
            <div className="kpi-icon-wrap emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-emerald" id="kpiAvailableRoomCount">{availableRoomCount}</span>
            <span className="kpi-derived-tag" id="kpiDerivedTag">AVAILABLE</span>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-sub" id="kpiTotalRoomsSub">/ {totalRoomCount} tổng phòng</span>
            <span className="kpi-arrow">→</span>
          </div>
        </Link>

        <Link to="/host/viewings" className="kpi-card" id="kpiCardViewing" title="Bấm để xem lịch hẹn chờ xác nhận">
          <div className="kpi-card-top">
            <span className="kpi-label">Chờ xác nhận</span>
            <div className="kpi-icon-wrap amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-amber" id="kpiPendingViewingCount">{pendingViewingCount}</span>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-sub">Lịch xem phòng</span>
            <span className="kpi-arrow">→</span>
          </div>
        </Link>

        <Link to="/host/property" className="kpi-card" id="kpiCardPendingListing" title="Bấm để xem nhà trọ đang chờ duyệt">
          <div className="kpi-card-top">
            <span className="kpi-label">Chờ duyệt</span>
            <div className="kpi-icon-wrap blue">
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-blue" id="kpiPendingListingCount">{pendingRegistrationCount}</span>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-sub">Hồ sơ nhà trọ</span>
            <span className="kpi-arrow">→</span>
          </div>
        </Link>
      </section>

      {/* 3. Secondary Metrics Summary Strip */}
      <section className="secondary-metrics-strip" aria-label="Tóm tắt bổ sung">
        <div className="sec-metric-item">
          <span className="sec-label">Tổng loại phòng:</span>
          <strong className="sec-val" id="secRoomTypeCount">{roomTypeCount}</strong>
        </div>
        <span className="sec-divider">|</span>
        <div className="sec-metric-item">
          <span className="sec-label">Tổng phòng thực tế:</span>
          <strong className="sec-val" id="secTotalRoomCount">{totalRoomCount}</strong>
        </div>
        <span className="sec-divider">|</span>
        <div className="sec-metric-item">
          <span className="sec-label">Tỷ lệ lấp đầy:</span>
          <strong className="sec-val text-primary" id="secOccupancyRate">{occupancyRate}</strong>
        </div>
        <span className="sec-divider">|</span>
        <div className="sec-metric-item">
          <span className="sec-label">Tin đang hiển thị:</span>
          <strong className="sec-val text-emerald" id="secActiveListingCount">{activeListingCount}</strong>
        </div>
      </section>

      {/* 4. Quick Actions */}
      <section className="quick-actions-bar" aria-label="Thao tác nhanh">
        <span className="quick-actions-label">THAO TÁC NHANH:</span>
        <div className="quick-actions-list">
          {canRegister && <Link to="/host/property/new" className="btn-quick-action" id="btnQuickAddProperty">
            <Plus size={15} strokeWidth={2.5} />
            <span id="quickAddPropertyText">Đăng ký nhà trọ</span>
          </Link>}
          <Link to="/host/rooms" className="btn-quick-action" id="btnQuickManageRooms">
            <Layers size={15} />
            <span>Quản lý phòng</span>
          </Link>
          <Link to="/host/rooms" className="btn-quick-action" id="btnQuickToggleAvailable">
            <CheckCircle2 size={15} />
            <span>Cập nhật phòng trống</span>
          </Link>
          <Link to="/host/viewings" className="btn-quick-action" id="btnQuickViewRequests">
            <Calendar size={15} />
            <span>Xem lịch hẹn</span>
          </Link>
        </div>
      </section>

      {/* 5. Main Content Area */}
      {hasProperty && (
        <div className="dashboard-split-grid">
          <div className="split-col-left">
            <section className="dashboard-section card-box" id="section-viewing-requests">
              <div className="section-header-box">
                <div>
                  <h3 className="section-box-title">Yêu cầu xem phòng gần đây</h3>
                  <p className="section-box-sub">Các yêu cầu xem phòng mới nhất từ người thuê.</p>
                </div>
                <Link to="/host/viewings" className="btn-link-action" id="btnViewAllBookings">
                  Xem tất cả ({recentViewings.length}) →
                </Link>
              </div>

              {recentViewings.length === 0 ? (
                <div className="empty-feed-card">
                  <div className="empty-feed-icon">
                    <Calendar size={36} strokeWidth={1.8} color="#94a3b8" />
                  </div>
                  <h4 className="empty-feed-title">Chưa có yêu cầu xem phòng</h4>
                  <p className="empty-feed-desc">Các yêu cầu xem phòng từ sinh viên và người thuê sẽ xuất hiện tại đây khi họ đặt lịch hẹn qua HL_RCS.</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="host-data-table" id="viewingRequestsTable" aria-label="Bảng yêu cầu xem phòng">
                    <thead>
                      <tr>
                        <th scope="col">NGƯỜI YÊU CẦU</th>
                        <th scope="col">THỜI GIAN XEM</th>
                        <th scope="col">TRẠNG THÁI</th>
                        <th scope="col" style={{ textAlign: 'right' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody id="viewingRequestsTableBody">
                      {recentViewings.map(v => (
                        <tr key={v.bookingId}>
                          <td data-label="Người yêu cầu">
                            <div style={{ fontWeight: 600 }}>{v.renterName}</div>
                            <small style={{ color: '#64748b' }}>{v.propertyName} · {v.roomType}</small>
                          </td>
                          <td data-label="Thời gian xem">{new Date(v.scheduledDate).toLocaleString('vi-VN')}</td>
                          <td data-label="Trạng thái"><StatusBadge>{bookingLabels[v.status] || v.status}</StatusBadge></td>
                          <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                            <Link to="/host/viewings" className="btn-link-action">Chi tiết</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dashboard-section card-box" id="section-my-properties">
              <div className="section-header-box">
                <div>
                  <h3 className="section-box-title">Nhà trọ của tôi</h3>
                  <p className="section-box-sub">Các cơ sở lưu trú thuộc quyền quản lý trực tiếp của bạn.</p>
                </div>
                <Link to="/host/property" className="btn-link-action">Quản lý nhà trọ →</Link>
              </div>
              <div className="my-properties-list" id="myPropertiesList">
                {properties.map(property => (
                  <div className="my-prop-row" key={property.propertyId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="my-prop-info">
                      <div className="my-prop-name" style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{property.name}</div>
                      <div className="my-prop-address" style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{property.address || 'Chưa cập nhật địa chỉ'}</div>
                      <div className="my-prop-config" style={{ fontSize: '12px', color: '#0d9488', marginTop: '4px' }}>{property.roomTypeCount} loại phòng · Giá từ: {money(property.minimumPrice)}</div>
                    </div>
                    <div className="my-prop-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <StatusBadge>{property.status === 'ACTIVE' ? 'Đang hoạt động' : property.status || 'Chưa cập nhật trạng thái'}</StatusBadge>
                      <Link to={`/host/property?id=${property.propertyId}`} className="btn-quick-action">Chi tiết</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="split-col-right">
            <section className="dashboard-section card-box" id="section-room-overview">
              <div className="section-header-box">
                <div>
                  <h3 className="section-box-title">Tình trạng phòng</h3>
                  <p className="section-box-sub">Tổng quan tình trạng phòng và tỷ lệ lấp đầy.</p>
                </div>
              </div>
              <div className="dash-room-summary-card" id="dashRoomSummaryCard">
                <div className="dash-summary-stats-grid">
                  <div className="dash-summary-stat-item">
                    <span className="dash-summary-stat-label">Tổng số phòng</span>
                    <strong className="dash-summary-stat-val" id="chipTotalCount">{totalRoomCount}</strong>
                  </div>
                  <div className="dash-summary-stat-item avail">
                    <span className="dash-summary-stat-label">Còn trống</span>
                    <strong className="dash-summary-stat-val" id="chipAvailableCount">{availableRoomCount}</strong>
                  </div>
                  <div className="dash-summary-stat-item">
                    <span className="dash-summary-stat-label">Đã có người thuê</span>
                    <strong className="dash-summary-stat-val" id="chipOccupiedCount">{Math.max(0, totalRoomCount - availableRoomCount)}</strong>
                  </div>
                  <div className="dash-summary-stat-item stale">
                    <span className="dash-summary-stat-label">Chờ xác nhận</span>
                    <strong className="dash-summary-stat-val" id="chipStaleCount">{pendingViewingCount}</strong>
                  </div>
                </div>
                <div className="dash-occ-summary-box">
                  <div className="dash-occ-summary-head">
                    <span>Tỷ lệ lấp đầy</span>
                    <strong className="text-primary" id="dashOccupancyRate">{occupancyRate}</strong>
                  </div>
                  <div className="dash-occ-summary-bar" id="dashOccupancyBar">
                    <div className="dash-occ-summary-fill" id="dashOccupancyFill" style={{ width: occupancyRate }} />
                  </div>
                </div>
                <Link to="/host/rooms" className="btn-dash-rooms-cta" id="btnGoToRoomsList">
                  Xem danh sách phòng →
                </Link>
              </div>
            </section>

            <section className="dashboard-section card-box staff-assistance-card">
              <div className="staff-card-header">
                <div className="staff-icon-wrap">
                  <MessagesSquare size={22} />
                </div>
                <div>
                  <h4 className="staff-card-title">Cần hỗ trợ vận hành?</h4>
                  <p className="staff-card-sub">Đội ngũ hỗ trợ HL_RCS sẵn sàng đồng hành cùng bạn.</p>
                </div>
              </div>
              <p className="staff-card-desc">
                Bạn có thể gửi yêu cầu Staff hỗ trợ kiểm định phòng, cập nhật thông tin biểu phí điện nước hoặc tư vấn tối ưu tỷ lệ lấp đầy.
              </p>
              <Link to="/host/support" className="btn-staff-request" id="btnOpenStaffModal">
                Yêu cầu hỗ trợ
              </Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HostDashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    hostApi.dashboard(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [user?.userId, revision]);

  const handleRefresh = () => setRevision(v => v + 1);
  const header=<HostHeaderSlot><MotionButton type="button" className="hd-context-refresh" onClick={handleRefresh} disabled={state.loading} aria-label="Làm mới dữ liệu"><RefreshCw size={16}/><span>Làm mới</span></MotionButton></HostHeaderSlot>;

  if (state.loading) {
    return (
      <div className="host-dashboard-page">{header}
        <StateView kind="loading" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="host-dashboard-page">{header}
        <StateView kind="error" message={state.error}>
          <MotionButton className="p-button primary" onClick={handleRefresh}>
            Thử lại
          </MotionButton>
        </StateView>
      </div>
    );
  }

  return (
    <div className="host-dashboard-page">{header}
      <HostDashboardContent data={state.data} onRefresh={handleRefresh} loading={state.loading} />
    </div>
  );
}
