import {useEffect} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {Building2,MapPin} from 'lucide-react';
import '../styles/host-property-selector.css';

export default function HostPropertySelector({properties,allowAll=false,management=false,defaultPropertyId,showScopeNote=true,compact=false,children}){
 const [params,setParams]=useSearchParams();
 const location=useLocation();
 useEffect(()=>{
  if(management&&properties.length&&!params.get('propertyId')){
   const typeId=params.get('roomTypeId');
   const next=new URLSearchParams(params);next.set('propertyId',String(defaultPropertyId||properties[0].propertyId));
   if(!typeId)next.delete('roomTypeId');
   setParams(next,{replace:true});
  }
 },[management,properties,params,setParams,defaultPropertyId]);
 if(!properties.length||(!management&&properties.length<2))return null;
 const value=params.get('propertyId')||(allowAll?'ALL':String(defaultPropertyId||properties[0].propertyId));
 const property=properties.find(item=>String(item.propertyId)===value);
 const selector=<label className="host-property-selector">{management?`Chuyển nhà trọ (${properties.length} cơ sở)`:'Nhà trọ đang quản lý'}
  <select aria-label="Chọn nhà trọ" value={value} onChange={event=>{
   const next=new URLSearchParams(params);next.delete('roomTypeId');
   if(event.target.value==='ALL')next.delete('propertyId');else next.set('propertyId',event.target.value);
   setParams(next);
  }}>{allowAll&&<option value="ALL">Tất cả nhà trọ</option>}{properties.map(property=><option key={property.propertyId} value={property.propertyId}>{property.name}{!compact&&property.address?` · ${property.address}`:''}</option>)}</select>
 </label>;
 if(!management)return selector;
 const status=<span className={`hmc-status ${property?.status==='ACTIVE'?'active':''}`}>{property?.status==='ACTIVE'?'Đang hoạt động':'Chưa hoạt động'}</span>;
 const title=<h2>{property?.name||'Nhà trọ không khả dụng'}</h2>;
 return <section className={`host-management-context${compact?' hmc-compact':''}`} aria-label="Nhà trọ đang quản lý">
  <div className="hmc-heading"><span className="hmc-icon"><Building2 size={24}/></span><div>
   <span className="hmc-eyebrow">{compact?'Nhà trọ đang quản lý':'ĐANG QUẢN LÝ NHÀ TRỌ'}</span>
   {compact?<div className="hmc-title-line">{title}{status}</div>:title}
   <p><MapPin size={14}/>{property?.address||'Chưa cập nhật địa chỉ'}</p>
  </div>{!compact&&status}</div>
  {selector}
  <footer>{showScopeNote&&<p>Danh sách, số liệu và thao tác chỉ áp dụng cho nhà trọ đang chọn.</p>}
   <nav aria-label="Quản lý nhà trọ đang chọn">{[['/host/room-types','Loại phòng & Giá'],['/host/rooms','Danh sách phòng']].map(([path,label])=><Link key={path} to={`${path}?propertyId=${value}`} aria-current={location.pathname===path?'page':undefined}>{label}</Link>)}<Link to={`/host/property?propertyId=${value}`}>Hồ sơ nhà trọ ↗</Link></nav>
   {children}
  </footer>
 </section>;
}
