import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Droplets,
  ExternalLink,
  Info,
  LoaderCircle,
  Plus,
  Receipt,
  Save,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import HostDrawer from '../HostDrawer.jsx';
import { Modal } from '../PortalUI.jsx';
import { MotionButton } from '../motion/MotionUI.jsx';
import {
  describeCycle,
  formatBillingMonth,
  formatVndInput,
  vndDigits,
  vndValue,
} from '../../services/room-billing.js';
import { roomUtilitiesPath } from '../../services/room-utilities.js';
import { formatFloorHeading } from '../../services/host-management.js';
import { money } from '../../services/room-types.js';
import { leaseDateLabel } from '../../services/rooms.js';

const emptyCharges = [];

const waterModeText = mode =>
  ({ METER: 'Theo đồng hồ (m³)', PER_PERSON: 'Theo đầu người', FIXED: 'Cố định hàng tháng' }[mode] || '');

export default function BillingDraftDrawer({
  propertyName,
  propertyId,
  candidate,
  bill,
  kind,
  month,
  busy,
  error,
  onClose,
  onSaveDraft,
  onSaveAndIssue,
}) {
  const id = useId();
  const supplementary = kind === 'UTILITIES';
  const utilities = candidate.utilities;
  const utilitiesBlockedByOtherBill = Boolean(candidate.utilitiesAlreadyBilled && !bill?.includesUtilities);

  const initialRent = supplementary ? '0' : String(bill?.rentAmount ?? candidate.rent?.amount ?? '0');
  const initialDue = bill?.dueDate || (supplementary ? candidate.utilityDueDate : candidate.dueDate) || '';
  const initialInclude = supplementary
    ? true
    : bill
      ? Boolean(bill.includesUtilities)
      : Boolean(utilities && !utilitiesBlockedByOtherBill);
  const initialCharges = (bill?.charges ?? (supplementary ? emptyCharges : candidate.suggestedCharges ?? emptyCharges))
    .map((charge, index) => ({
      id: index,
      label: charge.label || '',
      amount: formatVndInput(String(charge.amount ?? '')),
    }));

  const [rentInput, setRentInput] = useState(() => formatVndInput(initialRent));
  const [dueDate, setDueDate] = useState(initialDue);
  const [includeUtilities, setIncludeUtilities] = useState(initialInclude);
  const [charges, setCharges] = useState(initialCharges);
  const [showUtilitySource, setShowUtilitySource] = useState(false);
  const [localError, setLocalError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const nextChargeId = useRef(initialCharges.length);

  const rentVal = vndValue(vndDigits(rentInput));
  const electricityVal = includeUtilities && utilities ? vndValue(utilities.electricityAmount) : 0n;
  const waterVal = includeUtilities && utilities ? vndValue(utilities.waterAmount) : 0n;
  const utilitiesSum = electricityVal + waterVal;
  const chargesSum = charges.reduce((sum, item) => sum + vndValue(vndDigits(item.amount)), 0n);
  const totalVal = rentVal + utilitiesSum + chargesSum;

  const canIssueDirectly = Boolean(
    !candidate.issue &&
      (supplementary || candidate.schedule || rentVal === 0n) &&
      totalVal > 0n
  );

  const requestClose = () => {
    if (busy) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const buildValidatedPayload = () => {
    const rentAmount = vndDigits(rentInput) || '0';
    if (!dueDate) {
      setLocalError('Chọn hạn thanh toán cho phiếu thu.');
      return null;
    }
    if (!/^\d{1,12}$/.test(rentAmount)) {
      setLocalError('Tiền phòng phải là số tiền VND nguyên hợp lệ.');
      return null;
    }
    const items = [];
    for (let i = 0; i < charges.length; i++) {
      const label = charges[i].label.trim();
      const amount = vndDigits(charges[i].amount);
      if (!label || !/^\d{1,12}$/.test(amount) || vndValue(amount) <= 0n) {
        setLocalError(`Kiểm tra tên khoản phí và số tiền VND lớn hơn 0 ở dòng phí khác #${i + 1}.`);
        return null;
      }
      items.push({ label, amount });
    }
    if (totalVal <= 0n) {
      setLocalError('Phiếu thu cần có ít nhất một khoản phải thu lớn hơn 0 đ.');
      return null;
    }
    if (includeUtilities && (!utilities || utilitiesBlockedByOtherBill)) {
      setLocalError('Điện nước kỳ này chưa chốt hoặc đã được cộng ở phiếu khác.');
      return null;
    }
    setLocalError('');
    return {
      kind,
      revision: bill?.revision ?? null,
      dueDate,
      rentAmount,
      includeUtilities,
      period: {
        propertyId,
        roomId: candidate.roomId,
        tenancyKey: candidate.tenancyKey,
        month,
      },
      charges: items,
    };
  };

  const handleSaveDraft = event => {
    event?.preventDefault();
    if (busy) return;
    const payload = buildValidatedPayload();
    if (!payload) return;
    onSaveDraft(payload);
  };

  const handleRequestIssue = () => {
    if (busy) return;
    const payload = buildValidatedPayload();
    if (!payload) return;
    setConfirmIssue(true);
  };

  const handleConfirmIssue = () => {
    const payload = buildValidatedPayload();
    setConfirmIssue(false);
    if (!payload) return;
    onSaveAndIssue?.(payload);
  };

  const addChargeRow = () => {
    if (charges.length >= 20) return;
    const rowId = nextChargeId.current++;
    setCharges(prev => [...prev, { id: rowId, label: '', amount: '' }]);
    setDirty(true);
  };

  const updateChargeRow = (rowId, field, value) => {
    setCharges(prev =>
      prev.map(item =>
        item.id === rowId
          ? { ...item, [field]: field === 'amount' ? formatVndInput(value.replace(/[^\d.,\s]/g, '')) : value }
          : item
      )
    );
    setLocalError('');
    setDirty(true);
  };

  const removeChargeRow = rowId => {
    setCharges(prev => prev.filter(item => item.id !== rowId));
    setLocalError('');
    setDirty(true);
  };

  return (
    <>
      <HostDrawer
        className="hb-drawer-draft"
        size="lg"
        kicker={`${supplementary ? 'Phiếu điện nước bổ sung' : bill ? 'Chỉnh sửa bản nháp' : 'Tạo phiếu thu mới'} · Kỳ ${formatBillingMonth(month)}`}
        title={supplementary ? 'Lập phiếu điện nước bổ sung' : bill ? 'Chỉnh bản nháp phiếu thu' : 'Lập phiếu thu'}
        subtitle={`${propertyName} · Phòng ${candidate.roomNumber}${candidate.floor ? ` (${formatFloorHeading(candidate.floor)})` : ''} · ${candidate.tenantName}`}
        onClose={requestClose}
        footer={
          <div className="hm-drawer-footer-bar hb-draft-footer">
            <button type="button" className="hm-btn" disabled={busy} onClick={requestClose}>
              Hủy
            </button>
            <div className="hb-drawer-footer-right">
              <MotionButton
                type="button"
                className="hm-btn"
                disabled={busy}
                onClick={handleSaveDraft}
              >
                {busy ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                <span>Lưu bản nháp</span>
              </MotionButton>
              {onSaveAndIssue && (
                <MotionButton
                  type="button"
                  className="hm-btn hm-btn-primary"
                  disabled={busy || !canIssueDirectly}
                  title={
                    !canIssueDirectly && !candidate.schedule && rentVal > 0n
                      ? 'Cần thiết lập chu kỳ tiền phòng trước khi phát hành phiếu chính'
                      : undefined
                  }
                  onClick={handleRequestIssue}
                >
                  {busy ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                  <span>Phát hành phiếu</span>
                </MotionButton>
              )}
            </div>
          </div>
        }
      >
        <form className="hb-drawer-stack" onSubmit={handleSaveDraft} noValidate>
          {/* NHÓM A — THÔNG TIN PHIẾU */}
          <section className="hb-draft-group" aria-labelledby={`${id}-group-a`}>
            <header className="hb-draft-group-head">
              <span className="hb-group-step">Nhóm A</span>
              <h3 id={`${id}-group-a`}>Thông tin phiếu &amp; hồ sơ đợt thuê</h3>
            </header>

            <div className="hb-ref-box">
              <Building2 size={16} aria-hidden="true" />
              <div>
                <strong>
                  {propertyName} — Phòng {candidate.roomNumber}
                </strong>
                <p>
                  Hồ sơ đợt thuê: <strong>{candidate.tenantName}</strong> (bắt đầu {leaseDateLabel(candidate.startDate)}
                  {candidate.ended ? ' · Đã trả phòng' : ''})
                  {candidate.schedule ? ` · Chu kỳ: ${describeCycle(candidate.schedule.cycleMonths)}` : ' · Chưa thiết lập chu kỳ'}
                </p>
              </div>
            </div>

            <fieldset className="hb-form-grid" disabled={busy}>
              {!supplementary && (
                <label className="hb-field">
                  <span id={`${id}-rent`}>Tiền phòng kỳ này (đ)</span>
                  <input
                    aria-labelledby={`${id}-rent`}
                    name="rentAmount"
                    type="text"
                    inputMode="numeric"
                    value={rentInput}
                    readOnly={!candidate.rent}
                    onChange={event => {
                      setRentInput(formatVndInput(event.target.value.replace(/[^\d.,\s]/g, '')));
                      setLocalError('');
                      setDirty(true);
                    }}
                  />
                  <small className="hb-field-hint">
                    {candidate.rent
                      ? `Tính từ ${leaseDateLabel(candidate.rent.from)} đến ${leaseDateLabel(candidate.rent.through)}`
                      : candidate.schedule
                        ? 'Kỳ này không đến lượt thu tiền phòng theo chu kỳ.'
                        : 'Thiết lập chu kỳ tiền phòng để tự tính tiền phòng kỳ này.'}
                  </small>
                </label>
              )}

              <label className={`hb-field ${supplementary ? 'is-full' : ''}`}>
                <span id={`${id}-due`}>Hạn thanh toán <strong className="hb-req">*</strong></span>
                <input
                  aria-labelledby={`${id}-due`}
                  name="dueDate"
                  type="date"
                  min="1900-01-01"
                  max="9998-12-31"
                  value={dueDate}
                  onChange={event => {
                    setDueDate(event.target.value);
                    setLocalError('');
                    setDirty(true);
                  }}
                  required
                />
              </label>
            </fieldset>
          </section>

          {/* NHÓM B — ĐIỆN NƯỚC */}
          <section className="hb-draft-group" aria-labelledby={`${id}-group-b`}>
            <header className="hb-draft-group-head">
              <span className="hb-group-step">Nhóm B</span>
              <h3 id={`${id}-group-b`}>Điện nước kỳ {formatBillingMonth(month)}</h3>
            </header>

            <label className={`hb-util-toggle ${includeUtilities ? 'is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={includeUtilities}
                disabled={busy || supplementary || (!utilities && !includeUtilities) || utilitiesBlockedByOtherBill}
                onChange={event => {
                  setIncludeUtilities(event.target.checked);
                  setLocalError('');
                  setDirty(true);
                }}
              />
              <span>
                <strong>Cộng tiền điện nước đã chốt</strong>
                <small>Dùng số liệu đã chốt trong kỳ này.</small>
              </span>
            </label>

            {utilitiesBlockedByOtherBill ? (
              <div className="hb-rule-box" role="status">
                <AlertTriangle size={15} aria-hidden="true" />
                <span>Điện nước kỳ này đã được cộng vào một phiếu khác của cùng đợt thuê (chống cộng trùng).</span>
              </div>
            ) : utilities ? (
              <div className="hb-util-detail-box">
                <div className="hb-util-detail-top">
                  <span className="hb-util-tag is-ready">
                    Đã chốt ngày {leaseDateLabel(utilities.readOn)}
                  </span>
                  <div className="hb-util-detail-links">
                    {utilities.electricityStart != null && (
                      <button
                        type="button"
                        className="hb-text-btn"
                        onClick={() => setShowUtilitySource(v => !v)}
                      >
                        {showUtilitySource ? 'Ẩn chỉ số nguồn' : 'Xem chi tiết chỉ số'}
                      </button>
                    )}
                    <Link
                      className="hb-text-btn"
                      to={roomUtilitiesPath(propertyId, candidate.roomId, month)}
                    >
                      Mở sổ điện nước <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <dl className="hb-util-amounts">
                  <div>
                    <dt><Zap size={13} aria-hidden="true" /> Tiền điện</dt>
                    <dd>{money(vndValue(utilities.electricityAmount))}</dd>
                  </div>
                  <div>
                    <dt><Droplets size={13} aria-hidden="true" /> Tiền nước</dt>
                    <dd>{money(vndValue(utilities.waterAmount))}</dd>
                  </div>
                </dl>

                {showUtilitySource && utilities.electricityStart != null && (
                  <div className="hb-util-source">
                    <p>
                      <strong>Điện:</strong> {utilities.electricityStart} → {utilities.electricityEnd} kWh · Đơn giá{' '}
                      {money(vndValue(utilities.electricityRate))}/kWh
                    </p>
                    <p>
                      <strong>Nước ({waterModeText(utilities.waterMode)}):</strong>{' '}
                      {utilities.waterMode === 'METER'
                        ? `${utilities.waterStart} → ${utilities.waterEnd} m³ · ${money(vndValue(utilities.waterRate))}/m³`
                        : utilities.waterMode === 'PER_PERSON'
                          ? `${utilities.occupantCount ?? 0} người · ${money(vndValue(utilities.waterRate))}/người`
                          : `${money(vndValue(utilities.waterRate))} cố định`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="hb-util-missing-box">
                <div>
                  <span className="hb-util-tag is-missing">Chưa có chỉ số điện nước đã chốt</span>
                  <p>Không tự động cộng vào phiếu. Bạn có thể chốt chỉ số trước hoặc lập phiếu điện nước bổ sung sau.</p>
                </div>
                <Link
                  className="hm-btn"
                  to={roomUtilitiesPath(propertyId, candidate.roomId, month)}
                >
                  <Droplets size={14} aria-hidden="true" />
                  <span>Sang màn ghi điện nước</span>
                </Link>
              </div>
            )}
          </section>

          {/* NHÓM C — CÁC KHOẢN PHÍ KHÁC */}
          {!supplementary && (
            <section className="hb-draft-group" aria-labelledby={`${id}-group-c`}>
              <header className="hb-draft-group-head is-between">
                <div className="hb-group-title-left">
                  <span className="hb-group-step">Nhóm C</span>
                  <h3 id={`${id}-group-c`}>Các khoản phí khác</h3>
                </div>
                <button
                  type="button"
                  className="hm-btn hb-add-charge-btn"
                  disabled={busy || charges.length >= 20}
                  onClick={addChargeRow}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Thêm khoản phí</span>
                </button>
              </header>

              {charges.length === 0 ? (
                <p className="hb-muted-box">Chưa có khoản phí bổ sung (Internet, phí dịch vụ, gửi xe…).</p>
              ) : (
                <div className="hb-charges-list">
                  {charges.map((charge, idx) => (
                    <div className="hb-charge-row" key={charge.id}>
                      <label className="hb-field">
                        <span>Tên khoản phí</span>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Ví dụ: Internet, Phí dịch vụ"
                          value={charge.label}
                          disabled={busy}
                          onChange={event => updateChargeRow(charge.id, 'label', event.target.value)}
                          required
                        />
                      </label>
                      <label className="hb-field">
                        <span>Số tiền (đ)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="100.000"
                          value={charge.amount}
                          disabled={busy}
                          onChange={event => updateChargeRow(charge.id, 'amount', event.target.value)}
                          required
                        />
                      </label>
                      <button
                        type="button"
                        className="hm-icon-btn hb-remove-charge"
                        title={`Xóa khoản phí ${idx + 1}`}
                        aria-label={`Bỏ khoản phí ${idx + 1}`}
                        disabled={busy}
                        onClick={() => removeChargeRow(charge.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TỔNG KẾT */}
          <section className="hb-summary-box" aria-label="Tổng kết phiếu thu">
            <div className="hb-summary-head">
              <Receipt size={16} aria-hidden="true" />
              <strong>Tổng kết khoản thu</strong>
            </div>
            <dl className="hb-summary-lines">
              <div>
                <dt>Tiền phòng</dt>
                <dd>{money(rentVal)}</dd>
              </div>
              <div>
                <dt>+ Điện nước đã chốt được chọn</dt>
                <dd>{money(utilitiesSum)}</dd>
              </div>
              <div>
                <dt>+ Các khoản phí khác ({charges.length})</dt>
                <dd>{money(chargesSum)}</dd>
              </div>
              <div className="is-grand-total">
                <dt>= Tổng phải thu</dt>
                <dd>{money(totalVal)}</dd>
              </div>
            </dl>
            <p className="hb-summary-footnote">
              <Info size={13} aria-hidden="true" />
              <span>Lưu bản nháp chưa tính vào công nợ. Phát hành phiếu cũng không tự động ghi nhận tiền đã thu.</span>
            </p>
          </section>

          {(localError || error) && (
            <p className="hb-inline-error" role="alert">
              {localError || error}
            </p>
          )}
        </form>
      </HostDrawer>

      {confirmIssue && (
        <Modal title="Phát hành phiếu thu chính thức?" onClose={() => setConfirmIssue(false)} className="hb-confirm-modal">
          <p className="hb-confirm-text">
            Phiếu thu phòng <strong>{candidate.roomNumber}</strong> ({candidate.tenantName}) với tổng phải thu{' '}
            <strong>{money(totalVal)}</strong> (hạn {leaseDateLabel(dueDate)}) sẽ được phát hành ngay vào sổ công nợ chính thức và không thể chỉnh sửa lại bản nháp.
          </p>
          <div className="hb-confirm-actions">
            <MotionButton type="button" className="hm-btn" onClick={() => setConfirmIssue(false)}>
              Kiểm tra lại
            </MotionButton>
            <MotionButton type="button" className="hm-btn hm-btn-primary" onClick={handleConfirmIssue}>
              Xác nhận phát hành
            </MotionButton>
          </div>
        </Modal>
      )}

      {confirmDiscard && (
        <Modal title="Bỏ thay đổi trên phiếu thu?" onClose={() => setConfirmDiscard(false)} className="hb-confirm-modal">
          <p className="hb-confirm-text">Thông tin bạn đang nhập trên phiếu thu chưa được lưu. Bạn có chắc muốn đóng?</p>
          <div className="hb-confirm-actions">
            <MotionButton type="button" className="hm-btn" onClick={() => setConfirmDiscard(false)}>
              Tiếp tục nhập
            </MotionButton>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              onClick={() => {
                setConfirmDiscard(false);
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
