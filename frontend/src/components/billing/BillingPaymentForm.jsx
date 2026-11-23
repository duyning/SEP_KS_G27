import { useId, useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { MotionButton } from '../motion/MotionUI.jsx';
import {
  formatVndInput,
  paymentKey,
  paymentMethods,
  vndDigits,
  vndValue,
} from '../../services/room-billing.js';
import { money } from '../../services/room-types.js';

export default function BillingPaymentForm({
  bill,
  today,
  busy,
  error,
  onDirtyChange,
  onCancel,
  onSubmit,
}) {
  const id = useId();
  const [amountInput, setAmountInput] = useState('');
  const [paidOn, setPaidOn] = useState(today || '');
  const [method, setMethod] = useState('TRANSFER');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');
  const requestKeyRef = useRef(paymentKey());

  const currentDebt = vndValue(bill.outstanding);
  const rawDigits = vndDigits(amountInput);
  const enteredValue = /^\d{1,20}$/.test(rawDigits) ? vndValue(rawDigits) : 0n;
  const exceedsDebt = enteredValue > currentDebt;
  const projectedDebt = exceedsDebt ? 0n : currentDebt - enteredValue;

  const updateAmount = nextRaw => {
    const cleaned = nextRaw.replace(/[^\d.,\s]/g, '');
    setAmountInput(formatVndInput(cleaned));
    setLocalError('');
    onDirtyChange?.(true);
  };

  const fillFullOutstanding = () => {
    setAmountInput(formatVndInput(String(currentDebt)));
    setLocalError('');
    onDirtyChange?.(true);
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{1,20}$/.test(rawDigits) || enteredValue <= 0n) {
      setLocalError('Nhập số tiền đã nhận lớn hơn 0 đ.');
      return;
    }
    if (enteredValue > currentDebt) {
      setLocalError(`Số tiền thu không được vượt quá công nợ còn phải thu (${money(currentDebt)}).`);
      return;
    }
    if (!paidOn) {
      setLocalError('Chọn ngày thu tiền hợp lệ.');
      return;
    }
    setLocalError('');
    onSubmit(
      {
        requestKey: requestKeyRef.current,
        amount: rawDigits,
        paidOn,
        method,
        note: note.trim(),
      },
      () => {
        onDirtyChange?.(false);
      }
    );
  };

  return (
    <form className="hb-payment-card" onSubmit={handleSubmit} noValidate>
      <div className="hb-payment-head">
        <h3>Ghi nhận thanh toán</h3>
        <button
          type="button"
          className="hb-quick-fill-btn"
          disabled={busy || currentDebt <= 0n}
          onClick={fillFullOutstanding}
        >
          Thu đủ còn lại ({money(currentDebt)})
        </button>
      </div>

      {/* LIVE DEBT PROJECTION */}
      <dl className="hb-debt-preview" aria-label="Dự tính công nợ sau thanh toán">
        <div>
          <dt>Công nợ trước thanh toán</dt>
          <dd>{money(currentDebt)}</dd>
        </div>
        <div>
          <dt>Số tiền đang nhập</dt>
          <dd className="is-teal">{enteredValue > 0n ? `− ${money(enteredValue)}` : '0 đ'}</dd>
        </div>
        <div className="is-projected">
          <dt>Công nợ dự kiến sau thu</dt>
          <dd className={exceedsDebt ? 'is-danger' : projectedDebt === 0n && enteredValue > 0n ? 'is-success' : ''}>
            {exceedsDebt ? 'Vượt công nợ' : money(projectedDebt)}
          </dd>
        </div>
      </dl>

      <fieldset className="hb-form-grid" disabled={busy}>
        <label className="hb-field is-full">
          <span id={`${id}-amount`}>Số tiền đã nhận (đ) <strong className="hb-req">*</strong></span>
          <input
            aria-labelledby={`${id}-amount`}
            name="amount"
            type="text"
            inputMode="numeric"
            placeholder="Ví dụ: 200.000"
            value={amountInput}
            aria-invalid={Boolean(localError && (enteredValue <= 0n || exceedsDebt))}
            onChange={event => updateAmount(event.target.value)}
            required
          />
        </label>

        <label className="hb-field">
          <span id={`${id}-paidOn`}>Ngày thu <strong className="hb-req">*</strong></span>
          <input
            aria-labelledby={`${id}-paidOn`}
            name="paidOn"
            type="date"
            value={paidOn}
            min="1900-01-01"
            max={today || undefined}
            onChange={event => {
              setPaidOn(event.target.value);
              setLocalError('');
              onDirtyChange?.(true);
            }}
            required
          />
        </label>

        <label className="hb-field">
          <span id={`${id}-method`}>Phương thức</span>
          <select
            aria-labelledby={`${id}-method`}
            name="method"
            value={method}
            onChange={event => {
              setMethod(event.target.value);
              onDirtyChange?.(true);
            }}
          >
            {Object.entries(paymentMethods).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="hb-field is-full">
          <span id={`${id}-note`}>Ghi chú (tùy chọn)</span>
          <input
            aria-labelledby={`${id}-note`}
            name="note"
            type="text"
            maxLength={400}
            placeholder="Ví dụ: Chuyển khoản Vietcombank đợt 1"
            value={note}
            onChange={event => {
              setNote(event.target.value);
              onDirtyChange?.(true);
            }}
          />
        </label>
      </fieldset>

      {(localError || error) && (
        <p className="hb-inline-error" role="alert">
          {localError || error}
        </p>
      )}

      <div className="hb-payment-actions">
        <button type="button" className="hm-btn" disabled={busy} onClick={onCancel}>
          Hủy
        </button>
        <MotionButton type="submit" className="hm-btn hm-btn-primary" disabled={busy}>
          {busy ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          <span>{busy ? 'Đang ghi nhận…' : 'Xác nhận thanh toán'}</span>
        </MotionButton>
      </div>
    </form>
  );
}
