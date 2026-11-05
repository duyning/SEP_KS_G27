import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {Plus,FileText,Search,MapPin,Phone,Info,RotateCcw,X,ArrowUp,ChevronLeft,ChevronRight,LoaderCircle} from 'lucide-react';
import {communityApi} from '../services/community.js';
import {communityCategories,communityZones,communitySorts,filterCommunityPosts,paginateCommunityPosts,communityDate} from '../services/community-prototype.js';
import {paginationRange} from '../services/pagination.js';
import {detailPhone} from '../services/accommodation-detail.js';
import CommunityPrototypeSidebar from './CommunityPrototypeSidebar.jsx';
import {useCommunityImage} from './CommunityImageViewer.jsx';
import CommunityPostVideo from './CommunityPostVideo.jsx';
import CommunityPostFooter from './CommunityPostFooter.jsx';
import CommunityPostMedia from './CommunityPostMedia.jsx';
import CommunityPostDescription from './CommunityPostDescription.jsx';
import CommunityPostContactLinks from './CommunityPostContactLinks.jsx';
import Modal from './common/Modal.jsx';
import StatusBadge from './common/StatusBadge.jsx';
import {AnimatePresence,MotionButton} from './motion/MotionUI.jsx';

const badges={ROOM_TRANSFER:'badge-transfer',ROOMMATE:'badge-roommate',SECOND_HAND:'badge-secondhand'};
function InlinePhoto({postId,image}){const photo=useCommunityImage(postId,image.id);return photo.url?<img src={photo.url} alt={image.fileName} onError={photo.fail}/>:<p role="status">{photo.loading?'Đang tải ảnh...':'Không tải được ảnh'}</p>}
function Badge({post,className}){const category=communityCategories.find(([key])=>key===post.type);return <span data-category={post.type} className={className||`post-cat-badge ${badges[post.type]}`}><span aria-hidden="true">{category?.[1]}</span> <span>{post.typeLabel}</span></span>}
export default function CommunityPrototype({state,mine,user,params,setParams,onCreate,onEdit,onDelete,deleting}){
 const navigate=useNavigate(),route=useLocation(),posts=state.data||[];
 const category=communityCategories.some(([key])=>key===params.get('category'))?params.get('category'):'ALL';
 const q=params.get('q')||'',location=communityZones.some(([key])=>key===params.get('location'))?params.get('location'):'all',sort=communitySorts.some(([key])=>key===params.get('sort'))?params.get('sort'):'newest';
 const filtered=filterCommunityPosts(posts,{category,q,location,sort});
 const focusedId=Number(route.hash.match(/^#post-(\d+)$/)?.[1]),selected=posts.find(post=>post.id===focusedId);
 const {page,totalPages,items:visible}=paginateCommunityPosts(filtered,params.get('page'));
 const feedRef=useRef(null),pageFocus=useRef(false);
 const [showBackToTop,setShowBackToTop]=useState(false);
 const [mineCount,setMineCount]=useState(null);
 useEffect(()=>{
  const update=()=>setShowBackToTop(window.scrollY>400);
  update();window.addEventListener('scroll',update,{passive:true});
  return()=>window.removeEventListener('scroll',update);
 },[]);
 useEffect(()=>{
  if(state.loading||state.error)return;
  const index=filtered.findIndex(post=>post.id===focusedId);
  const targetPage=index>=0?Math.floor(index/8)+1:page;
  const expected=targetPage===1?null:String(targetPage);
  if(params.get('page')!==expected){const next=new URLSearchParams(params);next.delete('count');if(expected)next.set('page',expected);else next.delete('page');setParams(next,{replace:true});}
 },[state.loading,state.error,focusedId,filtered,page,params,setParams]);
 useEffect(()=>{
  if(!pageFocus.current)return;
  pageFocus.current=false;
  feedRef.current?.focus({preventScroll:true});
  feedRef.current?.scrollIntoView({block:'start',behavior:'instant'});
 },[page]);
 useEffect(()=>{document.title='Cộng đồng Hòa Lạc | HL_RCS';},[]);
 useEffect(()=>{
  if(!user){setMineCount(null);return;}
  if(mine){setMineCount(state.data?.length??null);return;}
  const controller=new AbortController();setMineCount(null);communityApi.mine(controller.signal).then(values=>{if(!controller.signal.aborted)setMineCount(values.length)}).catch(()=>{});return()=>controller.abort();
 },[user?.userId,mine,state.data]);
 function change(values){const next=new URLSearchParams(params);next.delete('count');for(const [key,value] of Object.entries(values)){if(!value||value==='all'||value==='ALL'||value==='newest'||key==='page'&&value===1)next.delete(key);else next.set(key,String(value));}if(!('page' in values))next.delete('page');setParams(next,{replace:Object.keys(values).length===1&&'q' in values});}
 function changePage(value){if(value===page||value<1||value>totalPages)return;pageFocus.current=true;change({page:value});}
 function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 function reset(){setParams(mine?{view:'mine'}:{});}
 function myPosts(){if(!user)navigate('/login',{state:{from:'/community?view=mine'}});else setParams({view:'mine'});}
 function closeDetail(){navigate({pathname:route.pathname,search:route.search,hash:''},{replace:true});}
 const filtersActive=q||location!=='all'||category!=='ALL';
 return <>
  <div className="community-breadcrumb-bar"><div className="container community-breadcrumb-inner"><ul className="community-breadcrumb-list"><li><Link to="/">Trang chủ</Link></li><li className="breadcrumb-sep">/</li><li className="breadcrumb-active">Cộng đồng Hòa Lạc</li></ul><span className="breadcrumb-hint"><Info size={14}/>Không gian kết nối sinh viên &amp; cư dân Hòa Lạc</span></div></div>
  <section className="community-hero-section"><div className="container community-hero-inner"><div className="community-hero-content"><div className="community-hero-badge"><span className="hero-badge-pulse"/>HL_RCS Community Space</div><h1 className="community-hero-title">Cộng đồng Cư dân &amp; <span className="highlight-text">Sinh viên Hòa Lạc</span></h1><p className="community-hero-desc">Kênh kết nối trực tiếp, minh bạch và an toàn dành cho sinh viên ĐH FPT, ĐHQGHN và người đi làm tại Khu Công nghệ cao: <strong>Nhượng phòng chính chủ</strong> • <strong>Tìm bạn ở ghép uy tín</strong> • <strong>Trao đổi đồ cũ sinh viên</strong>.</p></div><div className="community-hero-actions"><button type="button" className="btn-create-post" id="btnOpenCreateModal" onClick={onCreate}><Plus size={18}/><span>Đăng bài mới</span></button><button type="button" className="btn-my-posts-quick" id="btnQuickMyPosts" onClick={myPosts}><FileText size={16}/><span>Bài viết của tôi{user?` (${mineCount??'—'})`:''}</span></button></div></div></section>
  <section className="community-toolbar-section"><div className="container"><div className="community-category-tabs" id="categoryTabs" role="group" aria-label="Chuyên mục cộng đồng">{communityCategories.map(([key,icon,label])=><button type="button" className={`category-tab-btn${!mine&&category===key?' active':''}`} aria-pressed={!mine&&category===key} key={key} onClick={()=>change({view:'',category:key})}><span className="tab-icon">{icon}</span><span className="tab-label">{label}</span><span className="tab-count">{state.loading||state.error?'—':key==='ALL'?posts.length:posts.filter(post=>post.type===key).length}</span></button>)}<button type="button" className={`category-tab-btn${mine?' active':''}`} aria-pressed={mine} onClick={myPosts}><span className="tab-icon">📝</span><span className="tab-label">Bài viết của tôi</span><span className="tab-count">{user?mineCount??'—':'—'}</span></button></div>
   <div className="community-filters-card"><div className="filters-grid"><div className="filter-search-wrap"><Search className="search-input-icon" size={18}/><label className="community-sr-only" htmlFor="communitySearchInput">Tìm kiếm bài viết</label><input type="search" id="communitySearchInput" className="community-search-input" maxLength={200} value={q} onChange={e=>change({q:e.target.value})} placeholder="Tìm theo tiêu đề, địa điểm, đồ dùng, tác giả..."/>{q&&<button type="button" className="clear-search-btn" aria-label="Xóa tìm kiếm" onClick={()=>change({q:''})}><X size={14}/></button>}</div>
   <div className="filter-select-wrap"><label className="filter-label" htmlFor="communityLocationFilter"><MapPin size={15}/>Khu vực</label><select id="communityLocationFilter" className="community-select" value={location} onChange={e=>change({location:e.target.value})}>{communityZones.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="filter-select-wrap"><label className="filter-label" htmlFor="communitySortSelect"><RotateCcw size={15}/>Sắp xếp</label><select id="communitySortSelect" className="community-select" value={sort} onChange={e=>change({sort:e.target.value})}>{communitySorts.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></div>
   {filtersActive&&<div className="active-tags-row"><span className="active-tags-label">Đang lọc:</span><div className="active-tags-list">{q&&<span className="active-filter-tag">“{q}”</span>}{location!=='all'&&<span className="active-filter-tag">{communityZones.find(([key])=>key===location)?.[1]}</span>}{category!=='ALL'&&<span className="active-filter-tag">{communityCategories.find(([key])=>key===category)?.[2]}</span>}</div><button type="button" className="btn-clear-all-filters" onClick={reset}>Đặt lại tất cả</button></div>}
   </div></div></section>
  <main className="community-main-section"><div className="container community-layout-grid"><section className="community-feed-column" aria-label={mine?'Bài viết của tôi':'Bài viết công khai'} aria-busy={state.loading||state.refreshing}><div className="feed-top-meta"><div className="feed-count-summary" aria-live="polite">{state.loading?'Đang tải danh sách bài viết...':state.error?'Không thể tải bài viết':`${filtered.length} bài viết ${mine?'của bạn':'phù hợp'}`}</div><button type="button" className="feed-view-info community-refresh" onClick={state.reload} disabled={state.loading||state.refreshing}>{state.refreshing?<LoaderCircle className="spin" size={14}/>:<RotateCcw size={14}/>}<span>{state.refreshing?'Đang cập nhật':'Làm mới'}</span></button></div>
   <p className="community-visibility-note">{mine?'Chỉ bạn nhìn thấy các bài đang chờ duyệt, cần chỉnh sửa hoặc bị từ chối của mình.':'Chỉ những bài đã được nhân viên phê duyệt mới hiển thị công khai.'}</p>
   {state.refreshing&&<p className="community-background-status" role="status"><LoaderCircle className="spin" size={16}/>Đang cập nhật dữ liệu mới. Nội dung hiện tại vẫn được giữ nguyên.</p>}
   {state.refreshError&&<div className="community-background-status community-background-status--error" role="alert"><span>Không thể cập nhật dữ liệu mới: {state.refreshError}</span><button type="button" onClick={state.reload}>Thử lại</button></div>}
   {state.loading&&<div className="community-empty-state" role="status">Đang tải bài viết...</div>}{state.error&&<div className="community-empty-state" role="alert"><h2>Không thể tải bài viết</h2><p>{state.error}</p><button type="button" className="btn-empty-reset" onClick={state.reload}>Thử lại</button></div>}
   {!state.loading&&!state.error&&!filtered.length&&<div className="community-empty-state" role="status"><div className="empty-icon-box"><Search size={48}/></div><h2 className="empty-title">Không tìm thấy bài viết phù hợp</h2><p className="empty-desc">{mine?'Bạn chưa có bài viết phù hợp trong danh mục này.':'Không có bài viết nào khớp với bộ lọc hiện tại. Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.'}</p><div className="empty-actions"><button type="button" className="btn-empty-reset" onClick={reset}>Xóa bộ lọc</button><button type="button" className="btn-create-post" onClick={onCreate}>Đăng bài mới</button></div></div>}
   <div className="community-feed-list" id="communityFeedList" ref={feedRef} tabIndex={-1} aria-label={`Danh sách bài viết, trang ${page}`}>{visible.map(post=>{
    const hasMedia=Boolean(post.images?.length||post.videos?.length);
    return <article className="community-feed-card community-restored-post" id={`post-${post.id}`} key={post.id} data-id={post.id}>
     <div className="community-feed-card-header">
      <div className="community-restored-author"><div className="community-restored-avatar" aria-hidden="true">{post.authorName.slice(0,2).toUpperCase()}</div><div><strong>{post.authorName}</strong><time className="community-feed-time" dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString('vi-VN')}><span>{new Date(post.createdAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span><span aria-hidden="true">•</span><span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span></time></div></div>
      <div className="community-feed-badges"><Badge post={post} className="community-feed-category"/>{mine&&<StatusBadge status={post.status} label={post.statusLabel}/>}</div>
     </div>
     <div className={`community-feed-body${hasMedia?' community-feed-body--media':''}`}>
      <div className="community-feed-copy"><h2 className="community-feed-title">{post.title}</h2><CommunityPostDescription content={post.content} contentFormat={post.contentFormat}/>
       <dl className="community-feed-facts">{post.priceDisplay&&<div className="community-feed-price"><dt>{post.type==='SECOND_HAND'?'Giá bán':post.type==='ROOM_TRANSFER'?'Giá thuê':'Chi phí ở ghép'}</dt><dd>{post.priceDisplay}</dd></div>}{post.location&&<div><dt>Địa chỉ</dt><dd><MapPin size={16} aria-hidden="true"/> {post.location}</dd></div>}{post.authorPhone&&<div><dt>Số điện thoại</dt><dd><a href={`tel:${post.authorPhone}`}>{post.authorPhone}</a></dd></div>}<CommunityPostContactLinks post={post} asFacts/></dl>
      </div>{hasMedia&&<CommunityPostMedia post={post}/>}</div>
     {mine&&post.status==='NEED_CHANGES'&&<section className="community-revision-note" aria-label="Yêu cầu chỉnh sửa từ nhân viên"><strong>Nhân viên yêu cầu chỉnh sửa</strong><p>{post.decisionNote||'Vui lòng kiểm tra và cập nhật lại nội dung bài viết.'}</p><button type="button" className="btn-view-detail" onClick={()=>onEdit(post)}>Chỉnh sửa và gửi duyệt lại</button></section>}
     {mine&&post.status==='REJECTED'&&<p className="community-rejected-note">Lý do từ chối: {post.decisionNote||'Nội dung không phù hợp tiêu chuẩn cộng đồng.'}</p>}
     <CommunityPostFooter post={post} mine={mine} deleting={deleting} onDelete={()=>onDelete(post)}/>
     </article>;
   })}</div>
   {!state.loading&&!state.error&&filtered.length>0&&<nav className="community-pagination" aria-label="Phân trang bài viết"><p aria-live="polite">Hiển thị {(page-1)*8+1}–{Math.min(page*8,filtered.length)} / {filtered.length} bài viết</p><div><button type="button" aria-label="Trang trước" disabled={page<=1} onClick={()=>changePage(page-1)}><ChevronLeft size={18} aria-hidden="true"/></button>{paginationRange(page,totalPages).map(value=>typeof value==='string'?<span key={value} aria-hidden="true">…</span>:<button type="button" key={value} aria-label={`Trang ${value}`} aria-current={value===page?'page':undefined} onClick={()=>changePage(value)}>{value}</button>)}<button type="button" aria-label="Trang sau" disabled={page>=totalPages} onClick={()=>changePage(page+1)}><ChevronRight size={18} aria-hidden="true"/></button></div></nav>}
  </section><CommunityPrototypeSidebar onZone={value=>change({location:value})}/></div></main>
  {showBackToTop&&<button type="button" className="community-back-to-top" aria-label="Cuộn lên đầu trang" title="Cuộn lên đầu trang" onClick={scrollToTop}><ArrowUp size={22} aria-hidden="true"/></button>}
  <AnimatePresence>{selected&&<Modal title={selected.title} maxWidth="900px" className="community-detail-prototype" onClose={closeDetail} footer={<div className="community-detail-actions">{detailPhone(selected.authorPhone)&&<a className="btn-quick-call" href={`tel:${detailPhone(selected.authorPhone)}`}><Phone size={16}/>Gọi {selected.authorName}</a>}<MotionButton className="p-button" onClick={closeDetail}>Đóng</MotionButton></div>}><Badge post={selected}/><p className="community-detail-meta">{selected.authorName} · {communityDate(selected.createdAt)}</p><p className="post-main-price">{selected.priceDisplay}</p><p className="community-detail-meta"><MapPin size={16}/>{selected.location}</p><div className="community-detail-copy">{selected.content}</div><div className="community-detail-photos">{selected.images.map(image=><InlinePhoto key={image.id} postId={selected.id} image={image}/>)}</div>{selected.videos.map(video=><CommunityPostVideo key={video.id} postId={selected.id} video={video}/>)}</Modal>}</AnimatePresence>
 </>;
}
