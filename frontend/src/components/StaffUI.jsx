import UIButton from './common/Button.jsx';
import StatusBadge from './common/StatusBadge.jsx';
import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { staffApi } from '../services/staff.js';
import { StateView } from './PortalUI.jsx';
import '../styles/staff-workspace.css';

export const staffDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa cập nhật';
export const verificationLabels = { PENDING: 'Chờ xác minh', NEEDS_SUPPLEMENT: 'Cần bổ sung', APPROVED: 'Đã phê duyệt', REJECTED: 'Đã từ chối' };
export function StaffStatus({ status }) { return <StatusBadge status={status} label={verificationLabels[status] || status} />; }
export function useStaffLoad(type, id) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    staffApi[type](controller.signal, id).then(data => { if (!controller.signal.aborted) setState({ loading: false, data, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message }); });
    return () => controller.abort();
  }, [type, id, revision, user?.userId]);
  return { ...state, reload: () => setRevision(value => value + 1), replace: data => setState({ loading: false, error: '', data }) };
}
export function StaffLoadState({ state }) { return state.loading ? <StateView kind="loading" /> : <StateView kind="error" message={state.error}><UIButton className="p-button" onClick={state.reload}>Thử lại</UIButton></StateView>; }
export function StaffThumbnail({ registrationId, fileId, name }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(fileId));
  useEffect(() => {
    setUrl('');
    setLoading(Boolean(fileId));
    if (!fileId) return;
    const controller = new AbortController();
    let local;
    staffApi.file(registrationId, fileId, controller.signal).then(blob => { if (!controller.signal.aborted) { local = URL.createObjectURL(blob); setUrl(local); setLoading(false); } }).catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (local) URL.revokeObjectURL(local); };
  }, [registrationId, fileId]);
  return url ? <img className="sw-thumbnail" src={url} alt={name} onError={() => setUrl('')} /> : <span className="sw-thumbnail sw-no-image" aria-label={loading ? 'Đang tải ảnh' : fileId ? 'Không tải được ảnh' : 'Chưa có ảnh'}>{loading ? <LoaderCircle size={23} className="spin" /> : <ImageOff size={23} />}</span>;
}
export function StaffMetric({ label, value, hint, icon: Icon, tone = 'teal', children }) {
  return <article className={`sw-metric ${tone}`}><div><h3>{label}</h3><span className="sw-metric-icon"><Icon size={19} /></span></div><strong>{value == null ? '—' : value}</strong><span className="sw-metric-hint">{hint}</span>{children && <footer>{children}</footer>}</article>;
}
