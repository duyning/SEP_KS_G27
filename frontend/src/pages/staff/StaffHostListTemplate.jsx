import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { CheckCheck, Clock3, Files, FilePenLine, RotateCcw, Search, X } from 'lucide-react';
export default function StaffHostListTemplate(props){
 const {stats}=props.data;
 const metrics=[['cardKpiAll','kpiTotal','Tổng hồ sơ',stats.total,Files,'ALL'],['cardKpiPending','kpiPending','Chờ xét duyệt',stats.pending,Clock3,'PENDING_REVIEW'],['cardKpiNeedsChanges','kpiNeedsChanges','Cần bổ sung',stats.needsChanges,FilePenLine,'NEEDS_CHANGES'],['cardKpiProcessed','kpiProcessed','Đã xử lý',stats.approved+stats.rejected,CheckCheck,'PROCESSED']];
 return <div className="sha-page" onClick={props.onClick} onChange={props.onChange}>
  <section className="sha-metrics" aria-label="Thống kê hồ sơ">{metrics.map(([id,number,label,value,Icon,status])=><MotionButton type="button" key={id} id={id} className={`sha-metric ${status.toLowerCase()}`} aria-pressed={props.filters.status===status}><span>{label}</span><Icon size={19}/><strong id={number}>{value}</strong><small>{status==='PENDING_REVIEW'?'Hồ sơ cần thẩm định':status==='NEEDS_CHANGES'?'Chờ người đăng ký cập nhật':status==='PROCESSED'?'Đã phê duyệt hoặc từ chối':'Tất cả hồ sơ đã tiếp nhận'}</small></MotionButton>)}</section>
  <section className="sha-panel" aria-label="Danh sách hồ sơ đăng ký">
   <div className="sha-filters" role="search" aria-label="Bộ lọc hồ sơ đăng ký">
    <label className="sha-search"><Search size={17}/><span className="sha-sr-only">Tìm hồ sơ</span><input id="searchHostReg" type="search" placeholder="Tên, số điện thoại, email hoặc mã hồ sơ..." autoComplete="off" value={props.filters.search}/>{props.filters.search&&<MotionButton type="button" id="btnClearSearch" aria-label="Xóa tìm kiếm"><X size={15}/></MotionButton>}</label>
    <label className="sha-select"><span>Trạng thái</span><select id="selectStatusFilter" value={props.filters.status}>{[['ALL','Tất cả trạng thái'],['PENDING_REVIEW','Chờ xét duyệt'],['NEEDS_CHANGES','Cần bổ sung'],['PROCESSED','Đã xử lý'],['APPROVED','Đã phê duyệt'],['REJECTED','Đã từ chối']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="sha-select"><span>Sắp xếp</span><select id="selectSortFilter" value={props.filters.sort}><option value="NEWEST">Gửi gần nhất</option><option value="OLDEST">Gửi lâu nhất</option><option value="UPDATED">Cập nhật gần nhất</option><option value="NAME_ASC">Tên A–Z</option></select></label>
    <MotionButton type="button" id="btnResetFilter" className="sha-button"><RotateCcw size={15}/>Đặt lại</MotionButton>
   </div>
   <div className="sha-results-label" id="resultCountText">Hiển thị: {props.data.totalElements} hồ sơ</div>
   <div className="sha-table-wrap"><table className="sha-table" id="registrationsTable" aria-label="Bảng danh sách hồ sơ đăng ký làm chủ trọ"><thead><tr>{['Người đăng ký','Liên hệ','Khu vực & Quy mô','Ngày gửi','Trạng thái','Cập nhật','Thao tác'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody id="registrationsTableBody">{props.rows}</tbody></table></div>
   <div id="mobileCardsContainer" className="sha-mobile-cards">{props.cards}</div>
   {!props.data.totalElements&&<div className="sha-empty"><Search size={28}/><h3>Không tìm thấy hồ sơ đăng ký nào</h3><p>Thử thay đổi từ khóa hoặc trạng thái để xem các hồ sơ khác.</p><MotionButton type="button" id="btnEmptyReset" className="sha-button">Đặt lại bộ lọc</MotionButton></div>}
   <footer className="sha-pagination"><span id="paginationInfo">{props.paginationInfo}</span><div id="paginationButtons">{props.pagination}</div></footer>
  </section>
 </div>;
}
