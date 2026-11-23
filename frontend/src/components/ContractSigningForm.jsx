import { useId, useRef, useState } from 'react';
import { Check, CircleDashed, LoaderCircle, PenLine } from 'lucide-react';

const MAX_STROKES = 24;
const MAX_POINTS = 180;

const signingDate = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

export const formatSigningDate = value => signingDate.format(new Date(value));

export function SignatureStrokes({ strokes }) {
  return strokes.map((stroke, index) => (
    <polyline
      key={index}
      points={stroke.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="none"
      stroke="#134c59"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

export function ContractSigningStatus({ record }) {
  return (
    <div className="rc-sign-status" aria-label="Tình trạng chữ ký">
      {[
        ['Bên cho thuê', record.ownerSignature],
        ['Bên thuê', record.tenantSignature],
      ].map(([label, signature]) => {
        const Icon = signature ? Check : CircleDashed;
        return <span key={label} className={signature ? 'is-signed' : ''}>
          <Icon size={16} aria-hidden="true" />
          <strong>{label}</strong> {signature ? 'Đã ký' : 'Chưa ký'}
        </span>;
      })}
    </div>
  );
}

export default function ContractSigningForm({ name, documentHash, onSign, onCancel }) {
  const id = useId();
  const drawing = useRef(null);
  const [method, setMethod] = useState('TYPED');
  const [strokes, setStrokes] = useState([]);
  const [ink, setInk] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canSign = confirmed && (method === 'TYPED' || strokes.length > 0) && !saving && Boolean(documentHash);

  function toPoint(event) {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const clamp = (pixel, available, scale) => Math.round(Math.max(0, Math.min(1, pixel / available)) * scale);
    return { x: clamp(event.clientX - left, width, 600), y: clamp(event.clientY - top, height, 200) };
  }

  function startStroke(event) {
    if (event.button !== 0 || drawing.current || strokes.length >= MAX_STROKES || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const points = [toPoint(event)];
    drawing.current = { id: event.pointerId, points };
    setInk(points);
  }

  function moveStroke(event) {
    const current = drawing.current;
    if (current?.id !== event.pointerId || current.points.length >= MAX_POINTS) return;
    const point = toPoint(event);
    const last = current.points.at(-1);
    if (Math.abs(last.x - point.x) + Math.abs(last.y - point.y) < 3) return;
    current.points = [...current.points, point];
    setInk(current.points);
  }

  function endStroke(event) {
    const current = drawing.current;
    if (current?.id !== event.pointerId) return;
    if (event.type !== 'pointercancel' && current.points.length > 1) {
      setStrokes(previous => [...previous, current.points]);
    }
    drawing.current = null;
    setInk([]);
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSign) return;
    setSaving(true);
    setError('');
    try {
      await onSign({ documentHash, method, confirmed, strokes: method === 'DRAWN' ? strokes : [] });
    } catch (failure) {
      setError(failure.message || 'Chưa lưu được chữ ký. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rc-sign-form" onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}><PenLine size={19} aria-hidden="true" /> Ký hợp đồng</h3>
      <p>Chữ ký được lưu cùng họ tên <strong>{name}</strong> và thời điểm ký.</p>
      <fieldset disabled={saving}>
        <legend>Cách ký</legend>
        <div className="rc-sign-methods">
          <label><input type="radio" name={id} checked={method === 'TYPED'} onChange={() => setMethod('TYPED')} /> Ký bằng họ tên</label>
          <label><input type="radio" name={id} checked={method === 'DRAWN'} onChange={() => setMethod('DRAWN')} /> Vẽ chữ ký</label>
        </div>
        {method === 'TYPED' ? (
          <div className="rc-sign-name-preview">{name}</div>
        ) : (
          <>
            <svg
              className="rc-sign-pad" viewBox="0 0 600 200" role="img" aria-label="Khung vẽ chữ ký"
              onPointerDown={startStroke} onPointerMove={moveStroke}
              onPointerUp={endStroke} onPointerCancel={endStroke} onLostPointerCapture={endStroke}
            >
              <SignatureStrokes strokes={ink.length ? [...strokes, ink] : strokes} />
            </svg>
            <div className="rc-sign-pad-actions">
              <span>{strokes.length >= MAX_STROKES ? 'Đã đủ số nét. Có thể xóa để vẽ lại.' : 'Ký bằng chuột hoặc chạm vào khung.'}</span>
              <button type="button" className="p-button" disabled={!strokes.length} onClick={() => setStrokes([])}>Xóa nét ký</button>
            </div>
          </>
        )}
        <label className="rc-sign-consent">
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          <span>Tôi đã đọc nội dung và đồng ý ký hợp đồng này.</span>
        </label>
      </fieldset>
      {error && <p className="rc-error" role="alert">{error}</p>}
      <div className="rc-sign-buttons">
        {onCancel && <button type="button" className="p-button" onClick={onCancel} disabled={saving}>Hủy</button>}
        <button type="submit" className="p-button primary" disabled={!canSign} aria-busy={saving}>
          {saving && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
          {saving ? 'Đang lưu chữ ký…' : 'Xác nhận ký'}
        </button>
      </div>
    </form>
  );
}
