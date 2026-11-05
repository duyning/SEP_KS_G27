import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, Pencil, RefreshCw, Search } from 'lucide-react';
import { StaffLoadState, StaffStatus, StaffThumbnail, staffDate, useStaffLoad } from '../../components/StaffUI.jsx';
import '../../styles/staff-verifications-refinement.css';

export default function StaffPropertyVerificationsPage() {
  const state = useStaffLoad('verifications');
  const [search,setSearch] = useState('');
  const [status,setStatus] = useState('ALL');
  const [sort,setSort] = useState('NEWEST');
  const [page,setPage] = useState(1);
  const rows = useMemo(() => (state.data || []).filter(item => (status === 'ALL' || (status === 'PROCESSED' ? ['APPROVED','REJECTED'].includes(item.status) : item.status === status)) && [item.name,item.ownerName,item.ownerEmail,item.ownerPhone,item.contactPhone,item.registrationId].some(value => String(value || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))).sort((a,b) => sort === 'FIFO' ? new Date(a.createdAt) - new Date(b.createdAt) : sort === 'NEWEST' ? new Date(b.createdAt) - new Date(a.createdAt) || b.registrationId-a.registrationId : new Date(b.reviewedAt || b.createdAt) - new Date(a.reviewedAt || a.createdAt)), [state.data,search,status,sort]);
  if (state.loading || state.error) return <div className="sw-page"><StaffLoadState state={state} /></div>;
  const totalPages = Math.max(1,Math.ceil(rows.length / 5));
  const current = Math.min(page,totalPages);
  const selectStatus = value => {setStatus(value);setPage(1);};
  const counters = [['Tổng hồ sơ',state.data.length,'Tất cả hồ sơ',FileText,'blue','ALL'],['Chờ xác minh',state.data.filter(item=>item.status==='PENDING').length,'Cần thẩm định',Clock3,'amber','PENDING'],['Cần bổ sung',state.data.filter(item=>item.status==='NEEDS_SUPPLEMENT').length,'Chờ chủ trọ bổ sung',Pencil,'violet','NEEDS_SUPPLEMENT'],['Đã xử lý',state.data.filter(item=>['APPROVED','REJECTED'].includes(item.status)).length,'Duyệt & Từ chối',CheckCircle2,'teal','PROCESSED']];
  return <div className="sw-page sv-list"><div className="sv-kpis" aria-label="Lọc theo tình trạng hồ sơ">{counters.map(([label,value,hint,Icon,tone,filter])=><MotionButton className={`sv-kpi ${tone}`} key={label} aria-pressed={status===filter} onClick={()=>selectStatus(filter)}><span className="sv-kpi-label">{label}<Icon size={19}/></span><strong>{value}</strong><span className="sv-kpi-hint">{hint}</span></MotionButton>)}</div>
    <section className="sw-panel sv-results" aria-label="Danh sách hồ sơ xác minh">
      <div className="sv-filter-grid">
        <label className="sv-search-field"><span>Tìm hồ sơ</span><div className="sw-search"><Search size={17}/><input aria-label="Tìm hồ sơ" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Tên nhà trọ, chủ trọ, số điện thoại, mã hồ sơ..."/></div></label>
        <label><span>Trạng thái</span><select aria-label="Trạng thái hồ sơ" value={status} onChange={event=>selectStatus(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chờ xác minh</option><option value="NEEDS_SUPPLEMENT">Cần bổ sung</option><option value="APPROVED">Đã phê duyệt</option><option value="REJECTED">Đã từ chối</option><option value="PROCESSED">Đã xử lý</option></select></label>
        <label><span>Sắp xếp</span><select aria-label="Sắp xếp hồ sơ" value={sort} onChange={event=>{setSort(event.target.value);setPage(1);}}><option value="FIFO">Cũ nhất trước</option><option value="NEWEST">Mới nhất trước</option><option value="UPDATED">Cập nhật gần nhất</option></select></label>
        <MotionButton className="p-button sv-reset" onClick={()=>{setSearch('');setStatus('ALL');setSort('NEWEST');setPage(1);}}><RefreshCw size={15}/>Đặt lại</MotionButton>
      </div>
      <div className="sv-result-summary" role="status"><strong>{rows.length} hồ sơ</strong><span>trong tổng số {state.data.length} hồ sơ</span></div>
      <div className="sw-table-wrap"><table className="sw-table sw-verifications"><thead><tr><th>Nhà trọ & Mã hồ sơ</th><th>Chủ trọ / Đại diện</th><th>Ngày gửi</th><th>Trạng thái</th><th>Cập nhật gần nhất</th><th>Thao tác</th></tr></thead><tbody>{rows.slice((current-1)*5,current*5).map(item=><tr key={item.registrationId}><td data-label="Nhà trọ"><div className="sw-property-cell"><StaffThumbnail registrationId={item.registrationId} fileId={item.coverId} name={item.name}/><div><strong>{item.name}</strong><div className="sw-row-tags"><span>HS-{item.registrationId}</span>{item.propertyType&&<span>{item.propertyType}</span>}<span className={item.documentCount>=3?'complete':'incomplete'}>{item.documentCount ?? 0}/3 tài liệu xác minh</span></div><p>{item.address || 'Chưa cập nhật địa chỉ'}</p></div></div></td><td data-label="Chủ trọ / Đại diện"><div><strong>{item.managerName || item.ownerName || 'Chưa cập nhật'}</strong><p>{item.contactPhone || item.ownerPhone || 'Chưa có SĐT'}</p><small>{item.ownerEmail}</small></div></td><td data-label="Ngày gửi">{staffDate(item.createdAt)}</td><td data-label="Trạng thái"><StaffStatus status={item.status}/></td><td data-label="Cập nhật">{item.reviewedAt?staffDate(item.reviewedAt):item.status==='PENDING'?'Chưa xử lý':'Chưa có thời gian cập nhật'}{item.reviewerName&&<small>bởi {item.reviewerName}</small>}</td><td data-label="Thao tác"><Link className="sw-outline small" to={`/staff/verifications/detail?id=${item.registrationId}`}>Xem hồ sơ<ArrowRight size={14}/></Link></td></tr>)}</tbody></table></div>
      {!rows.length&&<p className="sw-empty">{state.data.length?'Không có hồ sơ phù hợp với bộ lọc.':'Chưa có hồ sơ đăng ký nhà trọ được gửi lên.'}</p>}
      <footer className="sw-pagination"><span>{rows.length?`Đang hiển thị ${(current-1)*5+1}–${Math.min(current*5,rows.length)} trong tổng số ${rows.length} hồ sơ`:'Không có hồ sơ'}</span><div><MotionButton className="p-icon" aria-label="Trang trước" title="Trang trước" disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></MotionButton><span>{current} / {totalPages}</span><MotionButton className="p-icon" aria-label="Trang sau" title="Trang sau" disabled={current===totalPages} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></MotionButton></div></footer>
    </section>
  </div>;
}
