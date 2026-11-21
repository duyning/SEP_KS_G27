import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Droplets,
  Eye,
  Plus,
  User,
} from 'lucide-react';
import {
  candidateNeedsBilling,
  candidateNeedsSupplementalUtilities,
  describeCycle,
  vndValue,
} from '../../services/room-billing.js';
import { roomUtilitiesPath } from '../../services/room-utilities.js';
import { formatFloorHeading } from '../../services/host-management.js';
import { money } from '../../services/room-types.js';
import { leaseDateLabel } from '../../services/rooms.js';

const amountText = value => money(vndValue(value));

export default function BillingPendingList({
  candidates,
  bills,
  propertyId,
  month,
  showBilled,
  onToggleShowBilled,
  onSchedule,
  onDraft,
  onOpenBill,
}) {
  const pendingList = candidates.filter(candidateNeedsBilling);
  const alreadyBilledCount = candidates.length - pendingList.length;
  const visible = showBilled ? candidates : pendingList;

  return (
    <div className="hb-pending-wrap">
      {alreadyBilledCount > 0 && (
        <div className="hb-pending-toolbar">
          <span className="hb-pending-note">
            Đang hiển thị <strong>{pendingList.length}</strong> đợt thuê cần lập phiếu
            {alreadyBilledCount > 0 ? ` (${alreadyBilledCount} đợt thuê đã có phiếu chính trong kỳ này)` : ''}.
          </span>
          <label className="hb-inline-check">
            <input
              type="checkbox"
              checked={showBilled}
              onChange={event => onToggleShowBilled(event.target.checked)}
            />
            <span>Hiện cả đợt thuê đã lập phiếu ({alreadyBilledCount})</span>
          </label>
        </div>
      )}

      {!visible.length ? (
        <div className="hb-empty-card" role="status">
          <div className="hb-empty-icon is-ok" aria-hidden="true">
            <CheckCircle2 size={24} />
          </div>
          <h3>
            {candidates.length > 0
              ? 'Tất cả đợt thuê trong kỳ đã được lập phiếu'
              : 'Kỳ này chưa có đợt thuê nào cần lập phiếu'}
          </h3>
          <p>
            {candidates.length > 0
              ? 'Mọi phòng có đợt thuê hợp lệ trong kỳ đã có phiếu thu tương ứng. Bật tùy chọn phía trên nếu bạn muốn kiểm tra lại lịch thu.'
              : 'Chỉ các phòng có hồ sơ đợt thuê hoạt động trong kỳ thu này mới hiển thị tại đây.'}
          </p>
        </div>
      ) : (
        <div className="hb-pending-grid">
          {visible.map(candidate => {
            const main = bills.find(bill => bill.id === candidate.mainBillId);
            const supplemental = bills.find(bill => bill.id === candidate.utilityBillId);
            const needsSupplemental = candidateNeedsSupplementalUtilities(candidate);
            const utilityTotal = candidate.utilities
              ? vndValue(candidate.utilities.electricityAmount) + vndValue(candidate.utilities.waterAmount)
              : 0n;

            return (
              <article
                className={`hb-pending-card ${candidate.issue ? 'is-issue' : needsSupplemental ? 'is-supplemental' : ''}`}
                key={candidate.tenancyKey}
                data-tenancy-key={candidate.tenancyKey}
              >
                <header className="hb-pending-head">
                  <div>
                    <div className="hb-pending-room">
                      <h3>Phòng {candidate.roomNumber}</h3>
                      {candidate.floor && (
                        <span className="hb-floor-tag">{formatFloorHeading(candidate.floor)}</span>
                      )}
                      {candidate.ended && <span className="hb-ended-tag">Đã trả phòng</span>}
                    </div>
                    <div className="hb-pending-tenant">
                      <User size={13} aria-hidden="true" />
                      <strong>{candidate.tenantName}</strong>
                      <span aria-hidden="true">·</span>
                      <small>Từ {leaseDateLabel(candidate.startDate)}</small>
                    </div>
                  </div>
                  <span className={`hb-schedule-pill ${candidate.schedule ? 'is-set' : 'is-unset'}`}>
                    {candidate.schedule ? describeCycle(candidate.schedule.cycleMonths) : 'Chưa đặt lịch thu'}
                  </span>
                </header>

                {candidate.issue ? (
                  <div className="hb-pending-issue" role="alert">
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>{candidate.issue}</span>
                  </div>
                ) : (
                  <dl className="hb-pending-meta">
                    <div>
                      <dt>Tiền phòng kỳ này</dt>
                      <dd className="hb-num-strong">
                        {candidate.rent
                          ? amountText(candidate.rent.amount)
                          : candidate.schedule
                            ? 'Không thu kỳ này'
                            : 'Chưa xác định'}
                      </dd>
                    </div>
                    <div>
                      <dt>Chu kỳ &amp; ngày thu</dt>
                      <dd>
                        {candidate.schedule
                          ? `${describeCycle(candidate.schedule.cycleMonths)} · Ngày ${candidate.schedule.dueDay}`
                          : 'Cần thiết lập chu kỳ'}
                      </dd>
                    </div>
                    <div>
                      <dt>Điện nước</dt>
                      <dd>
                        {candidate.utilities ? (
                          <span className="hb-util-tag is-ready">
                            Đã chốt · {money(utilityTotal)}
                          </span>
                        ) : candidate.hasPartialUtilityReading ? (
                          <span className="hb-util-tag is-partial">
                            Mới tạm ghi (chưa cộng vào phiếu)
                          </span>
                        ) : (
                          <span className="hb-util-tag is-missing">
                            Chưa chốt chỉ số
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                )}

                <footer className="hb-pending-actions">
                  {!candidate.issue && !candidate.utilities && (
                    <Link
                      className="hm-btn hb-util-link"
                      to={roomUtilitiesPath(propertyId, candidate.roomId, month)}
                    >
                      <Droplets size={14} aria-hidden="true" />
                      <span>Xem điện nước</span>
                    </Link>
                  )}

                  {!candidate.issue && !candidate.scheduleLocked && (
                    <button
                      type="button"
                      className="hm-btn"
                      onClick={() => onSchedule(candidate)}
                    >
                      <CalendarClock size={14} aria-hidden="true" />
                      <span>Chu kỳ thu</span>
                    </button>
                  )}

                  {main ? (
                    <button type="button" className="hm-btn" onClick={() => onOpenBill(main)}>
                      <Eye size={14} aria-hidden="true" />
                      <span>{main.status === 'DRAFT' ? 'Kiểm tra bản nháp' : 'Xem phiếu chính'}</span>
                    </button>
                  ) : (
                    !candidate.issue && (
                      <button
                        type="button"
                        className="hm-btn hm-btn-primary"
                        onClick={() => onDraft(candidate, 'MAIN')}
                      >
                        <Plus size={15} aria-hidden="true" />
                        <span>Lập phiếu</span>
                      </button>
                    )
                  )}

                  {supplemental ? (
                    <button type="button" className="hm-btn" onClick={() => onOpenBill(supplemental)}>
                      <Eye size={14} aria-hidden="true" />
                      <span>Xem phiếu điện nước</span>
                    </button>
                  ) : (
                    needsSupplemental && (
                      <button
                        type="button"
                        className="hm-btn hm-btn-primary"
                        onClick={() => onDraft(candidate, 'UTILITIES')}
                      >
                        <Plus size={15} aria-hidden="true" />
                        <span>Lập phiếu điện nước</span>
                      </button>
                    )
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
