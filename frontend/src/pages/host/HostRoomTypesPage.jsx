import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Download, FileSpreadsheet, DoorOpen, Eye, Grid2X2, House, ImageOff, Layers, List, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { hostApi } from '../../services/host.js';
import { Modal, StateView, StatusBadge, useToast } from '../../components/PortalUI.jsx';
import RoomTypeCreateModal from '../../components/RoomTypeCreateModal.jsx';
import RoomTypeDetailModal from '../../components/RoomTypeDetailModal.jsx';
import RoomTypePhoto from '../../components/RoomTypePhoto.jsx';
import HostPropertySelector from '../../components/HostPropertySelector.jsx';
import RoomTypeExcelImportModal from '../../components/RoomTypeExcelImportModal.jsx';
import {downloadRoomTypeTemplate} from '../../services/room-type-excel.js';
import { ROOM_AMENITIES, money } from '../../services/room-types.js';
import '../../styles/host-room-types-page.css';

export function RoomTypesNoProperty() {
  return <section className="host-room-types-state"><House size={48}/><h2>Bạn cần đăng ký nhà trọ trước khi tạo loại phòng</h2><p>Hãy đăng ký nhà trọ để cấu hình giá và tiện nghi. Bạn có thể quản lý nhiều nhà trọ trên cùng tài khoản.</p><Link to="/host/property/new" className="p-button primary"><Plus size={18}/>Đăng ký nhà trọ ngay</Link></section>;
}
function TypeImage({ type }) {
  return type.images?.length?<RoomTypePhoto typeId={type.roomTypeId} image={type.images[0]}/>:<span className="rt-thumbnail rt-no-image"><ImageOff size={20}/></span>;
}
export function RoomTypesContent({ data, propertyId, onRefresh, onCreated, onDeleted }) {
  const notify=useToast();
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [sort,setSort]=useState('NEWEST');
  const [view,setView]=useState('list');
  const [create,setCreate]=useState(false);
  const [excelImport,setExcelImport]=useState(false);
  const [excelDraft,setExcelDraft]=useState(null);
  const [exporting,setExporting]=useState(false);
  const exportTemplate=async()=>{if(exporting)return;setExporting(true);setOperationError('');try{await downloadRoomTypeTemplate();}catch{setOperationError('Không tải được file mẫu Excel. Vui lòng thử lại.');}finally{setExporting(false);}};
  const [selected,setSelected]=useState(null);
  const [editing,setEditing]=useState(null);
  const [deleting,setDeleting]=useState(null);
  const [busy,setBusy]=useState(false);
  const [operationError,setOperationError]=useState('');
  const operation=useRef();
  useEffect(()=>()=>operation.current?.abort(),[]);
  const openEdit=async id=>{
    if(operation.current)return;
    const controller=new AbortController();operation.current=controller;setBusy(true);setOperationError('');
    try{const type=await hostApi.roomTypeDetail(id,controller.signal);if(!controller.signal.aborted){setEditing(type);setSelected(null);}}
    catch(error){if(!controller.signal.aborted)setOperationError(error.message);}
    finally{if(operation.current===controller)operation.current=null;if(!controller.signal.aborted)setBusy(false);}
  };
  const remove=async()=>{
    if(operation.current)return;
    const controller=new AbortController();operation.current=controller;setBusy(true);setOperationError('');
    try{await hostApi.deleteRoomType(deleting.roomTypeId,controller.signal);if(!controller.signal.aborted){onDeleted(deleting.roomTypeId);setDeleting(null);notify?.('Đã xóa loại phòng.','success');}}
    catch(error){if(!controller.signal.aborted)setOperationError(error.message);}
    finally{if(operation.current===controller)operation.current=null;if(!controller.signal.aborted)setBusy(false);}
  };
  const property=propertyId?data.properties.find(item=>String(item.propertyId)===propertyId):data.properties[0];
  const types=useMemo(()=>data.roomTypes.filter(item=>item.propertyId===property?.propertyId),[data.roomTypes,property?.propertyId]);
  const shown=useMemo(()=>types.filter(item=>item.roomType.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))&&(filter==='ALL'||(filter==='AVAILABLE'?item.vacantRooms>0:item.totalRooms>0&&item.vacantRooms===0))).sort((a,b)=>sort==='PRICE_ASC'?a.price-b.price:sort==='NAME'?a.roomType.localeCompare(b.roomType,'vi'):b.roomTypeId-a.roomTypeId),[types,search,filter,sort]);
  if (!property) return data.pendingRegistrationCount>0?<section className="host-room-types-state"><StatusBadge>Chưa được phê duyệt</StatusBadge><h2>Hồ sơ nhà trọ đang được xử lý</h2><p>Bạn có thể cấu hình loại phòng sau khi nhà trọ được phê duyệt.</p><Link className="p-button primary" to="/host/property">Xem nhà trọ của tôi</Link></section>:<RoomTypesNoProperty/>;
  const canCreate=property.status==='ACTIVE';
  const totals=types.every(item=>item.totalRooms!=null)?types.reduce((sum,item)=>sum+item.totalRooms,0):null;
  const vacancies=types.every(item=>item.vacantRooms!=null)?types.reduce((sum,item)=>sum+item.vacantRooms,0):null;
  const created=record=>{onCreated(record);setCreate(false);setEditing(null);setSearch('');setFilter('ALL');setSort('NEWEST');notify?.(editing?'Đã cập nhật loại phòng thành công.':`Đã tạo loại phòng và ${record.rooms.length} phòng thành công.`,'success');};
  const add=<MotionButton className="p-button primary" disabled={!canCreate} title={canCreate?'Thêm loại phòng mới':'Nhà trọ cần được phê duyệt và đang hoạt động'} onClick={()=>setCreate(true)}><Plus size={17}/>Thêm loại phòng mới</MotionButton>;
  const actions=type=><div className="rt-row-actions"><Link className="p-button rt-manage" to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`}><DoorOpen size={13}/>Quản lý phòng</Link><MotionButton className="p-button" onClick={()=>setSelected(type.roomTypeId)}><Eye size={13}/>Chi tiết</MotionButton><MotionButton className="p-icon" title={`Sửa ${type.roomType}`} aria-label={`Sửa ${type.roomType}`} disabled={busy} onClick={()=>openEdit(type.roomTypeId)}><Pencil size={15}/></MotionButton><MotionButton className="p-icon rt-delete" title={`Xóa ${type.roomType}`} aria-label={`Xóa ${type.roomType}`} disabled={busy} onClick={()=>{setOperationError('');setDeleting(type);}}><Trash2 size={15}/></MotionButton></div>;
  const amenityTags=type=><div className="rt-tags">{(type.amenities||[]).slice(0,3).map(key=><span key={key}>{ROOM_AMENITIES.find(([value])=>key===value)?.[1]||key}</span>)}{type.amenities?.length>3&&<span>+{type.amenities.length-3}</span>}{!type.amenities?.length&&<small>Chưa cập nhật</small>}</div>;
  const availability=type=>type.totalRooms==null||type.vacantRooms==null?<small>Chưa có dữ liệu phòng</small>:<span className="rt-availability">{type.vacantRooms}/{type.totalRooms} trống</span>;
  return <>
    <HostPropertySelector properties={data.properties} management/>
    {operationError&&!deleting&&<p className="rt-submit-error" role="alert">{operationError}</p>}{busy&&!deleting&&<p role="status">Đang tải thông tin loại phòng...</p>}
    <header className="host-room-types-heading"><div><h2>Quản lý loại phòng</h2><p>Thiết lập mức giá, diện tích, sức chứa và tiện nghi cho từng nhóm phòng trong nhà trọ.</p></div><div className="portal-actions"><MotionButton className="p-button" disabled={exporting} onClick={exportTemplate}>{exporting?<LoaderCircle size={15} className="spin"/>:<Download size={15}/>}Tải mẫu Excel</MotionButton><MotionButton className="p-button" disabled={!canCreate} onClick={()=>setExcelImport(true)}><FileSpreadsheet size={15}/>Nhập Excel</MotionButton><MotionButton className="p-icon" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu" onClick={onRefresh}><RefreshCw size={17}/></MotionButton>{add}</div></header>
    <div className="rt-metrics">{[[Layers,'Loại phòng',types.length,'Cấu hình giá & tiện nghi'],[DoorOpen,'Tổng số phòng',totals,'Tổng hợp từ danh sách phòng'],[House,'Phòng còn trống',vacancies,'Tình trạng phòng thực tế']].map(([Icon,label,value,hint])=><article key={label}><header><span>{label}</span><Icon size={18}/></header><strong>{value==null?'Chưa có dữ liệu':value}</strong><small>{hint}</small></article>)}</div>
    <div className="rt-toolbar"><label className="rt-search"><Search size={16}/><input aria-label="Tìm loại phòng" placeholder="Tìm loại phòng theo tên..." value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="rt-filters">{[['ALL',`Tất cả (${types.length})`],['AVAILABLE',`Còn phòng trống (${types.filter(item=>item.vacantRooms>0).length})`],['FULL',`Hết phòng (${types.filter(item=>item.totalRooms>0&&item.vacantRooms===0).length})`]].map(([key,label])=><MotionButton key={key} aria-pressed={filter===key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</MotionButton>)}</div><label className="rt-sort">Sắp xếp:<select aria-label="Sắp xếp loại phòng" value={sort} onChange={event=>setSort(event.target.value)}><option value="NEWEST">Mới nhất</option><option value="PRICE_ASC">Giá tăng dần</option><option value="NAME">Tên A–Z</option></select></label><div className="rt-view-switch"><MotionButton title="Dạng danh sách" aria-label="Dạng danh sách" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={18}/></MotionButton><MotionButton title="Dạng lưới" aria-label="Dạng lưới" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={18}/></MotionButton></div></div>
    {!types.length?<section className="rt-empty"><Layers size={40}/><h3>Hiện tại chưa có loại phòng</h3><p>Chưa có loại phòng nào được lưu cho nhà trọ này.</p>{add}</section>:!shown.length?<section className="rt-empty"><Search size={32}/><h3>Không có loại phòng phù hợp</h3><MotionButton className="p-button" onClick={()=>{setSearch('');setFilter('ALL');}}>Đặt lại bộ lọc</MotionButton></section>:view==='list'?<div className="rt-table-wrap"><table className="rt-table"><thead><tr>{['Loại phòng','Giá thuê niêm yết','Tiền cọc','Tiện nghi tiêu biểu','Số phòng','Tình trạng phòng trống','Thao tác'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{shown.map(type=><tr key={type.roomTypeId}><td><div className="rt-type-cell"><TypeImage type={type}/><div><strong>{type.roomType}</strong><small><Layers size={12}/>{type.areaSqm??'—'} m² · <Users size={12}/>{type.capacity??'—'} người</small></div></div></td><td className="rt-price">{money(type.price)}<small> / tháng</small></td><td>{money(type.deposit)}</td><td>{amenityTags(type)}</td><td>{type.totalRooms??'Chưa có dữ liệu'}</td><td>{availability(type)}</td><td>{actions(type)}</td></tr>)}</tbody></table></div>:<div className="host-room-types-grid">{shown.map(type=><article className="host-room-type" key={type.roomTypeId}><TypeImage type={type}/><h3>{type.roomType}</h3><p>{type.areaSqm??'—'} m² · {type.capacity??'—'} người</p><strong className="rt-price">{money(type.price)} / tháng</strong>{amenityTags(type)}{availability(type)}{actions(type)}</article>)}</div>}
    <AnimatePresence>{excelImport&&<RoomTypeExcelImportModal property={property} types={types} onClose={()=>setExcelImport(false)} onImported={draft=>{setExcelDraft(draft);setExcelImport(false);setCreate(true);}}/>}</AnimatePresence>
    <AnimatePresence>{(create||editing)&&<RoomTypeCreateModal key={editing?.roomTypeId||'new'} property={property} type={editing} initialDraft={excelDraft} existingRoomNumbers={types.flatMap(type=>(type.rooms||[]).map(room=>room.roomNumber))} onClose={()=>{setCreate(false);setEditing(null);setExcelDraft(null);}} onCreated={record=>{created(record);setExcelDraft(null);}}/>}</AnimatePresence>
    <AnimatePresence>{selected&&<RoomTypeDetailModal id={selected} onClose={()=>setSelected(null)} onEdit={type=>{setSelected(null);setEditing(type);}}/>}</AnimatePresence>
    <AnimatePresence>{deleting&&<Modal className="rt-delete-modal" title="Xóa loại phòng" onClose={()=>{if(!busy)setDeleting(null);}}><p>Bạn chắc chắn muốn xóa loại phòng <strong>{deleting.roomType}</strong>? Ảnh thuộc loại phòng cũng sẽ bị xóa. Thao tác này không thể hoàn tác.</p>{operationError&&<p className="rt-submit-error" role="alert">{operationError}</p>}<div className="rt-modal-footer"><MotionButton className="p-button" disabled={busy} onClick={()=>setDeleting(null)}>Hủy</MotionButton><MotionButton className="p-button rt-delete-confirm" disabled={busy} onClick={remove}>{busy?<><LoaderCircle className="spin" size={16}/>Đang xóa...</>:<><Trash2 size={15}/>Xóa loại phòng</>}</MotionButton></div></Modal>}</AnimatePresence>
  </>;
}
export default function HostRoomTypesPage() {
  const { user }=useAuth();
  const [params]=useSearchParams();
  const propertyId=params.get('propertyId');
  const [state,setState]=useState({loading:true,data:null,error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setState({loading:true,data:null,error:''});hostApi.roomTypes(controller.signal,propertyId).then(data=>{if(!controller.signal.aborted)setState({loading:false,data,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,data:null,error:error.message});});return()=>controller.abort();},[user?.userId,propertyId,revision]);
  return <div className="host-room-types-page">{state.loading?<StateView kind="loading"/>:state.error?<StateView kind="error" message={state.error}><MotionButton className="p-button" onClick={()=>setRevision(value=>value+1)}>Thử lại</MotionButton></StateView>:<RoomTypesContent key={`${user?.userId}-${propertyId||''}`} data={state.data} propertyId={propertyId} onRefresh={()=>setRevision(value=>value+1)} onCreated={record=>setState(previous=>({...previous,data:{...previous.data,roomTypes:[record,...previous.data.roomTypes.filter(type=>type.roomTypeId!==record.roomTypeId)]}}))} onDeleted={id=>setState(previous=>({...previous,data:{...previous.data,roomTypes:previous.data.roomTypes.filter(type=>type.roomTypeId!==id)}}))}/>}</div>;
}
