import {supplementGroups} from '../services/supplement-request.js';
import '../styles/supplement-checklist.css';

export default function SupplementRequestFields({detail,selected,onChange,note,onNoteChange,busy,error}) {
 const groups=supplementGroups(detail);
 return <div className="ssc-body">
  <p>Tích chọn chính xác các mục thông tin cần bổ sung và nhập hướng dẫn chi tiết cho chủ trọ.</p>
  <div className="ssc-summary"><span>Danh sách trường theo đơn đăng ký nhà trọ:</span><strong>Đã chọn {selected.length} mục</strong></div>
  {groups.map((group,index)=><fieldset className="ssc-group" key={group.title} disabled={busy}><legend>{index+1}. {group.title}<small>{group.items.length} trường</small></legend>{group.items.map(([key,label,value])=><label className={selected.includes(key)?'selected':''} key={key}><input type="checkbox" checked={selected.includes(key)} onChange={event=>onChange(event.target.checked?[...selected,key]:selected.filter(item=>item!==key))}/><span>{label}</span><small title={value||'Chưa có thông tin'}>Hiện tại: {value||'Chưa có thông tin'}</small></label>)}</fieldset>)}
  <label className="sw-review-label" htmlFor="staff-review-note">Ghi chú của Staff (Tùy chọn):</label>
  <textarea id="staff-review-note" rows={3} maxLength={1000} disabled={busy} value={note} onChange={event=>onNoteChange(event.target.value)} placeholder="Ví dụ: Vui lòng chụp rõ hai mặt CCCD và ghim chính xác vị trí nhà trọ..." aria-invalid={Boolean(error)} aria-describedby={error?'staff-review-error':undefined}/>
  <small>{note.length}/1000 ký tự · Chọn ít nhất một mục cần bổ sung.</small>
  {error&&<p id="staff-review-error" className="sw-error" role="alert">{error}</p>}
 </div>;
}
