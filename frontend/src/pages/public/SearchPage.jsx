import {useFavoriteActions} from '../../context/FavoritesContext.jsx';
import FavoriteNotice from '../../components/FavoriteNotice.jsx';
import {useEffect,useRef,useState} from 'react';
import ComparisonBar from '../../components/ComparisonBar.jsx';
import {MAX_COMPARE_ROOMS,parseComparisonIds} from '../../services/room-comparison.js';
import {Link,useLocation,useNavigationType,useSearchParams} from 'react-router-dom';
import {Check,GraduationCap,SlidersHorizontal,Search,List,Map,MapPin,MessageCircle,LoaderCircle,RotateCcw,X} from 'lucide-react';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import SearchPrototypeCard from '../../components/SearchPrototypeCard.jsx';
import {useToast} from '../../components/PortalUI.jsx';
import {AnimatePresence} from '../../components/motion/MotionUI.jsx';
import SearchOriginDialog from '../../components/SearchOriginDialog.jsx';
import SearchFiltersDialog,{SearchSelectField} from '../../components/SearchFiltersDialog.jsx';
import AccommodationRecommendations from '../../components/AccommodationRecommendations.jsx';
import troMayAvatar from '../../assets/tro-may.webp';
import {CAMPUS_RADIUS_KM,SEARCH_CAMPUSES,formatDistance,readSearchOrigin,searchCampusForOrigin} from '../../services/search-origin.js';
import '../../styles/location-search.css';
import RoomsMap from '../../components/AccommodationMap.jsx';
import useAccommodations from '../../hooks/useAccommodations.js';
import {accommodationQuery} from '../../services/accommodations.js';
import {paginationRange} from '../../services/pagination.js';
import {readSearchFilters,updateSearchFilters,searchLocations,searchPrices,searchTypes,searchAmenities,searchSorts} from '../../services/search-prototype.js';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/search-prototype.css';
import '../../styles/search-prototype-integration.css';
import '../../styles/search-filters.css';
import '../../styles/room-comparison.css';

const PAGE_SIZE=6;
export default function SearchPage({mapView=false}){
 const [params,setParams]=useSearchParams(),filters=readSearchFilters(params),notify=useToast();
 const {state:locationState}=useLocation();
 const keywordEdit=useNavigationType()==='REPLACE'&&locationState?.searchKeywordEdit===true;
 const [keyword,setKeyword]=useState(filters.q);
 const composingKeyword=useRef(false);
 const [advanced,setAdvanced]=useState(false);
 const [locationDialog,setLocationDialog]=useState(false),[aiDialog,setAiDialog]=useState(false);
 const origin=readSearchOrigin(params);
 const campus=searchCampusForOrigin(origin);
 const advancedCount=filters.amenities.length+Number(filters.availableOnly)+Number(Boolean(origin));
 const query=accommodationQuery({...filters,page:filters.page-1,size:PAGE_SIZE,amenities:filters.amenities.join(','),availableOnly:filters.availableOnly});
 const {data,loading,error,retry}=useAccommodations(query);
 const favorites=useFavoriteActions(data?.items.map(item=>item.roomTypeId)||[]);
 // Comparison routes expect account-owned favorite IDs, not public room-type IDs.
 const selection=parseComparisonIds(params.get('compare')||''),selected=selection.ids;
 function select(value){setParams(previous=>{const next=new URLSearchParams(previous),current=parseComparisonIds(previous.get('compare')||'').ids,ids=typeof value==='function'?value(current):value;if(ids.length)next.set('compare',ids.join(','));else next.delete('compare');return next;},{replace:true});}
 function toggleComparison(id){select(ids=>ids.includes(id)?ids.filter(value=>value!==id):ids.length<MAX_COMPARE_ROOMS?[...ids,id]:ids);}
 useEffect(()=>{document.title='Tìm kiếm phòng trọ Hòa Lạc | HL_RCS';},[]);
 // A router transition from typing can finish after the next input event.
 useEffect(()=>{
  if(!keywordEdit&&!composingKeyword.current)setKeyword(filters.q);
 },[filters.q,keywordEdit]);
 useEffect(()=>{if(data&&filters.page>Math.max(1,data.totalPages))setParams(updateSearchFilters(params,{page:Math.max(1,data.totalPages)}),{replace:true});},[data,filters.page,params,setParams]);
 function change(updates){setParams(updateSearchFilters(params,updates),{replace:Object.keys(updates).length===1&&'q' in updates});}
 function changeKeyword(event){
  const value=event.currentTarget.value;
  setKeyword(value);
  if(!composingKeyword.current&&!event.nativeEvent.isComposing){
   setParams(updateSearchFilters(params,{q:value}),{replace:true,state:{...locationState,searchKeywordEdit:true}});
  }
 }
 function finishKeywordComposition(event){
  composingKeyword.current=false;
  changeKeyword(event);
 }
 function chooseOrigin(point,radiusKm){change({...point,radiusKm,sort:'nearest'});setLocationDialog(false);}
 function chooseCampus(school){chooseOrigin(school.origin,campus ? filters.radiusKm : CAMPUS_RADIUS_KM);}
 function clearOrigin(){change({originLat:null,originLng:null,radiusKm:null,sort:filters.sort==='nearest'?null:filters.sort});}
 function reset(){setParams({});}
 function toggleAmenity(key){change({amenities:filters.amenities.includes(key)?filters.amenities.filter(id=>id!==key):[...filters.amenities,key]});}
 function apply(updates){change(updates);setAdvanced(false);}
 async function save(id){const favoriteId=favorites.items.get(id);if(await favorites.toggle(id)&&favoriteId)select(ids=>ids.filter(value=>value!==favoriteId));}
 function comparisonControl(item){
  const id=favorites.items.get(item.roomTypeId),checked=selected.includes(id);
  return <label className={`comparison-select${checked?' is-selected':''}`}><input type="checkbox" checked={checked} disabled={!id||favorites.busy(item.roomTypeId)||(!checked&&selected.length>=MAX_COMPARE_ROOMS)} onChange={()=>toggleComparison(id)} aria-label={`So sánh ${item.propertyName} — ${item.roomTypeName}`}/><span>{checked?'Đã chọn so sánh':id?'Chọn để so sánh':'Thêm vào yêu thích để so sánh'}</span></label>;
 }
 const chips=[];
 if(filters.q)chips.push({key:'q',text:`Từ khóa: “${filters.q}”`,remove:()=>change({q:''})});
 for(const [key,options,label] of [['location',searchLocations,'Khu vực'],['price',searchPrices,'Giá'],['type',searchTypes,'Loại']])if(filters[key]!=='all')chips.push({key,text:`${label}: ${options.find(([id])=>id===filters[key])?.[1]}`,remove:()=>change({[key]:'all'})});
 for(const key of filters.amenities)chips.push({key,text:searchAmenities.find(([id])=>id===key)?.[1],remove:()=>toggleAmenity(key)});
 if(origin)chips.push({key:'origin',text:`${campus?.name ?? 'Ghim đã chọn'}${filters.radiusKm ? ` · ≤ ${formatDistance(filters.radiusKm)}` : ''}`,remove:clearOrigin});
 if(filters.availableOnly)chips.push({key:'availableOnly',text:'Chỉ phòng còn trống',remove:()=>change({availableOnly:false})});
 return <DetailPrototypeShell savedCount={favorites.total??0} className="prototype-search"><main className={selected.length?'has-comparison-selection':undefined}>
  <div className="search-breadcrumb-bar"><div className="container search-breadcrumb-inner"><ul className="search-breadcrumb-list"><li><Link to="/">Trang chủ</Link></li><li className="search-breadcrumb-sep">/</li><li className="search-breadcrumb-active">Tìm kiếm phòng trọ Hòa Lạc</li></ul><span className="search-breadcrumb-note">Dữ liệu niêm yết trực tiếp chính chủ</span></div></div>
  <section className="search-header-section"><div className="container"><div className="search-headline-group"><h1 className="search-main-title">Khám phá nhà trọ &amp; Căn hộ tại Hòa Lạc</h1><p className="search-subtitle">Tìm không gian sống phù hợp với nhu cầu học tập và làm việc của bạn quanh ĐH FPT, ĐH Quốc Gia và Khu Công nghệ cao.</p></div>
   <div className="search-controls-box"><form id="searchControlsForm" onSubmit={event=>{event.preventDefault();if(!composingKeyword.current)document.getElementById('resultsArea')?.scrollIntoView({block:'start'});}}><div className="search-main-inputs-row">
    <div className="search-input-field"><span className="search-input-icon"><Search size={18}/></span><label className="search-sr-only" htmlFor="searchInput">Tìm kiếm phòng trọ</label><input type="search" id="searchInput" className="search-text-input" maxLength={200} placeholder="Tên nhà trọ hoặc địa chỉ" value={keyword} onChange={changeKeyword} onCompositionStart={()=>{composingKeyword.current=true;}} onCompositionEnd={finishKeywordComposition}/></div>
    <SearchSelectField id="selectLocation" label="Khu vực" options={searchLocations} value={filters.location} onChange={value=>change({location:value})}/><SearchSelectField id="selectPrice" label="Mức giá thuê" options={searchPrices} value={filters.price} onChange={value=>change({price:value})}/><SearchSelectField id="selectType" label="Loại phòng" options={searchTypes} value={filters.type} onChange={value=>change({type:value})}/>
    <div className="search-submit-actions">
     <button type="submit" className="btn-search-trigger"><Search size={16} aria-hidden="true"/><span>Tìm kiếm</span></button>
     <button type="button" className="search-origin-trigger" onClick={()=>setLocationDialog(true)} aria-haspopup="dialog">
      <MapPin size={17} aria-hidden="true"/><span>{origin?'Đổi địa điểm':'Tìm quanh địa điểm'}</span>
     </button>
    </div>
   </div></form>
   <section className="search-campus-strip" aria-labelledby="searchCampusHeading">
    <div className="search-campus-heading">
     <span className="search-campus-icon"><GraduationCap size={21} aria-hidden="true"/></span>
     <div><h2 id="searchCampusHeading">Tìm quanh trường</h2><p>{campus ? filters.radiusKm ? `Trong ${formatDistance(filters.radiusKm)} từ ${campus.name}` : `Tính khoảng cách từ ${campus.name}` : `Chọn trường để tìm trong ${CAMPUS_RADIUS_KM} km`}</p></div>
    </div>
    <div className="search-campus-options">
     {SEARCH_CAMPUSES.map(school=><button type="button" key={school.id} aria-pressed={campus?.id===school.id} onClick={()=>chooseCampus(school)}>
      <span>{school.name}</span>{campus?.id===school.id&&<Check size={15} aria-hidden="true"/>}
     </button>)}
    </div>
   </section>
   <div className="search-secondary-row"><div className="quick-filter-pills"><span className="search-quick-label">Gợi ý nhanh:</span><button type="button" className={`filter-pill-btn${!filters.amenities.length?' active':''}`} onClick={()=>change({amenities:[]})}>Tất cả</button>{[['airConditioner','❄️ Có điều hòa'],['flexibleHours','⏰ Giờ tự do'],['balcony','🌿 Có ban công']].map(([key,text])=><button type="button" key={key} className={`filter-pill-btn${filters.amenities.includes(key)?' active':''}`} aria-pressed={filters.amenities.includes(key)} onClick={()=>toggleAmenity(key)}>{text}</button>)}<button type="button" className="filter-pill-btn" onClick={()=>notify('Danh sách chỉ bao gồm nhà trọ đã được duyệt và đang công khai.')}>✓ Đã xác minh</button></div>
    <div className="search-filter-actions">
     <button type="button" className="btn-toggle-advanced" id="btnToggleAdv" aria-haspopup="dialog" onClick={()=>setAdvanced(true)}><SlidersHorizontal size={16} aria-hidden="true"/>Bộ lọc nâng cao{advancedCount>0&&<span className="search-filter-badge">{advancedCount}</span>}</button>
     <button type="button" className="btn-toggle-advanced" id="btnOpenMobileFilter" aria-haspopup="dialog" onClick={()=>setAdvanced(true)}><SlidersHorizontal size={16} aria-hidden="true"/>Bộ lọc{advancedCount>0&&<span className="search-filter-badge">{advancedCount}</span>}</button>
    </div>
   </div>
   <div className="active-chips-wrapper" id="activeChipsContainer">{!!chips.length&&<><span className="chips-label">Đang lọc theo:</span>{chips.map(chip=><span className="chip-tag" key={chip.key}><span>{chip.text}</span><button type="button" onClick={chip.remove} aria-label={`Xóa bộ lọc ${chip.text}`}><X size={14}/></button></span>)}<button type="button" className="btn-clear-all-chips" onClick={reset}>Xóa tất cả</button></>}</div>
   </div></div></section>
  <section className="listing-results-section" id="resultsArea" aria-busy={loading}><div className="container"><div className="results-meta-header"><h2 className="results-count-title" id="resultsCount" aria-live="polite">{loading?'Đang tìm kiếm phòng trọ phù hợp...':data?<>Tìm thấy <strong>{data.totalElements}</strong> loại phòng phù hợp</>:'Kết quả tìm kiếm'}</h2><div className="results-header-actions"><nav className="view-switcher-group" aria-label="Chế độ hiển thị"><Link to={`/search?${params}`} className={`view-switch-btn${!mapView?' active':''}`} aria-current={!mapView?'page':undefined}><List size={15}/>Danh sách</Link><Link to={`/map?${params}`} className={`view-switch-btn${mapView?' active':''}`} aria-current={mapView?'page':undefined}><Map size={15}/>Bản đồ</Link></nav><div className="sort-controls-group"><label htmlFor="sortSelect" className="sort-label">Sắp xếp theo:</label><select id="sortSelect" className="sort-select" value={filters.sort} onChange={e=>change({sort:e.target.value})}>{origin&&<option value="nearest">Gần nhất</option>}{searchSorts.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></div></div></div>
   <FavoriteNotice favorites={favorites}/>{selection.error&&<p className="favorite-notice" role="alert">{selection.error}<button type="button" className="p-button" onClick={()=>select([])}>Đặt lại lựa chọn</button></p>}{!mapView&&<p className="comparison-hint">Thêm phòng vào danh sách yêu thích, sau đó chọn từ 2 đến 4 phòng để so sánh.</p>}
   <div className={mapView?'listing-map-container':'listing-grid-container'} id="listingGrid">
    {mapView ? <RoomsMap rooms={data?.items??[]} origin={origin} radiusKm={filters.radiusKm} loading={loading} error={error} retry={retry} onCampusSelect={chooseCampus} onOpenFilters={()=>setAdvanced(true)}/>
     : loading ? <div className="search-empty-container" role="status"><LoaderCircle className="spin"/><p>Đang tải danh sách nhà trọ...</p></div>
     : error ? <div className="search-empty-container" role="alert"><h3 className="search-empty-title">Không thể tải danh sách nhà trọ</h3><p className="search-empty-desc">{error}</p><button type="button" className="btn-empty-reset" onClick={retry}>Thử lại</button></div>
     : data?.items.length ? data.items.map(item=><SearchPrototypeCard key={item.roomTypeId} item={item} origin={origin} saved={favorites.isSaved(item.roomTypeId)} saveBusy={favorites.busy(item.roomTypeId)} onSave={save} comparisonControl={comparisonControl(item)}/>)
     : <div className="search-empty-container"><div className="search-empty-icon"><Search size={32}/></div><h3 className="search-empty-title">Không tìm thấy phòng trọ phù hợp</h3><p className="search-empty-desc">{filters.radiusKm?'Thử nới bán kính hoặc bỏ bớt tiêu chí lọc.':'Thử nới khoảng giá hoặc bỏ bớt tiện ích.'}</p><div className="search-empty-actions"><button type="button" className="btn-empty-reset" onClick={()=>setAdvanced(true)}><SlidersHorizontal size={16}/>Chỉnh bộ lọc</button><button type="button" className="btn-empty-reset" onClick={reset}><RotateCcw size={16}/>Xóa toàn bộ bộ lọc</button></div></div>}
   </div>
   {!loading&&!error&&data?.totalPages>1&&<nav className="pagination-wrapper" id="paginationWrapper" aria-label="Phân trang kết quả"><button type="button" className="page-btn" disabled={filters.page<=1} onClick={()=>change({page:filters.page-1})}>← Trước</button>{paginationRange(filters.page,data.totalPages).map(value=>typeof value==='number'?<button type="button" key={value} className={`page-btn${filters.page===value?' active':''}`} aria-label={`Trang ${value}`} aria-current={filters.page===value?'page':undefined} onClick={()=>change({page:value})}>{value}</button>:<span key={value}>…</span>)}<button type="button" className="page-btn" disabled={filters.page>=data.totalPages} onClick={()=>change({page:filters.page+1})}>Sau →</button></nav>}
  </div></section>
  <AnimatePresence>{advanced&&<SearchFiltersDialog filters={filters} origin={origin} onApply={apply} onClose={()=>setAdvanced(false)}/>}</AnimatePresence>
  {locationDialog&&<SearchOriginDialog origin={origin} radiusKm={filters.radiusKm} onApply={chooseOrigin} onClose={()=>setLocationDialog(false)}/>}
  {aiDialog&&<AccommodationRecommendations origin={origin} onClose={()=>setAiDialog(false)}/>}
  <div className="search-floating-actions">
   <button className="search-assistant-launcher" type="button" aria-haspopup="dialog" onClick={()=>setAiDialog(true)}>
    <span className="search-assistant-label"><MessageCircle size={16} aria-hidden="true"/>Hỏi Trọ Mây</span>
    <span className="search-assistant-avatar"><img src={troMayAvatar} alt="" width="56" height="56"/></span>
   </button>
   <ComparisonBar ids={selected} origin={origin} onClear={()=>select([])}/>
  </div>
 </main></DetailPrototypeShell>;
}
