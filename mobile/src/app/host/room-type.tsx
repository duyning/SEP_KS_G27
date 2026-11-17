import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError, hostRequest, type HostRoomType } from '@/services/host';
import { updateHostType } from '@/services/host-type-upload';
import { typePayload, validateTypeDraft, type TypeDraft } from '@/services/host-edit';
import { HostPage, h } from '@/components/host/host-ui';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ConfirmDialog } from '@/components/profile/profile-ui';

const empty:TypeDraft={roomType:'',areaSqm:'',capacity:'',price:''};
const draft=(v:HostRoomType):TypeDraft=>({roomType:v.roomType,areaSqm:String(v.areaSqm??''),capacity:String(v.capacity??''),price:String(v.price??'')});
export default function RoomType(){const params=useLocalSearchParams<{id?:string;propertyId:string}>();const {user}=useAuth();return <HostPage title={params.id?'Chỉnh sửa loại phòng':'Thêm loại phòng'}><TypeForm key={`${user?.userId}:${params.id||'new'}:${params.propertyId}`} id={params.id?Number(params.id):undefined} propertyId={Number(params.propertyId)}/></HostPage>;}
function TypeForm({id,propertyId}:{id?:number;propertyId:number}){
 const host=useHost();const [form,setForm]=useState(empty),[baseline,setBaseline]=useState(empty),[original,setOriginal]=useState<HostRoomType>(),[loading,setLoading]=useState(Boolean(id)),[error,setError]=useState<string|null>(null),[errors,setErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[attempt,setAttempt]=useState(0),[discard,setDiscard]=useState<(()=>void)|null>(null);
 const lock=useRef(false),mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const property=host.data.roomTypes?.properties?.find(p=>p.propertyId===propertyId)||host.data.properties?.records.find(p=>p.propertyId===propertyId);
 useEffect(()=>{if(!id)return;const controller=new AbortController();let active=true;const timer=setTimeout(()=>controller.abort(),20000);void(async()=>{try{const token=await tokenStore.get();const value=await hostRequest<HostRoomType>(`/host/room-types/${id}`,token||'',controller.signal);if(value.propertyId!==propertyId)throw new Error('Loại phòng không thuộc nhà trọ đã chọn.');if(active&&!controller.signal.aborted){setOriginal(value);setForm(draft(value));setBaseline(draft(value));}}catch(e){if(active)setError(controller.signal.aborted?'Tải dữ liệu quá lâu. Vui lòng thử lại.':e instanceof Error?e.message:'Chưa tải được loại phòng.');}finally{clearTimeout(timer);if(active)setLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(timer);};},[id,propertyId,attempt]);
 const canEdit=Boolean(property&&('status' in property?property.status==='ACTIVE':['ACTIVE','VISIBLE'].includes(property.displayStatus)));
 const dirty=JSON.stringify(form)!==JSON.stringify(baseline);usePreventRemove((dirty&&!saved)||busy,({repeat})=>{if(!busy)setDiscard(()=>repeat);});
 useEffect(()=>{if(saved){if(router.canGoBack())router.back();else router.replace('/host/room-types');}},[saved]);
 const save=async()=>{if(lock.current||!property||!canEdit||loading||id&&!original)return;const next=validateTypeDraft(form);setErrors(next);if(Object.keys(next).length)return;lock.current=true;setBusy(true);setError(null);const body=typePayload(propertyId,form,original);
 try{await host.store.mutate(id?`/host/room-types/${id}`:'/host/room-types',body,id?'PUT':'POST',undefined,id?async(token,signal)=>{
   const latest=await hostRequest<HostRoomType>(`/host/room-types/${id}`,token,signal);
   if(latest.propertyId!==propertyId||JSON.stringify(typePayload(propertyId,draft(latest),latest))!==JSON.stringify(typePayload(propertyId,draft(original!),original))){if(mounted.current){setOriginal(latest);setForm(draft(latest));setBaseline(draft(latest));}throw new HostError('Loại phòng đã thay đổi. Đã tải lại dữ liệu; kiểm tra trước khi lưu lại.',409);}
   return updateHostType(id,body,token,signal);
  }:undefined);if(mounted.current)setSaved(true);
 }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Chưa thể lưu loại phòng.');}finally{lock.current=false;if(mounted.current)setBusy(false);}};
 if(loading)return <Text style={h.secondary} accessibilityRole="progressbar">Đang tải loại phòng…</Text>;
 if(!property||id&&!original)return <View style={{gap:12}}><Text style={h.secondary}>{error||'Chưa tải được nhà trọ hoặc loại phòng trong tài khoản này.'}</Text><PrimaryButton title="Thử lại" onPress={()=>{setLoading(Boolean(id));setError(null);setAttempt(v=>v+1);void host.store.refresh();}}/></View>;
 return <><View style={h.card}><Text style={h.small}>Nhà trọ đang thao tác</Text><Text style={h.itemTitle}>{property.name}</Text></View><InlineError message={error}/>{(['roomType','areaSqm','capacity','price'] as const).map(key=><AuthInput key={key} label={{roomType:'Tên loại phòng',areaSqm:'Diện tích (m²)',capacity:'Sức chứa (người)',price:'Giá thuê (₫/tháng)'}[key]} accessibilityLabel={{roomType:'Tên loại phòng',areaSqm:'Diện tích (m²)',capacity:'Sức chứa (người)',price:'Giá thuê (₫/tháng)'}[key]} value={form[key]} maxLength={key==='roomType'?100:12} keyboardType={key==='roomType'?'default':key==='areaSqm'?'decimal-pad':'number-pad'} editable={!busy&&canEdit} error={errors[key]} onChangeText={value=>{setForm(v=>({...v,[key]:value}));setErrors(e=>({...e,[key]:''}));}}/>)}<Text style={h.secondary}>Giá này là cấu hình của loại phòng. Giá riêng của từng phòng và hợp đồng không được tự động thay đổi. Ảnh, tiện nghi và các khoản phí hiện tại được giữ nguyên.</Text><PrimaryButton title="Lưu loại phòng" loading={busy} disabled={host.busy||host.loading||busy||!canEdit} onPress={()=>{void save();}}/>{discard&&<ConfirmDialog title="Bỏ thay đổi chưa lưu?" description="Thông tin loại phòng chưa được lưu." confirmLabel="Bỏ thay đổi" onCancel={()=>setDiscard(null)} onConfirm={()=>{const leave=discard;setDiscard(null);leave();}}/>}<AnimatedPressable style={{minHeight:44,justifyContent:'center'}} onPress={()=>router.push({pathname:'/host/rooms',params:{propertyId,roomTypeId:id}})} disabled={!id||busy}><Text style={h.link}>{id?'Xem các phòng thuộc loại này':''}</Text></AnimatedPressable></>;
}



