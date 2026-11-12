import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateView, StatusBadge } from './PortalUI.jsx';
import { accommodationViewingLink, formatViewingDate, viewingStatuses } from '../services/viewings.js';
import '../styles/viewing-flow.css';

export function useViewingData(load, key) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, revision, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, revision, error: error.message });
    });
    return () => controller.abort();
  }, [key, load, revision]);
  const current = state?.key === key && state.revision === revision ? state : null;
  return { data: current?.data, error: current?.error, reload: () => setRevision(value => value + 1) };
}

export function ViewingLoadState({ error, retry }) {
  return error
    ? <StateView kind="error" message={error}><button type="button" className="p-button primary" onClick={retry}>Thử lại</button></StateView>
    : <StateView kind="loading" />;
}

export function ViewingStatus({ status }) {
  const tone = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger' }[status];
  return <StatusBadge tone={tone}>{viewingStatuses[status] || status}</StatusBadge>;
}

export function ViewingDetails({ item, showAccommodationLink = false }) {
  const fields = [
    ['Nhà trọ', item.propertyName], ['Loại phòng', item.roomType],
    ['Lịch hẹn (giờ Việt Nam)', formatViewingDate(item.scheduledDate)],
    ['Người liên hệ', item.renterName], ['Số điện thoại', item.renterPhone], ['Ghi chú', item.note],
    ['Thời điểm gửi', item.createdAt && formatViewingDate(item.createdAt)],
    [item.status === 'CANCELLED' ? 'Thời điểm hủy' : 'Thời điểm phản hồi', item.processedAt && formatViewingDate(item.processedAt)],
    [item.status === 'CANCELLED' ? 'Lý do hủy' : 'Lý do phản hồi', item.decisionReason],
  ];
  return <div className="viewing-details">
    <ViewingStatus status={item.status} />
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
    {showAccommodationLink && <Link className="p-button" to={accommodationViewingLink(item)}>Xem thông tin phòng</Link>}
  </div>;
}

export function ViewingPagination({ page, hasNext, onPage }) {
  if (!page && !hasNext) return null;
  return <nav className="viewing-actions" aria-label="Phân trang">
    <button type="button" className="p-button" disabled={!page} onClick={() => onPage(page - 1)}>Trang trước</button>
    <span>Trang {page + 1}</span>
    <button type="button" className="p-button" disabled={!hasNext} onClick={() => onPage(page + 1)}>Trang sau</button>
  </nav>;
}
