import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, useToast } from './PortalUI.jsx';
import { communityReportsApi, reportReasons } from '../services/community-reports.js';
import '../styles/community-reports.css';

export default function CommunityReportDialog({ post, user, onClose }) {
  const fieldId = useId();
  const notify = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (reason === 'OTHER' && !details.trim()) {
      setError('Vui lòng mô tả lý do khác.');
      return;
    }
    if (evidence && evidence.size > 5 * 1024 * 1024) {
      setError('Ảnh bằng chứng phải có dung lượng tối đa 5 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await communityReportsApi.submit(post.id, reason, details.trim(), evidence);
      onClose();
      notify('Đã gửi báo cáo thành công.');
    } catch (err) {
      setError(err.fields?.evidence || err.fields?.details || err.fields?.reason || err.message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Báo cáo bài viết" className="community-report-dialog" onClose={() => { if (!busy) onClose(); }}>
    <p className="community-report-post-title">{post.title}</p>
    {!user ? <>
      <p>Bạn cần đăng nhập để gửi báo cáo.</p>
      <div className="community-report-actions">
        <Link className="p-button primary" to="/login" state={{ from: `/community#post-${post.id}` }}>Đăng nhập</Link>
      </div>
    </> : <form className="community-report-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${fieldId}-reason`}>Lý do báo cáo</label>
      <select id={`${fieldId}-reason`} required value={reason} onChange={event => setReason(event.target.value)} disabled={busy}>
        <option value="" disabled>Chọn lý do</option>
        {Object.entries(reportReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <label htmlFor={`${fieldId}-details`}>Mô tả {reason === 'OTHER' ? '' : '(không bắt buộc)'}</label>
      <textarea id={`${fieldId}-details`} rows={4} maxLength={1000} required={reason === 'OTHER'}
        value={details} onChange={event => setDetails(event.target.value)} disabled={busy} />
      <label htmlFor={`${fieldId}-evidence`}>Ảnh bằng chứng (không bắt buộc)</label>
      <input id={`${fieldId}-evidence`} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={busy}
        aria-describedby={`${fieldId}-evidence-help`} onChange={event => setEvidence(event.target.files[0] || null)} />
      <small id={`${fieldId}-evidence-help`}>Một ảnh JPG hoặc PNG, tối đa 5 MB. Chỉ Admin xem được ảnh này.</small>
      {error && <p role="alert" className="portal-form-alert">{error}</p>}
      <div className="community-report-actions">
        <button type="button" className="p-button" onClick={onClose} disabled={busy}>Hủy</button>
        <button type="submit" className="p-button primary" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
      </div>
    </form>}
  </Modal>;
}
