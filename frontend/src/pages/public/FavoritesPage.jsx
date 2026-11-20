import UIButton from '../../components/common/Button.jsx';
import UIField from '../../components/common/Field.jsx';
import ComparisonBar from '../../components/ComparisonBar.jsx';
import {parseComparisonIds} from '../../services/room-comparison.js';
import '../../styles/room-comparison.css';
import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Heart,LoaderCircle,EyeOff} from 'lucide-react';
import {favoritesApi} from '../../services/favorites.js';
import {useFavoriteActions} from '../../context/FavoritesContext.jsx';
import SearchPrototypeCard from '../../components/SearchPrototypeCard.jsx';
import FavoriteNotice from '../../components/FavoriteNotice.jsx';
import {readSearchOrigin,withSearchOrigin} from '../../services/search-origin.js';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import {paginationRange} from '../../services/pagination.js';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/search-prototype.css';
import '../../styles/favorites-api.css';

export default function FavoritesPage() {
 const [params,setParams]=useSearchParams();
 const origin=readSearchOrigin(params);
 const selection=parseComparisonIds(params.get('compare')||''),selected=selection.ids;
 function select(value){setParams(previous=>{const next=new URLSearchParams(previous),current=parseComparisonIds(previous.get('compare')||'').ids,ids=typeof value==='function'?value(current):value;if(ids.length)next.set('compare',ids.join(','));else next.delete('compare');return next;},{replace:true});}
 function changePage(value){const next=new URLSearchParams(params);next.set('page',String(value));setParams(next);}
 function toggleComparison(id){select(ids=>ids.includes(id)?ids.filter(value=>value!==id):ids.length<4?[...ids,id]:ids);}
 async function removeFavorite(favorite){if(await favorites.remove(favorite.favoriteId,favorite.roomTypeId))select(ids=>ids.filter(id=>id!==favorite.favoriteId));}
 const changeUrl=useRef(setParams);changeUrl.current=setParams;
 const value=Number(params.get('page')||1),page=Number.isSafeInteger(value)&&value>0?value:1;
 const [state,setState]=useState({loading:true,error:'',data:null}),[reload,setReload]=useState(0);
 const favorites=useFavoriteActions(state.data?.items.map(item=>item.roomTypeId)||[]);
 useEffect(()=>{document.title='Phòng yêu thích | HL_RCS';},[]);
 useEffect(()=>{
  const c=new AbortController();setState({loading:true,error:'',data:null});
  favoritesApi.list(page-1,6,c.signal).then(data=>{
   if(c.signal.aborted)return;
   if(page>Math.max(1,data.totalPages)){changeUrl.current(previous=>{const next=new URLSearchParams(previous);next.set('page',String(Math.max(1,data.totalPages)));return next;},{replace:true});return;}
   setState({loading:false,error:'',data});
  }).catch(error=>{if(!c.signal.aborted)setState({loading:false,error:error.message,data:null});});
  return()=>c.abort();
 },[page,favorites.revision,reload]);
 return <DetailPrototypeShell className="prototype-search"><main className={`favorites-page container${selected.length?' has-comparison-selection':''}`}>
  <header className="favorites-heading"><div><span className="favorites-eyebrow"><Heart size={18}/>LỰA CHỌN CỦA BẠN</span><h1>Phòng yêu thích{state.data? ' ('+state.data.totalElements+')':''}</h1><p>Xem lại các loại phòng bạn quan tâm. Giá và tình trạng phòng được cập nhật theo thông tin công khai hiện tại.</p></div><Link className="p-button primary" to={withSearchOrigin('/search',origin)}>Khám phá thêm phòng</Link></header>
  <FavoriteNotice favorites={favorites}/>{selection.error&&<p className="favorite-notice" role="alert">{selection.error}<UIButton className="p-button" onClick={()=>select([])}>Đặt lại lựa chọn</UIButton></p>}<p className="comparison-hint">Chọn tối đa 4 phòng yêu thích để so sánh giá, diện tích, chi phí và tiện nghi.</p>
  {state.loading?<div className="favorites-state" role="status"><LoaderCircle className="spin"/><p>Đang tải danh sách yêu thích...</p></div>:state.error?<div className="favorites-state" role="alert"><h2>Không thể tải danh sách yêu thích</h2><p>{state.error}</p><UIButton className="p-button primary" onClick={()=>setReload(v=>v+1)}>Thử lại</UIButton></div>:!state.data?.items.length?<div className="favorites-state"><Heart size={42}/><h2>Bạn chưa có phòng yêu thích</h2><p>Nhấn biểu tượng trái tim khi tìm kiếm hoặc xem chi tiết để thêm phòng vào danh sách yêu thích.</p><Link className="p-button primary" to={withSearchOrigin('/search',origin)}>Tìm phòng ngay</Link></div>:<div className="favorites-grid">{state.data.items.map(favorite=>favorite.available&&favorite.accommodation?<SearchPrototypeCard key={favorite.favoriteId} item={favorite.accommodation} saved onSave={()=>removeFavorite(favorite)} saveBusy={favorites.pending.has(favorite.roomTypeId)} comparisonControl={<UIField className={`comparison-select${selected.includes(favorite.favoriteId)?' is-selected':''}`}><input type="checkbox" checked={selected.includes(favorite.favoriteId)} disabled={!selected.includes(favorite.favoriteId)&&selected.length>=4} onChange={()=>toggleComparison(favorite.favoriteId)} aria-label={`So sánh ${favorite.accommodation.propertyName} — ${favorite.accommodation.roomTypeName}`}/><span>{selected.includes(favorite.favoriteId)?'Đã chọn so sánh':'Chọn để so sánh'}</span></UIField>}/>:<article className="favorite-unavailable" key={favorite.favoriteId}><div className="favorite-unavailable-icon"><EyeOff size={32}/></div><h2>Loại phòng không còn khả dụng</h2><p>Thông tin này hiện không được công khai. Bạn vẫn có thể bỏ mục này khỏi danh sách yêu thích.</p><span>Ngày thêm: {new Date(favorite.createdAt).toLocaleDateString('vi-VN')}</span><UIButton type="button" className="p-button" disabled={favorites.pending.has(favorite.roomTypeId)} onClick={()=>removeFavorite(favorite)}>{favorites.pending.has(favorite.roomTypeId)?'Đang bỏ yêu thích...':'Bỏ yêu thích'}</UIButton></article>)}</div>}
  {!state.loading&&!state.error&&state.data?.totalPages>1&&<nav className="favorites-pagination" aria-label="Phân trang yêu thích"><UIButton type="button" className="p-button" disabled={page===1} onClick={()=>changePage(page-1)}>← Trước</UIButton>{paginationRange(page,state.data.totalPages).map(value=>typeof value==='number'?<UIButton type="button" key={value} className="p-button" aria-current={page===value?'page':undefined} onClick={()=>changePage(value)}>{value}</UIButton>:<span key={value}>…</span>)}<UIButton type="button" className="p-button" disabled={page===state.data.totalPages} onClick={()=>changePage(page+1)}>Sau →</UIButton></nav>}
  <ComparisonBar ids={selected} origin={origin} onClear={()=>select([])}/>
 </main></DetailPrototypeShell>;
}
