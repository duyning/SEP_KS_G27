import { MotionButton } from './motion/MotionUI.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, DoorOpen, ImageOff, Images, Maximize2, Minimize2, Pencil, Ruler, Users, Wallet } from 'lucide-react';
import { Modal, StateView } from './PortalUI.jsx';
import RoomTypePhoto from './RoomTypePhoto.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import '../styles/room-type-detail.css';

export default function RoomTypeDetailModal({ id, onClose, onEdit }) {
  const [state,setState]=useState({loading:true,data:null,error:''});
  const [revision,setRevision]=useState(0);
  const [zoom,setZoom]=useState(null);
  const [activeImage,setActiveImage]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true,data:null,error:''});setZoom(null);setActiveImage(0);
    hostApi.roomTypeDetail(id,controller.signal).then(data=>{if(!controller.signal.aborted)setState({loading:false,data,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({loading:false,data:null,error:error.message});});
    return()=>controller.abort();
  },[id,revision]);
  const type=state.data;
  const images=type?.images||[], rooms=type?.rooms||[], selectedImage=images[activeImage]||images[0];
  const stats=type?[[Wallet,'Giá thuê niêm yết',money(type.price),type.price==null?null:'/ tháng'],[Ruler,'Diện tích',type.areaSqm==null?'Chưa cập nhật':`${type.areaSqm} m²`],[Users,'Sức chứa',type.capacity==null?'Chưa cập nhật':`${type.capacity} người`],[DoorOpen,'Phòng còn trống',type.vacantRooms==null||type.totalRooms==null?'Chưa có dữ liệu':`${type.vacantRooms} / ${type.totalRooms}`,type.vacantRooms==null||type.totalRooms==null?null:'phòng']]:[];
  return <Modal className="rt-info-modal rt-detail" title={type?.roomType||'Chi tiết loại phòng'} onClose={onClose}>
    {state.loading?<StateView kind="loading"/>:state.error?<StateView kind="error" message={state.error}><MotionButton className="p-button" onClick={()=>setRevision(value=>value+1)}>Thử lại</MotionButton></StateView>:<>
      <div className="rtd-scroll">
        <dl className="rtd-stats">{stats.map(([Icon,label,value,unit])=><div key={label}><dt><Icon size={16} aria-hidden="true"/>{label}</dt><dd>{value}{unit&&<small>{unit}</small>}</dd></div>)}</dl>
        <div className="rtd-columns"><div className="rtd-column">
          <section className="rtd-section" aria-label="Hình ảnh loại phòng"><header><h3><Images size={17} aria-hidden="true"/>Hình ảnh loại phòng</h3><span>{images.length} ảnh</span></header>
            {selectedImage?<><MotionButton type="button" className={`rtd-main-photo ${zoom===selectedImage.imageId?'is-expanded':''}`} aria-pressed={zoom===selectedImage.imageId} aria-label={`${zoom===selectedImage.imageId?'Thu nhỏ':'Phóng to'} ảnh ${selectedImage.fileName||activeImage+1}`} onClick={()=>setZoom(zoom===selectedImage.imageId?null:selectedImage.imageId)}>
              <RoomTypePhoto typeId={id} image={selectedImage} className="rtd-photo"/><span className="rtd-photo-action">{zoom===selectedImage.imageId?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</span><span className="rtd-photo-position">{activeImage+1} / {images.length}</span>
            </MotionButton>{images.length>1&&<div className="rtd-thumbnails" aria-label="Chọn ảnh loại phòng">{images.map((image,index)=><MotionButton key={image.imageId} type="button" aria-label={`Xem ảnh ${index+1}: ${image.fileName||'Ảnh loại phòng'}`} aria-pressed={activeImage===index} onClick={()=>{setActiveImage(index);setZoom(null);}}><RoomTypePhoto typeId={id} image={image} className="rtd-thumb"/></MotionButton>)}</div>}</>:<div className="rtd-no-photos"><ImageOff size={28} aria-hidden="true"/><p>Chưa có hình ảnh loại phòng</p></div>}
          </section>
          <section className="rtd-section"><header><h3>Mô tả loại phòng</h3></header><p className="rtd-description">{type.description||'Chưa có mô tả.'}</p></section>
        </div><div className="rtd-column">
          <section className="rtd-section"><header><h3>Tiện nghi trong phòng</h3><span>{type.amenities.length} tiện nghi</span></header>{type.amenities.length?<ul className="rtd-amenities">{type.amenities.map(key=><li key={key}><Check size={15} aria-hidden="true"/>{ROOM_AMENITIES.find(([value])=>value===key)?.[1]||key}</li>)}</ul>:<p className="rtd-muted">Chưa cập nhật tiện nghi.</p>}</section>
          <section className="rtd-section"><header><h3>Tiền cọc & Chi phí dịch vụ</h3></header><dl className="rtd-fees"><div className="rtd-deposit"><dt>Tiền đặt cọc</dt><dd>{money(type.deposit)}</dd></div>{[['Tiền điện',type.electricityPrice,'kWh'],['Tiền nước',type.waterPrice,'m³'],['Internet / Wifi',type.internetPrice,'phòng'],['Dịch vụ chung',type.servicePrice,'người']].map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value==null?<span className="rtd-muted">Chưa cập nhật</span>:<>{money(value)}<small> / {unit}</small></>}</dd></div>)}</dl></section>
        </div></div>
        <section className="rtd-section rtd-rooms-section"><header><h3>Phòng thực tế <span className="rtd-count">{rooms.length}</span></h3><Link className="p-button" to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`}><DoorOpen size={14}/>Quản lý phòng</Link></header>
          <div className="rtd-room-table-wrap"><table className="rtd-room-table"><thead><tr><th scope="col">Số phòng</th><th scope="col">Tầng / Khu vực</th><th scope="col">Trạng thái</th><th scope="col">Giá áp dụng</th></tr></thead><tbody>{rooms.map(room=><tr key={room.roomId}><th scope="row">{room.roomNumber}</th><td>{room.floor||'Chưa cập nhật'}</td><td><span className={`rtd-room-status ${room.status==='VACANT'?'available':'occupied'}`}>{room.status==='VACANT'?'Còn trống':room.status==='OCCUPIED'?'Đã có người thuê':'Chưa xác nhận'}</span></td><td>{money(room.price)}</td></tr>)}{!rooms.length&&<tr><td className="rtd-empty-rooms" colSpan={4}>Chưa có phòng thực tế được liên kết.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>}
    <footer className="rt-info-footer rtd-footer"><MotionButton type="button" className="p-button" onClick={onClose}>Đóng</MotionButton>{type&&!state.loading&&!state.error&&<MotionButton type="button" className="p-button primary" onClick={()=>onEdit(type)}><Pencil size={15}/>Chỉnh sửa thông tin</MotionButton>}</footer>
  </Modal>;
}
