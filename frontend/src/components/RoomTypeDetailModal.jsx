import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Modal, StateView } from './PortalUI.jsx';
import RoomTypePhoto from './RoomTypePhoto.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';

export default function RoomTypeDetailModal({ id, onClose, onEdit }) {
  const [state,setState]=useState({loading:true,data:null,error:''});
  const [revision,setRevision]=useState(0);
  const [zoom,setZoom]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true,data:null,error:''});setZoom(null);
    hostApi.roomTypeDetail(id,controller.signal).then(data=>{if(!controller.signal.aborted)setState({loading:false,data,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,data:null,error:error.message});});
    return()=>controller.abort();
  },[id,revision]);
  const type=state.data;
  return <Modal className="rt-info-modal" title={type?.roomType||'Chi tiết loại phòng'} onClose={onClose}>
    <p className="rt-info-subtitle">Thông số kỹ thuật, tiện nghi và danh sách phòng thực tế liên kết.</p>
    {state.loading?<StateView kind="loading"/>:state.error?<StateView kind="error" message={state.error}><button className="p-button" onClick={()=>setRevision(value=>value+1)}>Thử lại</button></StateView>:<>
      <div className="rt-info-body"><dl className="rt-info-stats">{[['Giá niêm yết',money(type.price)],['Diện tích',`${type.areaSqm??'—'} m²`],['Sức chứa',`${type.capacity??'—'} người`],['Phòng thực tế',type.totalRooms==null?'Chưa có dữ liệu':`${type.vacantRooms} / ${type.totalRooms} trống`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="rt-info-deposit">Tiền đặt cọc: <strong>{money(type.deposit)}</strong></p>
        <h3>Mô tả loại phòng</h3><p className="rt-info-description">{type.description||'Chưa có mô tả.'}</p>
        <h3>Tiện nghi buồng phòng</h3><div className="rt-tags">{type.amenities.map(key=><span key={key}>{ROOM_AMENITIES.find(([value])=>key===value)?.[1]||key}</span>)}{!type.amenities.length&&<p>Chưa cập nhật tiện nghi.</p>}</div>
        <h3>Hình ảnh loại phòng ({type.images.length})</h3>{type.images.length?<div className="rt-info-gallery">{type.images.map(image=><button key={image.imageId} type="button" aria-label={`Xem ảnh ${image.fileName||image.imageId}`} onClick={()=>setZoom(zoom===image.imageId?null:image.imageId)} className={zoom===image.imageId?'expanded':''}><RoomTypePhoto typeId={id} image={image}/></button>)}</div>:<p className="rt-info-empty">Loại phòng này chưa có hình ảnh.</p>}
        <h3>Bảng biểu phí dịch vụ</h3><div className="rt-info-fees">{[['Tiền điện',type.electricityPrice,'kWh'],['Tiền nước',type.waterPrice,'m³'],['Internet',type.internetPrice,'phòng'],['Dịch vụ chung',type.servicePrice,'người']].map(([label,value,unit])=><div key={label}><span>{label}</span><strong>{value==null?'Chưa cập nhật':`${money(value)}/${unit}`}</strong></div>)}</div>
        <header className="rt-info-room-heading"><h3>Danh sách phòng thực tế</h3><Link className="p-button" to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`}>Quản lý phòng thuộc loại này</Link></header>
        <div className="rt-table-wrap"><table className="rt-table rt-info-rooms"><thead><tr><th>Số phòng</th><th>Tầng</th><th>Trạng thái</th><th>Giá áp dụng</th></tr></thead><tbody>{(type.rooms||[]).map(room=><tr key={room.roomId}><td>{room.roomNumber}</td><td>{room.floor}</td><td>{room.status==='VACANT'?'Còn trống':'Đã có người thuê'}</td><td>{money(room.price)}</td></tr>)}{!type.rooms?.length&&<tr><td colSpan={4}>Chưa có phòng thực tế được liên kết.</td></tr>}</tbody></table></div>
      </div>
      <footer className="rt-info-footer"><button className="p-button" onClick={onClose}>Đóng</button><button className="p-button primary" onClick={()=>onEdit(type)}><Pencil size={15}/>Chỉnh sửa thông tin</button></footer>
    </>}
  </Modal>;
}
