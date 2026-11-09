import { SUPPLEMENT_FIELD_META, composeSupplementNote, supplementGroups } from '../services/supplement-request.js';
import '../styles/supplement-checklist.css';

export default function SupplementRequestFields({ detail, selected, onChange, fieldNotes = {}, onFieldNoteChange, note, onNoteChange, busy, error }) {
  const groups = supplementGroups(detail);
  const composedLength = composeSupplementNote(groups, selected, note, fieldNotes).length;
  return <div className="ssc-body">
    <p>Tích chọn các mục cần bổ sung và nhập ghi chú trực tiếp tại từng mục để chủ trọ thấy ngay ở nội dung tương ứng.</p>
    <div className="ssc-summary"><span>Danh sách trường theo đơn đăng ký nhà trọ:</span><strong>Đã chọn {selected.length} mục</strong></div>
    {groups.map((group, index) => <fieldset className="ssc-group" key={group.title} disabled={busy}>
      <legend>{index + 1}. {group.title}<small>{group.items.length} trường</small></legend>
      {group.items.map(([key, label, value]) => {
        const isSelected = selected.includes(key);
        return <div className={`ssc-item ${isSelected ? 'selected' : ''}`} key={key}>
          <label className={isSelected ? 'selected' : ''}>
            <input type="checkbox" checked={isSelected} onChange={event => onChange(event.target.checked ? [...selected, key] : selected.filter(item => item !== key))} />
            <span>{label}</span>
            <small title={value || 'Chưa có thông tin'}>Hiện tại: {value || 'Chưa có thông tin'}</small>
          </label>
          {isSelected && <div className="ssc-item-note">
            <input
              type="text"
              maxLength={500}
              disabled={busy}
              aria-label={`Ghi chú bổ sung cho ${label}`}
              placeholder={SUPPLEMENT_FIELD_META[key]?.placeholder || 'Nhập hướng dẫn bổ sung cụ thể cho mục này...'}
              value={fieldNotes[key] || ''}
              onChange={event => onFieldNoteChange?.(key, event.target.value)}
            />
          </div>}
        </div>;
      })}
    </fieldset>)}
    <label className="sw-review-label" htmlFor="staff-review-note">Ghi chú chung của Staff (Tùy chọn):</label>
    <textarea id="staff-review-note" rows={3} maxLength={1000} disabled={busy} value={note} onChange={event => onNoteChange(event.target.value)} placeholder="Nhận xét tổng quan thêm cho chủ trọ (nếu có)..." aria-invalid={Boolean(error)} aria-describedby={error ? 'staff-review-error' : undefined} />
    <small className={composedLength > 2000 ? 'ssc-over-limit' : undefined}>Tổng độ dài phản hồi: {composedLength}/2000 ký tự · Chọn ít nhất một mục cần bổ sung.</small>
    {error && <p id="staff-review-error" className="sw-error" role="alert">{error}</p>}
  </div>;
}
