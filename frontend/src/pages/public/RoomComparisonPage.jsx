import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowLeftRight,EyeOff,LoaderCircle,X,RefreshCw} from 'lucide-react';
import {useFavorites} from '../../context/FavoritesContext.jsx';
import {loadComparison,parseComparisonIds,comparisonRows,favoritesSelectionUrl} from '../../services/room-comparison.js';
import {DetailImage} from '../../components/detail/DetailPrototypeParts.jsx';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/favorites-api.css';
import '../../styles/room-comparison.css';

export default function RoomComparisonPage() {
  const [params,setParams]=useSearchParams();
  const {ids,error}=parseComparisonIds(params.get('ids')||''),key=ids.join(',');
  const {revision}=useFavorites();
  const [retry,setRetry]=useState(0),[state,setState]=useState({key:'',loading:true,columns:[]});
  const differences=params.get('differences')==='1';
  useEffect(()=>{document.title='So sánh phòng đã lưu | HL_RCS';},[]);
  useEffect(()=>{
    if(error||ids.length<2)return;
    const controller=new AbortController();setState({key,loading:true,columns:[]});
    Promise.all(key.split(',').map(id=>loadComparison(Number(id),controller.signal))).then(columns=>{
      if(!controller.signal.aborted)setState({key,loading:false,columns});
    }).catch(()=>{ /* The request is aborted when the selection, account or route changes. */ });
    return()=>controller.abort();
  },[key,error,retry,revision]);
  function remove(id) {
    const next=new URLSearchParams(params);next.set('ids',ids.filter(value=>value!==id).join(','));setParams(next);
  }
  const columns=state.columns;
  const rows=comparisonRows(columns).filter(row=>!differences||row.different);
  return <DetailPrototypeShell className="prototype-comparison"><main className="comparison-page container">
    <Link className="comparison-back" to={favoritesSelectionUrl(ids)}><ArrowLeft size={17}/>Về phòng đã lưu</Link>
    <header className="comparison-heading"><div><span className="favorites-eyebrow"><ArrowLeftRight size={18}/>ĐỐI CHIẾU LỰA CHỌN</span><h1>So sánh phòng đã lưu</h1><p>Tối đa 4 loại phòng. Giá và tình trạng được lấy từ thông tin công khai hiện tại.</p></div><Link className="p-button" to={favoritesSelectionUrl(ids)}>Chọn / thay phòng</Link></header>
    {error||ids.length<2?<section className="favorites-state"><ArrowLeftRight size={36}/><h2>{error||'Chọn ít nhất 2 phòng để so sánh'}</h2><p>Quay lại danh sách đã lưu và chọn từ 2 đến 4 loại phòng.</p><Link className="p-button primary" to={favoritesSelectionUrl(ids)}>Chọn phòng đã lưu</Link></section>:state.loading||state.key!==key?<section className="favorites-state" role="status"><LoaderCircle className="spin"/><p>Đang tải thông tin so sánh...</p></section>:<>
      <div className="comparison-toolbar"><label><input type="checkbox" checked={differences} onChange={event=>{const next=new URLSearchParams(params);if(event.target.checked)next.set('differences','1');else next.delete('differences');setParams(next,{replace:true});}}/>Chỉ hiện điểm khác biệt</label><button type="button" className="p-button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={16}/>Cập nhật thông tin</button></div>
      <p className="comparison-note">Ô xanh đánh dấu giá thuê / tiền ban đầu thấp hơn hoặc diện tích lớn hơn trong các phòng có dữ liệu. Tiền ban đầu chỉ gồm tiền phòng và tiền cọc; chưa gồm các phí khác.</p>
      <div className="comparison-table-wrap" tabIndex={0} role="region" aria-label="Bảng so sánh phòng, cuộn ngang để xem các phòng">
        <table className="comparison-table" style={{'--compare-columns':columns.length}}><caption className="comparison-sr-only">So sánh {columns.length} loại phòng đã lưu theo chi phí, diện tích và tiện nghi</caption><thead><tr><th scope="col" className="comparison-criteria">Tiêu chí</th>{columns.map((column,index)=><th scope="col" key={column.favoriteId}>
          <div className="comparison-column-heading"><span>Phòng {index+1}</span><button type="button" aria-label={`Bỏ phòng ${index+1} khỏi bảng so sánh`} onClick={()=>remove(column.favoriteId)}><X size={18}/></button></div>
          {column.status==='ready'?<><DetailImage className="comparison-photo" src={column.data.imageUrl||column.data.gallery?.[0]?.url} alt={`${column.data.propertyName} — ${column.data.roomTypeName}`}/><span className="comparison-property">{column.data.propertyName}</span><h2>{column.data.roomTypeName}</h2><div className="comparison-column-actions"><Link to={`/properties/detail?propertyId=${column.data.propertyId}&roomTypeId=${column.data.roomTypeId}`}>Xem chi tiết</Link><Link to={`/properties/detail?propertyId=${column.data.propertyId}&roomTypeId=${column.data.roomTypeId}#host-contact`}>Liên hệ</Link></div></>:column.status==='unavailable'?<div className="comparison-unavailable"><EyeOff size={28}/><h2>Không còn khả dụng</h2><p>Mục đã bị bỏ lưu hoặc thông tin hiện không được công khai.</p></div>:<div className="comparison-column-error" role="alert"><h2>Chưa thể tải phòng</h2><p>{column.error}</p><button type="button" className="p-button" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></div>}
          <Link className="comparison-replace" to={favoritesSelectionUrl(ids.filter(id=>id!==column.favoriteId))}>Thay phòng này</Link>
        </th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.key}><th scope="row" className="comparison-criteria">{row.label}</th>{row.cells.map((cell,index)=><td key={columns[index].favoriteId} className={cell.best?'comparison-best':''}>{columns[index].status==='ready'?cell.text:'—'}{cell.best&&<span className="comparison-best-label">{row.key==='areaSqm'?'Diện tích lớn hơn':'Chi phí thấp hơn'}</span>}</td>)}</tr>)}</tbody></table>
        {!rows.length&&<p className="comparison-same" role="status">Các tiêu chí hiện tại giống nhau. Bỏ chọn “Chỉ hiện điểm khác biệt” để xem toàn bộ.</p>}
      </div>
      <p className="comparison-footnote">“Chưa ghi nhận” nghĩa là tiện nghi chưa được khai báo; hãy xác nhận với chủ trọ. Trên điện thoại, vuốt ngang bảng để xem đủ các phòng.</p>
    </>}
  </main></DetailPrototypeShell>;
}
