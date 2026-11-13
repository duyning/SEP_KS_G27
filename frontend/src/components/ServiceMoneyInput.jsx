import UIField from './common/Field.jsx';
import { useId, useLayoutEffect, useRef } from 'react';
import { formatServiceMoney, parseServiceMoney } from '../services/service-form.js';

export default function ServiceMoneyInput({ value, onChange, error }) {
  const id = useId(); const input = useRef(null); const caret = useRef(null);
  const display = formatServiceMoney(value);
  useLayoutEffect(() => {
    if (caret.current == null || document.activeElement !== input.current) return;
    let remaining = caret.current; let position = 0;
    while (position < display.length && remaining > 0) { if (/[\d,]/.test(display[position])) remaining--; position++; }
    input.current.setSelectionRange(position, position); caret.current = null;
  }, [display]);
  return <div className="svc-money-field"><UIField htmlFor={id}>Giá dịch vụ (VNĐ)<span className="svc-required"> *</span></UIField><div className="svc-money-control">
    <input ref={input} id={id} name="price" type="text" inputMode="decimal" autoComplete="off" required value={display} aria-invalid={!!error} aria-describedby={`${id}-hint`}
      placeholder="Ví dụ: 200.000" onChange={event => {
        const raw = parseServiceMoney(event.target.value);
        if (raw == null) return;
        caret.current = (event.target.value.slice(0, event.target.selectionStart).match(/[\d,]/g) || []).length;
        onChange({ target: { name: 'price', value: raw } });
      }} /><span>VNĐ</span></div>
    <small id={`${id}-hint`} className={error ? 'svc-field-error' : 'svc-field-hint'} role={error ? 'alert' : undefined}>{error || (display ? `Số tiền: ${display} VNĐ` : 'Nhập giá dịch vụ bằng VNĐ.')}</small>
  </div>;
}
