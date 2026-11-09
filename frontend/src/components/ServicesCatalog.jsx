import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowUpRight,Check,ShieldCheck,Search,MapPin,SlidersHorizontal,ReceiptText,ChevronLeft,RotateCcw,LoaderCircle,X,ChevronRight} from 'lucide-react';
import DetailPrototypeShell from './detail/DetailPrototypeShell.jsx';
import ServiceRegistrationModal from './ServiceRegistrationModal.jsx';
import ServiceManagement from './ServiceManagement.jsx';
import ServiceGallery from './ServiceGallery.jsx';
import {useAuth} from '../context/AuthContext.jsx';
import {serviceRegistrationApi} from '../services/service-registration.js';
import {MotionButton,AnimatePresence} from './motion/MotionUI.jsx';
import {ServiceCategoryIcon,ServiceDiscoveryCard,ServiceContact} from './ServiceDiscoveryParts.jsx';
import {publicServicesApi as api,servicePrice} from '../services/public-services.js';
import {paginationRange} from '../services/pagination.js';
import {resolveServiceCategory,discoverServices,serviceInventory,serviceAreas,serviceCategoryKind} from '../services/service-discovery.js';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/services-discovery.css';

const PAGE_SIZE=6;

export default function ServicesCatalog({detail=false}){
 const {user,loading:authLoading}=useAuth(),userId=user?.userId??null;
 const [ownership,setOwnership]=useState(null),[ownershipRevision,setOwnershipRevision]=useState(0),[manage,setManage]=useState(null);
 const [params,setParams]=useSearchParams(),id=params.get('id'),categoryValue=params.get('category')||'all';
 const key=detail?`detail/${id}`:'catalog';
 const [state,setState]=useState({key:'',loading:true,error:'',rows:[],categories:[],row:null}),[revision,setRevision]=useState(0),[register,setRegister]=useState(null);
 useEffect(()=>{setRegister(null);setManage(null);},[userId,detail]);
 useEffect(()=>{
  if(userId===null||detail){setOwnership(null);return;}
  const controller=new AbortController();setOwnership(null);
  serviceRegistrationApi.mine(controller.signal)
   .then(records=>{if(!controller.signal.aborted)setOwnership({userId,revision:ownershipRevision,hasRecords:records.length>0});})
   .catch(error=>{if(!controller.signal.aborted)setOwnership({userId,revision:ownershipRevision,error:error.message});});
  return()=>controller.abort();
 },[userId,detail,ownershipRevision]);
 useEffect(()=>{const controller=new AbortController();setState({key,loading:true,error:'',rows:[],categories:[],row:null});
  (detail?api.detail(id,controller.signal):Promise.all([api.categories(controller.signal),api.list(controller.signal)]))
   .then(data=>{if(!controller.signal.aborted)setState({key,loading:false,error:'',rows:detail?[]:data[1],categories:detail?[]:data[0],row:detail?data:null});})
   .catch(error=>{if(!controller.signal.aborted)setState({key,loading:false,error:error.message,rows:[],categories:[],row:null});});return()=>controller.abort();
 },[detail,id,key,revision]);
 const current=state.key===key?state:{...state,loading:true,error:'',rows:[],categories:[],row:null};
 const {loading,error,rows,categories,row}=current,category=resolveServiceCategory(categoryValue,categories),q=(params.get('q')||'').slice(0,200),area=serviceAreas.some(([key])=>key===params.get('area'))?params.get('area'):'all',sort=['price-asc','price-desc','name'].includes(params.get('sort'))?params.get('sort'):'recommended';
 const matched=discoverServices(rows,{category,q,area,sort}),inventory=serviceInventory(rows,categories),known=!loading&&!error;
 const rawPage=Number(params.get('page')||1),totalPages=Math.max(1,Math.ceil(matched.length/PAGE_SIZE));
 const page=Math.min(Number.isSafeInteger(rawPage)&&rawPage>0?rawPage:1,totalPages),start=(page-1)*PAGE_SIZE;
 const pageRows=matched.slice(start,start+PAGE_SIZE);
 useEffect(()=>{if(!detail&&known&&params.has('page')&&rawPage!==page){const next=new URLSearchParams(params);if(page===1)next.delete('page');else next.set('page',String(page));setParams(next,{replace:true});}},[detail,known,rawPage,page,params,setParams]);
 const activeCategory=categories.find(item=>String(item.categoryId)===category),activeFilters=q||category!=='all'||area!=='all';
 const emptyCategory=known&&activeCategory&&!(inventory.byCategory[activeCategory.categoryId]>0);
 useEffect(()=>{document.title=`${detail?row?.serviceName||'Chi tiết dịch vụ':'Dịch vụ quanh trọ'} | HL_RCS`;},[detail,row?.serviceName]);
 function change(updates){const next=new URLSearchParams(params);for(const [field,value] of Object.entries(updates)){if(!value||value==='all'||value==='recommended'||field==='page'&&value===1)next.delete(field);else next.set(field,String(value));}next.delete('count');if(!('page' in updates))next.delete('page');setParams(next,{replace:Object.keys(updates).length===1&&'q' in updates});}
 function goToPage(value){change({page:value});document.getElementById('services-results')?.scrollIntoView({block:'start'});}
 const retry=()=>setRevision(value=>value+1);
 const ownState=ownership?.userId===userId&&ownership.revision===ownershipRevision?ownership:null;
 const checkingOwnership=authLoading||(userId!==null&&!detail&&!ownState);
 const actionLabel=checkingOwnership?'Đang kiểm tra hồ sơ...':ownState?.error?'Thử lại hồ sơ':ownState?.hasRecords?'Dịch vụ của tôi':'Đăng ký dịch vụ / Xem hồ sơ';
 function openRegistration(){
  if(checkingOwnership)return;
  if(ownState?.error)setOwnershipRevision(value=>value+1);
  else if(ownState?.hasRecords)setManage({userId});
  else setRegister({userId});
 }
 function closeServices(){setRegister(null);setManage(null);setOwnershipRevision(value=>value+1);retry();}
 return <DetailPrototypeShell className="prototype-services"><main className={`sv-page${detail?'':' sv-catalog'}`}>
  <div className="sv-breadcrumb"><div className="container"><nav aria-label="Đường dẫn dịch vụ"><Link to="/">Trang chủ</Link><ChevronRight size={13}/>{detail?<><Link to="/services">Dịch vụ quanh trọ</Link><ChevronRight size={13}/><span>Chi tiết dịch vụ</span></>:<span>Dịch vụ quanh trọ</span>}</nav><span className="sv-breadcrumb-note">Kết nối trực tiếp tại Hòa Lạc</span></div></div>
  {!detail&&<>
   <section className="sv-hero"><div className="container sv-hero-grid"><div className="sv-hero-copy"><h1>Dịch vụ quanh trọ</h1><p>Tìm dịch vụ tại Hòa Lạc, xem thông tin và liên hệ trực tiếp với nhà cung cấp.</p></div><aside className="sv-provider-intro" aria-labelledby="sv-provider-intro-title"><span className="sv-eyebrow">DÀNH CHO NHÀ CUNG CẤP</span><h2 id="sv-provider-intro-title">Mang dịch vụ của bạn đến cộng đồng.</h2><p>Gửi hồ sơ để được xét duyệt và xuất hiện trong danh sách dịch vụ quanh Hòa Lạc.</p><div className="sv-provider-intro-actions"><MotionButton className="sv-button sv-button-primary" disabled={checkingOwnership} aria-busy={checkingOwnership} onClick={openRegistration}>{actionLabel}<ArrowUpRight size={16}/></MotionButton><MotionButton className="sv-button sv-button-secondary" disabled={checkingOwnership} aria-busy={checkingOwnership} onClick={openRegistration}>{checkingOwnership?'Đang kiểm tra hồ sơ...':ownState?.error?'Thử lại hồ sơ':'Hồ sơ dịch vụ của tôi'}</MotionButton></div></aside></div></section>
   {ownState?.error&&<div className="container sv-state sv-error" role="alert"><p>Không tải được hồ sơ dịch vụ: {ownState.error}</p><MotionButton className="sv-button sv-button-secondary" onClick={openRegistration}>Thử lại hồ sơ</MotionButton></div>}
   <section className="sv-results-section" id="services-results"><div className="container"><div className="sv-section-heading"><h2>Danh sách dịch vụ</h2><span className="sv-result-count" aria-live="polite">{loading?'Đang tải...':error?'Chưa tải được dữ liệu':`${matched.length} dịch vụ phù hợp`}</span></div>
    <div className="sv-filter-panel"><div className="sv-category-tabs" role="group" aria-label="Danh mục dịch vụ"><MotionButton type="button" className={category==='all'?'is-active':''} aria-pressed={category==='all'} onClick={()=>change({category:'all'})}>Tất cả<span>{known?rows.length:'—'}</span></MotionButton>{categories.map(item=><MotionButton type="button" key={item.categoryId} className={`${category===String(item.categoryId)?'is-active ':''}${known&&!inventory.byCategory[item.categoryId]?'is-empty':''}`} title={known&&!inventory.byCategory[item.categoryId]?'Chưa có dịch vụ công khai. Bạn có thể đăng ký cung cấp dịch vụ.':undefined} aria-pressed={category===String(item.categoryId)} onClick={()=>change({category:item.categoryId})}><ServiceCategoryIcon name={item.name} size={16}/>{item.name}<span>{known?(inventory.byCategory[item.categoryId]||'Chưa có'):'—'}</span></MotionButton>)}</div>
    <div className="sv-toolbar"><div className="sv-search"><Search size={18}/><label className="sv-sr-only" htmlFor="svcSearchInput">Tìm kiếm dịch vụ hoặc nhà cung cấp</label><input id="svcSearchInput" type="search" maxLength={200} value={q} onChange={e=>change({q:e.target.value})} placeholder="Tìm theo tên dịch vụ, nhà cung cấp..."/>{q&&<button type="button" aria-label="Xóa tìm kiếm" onClick={()=>change({q:''})}><X size={16}/></button>}</div><label className="sv-select"><span><MapPin size={16} aria-hidden="true"/>Khu vực</span><select aria-label="Lọc theo khu vực" value={area} onChange={e=>change({area:e.target.value})}>{serviceAreas.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="sv-select"><span><SlidersHorizontal size={16} aria-hidden="true"/>Sắp xếp</span><select aria-label="Sắp xếp danh sách" value={sort} onChange={e=>change({sort:e.target.value})}><option value="recommended">Mới thêm</option><option value="name">Tên dịch vụ A–Z</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></label></div>
    </div>{activeFilters&&<div className="sv-active-filters"><span>Đang lọc:</span>{category!=='all'&&<span>{activeCategory?.name||'Danh mục đã chọn'}</span>}{q&&<span>“{q}”</span>}{area!=='all'&&<span>{serviceAreas.find(([key])=>key===area)?.[1]}</span>}<button type="button" onClick={()=>setParams({})}><RotateCcw size={13}/>Đặt lại bộ lọc</button></div>}
    {loading?<div className="sv-state" role="status"><LoaderCircle className="spin" size={25}/><h3>Đang tìm dịch vụ cho bạn...</h3><p>Đang tải thông tin từ hệ thống.</p></div>:error?<div className="sv-state sv-error" role="alert"><h3>Chưa thể tải danh sách dịch vụ</h3><p>{error}</p><MotionButton className="sv-button sv-button-primary" onClick={retry}><RotateCcw size={16}/>Thử lại</MotionButton></div>:matched.length?<><div className={`sv-service-grid${pageRows.length<3?' sv-service-grid--few':''}${pageRows.length===1?' sv-service-grid--single':''}`} aria-label="Danh sách dịch vụ">{pageRows.map(item=><ServiceDiscoveryCard key={item.serviceId} row={item}/>)}</div><div className="sv-pagination-bar"><span aria-live="polite">Hiển thị {start+1}–{Math.min(start+PAGE_SIZE,matched.length)} / {matched.length} dịch vụ</span>{totalPages>1&&<nav className="sv-pagination" aria-label="Phân trang dịch vụ"><MotionButton type="button" disabled={page<=1} onClick={()=>goToPage(page-1)} aria-label="Trang trước"><ChevronLeft size={16}/>Trước</MotionButton>{paginationRange(page,totalPages).map(value=>typeof value==='number'?<MotionButton type="button" key={value} aria-label={`Trang ${value}`} aria-current={page===value?'page':undefined} onClick={()=>goToPage(value)}>{value}</MotionButton>:<span key={value} aria-hidden="true">…</span>)}<MotionButton type="button" disabled={page>=totalPages} onClick={()=>goToPage(page+1)} aria-label="Trang tiếp theo">Sau<ChevronRight size={16}/></MotionButton></nav>}</div></>:<div className="sv-state"><span className="sv-state-icon"><Search size={27}/></span><h3>{activeFilters?'Chưa tìm thấy dịch vụ phù hợp':'Dịch vụ mới đang được cập nhật'}</h3><p>{activeFilters?'Thử đổi từ khóa hoặc mở rộng khu vực phục vụ.':'Các dịch vụ đã được duyệt sẽ xuất hiện tại đây. Bạn vẫn có thể đăng ký trở thành nhà cung cấp.'}</p><MotionButton className="sv-button sv-button-secondary" disabled={!activeFilters&&checkingOwnership} aria-busy={!activeFilters&&checkingOwnership} onClick={activeFilters?()=>setParams({}):openRegistration}>{activeFilters?'Xóa bộ lọc':actionLabel}</MotionButton></div>}
    {emptyCategory&&<div className="sv-category-invitation"><p>Danh mục <strong>{activeCategory.name}</strong> chưa có dịch vụ công khai. Bạn cung cấp dịch vụ này?</p><MotionButton type="button" className="sv-button sv-button-secondary" disabled={checkingOwnership} aria-busy={checkingOwnership} onClick={openRegistration}>{actionLabel}<ArrowUpRight size={16}/></MotionButton></div>}
    <p className="sv-price-note"><ReceiptText size={15}/>Giá và khu vực phục vụ do nhà cung cấp khai báo. Hãy xác nhận chi phí cuối cùng trước khi sử dụng.</p>
   </div></section>
  </>}
  {detail&&<div className="container sv-detail-page"><Link className="sv-detail-back" to="/services">← Danh sách dịch vụ</Link>{loading?<div className="sv-state" role="status">Đang tải thông tin dịch vụ...</div>:error?<div className="sv-state sv-error" role="alert"><h1>Không thể xem dịch vụ</h1><p>{error}</p><MotionButton className="sv-button sv-button-primary" onClick={retry}>Thử lại</MotionButton></div>:row&&<div className="sv-detail-grid"><article><div className={`sv-detail-heading sv-tone-${serviceCategoryKind(row.categoryName)}`}><span className="sv-card-icon"><ServiceCategoryIcon name={row.categoryName} size={34}/></span><span>{row.categoryName}</span><h1>{row.serviceName}</h1><span className="sv-reviewed"><ShieldCheck size={14}/>Thông tin đã xét duyệt</span></div><section className="sv-detail-description"><ServiceGallery key={row.serviceId} urls={row.imageUrls?.length?row.imageUrls:row.imageUrl?[row.imageUrl]:[]} alt={row.serviceName}/><h2>Thông tin dịch vụ</h2><p>{row.description||'Chưa cập nhật mô tả.'}</p><h2>Khu vực phục vụ</h2><p><MapPin size={16}/>{row.serviceArea||'Liên hệ xác nhận khu vực phục vụ'}</p></section></article><aside className="sv-detail-contact"><span className="sv-eyebrow">KẾT NỐI NHÀ CUNG CẤP</span><h2>{row.providerName||`Nhà cung cấp #${row.providerId}`}</h2><div className="sv-card-price"><span>GIÁ DỊCH VỤ</span><strong>{servicePrice(row)}</strong></div><ServiceContact row={row}/><p>Trao đổi trực tiếp để thống nhất phạm vi công việc, lịch thực hiện và tổng chi phí. Hệ thống chưa hỗ trợ đặt dịch vụ trực tuyến.</p><ul><li><Check size={15}/>Xác nhận báo giá trước khi bắt đầu.</li><li><Check size={15}/>Giữ lại nội dung trao đổi với nhà cung cấp.</li></ul></aside></div>}</div>}
  <AnimatePresence>{register&&register.userId===userId&&<ServiceRegistrationModal key={`registration/${userId}`} onClose={closeServices}/>}{manage&&manage.userId===userId&&userId!==null&&<ServiceManagement key={`management/${userId}`} onClose={closeServices}/>}</AnimatePresence>
 </main></DetailPrototypeShell>;
}
