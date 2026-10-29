import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './common/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { serviceRegistrationApi as api, validateServiceRegistration } from '../services/service-registration.js';

const statuses = { PENDING: 'Chờ xét duyệt', NEEDS_SUPPLEMENT: 'Cần bổ sung hồ sơ', APPROVED: 'Đã được duyệt', REJECTED: 'Bị từ chối' };
const reasons = { HAS_CAPABILITY: 'Tài khoản đã có quyền cung cấp dịch vụ.', APPROVED: 'Hồ sơ của bạn đã được duyệt.', IN_REVIEW: 'Hồ sơ đang được xử lý. Bạn chưa thể gửi hồ sơ mới.' };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8 };

export default function ServiceRegistrationModal({ onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ applicantName: user?.fullName || '', contactPhone: user?.phoneNumber || '', contactEmail: user?.email || '', categoryId: '', serviceName: '', description: '', serviceArea: '', pricingType: 'FIXED', price: '' });
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([api.categories(controller.signal), api.current(controller.signal)]).then(([rows, current]) => {
      if (controller.signal.aborted) return;
      setCategories(rows); setState(current);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, reload]);
  const close = () => { if (!busy) onClose(); };
  const update = e => setForm(previous => ({ ...previous, [e.target.name]: e.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const message = validateServiceRegistration(form, files);
    if (message) { setError(message); return; }
    setBusy(true); setError('');
    try {
      const registration = await api.submit({ ...form, categoryId: Number(form.categoryId), price: form.pricingType === 'NEGOTIABLE' ? null : Number(form.price) }, files);
      setState({ canRegister: false, reason: 'IN_REVIEW', registration }); setFiles([]);
    } catch (err) {
      setError(err.message + (err.fields && Object.keys(err.fields).length ? `: ${Object.values(err.fields).join('; ')}` : ''));
      if (err.status === 409) {
        try { setState(await api.current()); } catch { /* Keep original submission error visible. */ }
      }
    } finally { setBusy(false); }
  }
  async function download(document) {
    setError('');
    try {
      const blob = await api.document(document.documentId);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  }
  const field = (name, label, props = {}) => <label style={{ display: 'grid', gap: 6 }} key={name}>{label}<input style={inputStyle} name={name} value={form[name]} onChange={update} required {...props} /></label>;
  const row = state?.registration;
  return <Modal title="Đăng ký cung cấp dịch vụ" onClose={close} maxWidth="680px">
    {!user ? <p>Bạn cần <Link to="/login" state={{ from: '/services' }}>đăng nhập</Link> để gửi và theo dõi hồ sơ.</p> : loading ? <p role="status">Đang tải hồ sơ...</p> : <>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {!state && <button onClick={() => setReload(v => v + 1)}>Thử lại</button>}
      {row && <section style={{ background: '#f0fdfa', padding: 16, borderRadius: 10, marginBottom: 16 }} aria-label="Hồ sơ đã gửi">
        <h4 style={{ marginTop: 0 }}>Hồ sơ #{row.registrationId} — {statuses[row.status] || row.status}</h4>
        <p>{row.serviceName} · {row.categoryName}</p>
        <p>Người đăng ký: {row.applicantName}</p>
        <p>{row.description}</p>
        <p>Khu vực: {row.serviceArea}</p>
        <p>Giá: {row.pricingType === 'NEGOTIABLE' ? 'Thỏa thuận' : `${row.pricingType === 'FROM' ? 'Từ ' : ''}${Number(row.price).toLocaleString('vi-VN')} VNĐ`}</p>
        <p>Liên hệ: {row.contactPhone} {row.contactEmail && `· ${row.contactEmail}`}</p>
        {row.createdAt && <p>Ngày gửi: {new Date(row.createdAt).toLocaleString('vi-VN')}</p>}
        {row.reasonNote && <p>Phản hồi: {row.reasonNote}</p>}
        {row.reviewedAt && <><p>Quyền Service Owner: {row.capabilityDecision === 'APPROVE' ? 'Đã cấp' : 'Từ chối'} · Quyết định nội dung: {row.listingDecision === 'APPROVE' ? 'Đã duyệt' : 'Từ chối công khai'}</p><p>Người duyệt: {row.reviewerName} · {new Date(row.reviewedAt).toLocaleString('vi-VN')}</p></>}
        {row.reviewedAt && <><p>Quyền Service Owner hiện tại: {row.capabilityActive ? 'Đang hoạt động' : 'Chưa được cấp / Đã ngừng'}. Vai trò tài khoản được giữ nguyên.</p><p>Mã nhà cung cấp: #{row.providerId}{row.serviceId && ` · Mã dịch vụ: #${row.serviceId}`}</p><p>{row.publicEligible ? 'Dịch vụ đang công khai.' : row.serviceId ? 'Dịch vụ hiện không đủ điều kiện công khai.' : 'Chưa có dịch vụ công khai.'}</p>{row.publicEligible && <Link to={`/services/detail?id=${row.serviceId}`} onClick={onClose}>Xem dịch vụ công khai</Link>}</>}
        <div>Tài liệu: {row.documents.map(doc => <button key={doc.documentId} type="button" onClick={() => download(doc)} style={{ margin: 4 }}>{doc.name}</button>)}</div>
        {row.status === 'PENDING' && <p role="status">Hồ sơ đã được lưu và gửi xét duyệt. Quyền cung cấp dịch vụ chỉ được cấp sau khi hồ sơ được phê duyệt.</p>}
      </section>}
      {row && <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Cập nhật kết quả hồ sơ</button>}
      {state && !state.canRegister && <p>{reasons[state.reason]}</p>}
      {state?.canRegister && <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <p style={{ margin: 0 }}>Gửi thông tin dịch vụ đầu tiên và giấy tờ xác minh để bắt đầu onboarding. Hồ sơ sẽ được ban quản trị xét duyệt.</p>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
          {field('applicantName', 'Họ tên người đăng ký *', { minLength: 2, maxLength: 100 })}
          {field('serviceName', 'Tên dịch vụ / đơn vị *', { minLength: 3, maxLength: 255 })}
          <label style={{ display: 'grid', gap: 6 }}>Danh mục *<select name="categoryId" value={form.categoryId} onChange={update} required style={inputStyle}><option value="">Chọn danh mục</option>{categories.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}</select></label>
          <label style={{ display: 'grid', gap: 6 }}>Mô tả dịch vụ *<textarea name="description" required minLength={20} maxLength={5000} rows={4} value={form.description} onChange={update} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 6 }}>Loại giá *<select name="pricingType" value={form.pricingType} onChange={update} style={inputStyle}><option value="FIXED">Giá cố định</option><option value="FROM">Giá từ</option><option value="NEGOTIABLE">Thỏa thuận</option></select></label>
          {form.pricingType !== 'NEGOTIABLE' && field('price', 'Giá dịch vụ (VNĐ) *', { type: 'number', min: '0.01', max: '9999999999.99', step: '0.01' })}
          {field('serviceArea', 'Khu vực phục vụ *', { minLength: 2, maxLength: 500, placeholder: 'VD: Tân Xã, Thạch Hòa, Bình Yên' })}
          {field('contactPhone', 'Số điện thoại liên hệ *', { type: 'tel', maxLength: 30 })}
          {field('contactEmail', 'Email liên hệ', { type: 'email', maxLength: 255, required: false })}
          <label style={{ display: 'grid', gap: 6 }}>Tài liệu xác minh *<input type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setFiles(Array.from(e.target.files || []))} /><small>Đính kèm giấy tờ định danh, giấy phép kinh doanh hoặc tài liệu chứng minh khả năng cung cấp dịch vụ. Từ 1–5 tệp PDF, JPG, PNG, WEBP; mỗi tệp tối đa 10 MB.</small></label>
          {!!files.length && <ul>{files.map((file, i) => <li key={i}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>)}</ul>}
          <button type="submit" className="p-button primary">{busy ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ xét duyệt'}</button>
        </fieldset>
      </form>}
    </>}
  </Modal>;
}
