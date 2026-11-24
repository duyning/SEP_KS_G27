import { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  LoaderCircle,
  Send,
  User,
} from 'lucide-react';
import HostDrawer from '../HostDrawer.jsx';
import { Modal } from '../PortalUI.jsx';
import { MotionButton } from '../motion/MotionUI.jsx';
import BillingStatusBadge from './BillingStatusBadge.jsx';
import BillingPaymentForm from './BillingPaymentForm.jsx';
import {
  billPaidPercent,
  formatBillingMonth,
  paymentMethods,
  vndValue,
} from '../../services/room-billing.js';
import { formatFloorHeading } from '../../services/host-management.js';
import { money } from '../../services/room-types.js';
import { leaseDateLabel } from '../../services/rooms.js';

const amountText = value => money(vndValue(value));

export default function BillingDetailDrawer({
  bill: initialBill,
  detail,
  floor,
  today,
  busy,
  error,
  onClose,
  onEditDraft,
  onIssue,
  onPayment,
}) {
  const bill = detail?.bill || initialBill;
  const [mode, setMode] = useState(''); // '' | 'pay' | 'issue'
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDraft = bill.status === 'DRAFT';
  const outstanding = vndValue(bill.outstanding);
  const paidPct = billPaidPercent(bill);

  const requestClose = () => {
    if (busy) return;
    if (mode === 'pay' && paymentDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const footer = (
    <div className="hm-drawer-footer-bar">
      <button type="button" className="hm-btn" disabled={busy} onClick={requestClose}>
        Đóng
      </button>

      {mode === '' && (
        <div className="hb-drawer-footer-right">
          {isDraft && onEditDraft && (
            <button type="button" className="hm-btn" disabled={busy} onClick={onEditDraft}>
              <Edit3 size={15} aria-hidden="true" />
              <span>Chỉnh bản nháp</span>
            </button>
          )}
          {isDraft && (
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              disabled={busy}
              onClick={() => setMode('issue')}
            >
              <Send size={15} aria-hidden="true" />
              <span>Phát hành phiếu</span>
            </MotionButton>
          )}
          {!isDraft && outstanding > 0n && (
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              disabled={busy}
              onClick={() => setMode('pay')}
            >
              <CreditCard size={15} aria-hidden="true" />
              <span>Ghi nhận thanh toán</span>
            </MotionButton>
          )}
        </div>
      )}

      {mode === 'issue' && (
        <div className="hb-drawer-footer-right">
          <button type="button" className="hm-btn" disabled={busy} onClick={() => setMode('')}>
            Quay lại
          </button>
          <MotionButton
            type="button"
            className="hm-btn hm-btn-primary"
            disabled={busy}
            onClick={() => onIssue(bill, () => setMode(''))}
          >
            {busy ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
            <span>{busy ? 'Đang phát hành…' : 'Xác nhận phát hành'}</span>
          </MotionButton>
        </div>
      )}
    </div>
  );

  return (
    <>
      <HostDrawer
        className="hb-drawer-detail"
        size="md"
        kicker={`${bill.kind === 'UTILITIES' ? 'Phiếu điện nước bổ sung' : 'Phiếu thu chính'} · Kỳ ${formatBillingMonth(bill.month)}`}
        title={isDraft ? 'Bản nháp' : 'Phiếu thu'}
        badge={<BillingStatusBadge bill={bill} />}
        subtitle={`Phòng ${bill.roomNumber}${floor ? ` · ${formatFloorHeading(floor)}` : ''} · ${bill.tenantName}`}
        onClose={requestClose}
        footer={footer}
      >
        <div className="hb-drawer-stack">
          {/* META STRIP */}
          <div className="hb-detail-meta">
            <div>
              <User size={14} aria-hidden="true" />
              <span>Người thuê: <strong>{bill.tenantName}</strong></span>
            </div>
            <div>
              <Calendar size={14} aria-hidden="true" />
              <span>
                Hạn thanh toán:{' '}
                <strong className={bill.overdue ? 'is-danger-text' : ''}>
                  {leaseDateLabel(bill.dueDate)}
                </strong>
              </span>
            </div>
          </div>

          {/* LINE ITEMS BREAKDOWN */}
          <section className="hb-detail-section" aria-label="Chi tiết khoản thu">
            <h3>Chi tiết khoản thu</h3>
            <dl className="hb-line-items">
              {vndValue(bill.rentAmount) > 0n && (
                <div>
                  <dt>
                    Tiền phòng
                    {bill.rentFrom && bill.rentThrough && (
                      <small>{leaseDateLabel(bill.rentFrom)} – {leaseDateLabel(bill.rentThrough)}</small>
                    )}
                  </dt>
                  <dd>{amountText(bill.rentAmount)}</dd>
                </div>
              )}

              {bill.includesUtilities && (
                <>
                  <div>
                    <dt>Tiền điện</dt>
                    <dd>{amountText(bill.electricityAmount)}</dd>
                  </div>
                  <div>
                    <dt>Tiền nước</dt>
                    <dd>{amountText(bill.waterAmount)}</dd>
                  </div>
                </>
              )}

              {(bill.charges || []).map((charge, idx) => (
                <div key={`${charge.label}-${idx}`}>
                  <dt>{charge.label}</dt>
                  <dd>{amountText(charge.amount)}</dd>
                </div>
              ))}
            </dl>

            <div className="hb-detail-totals">
              <div>
                <span>Tổng phải thu</span>
                <strong>{amountText(bill.totalAmount)}</strong>
              </div>
              {!isDraft && (
                <>
                  <div>
                    <span>Đã thu ({paidPct}%)</span>
                    <strong className="is-success">{amountText(bill.paidAmount)}</strong>
                  </div>
                  <div className={`hb-detail-outstanding ${outstanding > 0n ? 'has-debt' : 'is-done'}`}>
                    <span>Còn phải thu</span>
                    <strong>{amountText(bill.outstanding)}</strong>
                  </div>
                </>
              )}
            </div>

            {!isDraft && (
              <div className="hb-progress is-lg" aria-hidden="true">
                <span
                  className={`hb-progress-fill ${paidPct === 100 ? 'is-done' : ''}`}
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            )}
          </section>

          {/* ISSUE CONFIRMATION BANNER */}
          {mode === 'issue' && (
            <div className="hb-confirm-callout" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>Xác nhận phát hành phiếu thu?</strong>
                <p>
                  Sau khi phát hành, tổng tiền {amountText(bill.totalAmount)} và hạn thanh toán{' '}
                  {leaseDateLabel(bill.dueDate)} sẽ được chốt vào công nợ chính thức và không thể chỉnh sửa bản nháp.
                </p>
              </div>
            </div>
          )}

          {/* INLINE PAYMENT FORM */}
          {mode === 'pay' && (
            <BillingPaymentForm
              bill={bill}
              today={today}
              busy={busy}
              error={error}
              onDirtyChange={setPaymentDirty}
              onCancel={() => {
                setPaymentDirty(false);
                setMode('');
              }}
              onSubmit={(body, done) =>
                onPayment(bill.id, body, () => {
                  done();
                  setMode('');
                })
              }
            />
          )}

          {error && mode !== 'pay' && (
            <p className="hb-inline-error" role="alert">
              {error}
            </p>
          )}

          {/* PAYMENT HISTORY TIMELINE */}
          {!isDraft && (
            <section className="hb-detail-section" aria-label="Lịch sử thanh toán">
              <div className="hb-section-head">
                <h3>Lịch sử thanh toán</h3>
                {detail && <span className="hb-count-pill">{detail.payments.length} giao dịch</span>}
              </div>

              {!detail ? (
                <p className="hb-loading-inline" role="status">
                  <LoaderCircle size={15} className="spin" aria-hidden="true" />
                  <span>Đang tải lịch sử thanh toán…</span>
                </p>
              ) : detail.payments.length === 0 ? (
                <div className="hb-history-empty">
                  <Clock size={16} aria-hidden="true" />
                  <span>Chưa có giao dịch thanh toán nào cho phiếu này.</span>
                </div>
              ) : (
                <ul className="hb-history-list">
                  {detail.payments.map((payment, idx) => (
                    <li key={payment.id} className="hb-history-item">
                      <div className="hb-history-top">
                        <strong>+{amountText(payment.amount)}</strong>
                        <span className="hb-method-pill">
                          {paymentMethods[payment.method] || payment.method}
                        </span>
                      </div>
                      <div className="hb-history-meta">
                        <span>Lần {detail.payments.length - idx} · Ngày {leaseDateLabel(payment.paidOn)}</span>
                      </div>
                      {payment.note && <p className="hb-history-note">{payment.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </HostDrawer>

      {confirmDiscard && (
        <Modal title="Hủy nhập thanh toán?" onClose={() => setConfirmDiscard(false)} className="hb-confirm-modal">
          <p className="hb-confirm-text">Thông tin thanh toán bạn đang nhập chưa được lưu. Bạn có chắc muốn đóng?</p>
          <div className="hb-confirm-actions">
            <MotionButton type="button" className="hm-btn" onClick={() => setConfirmDiscard(false)}>
              Tiếp tục nhập
            </MotionButton>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              onClick={() => {
                setConfirmDiscard(false);
                setPaymentDirty(false);
                onClose();
              }}
            >
              Đóng &amp; bỏ dữ liệu
            </MotionButton>
          </div>
        </Modal>
      )}
    </>
  );
}
