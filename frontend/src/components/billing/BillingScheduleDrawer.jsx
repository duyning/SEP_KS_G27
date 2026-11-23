import { useId, useState } from 'react';
import { CalendarClock, Info, LoaderCircle, Save } from 'lucide-react';
import HostDrawer from '../HostDrawer.jsx';
import { Modal } from '../PortalUI.jsx';
import { MotionButton } from '../motion/MotionUI.jsx';
import {
  describeCycle,
  describeDueDayRule,
  formatBillingMonth,
} from '../../services/room-billing.js';
import { formatFloorHeading } from '../../services/host-management.js';
import { leaseDateLabel } from '../../services/rooms.js';

export default function BillingScheduleDrawer({
  candidate,
  month,
  propertyId,
  busy,
  error,
  onClose,
  onSave,
}) {
  const id = useId();
  const initialCycle = candidate.schedule?.cycleMonths || 1;
  const initialDueDay = candidate.schedule?.dueDay || 5;
  const initialFirstDue = candidate.schedule?.firstDueDate || candidate.startDate || '';

  const [cycleMonths, setCycleMonths] = useState(String(initialCycle));
  const [dueDay, setDueDay] = useState(String(initialDueDay));
  const [firstDueDate, setFirstDueDate] = useState(initialFirstDue);
  const [localError, setLocalError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDirty =
    Number(cycleMonths) !== initialCycle ||
    Number(dueDay) !== initialDueDay ||
    firstDueDate !== initialFirstDue;

  const dueDayNum = Number(dueDay);
  const monthEndRule = describeDueDayRule(dueDayNum);

  const requestClose = () => {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleSubmit = event => {
    event?.preventDefault();
    if (busy) return;
    const cycle = Number(cycleMonths);
    const day = Number(dueDay);
    if (!Number.isInteger(cycle) || cycle < 1 || cycle > 12) {
      setLocalError('Chọn chu kỳ thu tiền phòng từ 1 đến 12 tháng.');
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setLocalError('Ngày thu định kỳ phải từ ngày 1 đến ngày 31.');
      return;
    }
    if (!firstDueDate) {
      setLocalError('Chọn hạn thanh toán lần đầu.');
      return;
    }
    setLocalError('');
    onSave({
      period: {
        propertyId,
        roomId: candidate.roomId,
        tenancyKey: candidate.tenancyKey,
        month,
      },
      cycleMonths: cycle,
      dueDay: day,
      firstDueDate,
    });
  };

  return (
    <>
      <HostDrawer
        className="hb-drawer-schedule"
        size="md"
        kicker={`Hồ sơ đợt thuê · Kỳ ${formatBillingMonth(month)}`}
        title="Chu kỳ thu tiền phòng"
        subtitle={`Phòng ${candidate.roomNumber}${candidate.floor ? ` · ${formatFloorHeading(candidate.floor)}` : ''} · ${candidate.tenantName}`}
        onClose={requestClose}
        footer={
          <div className="hm-drawer-footer-bar">
            <button type="button" className="hm-btn" disabled={busy} onClick={requestClose}>
              Hủy
            </button>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? (
                <LoaderCircle size={15} className="spin" aria-hidden="true" />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              <span>{busy ? 'Đang lưu chu kỳ…' : 'Lưu chu kỳ'}</span>
            </MotionButton>
          </div>
        }
      >
        <form className="hb-drawer-stack" onSubmit={handleSubmit} noValidate>
          <div className="hb-context-strip">
            <CalendarClock size={16} aria-hidden="true" />
            <div>
              <strong>Phòng {candidate.roomNumber} — {candidate.tenantName}</strong>
              <p>Đợt thuê bắt đầu từ {leaseDateLabel(candidate.startDate)}. Chu kỳ được gắn trực tiếp vào hồ sơ đợt thuê này.</p>
            </div>
          </div>

          <fieldset className="hb-form-grid" disabled={busy}>
            <label className="hb-field is-full">
              <span id={`${id}-cycle`}>Chu kỳ thu tiền phòng <strong className="hb-req">*</strong></span>
              <select
                aria-labelledby={`${id}-cycle`}
                name="cycleMonths"
                value={cycleMonths}
                onChange={event => {
                  setCycleMonths(event.target.value);
                  setLocalError('');
                }}
              >
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map(value => (
                  <option key={value} value={value}>
                    {describeCycle(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="hb-field">
              <span id={`${id}-day`}>Ngày thu định kỳ (1–31) <strong className="hb-req">*</strong></span>
              <input
                aria-labelledby={`${id}-day`}
                name="dueDay"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                aria-invalid={Boolean(localError && (dueDayNum < 1 || dueDayNum > 31))}
                onChange={event => {
                  setDueDay(event.target.value);
                  setLocalError('');
                }}
                required
              />
            </label>

            <label className="hb-field">
              <span id={`${id}-first`}>Hạn thanh toán lần đầu <strong className="hb-req">*</strong></span>
              <input
                aria-labelledby={`${id}-first`}
                name="firstDueDate"
                type="date"
                min="1900-01-01"
                max="9998-12-31"
                value={firstDueDate}
                onChange={event => {
                  setFirstDueDate(event.target.value);
                  setLocalError('');
                }}
                required
              />
            </label>
          </fieldset>

          {monthEndRule && (
            <div className="hb-rule-box" role="note">
              <Info size={15} aria-hidden="true" />
              <span>{monthEndRule}</span>
            </div>
          )}

          <div className="hb-info-note">
            <Info size={15} aria-hidden="true" />
            <span>
              Lưu chu kỳ chỉ thiết lập lịch tính tiền phòng cho đợt thuê; hệ thống <strong>không tự tạo phiếu thu</strong> và <strong>không ghi nhận thanh toán</strong>.
            </span>
          </div>

          {(localError || error) && (
            <p className="hb-inline-error" role="alert">
              {localError || error}
            </p>
          )}
        </form>
      </HostDrawer>

      {confirmDiscard && (
        <Modal title="Bỏ thay đổi chu kỳ thu?" onClose={() => setConfirmDiscard(false)} className="hb-confirm-modal">
          <p className="hb-confirm-text">Thay đổi chu kỳ tiền phòng chưa được lưu. Bạn có chắc muốn đóng?</p>
          <div className="hb-confirm-actions">
            <MotionButton type="button" className="hm-btn" onClick={() => setConfirmDiscard(false)}>
              Tiếp tục chỉnh
            </MotionButton>
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Đóng &amp; bỏ thay đổi
            </MotionButton>
          </div>
        </Modal>
      )}
    </>
  );
}
