import { useState, useSyncExternalStore } from 'react';
import { Modal } from '../../components/PortalUI.jsx';
import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import {
  CheckCheck,
  Clock3,
  Files,
  FilePenLine,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { formatProcessedBreakdown, isKpiStatusActive } from './StaffHostShell.jsx';

const subscribe = listener => {
  const media = window.matchMedia('(max-width:640px)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};

export function StaffHostListSkeleton() {
  return (
    <div
      className="portal-state loading sha-skeleton-wrap"
      role="status"
      aria-live="polite"
      aria-label="Đang tải danh sách hồ sơ đăng ký chủ trọ"
    >
      <div className="sha-metrics">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="sha-skel-kpi" />
        ))}
      </div>
      <div className="sha-panel">
        <div className="sha-skel-toolbar" />
        <div className="sha-skel-rows">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="sha-skel-row" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StaffHostListTemplate(props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width:640px)').matches,
    () => false
  );

  const filterFields = (
    <>
      <label className="sha-select">
        <span className="sha-filter-label">Trạng thái</span>
        <select id="selectStatusFilter" value={props.filters.status}>
          {[
            ['ALL', 'Tất cả trạng thái'],
            ['PENDING_REVIEW', 'Chờ xét duyệt'],
            ['NEEDS_CHANGES', 'Cần bổ sung'],
            ['PROCESSED', 'Đã xử lý'],
            ['APPROVED', 'Đã phê duyệt'],
            ['REJECTED', 'Đã từ chối'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="sha-select">
        <span className="sha-filter-label">Sắp xếp</span>
        <select id="selectSortFilter" value={props.filters.sort}>
          <option value="NEWEST">Gửi gần nhất</option>
          <option value="OLDEST">Gửi lâu nhất (Chờ xử lý lâu nhất)</option>
          <option value="UPDATED">Cập nhật gần nhất</option>
          <option value="NAME_ASC">Tên A–Z</option>
        </select>
      </label>
    </>
  );

  const { stats } = props.data;
  const metrics = [
    ['cardKpiAll', 'kpiTotal', 'Tổng hồ sơ', stats.total, Files, 'ALL', 'Tất cả hồ sơ đã tiếp nhận'],
    [
      'cardKpiPending',
      'kpiPending',
      'Chờ xét duyệt',
      stats.pending,
      Clock3,
      'PENDING_REVIEW',
      'Hồ sơ cần kiểm tra & thẩm định',
    ],
    [
      'cardKpiNeedsChanges',
      'kpiNeedsChanges',
      'Cần bổ sung',
      stats.needsChanges,
      FilePenLine,
      'NEEDS_CHANGES',
      'Chờ người đăng ký cập nhật',
    ],
    [
      'cardKpiProcessed',
      'kpiProcessed',
      'Đã xử lý',
      stats.approved + stats.rejected,
      CheckCheck,
      'PROCESSED',
      formatProcessedBreakdown(stats),
    ],
  ];

  return (
    <div className="sha-page" onClick={props.onClick} onChange={props.onChange}>
      <section className="sha-metrics" aria-label="Thống kê hồ sơ">
        {metrics.map(([id, number, label, value, Icon, status, subtitle]) => {
          const active = isKpiStatusActive(props.filters.status, status);
          return (
            <MotionButton
              type="button"
              key={id}
              id={id}
              className={`sha-metric ${status.toLowerCase()} ${active ? 'is-active' : ''}`}
              aria-pressed={active}
            >
              <span className="sha-metric-label">{label}</span>
              <span className="sha-metric-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <strong id={number}>{value}</strong>
              <small className="sha-metric-sub">{subtitle}</small>
            </MotionButton>
          );
        })}
      </section>

      <section
        className={`sha-panel ${props.loading ? 'is-fetching' : ''}`}
        aria-label="Danh sách hồ sơ đăng ký"
      >
        <div className="sha-filters" role="search" aria-label="Bộ lọc hồ sơ đăng ký">
          <label className="sha-search">
            {props.loading ? (
              <LoaderCircle size={17} className="spin" aria-hidden="true" />
            ) : (
              <Search size={17} aria-hidden="true" />
            )}
            <span className="sha-sr-only">Tìm hồ sơ</span>
            <input
              id="searchHostReg"
              type="search"
              placeholder="Tên, số điện thoại, email hoặc mã hồ sơ (HREG-...)..."
              autoComplete="off"
              value={props.filters.search}
              onKeyDown={props.onSearchKeyDown}
            />
            {props.filters.search && (
              <MotionButton
                type="button"
                id="btnClearSearch"
                aria-label="Xóa tìm kiếm"
                title="Xóa từ khóa tìm kiếm"
              >
                <X size={15} />
              </MotionButton>
            )}
          </label>
          {mobile ? (
            <MotionButton
              type="button"
              className={`sha-button sha-filter-trigger ${props.filters.status !== 'ALL' ? 'is-filtered' : ''}`}
              aria-expanded={filterOpen}
              aria-label="Bộ lọc"
              onClick={() => setFilterOpen(true)}
            >
              <Filter size={16} />
              <span>Bộ lọc</span>
            </MotionButton>
          ) : (
            filterFields
          )}
          <MotionButton
            type="button"
            id="btnResetFilter"
            className="sha-button"
            title="Đặt lại tìm kiếm, trạng thái và sắp xếp về mặc định"
          >
            <RotateCcw size={15} />
            <span>Đặt lại</span>
          </MotionButton>
        </div>

        <span className="sha-sr-only" id="resultCountText" role="status">
          {props.loading ? 'Đang cập nhật danh sách…' : `${props.data.totalElements} hồ sơ`}
        </span>

        <div className="sha-table-wrap">
          <table
            className="sha-table"
            id="registrationsTable"
            aria-label="Bảng danh sách hồ sơ đăng ký làm chủ trọ"
          >
            <thead>
              <tr>
                {[
                  'Người đăng ký',
                  'Liên hệ',
                  'Thông tin đăng ký',
                  'Ngày gửi',
                  'Trạng thái',
                  'Thao tác',
                ].map(label => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="registrationsTableBody">{props.rows}</tbody>
          </table>
        </div>

        <div id="mobileCardsContainer" className="sha-mobile-cards">
          {props.cards}
        </div>

        {!props.data.totalElements && (
          <div className="sha-empty">
            <Search size={28} aria-hidden="true" />
            <h3>
              {props.data.stats.total === 0
                ? 'Chưa có hồ sơ đăng ký'
                : props.filters.status === 'PENDING_REVIEW' && !props.filters.search
                ? 'Đã xử lý hết hồ sơ chờ duyệt'
                : 'Không tìm thấy hồ sơ phù hợp'}
            </h3>
            <p>
              {props.data.stats.total === 0
                ? 'Hồ sơ mới sẽ xuất hiện tại đây khi người dùng gửi đăng ký.'
                : 'Thử thay đổi từ khóa hoặc trạng thái để xem các hồ sơ khác.'}
            </p>
            {(props.filters.search ||
              props.filters.status !== 'ALL' ||
              props.filters.sort !== 'NEWEST') && (
              <MotionButton type="button" id="btnEmptyReset" className="sha-button">
                Đặt lại bộ lọc
              </MotionButton>
            )}
          </div>
        )}

        <footer className="sha-pagination" aria-label="Phân trang danh sách hồ sơ">
          <span id="paginationInfo">{props.paginationInfo}</span>
          <div id="paginationButtons">{props.pagination}</div>
        </footer>
      </section>

      {mobile && (
        <AnimatePresence>
          {filterOpen && (
            <Modal
              title="Bộ lọc hồ sơ"
              className="sha-filter-modal"
              onClose={() => setFilterOpen(false)}
            >
              <div className="sha-filter-sheet">
                {filterFields}
                <MotionButton
                  type="button"
                  className="sha-button primary"
                  onClick={() => setFilterOpen(false)}
                >
                  Xem kết quả
                </MotionButton>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
