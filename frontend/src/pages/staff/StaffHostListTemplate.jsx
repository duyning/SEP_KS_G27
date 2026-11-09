import {useState,useSyncExternalStore} from 'react';
import {Modal} from '../../components/PortalUI.jsx';
import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { CheckCheck, Clock3, Files, FilePenLine, RotateCcw, Search, Filter, LoaderCircle, X } from 'lucide-react';
const subscribe=listener=>{const media=window.matchMedia('(max-width:640px)');media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener);};
export default function StaffHostListTemplate(props){
 const [filterOpen,setFilterOpen]=useState(false);
 const mobile=useSyncExternalStore(subscribe,()=>window.matchMedia('(max-width:640px)').matches,()=>false);
 const filterFields=<>    <label className="sha-select"><span className="sha-filter-label">Trạng thái</span><select id="selectStatusFilter" value={props.filters.status}>{[['ALL','Tất cả trạng thái'],['PENDING_REVIEW','Chờ xét duyệt'],['NEEDS_CHANGES','Cần bổ sung'],['PROCESSED','Đã xử lý'],['APPROVED','Đã phê duyệt'],['REJECTED','Đã từ chối']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="sha-select"><span className="sha-filter-label">Sắp xếp</span><select id="selectSortFilter" value={props.filters.sort}><option value="NEWEST">Gửi gần nhất</option><option value="OLDEST">Gửi lâu nhất</option><option value="UPDATED">Cập nhật gần nhất</option><option value="NAME_ASC">Tên A–Z</option></select></label>
</>;
 const {stats}=props.data;
 const metrics=[['cardKpiAll','kpiTotal','Tổng hồ sơ',stats.total,Files,'ALL'],['cardKpiPending','kpiPending','Chờ xét duyệt',stats.pending,Clock3,'PENDING_REVIEW'],['cardKpiNeedsChanges','kpiNeedsChanges','Cần bổ sung',stats.needsChanges,FilePenLine,'NEEDS_CHANGES'],['cardKpiProcessed','kpiProcessed','Đã xử lý',stats.approved+stats.rejected,CheckCheck,'PROCESSED']];
 return <div className="sha-page" onClick={props.onClick} onChange={props.onChange}>
  <section className="sha-metrics" aria-label="Thống kê hồ sơ">{metrics.map(([id,number,label,value,Icon,status])=><MotionButton type="button" key={id} id={id} className={`sha-metric ${status.toLowerCase()}`} aria-pressed={props.filters.status===status}><span>{label}</span><Icon size={19}/><strong id={number}>{value}</strong><small>{status==='PENDING_REVIEW'?'Hồ sơ cần thẩm định':status==='NEEDS_CHANGES'?'Chờ người đăng ký cập nhật':status==='PROCESSED'?'Đã phê duyệt hoặc từ chối':'Tất cả hồ sơ đã tiếp nhận'}</small></MotionButton>)}</section>
  <section className="sha-panel" aria-label="Danh sách hồ sơ đăng ký">
   <div className="sha-filters" role="search" aria-label="Bộ lọc hồ sơ đăng ký">
    <label className="sha-search">{props.loading?<LoaderCircle size={17} className="spin"/>:<Search size={17}/>}<span className="sha-sr-only">Tìm hồ sơ</span><input id="searchHostReg" type="search" placeholder="Tên, số điện thoại, email hoặc mã hồ sơ..." autoComplete="off" value={props.filters.search}/>{props.filters.search&&<MotionButton type="button" id="btnClearSearch" aria-label="Xóa tìm kiếm"><X size={15}/></MotionButton>}</label>
    {mobile?<MotionButton type="button" className="sha-button sha-filter-trigger" aria-expanded={filterOpen} onClick={()=>setFilterOpen(true)}><Filter size={16}/>Bộ lọc{props.filters.status!=='ALL'?' •':''}</MotionButton>:filterFields}
    <MotionButton type="button" id="btnResetFilter" className="sha-button"><RotateCcw size={15}/>Đặt lại</MotionButton>
   </div>
   <span className="sha-sr-only" id="resultCountText" role="status">{props.loading?'Đang cập nhật danh sách…':`${props.data.totalElements} hồ sơ`}</span>
   <div className="sha-table-wrap"><table className="sha-table" id="registrationsTable" aria-label="Bảng danh sách hồ sơ đăng ký làm chủ trọ"><thead><tr>{['Người đăng ký','Liên hệ','Thông tin đăng ký','Ngày gửi','Trạng thái','Thao tác'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody id="registrationsTableBody">{props.rows}</tbody></table></div>
   <div id="mobileCardsContainer" className="sha-mobile-cards">{props.cards}</div>
   {!props.data.totalElements&&<div className="sha-empty"><Search size={28}/><h3>{props.data.stats.total===0?'Chưa có hồ sơ đăng ký':props.filters.status==='PENDING_REVIEW'&&!props.filters.search?'Đã xử lý hết hồ sơ chờ duyệt':'Không tìm thấy hồ sơ phù hợp'}</h3><p>{props.data.stats.total===0?'Hồ sơ mới sẽ xuất hiện tại đây khi người dùng gửi đăng ký.':'Thử thay đổi từ khóa hoặc trạng thái để xem các hồ sơ khác.'}</p>{(props.filters.search||props.filters.status!=='ALL'||props.filters.sort!=='NEWEST')&&<MotionButton type="button" id="btnEmptyReset" className="sha-button">Đặt lại bộ lọc</MotionButton>}</div>}
   <footer className="sha-pagination"><span id="paginationInfo">{props.paginationInfo}</span><div id="paginationButtons">{props.pagination}</div></footer>
  </section>
  {mobile&&<AnimatePresence>{filterOpen&&<Modal title="Bộ lọc hồ sơ" className="sha-filter-modal" onClose={()=>setFilterOpen(false)}><div className="sha-filter-sheet">{filterFields}<MotionButton type="button" className="sha-button primary" onClick={()=>setFilterOpen(false)}>Xem kết quả</MotionButton></div></Modal>}</AnimatePresence>}
 </div>;
}
