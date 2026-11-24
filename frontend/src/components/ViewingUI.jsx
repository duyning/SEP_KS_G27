import { useCallback, useEffect, useState } from 'react';
import { accommodationApi } from '../services/accommodations.js';
import '../styles/notification-center.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useViewingUpdates } from '../hooks/useViewingUpdates.js';
import { StateView, StatusBadge } from './PortalUI.jsx';
import { accommodationViewingLink, formatViewingDate, viewingStatuses } from '../services/viewings.js';
import '../styles/viewing-flow.css';

export function useViewingData(load, key) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);
  const reload = () => setRevision(value => value + 1);
  useViewingUpdates(user?.userId, reload);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous =>
        previous?.key === key && previous.data !== undefined ? previous : { key, error: error.message });
    });
    return () => controller.abort();
  }, [key, load, revision]);
  const current = state?.key === key ? state : null;
  return { data: current?.data, error: current?.error, reload };
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

export function CopyPhoneButton({phone}) {
  const [message,setMessage]=useState('');
  return phone?<><button type="button" className="notice-button primary" onClick={async()=>{try{await navigator.clipboard.writeText(phone);setMessage('Đã sao chép SĐT');}catch{setMessage('Không sao chép được, vui lòng chọn số điện thoại.');}}}>Sao chép SĐT</button><span className="notice-copy-result" role="status">{message}</span></>:null;
}

export function ViewingDetails({ item, showAccommodationLink = false, host = false, onContactChange }) {
  const load=useCallback(signal=>accommodationApi.detail(item.propertyId,item.roomTypeId,signal),[item.propertyId,item.roomTypeId]);
  const {data:room}=useViewingData(load,`${item.propertyId}/${item.roomTypeId}`);
  const [copied,setCopied]=useState('');
  const phone=host?item.renterPhone:item.status==='APPROVED'?room?.publicContact?.phone:null;
  useEffect(()=>{onContactChange?.(phone||null);},[phone,onContactChange]);
  return <div className="viewing-details viewing-smart-details"><div className="viewing-smart-grid">
    <div><span>Nhà trọ &amp; Giá thuê</span><strong>{item.propertyName}</strong><p>{item.roomType}{room?.price>0?` · ${Number(room.price).toLocaleString('vi-VN')}đ/tháng`:''}</p></div>
    <div><span>Trạng thái &amp; Mã lịch</span><ViewingStatus status={item.status}/><strong>#{item.bookingId}</strong></div>
    <div><span>Thời gian hẹn xem</span><strong>{formatViewingDate(item.scheduledDate)}</strong></div>
    <div><span>{host?'Người liên hệ & SĐT':'Chủ trọ & SĐT'}</span><strong>{host?item.renterName:room?.publicContact?.hostName||'Thông tin liên hệ'}</strong>{phone?<><a href={`tel:${phone}`}>{phone}</a>{!onContactChange&&<button type="button" className="notice-button" onClick={async()=>{try{await navigator.clipboard.writeText(phone);setCopied('Đã sao chép SĐT');}catch{setCopied('Không sao chép được. Vui lòng chọn số điện thoại.');}}}>Sao chép SĐT</button>}</>:<p>{item.status==='APPROVED'?'Chưa có SĐT công khai':'Mở khóa khi lịch đã xác nhận'}</p>}</div>
   </div>{copied&&<p role="status">{copied}</p>}{item.note&&<p className="viewing-smart-note"><strong>Ghi chú:</strong> {item.note}</p>}{item.decisionReason&&<p className="viewing-smart-note"><strong>{item.status==='CANCELLED'?'Lý do hủy':'Phản hồi'}:</strong> {item.decisionReason}</p>}<p className="viewing-smart-timestamps">Gửi: {formatViewingDate(item.createdAt)}{item.processedAt?` · Xử lý: ${formatViewingDate(item.processedAt)}`:''}</p>{showAccommodationLink&&<Link className="notice-button" to={accommodationViewingLink(item)}>Xem thông tin phòng</Link>}</div>;
}

export function ViewingPagination({ page, hasNext, onPage }) {
  if (!page && !hasNext) return null;
  return <nav className="viewing-actions" aria-label="Phân trang">
    <button type="button" className="p-button" disabled={!page} onClick={() => onPage(page - 1)}>Trang trước</button>
    <span>Trang {page + 1}</span>
    <button type="button" className="p-button" disabled={!hasNext} onClick={() => onPage(page + 1)}>Trang sau</button>
  </nav>;
}
