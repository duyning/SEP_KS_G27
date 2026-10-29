import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { serviceReviewApi as api, validateServiceReview } from '../../services/service-review.js';
import '../../styles/service-applications.css';

const status = { PENDING: 'Chờ xét duyệt', APPROVED: 'Đã cấp capability', REJECTED: 'Đã từ chối', NEEDS_SUPPLEMENT: 'Cần bổ sung' };
const decisionLabel = value => ({ APPROVE: 'Duyệt', REJECT: 'Từ chối' })[value] || 'Chưa quyết định';
const time = value => value ? new Date(value).toLocaleString('vi-VN') : '—';

export default function StaffServiceApplicationsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams(); const selected = params.get('id');
  const activeSelection = useRef(selected); activeSelection.current = selected;
  const [rows, setRows] = useState([]); const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [capability, setCapability] = useState(''); const [listing, setListing] = useState(''); const [reason, setReason] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setDetail(null);
    setCapability(''); setListing(''); setReason('');
    (selected ? api.detail(selected, controller.signal) : api.list(controller.signal))
      .then(data => {
        if (controller.signal.aborted) return;
        if (selected) setDetail(data); else setRows(data);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, user.userId, revision]);
  const row = detail?.application;
  async function mutate(action) {
    if (busy) return;
    setBusy(true); setError('');
    const requested = selected;
    try { const result = await action(); if (activeSelection.current === requested) setDetail(result); window.dispatchEvent(new Event('hlrcs:staff-updated')); }
    catch (err) { if (activeSelection.current === requested) setError(err.message); }
    finally { setBusy(false); }
  }
  async function download(doc) {
    try {
      const blob = await api.file(selected, doc.documentId); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  }
  function review(event) {
    event.preventDefault(); const error = validateServiceReview(capability, listing, reason);
    if (error) { setError(error); return; }
    mutate(() => api.review(selected, capability, listing, reason));
  }
  return <main className="service-applications">
    <div className="service-applications-heading"><h1>{selected ? `Hồ sơ dịch vụ #${selected}` : 'Xét duyệt hồ sơ cung cấp dịch vụ'}</h1><button disabled={busy} onClick={() => setRevision(v => v + 1)}>Tải lại</button></div>
    <p>Staff và Admin đều có thể xem tài liệu và xét duyệt các hồ sơ chờ xử lý.</p>
    {selected && <Link to="/staff/service-applications">← Danh sách hồ sơ</Link>}
    {error && <p role="alert" className="service-error">{error}</p>}
    {loading ? <p role="status">Đang tải hồ sơ...</p> : !selected ? <>
      {!rows.length && !error && <p>Chưa có hồ sơ dịch vụ.</p>}
      <div className="service-table-wrap"><table><thead><tr><th>Hồ sơ / Dịch vụ</th><th>Người đăng ký</th><th>Người duyệt</th><th>Trạng thái</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead><tbody>{rows.map(row => <tr key={row.registrationId}><td>#{row.registrationId} · {row.serviceName}</td><td>{row.applicantName}</td><td>{row.reviewerName || 'Chưa xét duyệt'}</td><td>{status[row.status]}</td><td>{time(row.createdAt)}</td><td><Link to={`/staff/service-applications?id=${row.registrationId}`}>Xem hồ sơ</Link></td></tr>)}</tbody></table></div>
    </> : row && <>
      <section><h2>{row.serviceName}</h2><p>{status[row.status]} · {row.categoryName}</p>
        <dl><dt>Người đăng ký</dt><dd>{row.applicantName} (tài khoản #{row.applicantId})</dd><dt>Liên hệ</dt><dd>{row.contactPhone} · {row.contactEmail || 'Không có email'}</dd><dt>Mô tả</dt><dd className="service-text">{row.description}</dd><dt>Khu vực</dt><dd>{row.serviceArea}</dd><dt>Giá</dt><dd>{row.pricingType === 'NEGOTIABLE' ? 'Thỏa thuận' : `${row.pricingType === 'FROM' ? 'Từ ' : ''}${Number(row.price).toLocaleString('vi-VN')} VNĐ`}</dd><dt>Ngày gửi</dt><dd>{time(row.createdAt)}</dd></dl>
        <h3>Tài liệu xác minh</h3>{!row.documents.length && <p>Hồ sơ không có tài liệu.</p>}{row.documents.map(doc => <button key={doc.documentId} onClick={() => download(doc)}>{doc.name} ↓</button>)}
      </section>
      {row.status === 'PENDING' && row.applicantId === user.userId && <p>Hồ sơ của bạn cần được một Staff hoặc Admin khác xét duyệt.</p>}
      {row.status === 'PENDING' && row.applicantId !== user.userId && <section><h2>Quyết định thẩm định</h2><form onSubmit={review}><fieldset disabled={busy}>
        <label>Quyền cung cấp dịch vụ<select required value={capability} onChange={e => { setCapability(e.target.value); if (e.target.value === 'REJECT') setListing('REJECT'); }}><option value="">Chọn quyết định</option><option value="APPROVE">Cấp quyền Service Owner</option><option value="REJECT">Từ chối cấp quyền</option></select></label>
        <label>Nội dung dịch vụ đầu tiên<select required value={listing} onChange={e => setListing(e.target.value)}><option value="">Chọn quyết định</option><option value="APPROVE" disabled={capability !== 'APPROVE'}>Duyệt và công khai dịch vụ</option><option value="REJECT">Từ chối công khai</option></select></label>
        <label>Lý do xét duyệt *<textarea required minLength={10} maxLength={2000} rows={4} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p>Chỉ công khai khi cả capability và nội dung được duyệt. Quyết định có hiệu lực ngay khi lưu và không được duyệt lại.</p><button type="submit">{busy ? 'Đang lưu...' : 'Lưu quyết định xét duyệt'}</button>
      </fieldset></form></section>}
      {row.reviewedAt && <section role="status"><h2>Kết quả xét duyệt</h2><p>Service Owner: {decisionLabel(row.capabilityDecision)} · Nội dung: {decisionLabel(row.listingDecision)}</p><p className="service-text">Lý do: {row.reasonNote}</p><p>{row.reviewerName} · {time(row.reviewedAt)}</p><p>Nhà cung cấp #{row.providerId} · Quyền hiện tại: {row.capabilityActive ? 'Đang hoạt động' : 'Chưa có / Đã ngừng'}</p><p>{row.serviceId ? `Dịch vụ #${row.serviceId} · ${row.serviceState}` : 'Chưa tạo dịch vụ công khai'}</p>{row.publicEligible && <Link to={`/services/detail?id=${row.serviceId}`}>Xem dịch vụ công khai</Link>}</section>}
      <section><h2>Lịch sử xử lý</h2>{detail.history.map(item => <p key={item.id}>{time(item.time)} · {item.actor} · {item.action}<br />{item.reason}</p>)}</section>
    </>}
  </main>;
}
