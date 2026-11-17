import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,Check,Copy,Layers,LoaderCircle,Plus,RotateCcw,Trash2,Pencil} from 'lucide-react';
import HostManagementShell from './HostManagementShell.jsx';
import {MotionButton} from './motion/MotionUI.jsx';
import {hostApi} from '../services/host.js';
import {applyLayoutPattern,copyFloorLayout,generateRoomLayout,layoutErrors,selectLayoutNumbers,ROOM_LAYOUT_LIMIT} from '../services/room-layout.js';
import '../styles/multi-floor-room-setup.css';
const PAGE_SIZE=24;

export default function MultiFloorRoomSetup({property,types,userId,onDone}) {
 const storageKey=`hlrcs:room-layout:${userId}:${property.propertyId}`;
 const [rows,setRows]=useState(()=>{try{const data=JSON.parse(sessionStorage.getItem(storageKey));return Array.isArray(data)&&data.length<=ROOM_LAYOUT_LIMIT&&data.every(row=>typeof row.id==='string'&&typeof row.roomNumber==='string'&&typeof row.floor==='string')?data:[];}catch{return [];}});
 const [generation,setGeneration]=useState({from:'1',to:'5',count:'10',start:'1',prefix:''});
 const [floor,setFloor]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1);
 const [selected,setSelected]=useState(new Set()),[history,setHistory]=useState([]),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [editingNumber,setEditingNumber]=useState(null);
 const [selectionText,setSelectionText]=useState('');
 const [chosenType,setChosenType]=useState(types[0]?.roomTypeId||''),[pattern,setPattern]=useState(types.slice(0,2).map(type=>type.roomTypeId)),[destinations,setDestinations]=useState([]);
 const request=useRef(),finished=useRef(false);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{if(finished.current)return;try{sessionStorage.setItem(storageKey,JSON.stringify(rows));}catch{setMessage('Không lưu được bản nháp trên trình duyệt. Giữ trang này mở cho đến khi lưu.');}},[rows,storageKey]);
 const existing=useMemo(()=>types.flatMap(type=>(type.rooms||[]).map(room=>room.roomNumber)),[types]);
 const errors=useMemo(()=>layoutErrors(rows,types,existing),[rows,types,existing]);
 const floors=useMemo(()=>[...new Set(rows.map(row=>row.floor))],[rows]);
 const activeFloor=floors.includes(floor)?floor:floors[0];
 const current=rows.filter(row=>row.floor===activeFloor&&row.roomNumber.toLowerCase().includes(search.toLowerCase()));
 const currentPage=Math.min(page,Math.max(1,Math.ceil(current.length/PAGE_SIZE))),visible=current.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
 const selectedRows=rows.filter(row=>selected.has(row.id));
 const canSave=property.status==='ACTIVE'&&rows.length>0&&!Object.keys(errors).length;
 const commit=next=>{setHistory(previous=>[...previous.slice(-9),rows]);setRows(next);setError('');setMessage('');};
 const toggle=id=>setSelected(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);return next;});
 const selectFloor=value=>{setFloor(value);setPage(1);setSearch('');setSelected(new Set());setDestinations([]);};
 function generate(){try{const result=generateRoomLayout(generation,[...existing,...rows.map(row=>row.roomNumber)]);if(rows.length+result.rooms.length>ROOM_LAYOUT_LIMIT)throw Error('Một bản nháp tối đa 5.000 phòng.');if(!result.rooms.length)throw Error('Các số phòng này đã có. Đổi tầng hoặc số bắt đầu để thêm phòng.');commit([...rows,...result.rooms]);setFloor(result.rooms[0].floor);setSelected(new Set());setMessage(`Đã thêm ${result.rooms.length} phòng vào bản nháp.${result.skipped?` Bỏ qua ${result.skipped} số phòng đã có.`:''}`);}catch(e){setError(e.message);}}
 function assign(){if(!selected.size||!chosenType)return;commit(rows.map(row=>selected.has(row.id)?{...row,roomTypeId:Number(chosenType)}:row));}
 function alternating(){try{const ids=selected.size?selected:new Set(current.map(row=>row.id));if(!ids.size)throw Error('Chọn tầng hoặc phòng trước khi áp dụng mẫu.');commit(applyLayoutPattern(rows,ids,pattern.map(Number)));}catch(e){setError(e.message);}}
 function copy(){try{if(!destinations.length)throw Error('Chọn ít nhất một tầng nhận.');commit(copyFloorLayout(rows,activeFloor,destinations));setMessage(`Đã sao chép loại phòng sang ${destinations.length} tầng. Số phòng từng tầng được giữ nguyên.`);}catch(e){setError(e.message);}}
 async function save(){if(!canSave||request.current)return;const c=new AbortController();request.current=c;setBusy(true);setError('');
  try{await hostApi.createRoomLayout({propertyId:property.propertyId,rooms:rows.map(({roomTypeId,roomNumber,floor})=>({roomTypeId,roomNumber:roomNumber.trim(),floor:floor.trim()}))},c.signal);if(!c.signal.aborted){finished.current=true;sessionStorage.removeItem(storageKey);onDone();}}
  catch(e){if(!c.signal.aborted)setError(e.message);}finally{if(request.current===c)request.current=null;if(!c.signal.aborted)setBusy(false);}
 }
 return <HostManagementShell activePath="/host/room-types"><section className="ml-page">
  <Link className="hm-btn hm-btn-subtle" to={`/host/room-types?propertyId=${property.propertyId}`}><ArrowLeft size={16}/>Loại phòng &amp; Giá</Link>
  <header><Layers size={28}/><div><h1>Thiết lập phòng nhiều tầng</h1><p>{property.name} · Tạo khung phòng, gán loại theo vị trí, rồi chọn công khai.</p></div></header>
  {!types.length?<div className="ml-notice"><p>Thêm các loại phòng trước. Bạn có thể lưu loại phòng và thiết lập danh sách phòng sau.</p><Link className="hm-btn hm-btn-primary" to={`/host/room-types?propertyId=${property.propertyId}`}>Thêm loại phòng</Link></div>:<>
  {property.status!=='ACTIVE'&&<p role="alert">Nhà trọ cần được phê duyệt và đang hoạt động để tạo phòng.</p>}
  <fieldset disabled={busy||property.status!=='ACTIVE'} className="ml-controls">
   <details className="ml-panel" open={!rows.length}><summary>1. Tạo khung tầng &amp; số phòng</summary><div className="ml-generator">
    {[["from","Từ tầng"],["to","Đến tầng"],["count","Số phòng mỗi tầng"],["start","Số thứ tự bắt đầu"]].map(([key,label])=><label key={key}>{label}<input type="number" min={key==='from'?'0':'1'} value={generation[key]} onChange={e=>setGeneration(previous=>({...previous,[key]:e.target.value}))}/></label>)}
    <label>Tiền tố (tùy chọn)<input maxLength={12} value={generation.prefix} onChange={e=>setGeneration(previous=>({...previous,prefix:e.target.value}))} placeholder="VD: P."/></label>
    <MotionButton className="hm-btn hm-btn-primary" onClick={generate}><Plus size={16}/>Thêm khung phòng</MotionButton>
   </div><p>Số phòng được ghép từ tầng và số thứ tự: tầng 3, bắt đầu 01 → 301. Phòng đã tồn tại được bỏ qua.</p></details>
   {!!rows.length&&<>
    <div className="ml-overview"><strong>{rows.length} phòng · {floors.length} tầng</strong><span>{rows.filter(row=>!errors[row.id]).length} phòng hợp lệ</span><span>{Object.keys(errors).length} phòng cần kiểm tra</span>
     <MotionButton className="hm-btn hm-btn-subtle" disabled={!history.length} onClick={()=>{setRows(history.at(-1));setHistory(previous=>previous.slice(0,-1));setSelected(new Set());setError('');setMessage('Đã hoàn tác thay đổi gần nhất.');}}><RotateCcw size={15}/>Hoàn tác</MotionButton>
    </div>
    <div className="ml-floor-switch"><label>Tầng đang thiết lập<select aria-label="Tầng đang thiết lập" value={activeFloor} onChange={e=>selectFloor(e.target.value)}>{floors.map(name=><option key={name}>{name}</option>)}</select></label><label>Tìm số phòng<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);setSelected(new Set());}} placeholder="VD: 301"/></label></div>
    <section className="ml-panel"><h2>2. Gán loại cho các phòng bất kỳ</h2>
     <div className="ml-quick-select"><MotionButton className="hm-btn" onClick={()=>setSelected(new Set(current.map(row=>row.id)))}>Chọn cả tầng / kết quả lọc</MotionButton><MotionButton className="hm-btn" onClick={()=>setSelected(new Set(current.filter(row=>Number(row.roomNumber.match(/\d+$/)?.[0])%2===1).map(row=>row.id)))}>Chọn phòng lẻ</MotionButton><MotionButton className="hm-btn" onClick={()=>setSelected(new Set(current.filter(row=>Number(row.roomNumber.match(/\d+$/)?.[0])%2===0).map(row=>row.id)))}>Chọn phòng chẵn</MotionButton><MotionButton className="hm-btn hm-btn-subtle" onClick={()=>{setSelected(new Set());setMessage('');}}>Bỏ chọn</MotionButton></div>
     <details className="ml-number-selection"><summary>Chọn nhanh bằng danh sách số phòng</summary><label>Danh sách số phòng cần chọn<textarea aria-label="Danh sách số phòng cần chọn" rows={2} value={selectionText} onChange={e=>setSelectionText(e.target.value)} placeholder="101, 104, 108, 201, 205"/></label><p>Chọn phòng bất kỳ trên mọi tầng bằng số phòng, ngăn cách bằng dấu phẩy hoặc xuống dòng.</p><MotionButton className="hm-btn" onClick={()=>{try{const ids=selectLayoutNumbers(rows,selectionText);setSelected(ids);setError('');setMessage(`Đã chọn ${ids.size} phòng theo danh sách trên mọi tầng.`);}catch(e){setError(e.message);}}}>Chọn các số này</MotionButton></details>
     <div className="ml-assign"><strong>{selectedRows.length} phòng đã chọn</strong><label>Loại phòng để gán<select aria-label="Loại phòng để gán" value={chosenType} onChange={e=>setChosenType(e.target.value)}>{types.map(type=><option key={type.roomTypeId} value={type.roomTypeId}>{type.roomType}</option>)}</select></label><MotionButton className="hm-btn hm-btn-primary" disabled={!selected.size} onClick={assign}>Gán loại phòng</MotionButton><MotionButton className="hm-btn" disabled={!selected.size} onClick={()=>{commit(rows.filter(row=>!selected.has(row.id)));setSelected(new Set());}}><Trash2 size={15}/>Bỏ khỏi bản nháp</MotionButton></div>
     <div className="ml-rooms">{visible.map(row=><div className={`ml-room ${selected.has(row.id)?'is-selected':''} ${errors[row.id]?'has-error':''}`} key={row.id}>
      <label className="ml-room-select"><input type="checkbox" aria-label={`Chọn phòng ${row.roomNumber}`} checked={selected.has(row.id)} onChange={()=>toggle(row.id)}/><span>{row.roomNumber}</span></label>
      <button type="button" className="ml-rename" aria-label={`Sửa số phòng ${row.roomNumber}`} onClick={()=>setEditingNumber(editingNumber===row.id?null:row.id)}><Pencil size={14}/>Đổi số</button>
      {editingNumber===row.id&&<label>Số phòng<input autoFocus value={row.roomNumber} maxLength={30} aria-label={`Số phòng ${row.roomNumber}`} onChange={e=>commit(rows.map(item=>item.id===row.id?{...item,roomNumber:e.target.value}:item))}/></label>}
      <label>Loại phòng<select value={row.roomTypeId||''} aria-label={`Loại phòng ${row.roomNumber}`} onChange={e=>commit(rows.map(item=>item.id===row.id?{...item,roomTypeId:Number(e.target.value)||null}:item))}><option value="">Chưa gán loại</option>{types.map(type=><option key={type.roomTypeId} value={type.roomTypeId}>{type.roomType}</option>)}</select></label>
      {errors[row.id]&&<small className="ml-room-error">{errors[row.id]}</small>}
     </div>)}</div>
     <nav className="ml-pagination" aria-label="Trang phòng trong tầng"><MotionButton className="hm-btn" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Trước</MotionButton><span>Trang {currentPage}/{Math.max(1,Math.ceil(current.length/PAGE_SIZE))} · {current.length} phòng</span><MotionButton className="hm-btn" disabled={currentPage*PAGE_SIZE>=current.length} onClick={()=>setPage(currentPage+1)}>Sau</MotionButton></nav>
    </section>
    <div className="ml-shortcuts">
     <details className="ml-panel"><summary>Gán so le tự động</summary><p>Áp dụng lần lượt theo mẫu cho {selected.size?`${selected.size} phòng đang chọn`:'toàn bộ kết quả lọc của tầng đang mở'}.</p><div className="ml-pattern">{pattern.map((id,index)=><label key={index}>Vị trí {index+1}<select aria-label={`Vị trí ${index+1}`} value={id} onChange={e=>setPattern(previous=>previous.map((item,i)=>i===index?Number(e.target.value):item))}>{types.map(type=><option key={type.roomTypeId} value={type.roomTypeId}>{type.roomType}</option>)}</select></label>)}</div><div className="ml-quick-select"><MotionButton className="hm-btn" disabled={pattern.length>=10} onClick={()=>setPattern(previous=>[...previous,types[0].roomTypeId])}>Thêm vị trí vào mẫu</MotionButton><MotionButton className="hm-btn" disabled={pattern.length<2} onClick={()=>setPattern(previous=>previous.slice(0,-1))}>Bớt vị trí cuối</MotionButton><MotionButton className="hm-btn hm-btn-primary" onClick={alternating}>Áp dụng so le</MotionButton></div></details>
     <details className="ml-panel"><summary>Sao chép bố trí sang các tầng khác</summary><p>Sao chép loại phòng theo thứ tự từ {activeFloor}. Giữ nguyên số phòng của tầng nhận; các tầng cần có cùng số phòng.</p><MotionButton className="hm-btn" onClick={()=>setDestinations(floors.filter(name=>name!==activeFloor))}>Chọn mọi tầng còn lại</MotionButton><div className="ml-copy-targets">{floors.filter(name=>name!==activeFloor).map(name=><label key={name}><input type="checkbox" checked={destinations.includes(name)} onChange={()=>setDestinations(previous=>previous.includes(name)?previous.filter(item=>item!==name):[...previous,name])}/>{name}</label>)}</div><MotionButton className="hm-btn hm-btn-primary" disabled={!destinations.filter(name=>name!==activeFloor&&floors.includes(name)).length} onClick={copy}><Copy size={15}/>Sao chép loại phòng</MotionButton></details>
    </div>
    <details className="ml-panel"><summary>3. Kiểm tra tổng hợp trước khi lưu</summary><ul>{types.map(type=><li key={type.roomTypeId}>{type.roomType}: <strong>{rows.filter(row=>row.roomTypeId===type.roomTypeId).length} phòng</strong></li>)}</ul><p>Các phòng mới đều riêng tư. Sau khi lưu, bạn sẽ chọn những phòng muốn công khai ở bước tiếp theo.</p></details>
   </>}
  </fieldset>
  {message&&<p role="status" className="ml-notice">{message}</p>}{error&&<p role="alert" className="ml-error">{error}</p>}
  <footer><p>{!rows.length?'Tạo khung phòng để bắt đầu.':Object.keys(errors).length?`Cần kiểm tra ${Object.keys(errors).length} phòng trước khi lưu.`:'Danh sách đã đủ loại phòng, sẵn sàng lưu.'}</p><MotionButton className="hm-btn hm-btn-primary" disabled={busy||!canSave} onClick={save}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>}Tạo {rows.length} phòng &amp; chọn công khai</MotionButton></footer>
  </>}
 </section></HostManagementShell>;
}
