import { MotionButton } from './motion/MotionUI.jsx';
import {useEffect,useRef,useState} from 'react';
import {FileSpreadsheet,Upload,LoaderCircle} from 'lucide-react';
import {Modal} from './PortalUI.jsx';
import {readRoomTypeExcel} from '../services/room-type-excel.js';
import {money} from '../services/room-types.js';

export default function RoomTypeExcelImportModal({property,types,onClose,onImported}){
 const picker=useRef();const alive=useRef(true);const [busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[fileName,setFileName]=useState('');
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const close=()=>{alive.current=false;onClose();};
 const read=async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setBusy(true);setError('');setResult(null);setFileName(file.name);
  try{const parsed=await readRoomTypeExcel(file,{existingRoomNumbers:types.flatMap(type=>(type.rooms||[]).map(room=>room.roomNumber)),existingTypeNames:types.map(type=>type.roomType)});if(alive.current)setResult(parsed);}
  catch(error){if(alive.current)setError(error.message);}finally{if(alive.current)setBusy(false);}
 };
 return <Modal title="Nhập loại phòng từ Excel" className="rt-create-modal rt-excel-modal" onClose={close}>
  <div className="rt-excel-body"><p>Nhập một loại phòng và danh sách phòng cho <strong>{property.name}</strong>. Dữ liệu chỉ được lưu sau khi bạn kiểm tra và xác nhận trong form.</p>
   <input ref={picker} className="rt-excel-file" type="file" accept=".xlsx" aria-label="Chọn file Excel" onChange={read} disabled={busy}/>
   <div className="rt-excel-picker"><FileSpreadsheet size={30}/><strong>{fileName||'Chọn file Excel đã điền theo mẫu'}</strong><span>.xlsx · Tối đa 5 MB · 1–200 phòng</span><MotionButton type="button" className="p-button" disabled={busy} onClick={()=>picker.current?.click()}>{busy?<LoaderCircle className="spin" size={15}/>:<Upload size={15}/>}Chọn file Excel</MotionButton></div>
   {error&&<p className="rt-submit-error" role="alert">{error}</p>}
   {result?.issues.length>0&&<section className="rt-excel-errors" role="alert"><h3>Cần sửa {result.issues.length} lỗi trong file</h3><p>Sửa các ô dưới đây rồi chọn lại file. Chưa có dữ liệu được lưu.</p><ul>{result.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul></section>}
   {result&&!result.issues.length&&<section className="rt-batch-section"><h3>Đã kiểm tra file: {result.rooms.length} phòng</h3><div className="rt-batch-summary"><strong>{result.data.roomType}</strong><div className="rt-batch-summary-values"><span>{result.data.areaSqm} m²</span><span>{result.data.capacity} người</span><span>{money(result.data.price)}/tháng</span></div></div><div className="rt-batch-table-wrap"><table className="rt-batch-table"><thead><tr><th>STT</th><th>Số phòng</th><th>Tầng / Khu vực</th></tr></thead><tbody>{result.rooms.map((room,index)=><tr key={index}><td>{index+1}</td><td>{room.roomNumber}</td><td>{room.floor}</td></tr>)}</tbody></table></div><p className="rt-batch-note">Tiếp tục để kiểm tra thông tin loại phòng, thêm ảnh và chỉnh sửa danh sách phòng trước khi lưu.</p></section>}
   <footer className="rt-modal-footer"><MotionButton type="button" className="p-button" onClick={close}>Hủy</MotionButton><MotionButton type="button" className="p-button primary" disabled={busy||!result||Boolean(result.issues.length)} onClick={()=>{alive.current=false;onImported(result);}}>Đưa vào form kiểm tra</MotionButton></footer>
  </div>
 </Modal>;
}
