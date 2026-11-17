import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Text, View } from 'react-native';
import { HostPage, ResourceState, h } from '@/components/host/host-ui';
import { Segments } from '@/components/host/management-ui';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useHost } from '@/context/host-context';
import { useAuth } from '@/context/auth-context';
import { HostError, type HostRoom } from '@/services/host';
import { validateRoomDraft, type RoomDraft } from '@/services/host-edit';

const draft=(r?:HostRoom):RoomDraft=>({roomNumber:r?.roomNumber||'',floor:r?.floor||'',roomTypeId:r?String(r.roomTypeId):'',status:r?.status||'VACANT',customPrice:r?.customPrice==null?'':String(r.customPrice)});
export default function Room(){
 const {id,propertyId}=useLocalSearchParams<{id?:string;propertyId?:string}>();const host=useHost();const {user}=useAuth();const room=host.data.rooms?.rooms.find(r=>String(r.roomId)===id);
 return <HostPage title={id?'Chỉnh sửa phòng':'Thêm phòng'}><ResourceState resource="rooms"/><ResourceState resource="roomTypes"/>{id&&!room?<Text style={h.secondary}>{host.data.rooms?'Không tìm thấy phòng trong tài khoản này.':'Đang tải phòng…'}</Text>:<RoomForm key={`${user?.userId}:${id||'new'}:${propertyId}`} room={room} propertyId={room?.propertyId||Number(propertyId)}/>}</HostPage>;
}
function RoomForm({room,propertyId}:{room?:HostRoom;propertyId:number}){
 const host=useHost();const [form,setForm]=useState(()=>draft(room)),[baseline,setBaseline]=useState(()=>draft(room)),[errors,setErrors]=useState<Record<string,string>>({}),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[confirm,setConfirm]=useState(false),[discard,setDiscard]=useState<(()=>void)|null>(null);const lock=useRef(false),mounted=useRef(true),snapshot=useRef(room);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const property=host.data.roomTypes?.properties?.find(p=>p.propertyId===propertyId)||host.data.properties?.records.find(p=>p.propertyId===propertyId);const types=host.data.roomTypes?.roomTypes.filter(t=>t.propertyId===propertyId)||[];
 const dirty=JSON.stringify(form)!==JSON.stringify(baseline);usePreventRemove((dirty&&!saved)||busy,({repeat})=>{if(!busy)setDiscard(()=>repeat);});
 useEffect(()=>{if(saved){if(router.canGoBack())router.back();else router.replace('/host/rooms');}},[saved]);
 const save=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError(null);const body={roomTypeId:Number(form.roomTypeId),roomNumber:form.roomNumber.trim().toUpperCase(),floor:form.floor.trim(),status:form.status,customPrice:form.customPrice.trim()?Number(form.customPrice):null};
 try{await host.store.mutate(room?`/host/rooms/${room.roomId}`:'/host/rooms',body,room?'PUT':'POST',snapshot.current);if(mounted.current)setSaved(true);}
 catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Chưa thể lưu phòng.');if(e instanceof HostError&&e.status===409&&room){const latest=host.store.getSnapshot().data.rooms?.rooms.find(r=>r.roomId===room.roomId);if(latest){snapshot.current=latest;setForm(draft(latest));setBaseline(draft(latest));}}}}
 finally{lock.current=false;if(mounted.current){setBusy(false);setConfirm(false);}}};
 if(!property)return <Text style={h.secondary}>Chưa tải được nhà trọ trong tài khoản này.</Text>;
 const canEdit=property&&('status' in property?property.status==='ACTIVE':['ACTIVE','VISIBLE'].includes(property.displayStatus));
 return <><View style={h.card}><Text style={h.small}>Nhà trọ đang thao tác</Text><Text style={h.itemTitle}>{property.name}</Text></View><InlineError message={error}/><AuthInput label="Mã phòng" accessibilityLabel="Mã phòng" value={form.roomNumber} maxLength={30} editable={!busy&&canEdit} error={errors.roomNumber} onChangeText={value=>setForm(v=>({...v,roomNumber:value}))}/><AuthInput label="Tầng / khu vực" accessibilityLabel="Tầng / khu vực" value={form.floor} maxLength={50} editable={!busy&&canEdit} error={errors.floor} onChangeText={value=>setForm(v=>({...v,floor:value}))}/><View style={{gap:8}}><Text style={h.itemTitle}>Loại phòng</Text>{types.map(t=><AnimatedPressable key={t.roomTypeId} disabled={busy||!canEdit} accessibilityRole="radio" accessibilityState={{checked:Number(form.roomTypeId)===t.roomTypeId}} aria-checked={Number(form.roomTypeId)===t.roomTypeId} accessibilityLabel={t.roomType} style={h.action} onPress={()=>setForm(v=>({...v,roomTypeId:String(t.roomTypeId)}))}><Text style={h.itemTitle}>{Number(form.roomTypeId)===t.roomTypeId?'✓ ':''}{t.roomType}</Text></AnimatedPressable>)}{!types.length&&<Text style={h.secondary}>Nhà trọ chưa có loại phòng. Hãy thêm loại phòng trước.</Text>}<InlineError message={errors.roomTypeId}/></View><AuthInput label="Giá riêng (₫/tháng)" optionalLabel="Không bắt buộc" accessibilityLabel="Giá riêng (₫/tháng)" hint="Để trống để dùng giá loại phòng." value={form.customPrice} keyboardType="number-pad" editable={!busy&&canEdit} error={errors.customPrice} onChangeText={value=>setForm(v=>({...v,customPrice:value}))}/><View style={{gap:8}}><Text style={h.itemTitle}>Tình trạng thực tế</Text><Segments value={form.status} items={[['VACANT','Trống'],['OCCUPIED','Đã thuê']]} onChange={value=>{if(!busy&&canEdit)setForm(v=>({...v,status:value}));}}/><InlineError message={errors.status}/></View>{!canEdit&&<Text style={h.secondary}>Nhà trọ cần đang hoạt động và được phê duyệt để cập nhật phòng.</Text>}<PrimaryButton title="Lưu phòng" disabled={busy||host.busy||host.loading||!canEdit||!types.length} loading={busy} onPress={()=>{const next=validateRoomDraft(form,types.map(t=>t.roomTypeId));setErrors(next);if(!Object.keys(next).length)setConfirm(true);}}/>{confirm&&<ConfirmDialog title="Lưu thông tin phòng?" description={`${property.name} · ${form.roomNumber.trim()} · ${form.status==='VACANT'?'Trống':'Đã thuê'}`} confirmLabel="Xác nhận lưu phòng" busy={busy} onCancel={()=>setConfirm(false)} onConfirm={()=>{void save();}}/>}{discard&&<ConfirmDialog title="Bỏ thay đổi chưa lưu?" description="Thông tin phòng chưa được lưu." confirmLabel="Bỏ thay đổi" onCancel={()=>setDiscard(null)} onConfirm={()=>{const leave=discard;setDiscard(null);leave();}}/>}</>;
}


