import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Search,List,Map,LoaderCircle,RotateCcw,X} from 'lucide-react';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import SearchPrototypeCard from '../../components/SearchPrototypeCard.jsx';
import {useToast} from '../../components/PortalUI.jsx';
import useAccommodations from '../../hooks/useAccommodations.js';
import {accommodationQuery} from '../../services/accommodations.js';
import {paginationRange} from '../../services/pagination.js';
import {readSearchFilters,updateSearchFilters,searchLocations,searchPrices,searchTypes,searchAmenities,searchSorts} from '../../services/search-prototype.js';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/search-prototype.css';
import '../../styles/search-prototype-integration.css';

const savedKey='hlrcs:public-saved-properties',PAGE_SIZE=6;
function readSaved(){try{const value=JSON.parse(localStorage.getItem(savedKey)||'[]');return Array.isArray(value)?value.filter(Number.isInteger):[]}catch{return []}}
function SelectField({id,label,options,value,onChange}){return <div className="search-field-select"><label className="search-sr-only" htmlFor={id}>{label}</label><select id={id} className="search-select-dropdown" value={value} onChange={e=>onChange(e.target.value)}>{options.map(([key,text])=><option value={key} key={key}>{text}</option>)}</select></div>}
export default function SearchPage(){
 const [params,setParams]=useSearchParams(),filters=readSearchFilters(params),notify=useToast();
 const [saved,setSaved]=useState(readSaved);
 const query=accommodationQuery({...filters,page:filters.page-1,size:PAGE_SIZE,amenities:filters.amenities.join(','),availableOnly:filters.availableOnly});
 const {data,loading,error,retry}=useAccommodations(query);
 useEffect(()=>{document.title='Tìm kiếm phòng trọ Hòa Lạc | HL_RCS';},[]);
 useEffect(()=>{const update=()=>setSaved(readSaved());window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update)},[]);
 useEffect(()=>{if(data&&filters.page>Math.max(1,data.totalPages))setParams(updateSearchFilters(params,{page:Math.max(1,data.totalPages)}),{replace:true});},[data,filters.page,params,setParams]);
 function change(updates){setParams(updateSearchFilters(params,updates),{replace:Object.keys(updates).length===1&&'q' in updates});}
 function reset(){setParams({});}
 function toggleAmenity(key){change({amenities:filters.amenities.includes(key)?filters.amenities.filter(id=>id!==key):[...filters.amenities,key]});}
 function save(id){const next=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];try{localStorage.setItem(savedKey,JSON.stringify(next));setSaved(next);notify(next.includes(id)?'Đã lưu nhà trọ trên thiết bị này.':'Đã bỏ lưu nhà trọ trên thiết bị này.')}catch{notify('Thiết bị không cho phép lưu nhà trọ.','error')}}
 const chips=[];
 if(filters.q)chips.push({key:'q',text:`Từ khóa: “${filters.q}”`,remove:()=>change({q:''})});
 for(const [key,options,label] of [['location',searchLocations,'Khu vực'],['price',searchPrices,'Giá'],['type',searchTypes,'Loại']])if(filters[key]!=='all')chips.push({key,text:`${label}: ${options.find(([id])=>id===filters[key])?.[1]}`,remove:()=>change({[key]:'all'})});
 for(const key of filters.amenities)chips.push({key,text:searchAmenities.find(([id])=>id===key)?.[1],remove:()=>toggleAmenity(key)});
 if(filters.availableOnly)chips.push({key:'availableOnly',text:'Chỉ phòng còn trống',remove:()=>change({availableOnly:false})});
 return <DetailPrototypeShell savedCount={saved.length} className="prototype-search"><main>
  <div className="search-breadcrumb-bar"><div className="container search-breadcrumb-inner"><ul className="search-breadcrumb-list"><li><Link to="/">Trang chủ</Link></li><li className="search-breadcrumb-sep">/</li><li className="search-breadcrumb-active">Tìm kiếm phòng trọ Hòa Lạc</li></ul><span className="search-breadcrumb-note">Dữ liệu niêm yết trực tiếp chính chủ</span></div></div>
  <section className="search-header-section"><div className="container"><div className="search-headline-group"><h1 className="search-main-title">Khám phá nhà trọ &amp; Căn hộ tại Hòa Lạc</h1><p className="search-subtitle">Tìm không gian sống phù hợp với nhu cầu học tập và làm việc của bạn quanh ĐH FPT, ĐH Quốc Gia và Khu Công nghệ cao.</p></div>
   <div className="search-controls-box"><form id="searchControlsForm" onSubmit={event=>{event.preventDefault();document.getElementById('resultsArea')?.scrollIntoView({block:'start'});}}><div className="search-main-inputs-row">
    <div className="search-input-field"><span className="search-input-icon"><Search size={18}/></span><label className="search-sr-only" htmlFor="searchInput">Tìm kiếm phòng trọ</label><input type="search" id="searchInput" className="search-text-input" maxLength={200} placeholder="Tìm theo tên nhà trọ, địa chỉ, đường phố..." value={filters.q} onChange={e=>change({q:e.target.value})}/></div>
    <SelectField id="selectLocation" label="Khu vực" options={searchLocations} value={filters.location} onChange={value=>change({location:value})}/><SelectField id="selectPrice" label="Mức giá thuê" options={searchPrices} value={filters.price} onChange={value=>change({price:value})}/><SelectField id="selectType" label="Loại phòng" options={searchTypes} value={filters.type} onChange={value=>change({type:value})}/>
    <button type="submit" className="btn-search-trigger"><Search size={16}/><span>Tìm kiếm</span></button>
   </div></form>
   <div className="active-chips-wrapper" id="activeChipsContainer">{!!chips.length&&<><span className="chips-label">Đang lọc theo:</span>{chips.map(chip=><span className="chip-tag" key={chip.key}><span>{chip.text}</span><button type="button" onClick={chip.remove} aria-label={`Xóa bộ lọc ${chip.text}`}><X size={14}/></button></span>)}<button type="button" className="btn-clear-all-chips" onClick={reset}>Xóa tất cả</button></>}</div>
   </div></div></section>
  <section className="listing-results-section" id="resultsArea" aria-busy={loading}><div className="container"><div className="results-meta-header"><h2 className="results-count-title" id="resultsCount" aria-live="polite">{loading?'Đang tìm kiếm phòng trọ phù hợp...':data?<>Tìm thấy <strong>{data.totalElements}</strong> loại phòng phù hợp</>:'Kết quả tìm kiếm'}</h2><div className="results-header-actions"><nav className="view-switcher-group" aria-label="Chế độ hiển thị"><Link to={`/search?${params}`} className="view-switch-btn active" aria-current="page"><List size={15}/>Danh sách</Link><Link to={`/map?${params}`} className="view-switch-btn"><Map size={15}/>Bản đồ</Link></nav><div className="sort-controls-group"><label htmlFor="sortSelect" className="sort-label">Sắp xếp theo:</label><select id="sortSelect" className="sort-select" value={filters.sort} onChange={e=>change({sort:e.target.value})}>{searchSorts.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></div></div></div>
   <div className="listing-grid-container" id="listingGrid">{loading?<div className="search-empty-container" role="status"><LoaderCircle className="spin"/><p>Đang tải danh sách nhà trọ...</p></div>:error?<div className="search-empty-container" role="alert"><h3 className="search-empty-title">Không thể tải danh sách nhà trọ</h3><p className="search-empty-desc">{error}</p><button type="button" className="btn-empty-reset" onClick={retry}>Thử lại</button></div>:data?.items.length?data.items.map(item=><SearchPrototypeCard key={item.roomTypeId} item={item} saved={saved.includes(item.propertyId)} onSave={save}/>):<div className="search-empty-container"><div className="search-empty-icon"><Search size={32}/></div><h3 className="search-empty-title">Không tìm thấy phòng trọ phù hợp</h3><p className="search-empty-desc">Không có kết quả nào thỏa mãn toàn bộ tiêu chí tìm kiếm hiện tại. Bạn vui lòng thử điều chỉnh lại bộ lọc, nới rộng khoảng giá hoặc xóa bớt tiện ích.</p><button type="button" className="btn-empty-reset" onClick={reset}><RotateCcw size={16}/>Xóa toàn bộ bộ lọc</button></div>}</div>
   {!loading&&!error&&data?.totalPages>1&&<nav className="pagination-wrapper" id="paginationWrapper" aria-label="Phân trang kết quả"><button type="button" className="page-btn" disabled={filters.page<=1} onClick={()=>change({page:filters.page-1})}>← Trước</button>{paginationRange(filters.page,data.totalPages).map(value=>typeof value==='number'?<button type="button" key={value} className={`page-btn${filters.page===value?' active':''}`} aria-label={`Trang ${value}`} aria-current={filters.page===value?'page':undefined} onClick={()=>change({page:value})}>{value}</button>:<span key={value}>…</span>)}<button type="button" className="page-btn" disabled={filters.page>=data.totalPages} onClick={()=>change({page:filters.page+1})}>Sau →</button></nav>}
  </div></section>
 </main></DetailPrototypeShell>;
}
