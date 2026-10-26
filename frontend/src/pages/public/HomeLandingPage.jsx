import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Check, ChevronRight, Heart, LogOut, MapPin, Phone} from 'lucide-react';
import {useAuth} from '../../context/AuthContext.jsx';
import {landingFor, roleLabels} from '../../routing/screens.js';
import {PublicListingImage, PublicPropertyDetail, publicAmenityLabel} from '../../components/PublicPropertyCard.jsx';
import {fetchPublicProperties, filterPublicProperties, normalizeLocation} from '../../services/public-properties.js';
import {money} from '../../services/room-types.js';
import HomePrototype from './HomePrototype.jsx';
import '../../styles/home-landing.css';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';

const initialFilters = {location:'all', price:'all', type:'all', tab:'all', chip:'all'};
const savedKey = 'hlrcs:public-saved-properties';
function readSaved() {
  try { const value=JSON.parse(localStorage.getItem(savedKey)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; }
}
export function filterHomeProperties(data, filters) {
  const amenity = {'dieu-hoa':'airConditioner','tu-do':'flexibleHours','ban-cong':'balcony'}[filters.chip] || 'all';
  const base = filterPublicProperties(data, {area:filters.location, price:filters.price, amenity});
  return base.filter(property => {
    const types = property.roomTypes || [];
    const text = normalizeLocation([property.propertyType, ...types.map(type=>type.name)].join(' '));
    const amenities = [...(property.amenities||[]), ...types.flatMap(type=>type.amenities||[])];
    if (filters.tab === 'studio' && !/studio|chung cu|can ho/.test(text)) return false;
    if (['tan-xa','thach-hoa'].includes(filters.tab) && !filterPublicProperties([property],{area:filters.tab}).length) return false;
    if (filters.type === 'khep-kin' && !amenities.includes('privateBathroom') && !text.includes('khep kin')) return false;
    if (filters.type === 'gac-lung' && !amenities.includes('loft') && !text.includes('gac')) return false;
    if (filters.type === 'chung-cu-mini' && !/studio|chung cu|can ho/.test(text)) return false;
    if (filters.type === 'o-ghep' && !text.includes('ghep')) return false;
    // Do not infer distance from an address: this shortcut requires a real measured distance.
    if (filters.chip === 'gan-fpt' && !(property.distanceToFptMeters != null && property.distanceToFptMeters < 1000)) return false;
    return true;
  });
}
function PropertyCard({property, saved, onSave, onDetail, onContact}) {
  const types = property.roomTypes || [];
  const type = types.find(type=>type.vacantRooms>0) || types[0];
  const tags = [...new Set([...(type?.amenities||[]), ...(property.amenities||[])])];
  return <article className="room-card" data-property-id={property.propertyId}>
    <div className="room-thumb-wrap">
      <button className="room-thumb-link home-image-button" onClick={onDetail} aria-label={`Xem ${property.name}`}><PublicListingImage src={property.photos?.[0]} name={property.name} className="room-img"/></button>
      <span className="room-badge-top"><Check size={12}/>100% Xác thực chính chủ</span>
      <span className="room-badge-avail">{property.vacantRooms>0?`Còn ${property.vacantRooms} phòng`:property.totalRooms?'Hết phòng':'Chưa cập nhật phòng'}</span>
      <button type="button" className={`btn-card-wishlist ${saved?'active':''}`} aria-label={`${saved?'Bỏ lưu':'Lưu'} ${property.name} trên thiết bị`} aria-pressed={saved} onClick={onSave}><Heart size={18} fill={saved?'currentColor':'none'}/></button>
    </div>
    <div className="room-body">
      <div className="room-location"><MapPin size={14}/><span>{property.address || property.commune || 'Chưa cập nhật địa chỉ'}</span></div>
      <h3 className="room-title" title={property.name}><button className="home-title-button" onClick={onDetail}>{property.name}</button></h3>
      <div className="room-amenities">{type?.area!=null&&<span className="amenity-pill">📐 {type.area}m²</span>}{tags.slice(0,3).map(key=><span className="amenity-pill" key={key}>{publicAmenityLabel(key)}</span>)}{tags.length>3&&<span className="amenity-pill">+{tags.length-3}</span>}</div>
      <div className="room-price-row"><div><span className="price-main">{property.minPrice==null?'Đang cập nhật':money(property.minPrice)}</span>{property.minPrice!=null&&<span className="price-unit">/tháng</span>}</div><div className="utility-rates">⚡ {type?.electricityPrice!=null?`${money(type.electricityPrice)}/kWh`:'Chưa cập nhật'}<br/>💧 {type?.waterPrice!=null?money(type.waterPrice):'Chưa cập nhật'}</div></div>
      <div className="room-actions"><button className="btn-card-detail" onClick={onDetail}>Chi tiết phòng</button><button className="btn-card-contact" onClick={onContact} title="Xem thông tin nhà trọ; số liên hệ chưa được cung cấp qua API công khai"><Phone size={14}/><span>Gọi chủ trọ</span></button></div>
    </div>
  </article>;
}
export default function HomeLandingPage() {
  const {user, logout} = useAuth();
  const [data,setData] = useState([]), [loading,setLoading] = useState(true), [error,setError] = useState(''), [revision,setRevision] = useState(0);
  const [filters,setFilters] = useState(initialFilters), [visible,setVisible] = useState(6), [selected,setSelected] = useState(null), [contactNotice,setContactNotice] = useState(false), [saved,setSaved] = useState(readSaved), [mobileOpen,setMobileOpen] = useState(false);
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true); setError('');
    fetchPublicProperties(controller.signal).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[revision]);
  useEffect(()=>setVisible(6),[filters]);
  useEffect(()=>{const previous=document.title; document.title='HL_RCS | Hệ thống kết nối phòng trọ thông minh tại Hòa Lạc';return()=>{document.title=previous;};},[]);
  const filtered=useMemo(()=>filterHomeProperties(data,filters),[data,filters]);
  const save=id=>setSaved(previous=>{const next=previous.includes(id)?previous.filter(value=>value!==id):[...previous,id];try{localStorage.setItem(savedKey,JSON.stringify(next));}catch{}return next;});
  const scrollListings=()=>document.getElementById('explore')?.scrollIntoView({behavior:'smooth'});
  const onClick=event=>{
    const tab=event.target.closest('[data-tab]'), chip=event.target.closest('[data-chip]');
    if(tab)setFilters(previous=>({...previous,tab:tab.dataset.tab}));
    if(chip)setFilters(previous=>({...previous,chip:chip.dataset.chip}));
    if(event.target.closest('#mobileMenuBtn'))setMobileOpen(value=>!value);
    if(event.target.closest('.nav-menu a'))setMobileOpen(false);
  };
  const onChange=event=>{
    const key={filterLocation:'location',filterPrice:'price',filterType:'type'}[event.target.id];
    if(key)setFilters(previous=>({...previous,[key]:event.target.value}));
  };
  const onSubmit=event=>{if(event.target.id==='searchForm'){event.preventDefault();scrollListings();}};
  const account=user?<><Link to="/favorites" className="btn-wishlist-top" aria-label="Nhà trọ đã lưu"><Heart size={18}/><span className="wishlist-count">{saved.length}</span></Link>{user.role!=='USER'&&<Link to={landingFor(user)} className="btn-primary-sm">Bảng điều khiển</Link>}<div className="user-nav-pill"><Link to="/profile" className="user-nav-profile-link"><div className="user-nav-avatar">{(user.fullName||'U').charAt(0)}</div><div className="user-nav-meta"><span className="user-nav-name">{user.fullName}</span><span className="user-nav-role">{roleLabels[user.role]}</span></div></Link><button className="user-nav-logout" aria-label="Đăng xuất" onClick={()=>logout()}><LogOut size={15}/></button></div></>:null;
  const listings=loading?<div className="home-list-state" role="status">Đang tải danh sách nhà trọ...</div>:error?<div className="home-list-state" role="alert"><h3>Chưa thể tải danh sách nhà trọ</h3><p>{error}</p><button className="btn-primary-sm" onClick={()=>setRevision(value=>value+1)}>Thử lại</button></div>:!filtered.length?<div className="home-list-state"><h3>{data.length?'Không tìm thấy phòng trọ phù hợp':'Chưa có nhà trọ được công khai'}</h3><p>{data.length?'Vui lòng thử điều chỉnh lại bộ lọc hoặc chọn mức giá khác.':'Nhà trọ sẽ xuất hiện sau khi được xét duyệt và hiển thị.'}</p>{data.length>0&&<button className="btn-primary-sm" onClick={()=>setFilters(initialFilters)}>Xem tất cả phòng</button>}</div>:filtered.slice(0,visible).map(property=><PropertyCard key={property.propertyId} property={property} saved={saved.includes(property.propertyId)} onSave={()=>save(property.propertyId)} onDetail={()=>{setContactNotice(false);setSelected(property);}} onContact={()=>{setContactNotice(true);setSelected(property);}}/>);
  const more=!loading&&!error&&visible<filtered.length?<button className="btn-outline-lg" onClick={()=>setVisible(value=>value+6)}>Xem thêm {filtered.length-visible} nhà trọ quanh Hòa Lạc<ChevronRight size={16}/></button>:null;
  return <><HomePrototype {...{listings,more,account,filters,onClick,onSubmit,onChange,mobileOpen}} savedCount={saved.length}/>{selected&&<PublicPropertyDetail contactNotice={contactNotice} property={selected} onClose={()=>setSelected(null)}/>}</>;
}
