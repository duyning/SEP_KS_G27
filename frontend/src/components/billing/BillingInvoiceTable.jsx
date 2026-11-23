import { ChevronLeft, ChevronRight, Eye, FileText, Plus } from 'lucide-react';
import BillingStatusBadge from './BillingStatusBadge.jsx';
import {
  billPaidPercent,
  formatBillCode,
  formatBillingMonth,
  vndValue,
} from '../../services/room-billing.js';
import { formatFloorHeading } from '../../services/host-management.js';
import { money } from '../../services/room-types.js';
import { leaseDateLabel } from '../../services/rooms.js';

const amountText = value => money(vndValue(value));

export default function BillingInvoiceTable({
  bills,
  floorByRoom,
  page,
  pageSize,
  totalItems,
  hasActiveFilters,
  onPageChange,
  onOpenDetail,
  onSwitchToPending,
  onClearFilters,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  if (!bills.length) {
    return (
      <div className="hb-empty-card" role="status">
        <div className="hb-empty-icon" aria-hidden="true">
          <FileText size={24} />
        </div>
        <h3>
          {hasActiveFilters
            ? 'Không có phiếu thu phù hợp với bộ lọc'
            : 'Chưa có phiếu thu nào trong kỳ này'}
        </h3>
        <p>
          {hasActiveFilters
            ? 'Thử thay đổi phòng, trạng thái hoặc từ khóa tìm kiếm để xem các phiếu thu khác.'
            : 'Mở tab Đợt thuê cần lập phiếu để thiết lập chu kỳ và tạo phiếu thu từ hồ sơ đợt thuê.'}
        </p>
        <div className="hb-empty-actions">
          {hasActiveFilters ? (
            <button type="button" className="hm-btn" onClick={onClearFilters}>
              Đặt lại bộ lọc
            </button>
          ) : (
            <button type="button" className="hm-btn hm-btn-primary" onClick={onSwitchToPending}>
              <Plus size={15} aria-hidden="true" />
              <span>Xem đợt thuê cần lập phiếu</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hb-table-card">
      <div className="hb-table-wrap">
        <table className="hb-table">
          <thead>
            <tr>
              <th scope="col">Phòng / Người thuê</th>
              <th scope="col" className="is-num">Tổng phải thu</th>
              <th scope="col" className="is-num">Đã thu</th>
              <th scope="col" className="is-num">Còn thiếu</th>
              <th scope="col">Trạng thái</th>
              <th scope="col" className="is-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => {
              const isDraft = bill.status === 'DRAFT';
              const paidPct = billPaidPercent(bill);
              const outstandingVal = vndValue(bill.outstanding);
              const floor = floorByRoom?.get(bill.roomId);

              return (
                <tr key={bill.id} className={bill.overdue ? 'is-overdue-row' : ''}>
                  <td data-label="Phòng / Người thuê">
                    <div className="hb-cell-room">
                      <div className="hb-cell-room-head">
                        <strong>Phòng {bill.roomNumber}</strong>
                        {floor && <span className="hb-floor-tag">{formatFloorHeading(floor)}</span>}
                        <span className="hb-code-tag">{formatBillCode(bill.id)}</span>
                      </div>
                      <span className="hb-cell-tenant">{bill.tenantName}</span>
                      <div className="hb-cell-sub">
                        <span>{bill.kind === 'UTILITIES' ? 'Điện nước bổ sung' : 'Phiếu chính'}</span>
                        <span aria-hidden="true">·</span>
                        <span>Kỳ {formatBillingMonth(bill.month)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={bill.overdue ? 'is-danger-text' : ''}>
                          Hạn {leaseDateLabel(bill.dueDate)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td data-label="Tổng phải thu" className="is-num">
                    <span className="hb-num-strong">{amountText(bill.totalAmount)}</span>
                  </td>

                  <td data-label="Đã thu" className="is-num">
                    {isDraft ? (
                      <span className="hb-num-muted">—</span>
                    ) : (
                      <div className="hb-paid-cell">
                        <span className="hb-num-paid">{amountText(bill.paidAmount)}</span>
                        <div
                          className="hb-progress"
                          role="progressbar"
                          aria-label={`Đã thu ${paidPct}% phiếu ${formatBillCode(bill.id)}`}
                          aria-valuenow={paidPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span
                            className={`hb-progress-fill ${paidPct === 100 ? 'is-done' : ''}`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>

                  <td data-label="Còn thiếu" className="is-num">
                    {isDraft ? (
                      <span className="hb-num-muted">—</span>
                    ) : (
                      <span
                        className={`hb-num-debt ${
                          outstandingVal > 0n
                            ? bill.overdue
                              ? 'is-danger'
                              : 'is-warning'
                            : 'is-settled'
                        }`}
                      >
                        {amountText(bill.outstanding)}
                      </span>
                    )}
                  </td>

                  <td data-label="Trạng thái">
                    <BillingStatusBadge bill={bill} />
                  </td>

                  <td data-label="Thao tác" className="is-actions">
                    <button
                      type="button"
                      className="hm-btn hb-action-btn"
                      onClick={() => onOpenDetail(bill)}
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>{isDraft ? 'Kiểm tra nháp' : 'Xem chi tiết'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="hb-pagination" aria-label="Phân trang danh sách phiếu thu">
          <span>
            Hiển thị <strong>{(safePage - 1) * pageSize + 1}</strong>–
            <strong>{Math.min(safePage * pageSize, totalItems)}</strong> / {totalItems} phiếu
          </span>
          <div className="hb-pagination-actions">
            <button
              type="button"
              className="hm-btn"
              disabled={safePage <= 1}
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span>Trang trước</span>
            </button>
            <span className="hb-page-indicator">
              Trang {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="hm-btn"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            >
              <span>Trang sau</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
