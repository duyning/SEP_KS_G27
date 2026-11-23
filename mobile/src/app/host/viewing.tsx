import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { HostPage, ResourceState, Badge, Action, h } from '@/components/host/host-ui';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { useHost } from '@/context/host-context';
import { formatHostDate } from '@/services/host';
type Decision={status:'APPROVED'|'REJECTED';scheduledDate:string;roomType:string;propertyName:string};
export default function Viewing(){
 const {id}=useLocalSearchParams<{id:string}>(),host=useHost();const request=host.data.viewings?.viewings.find(v=>String(v.bookingId)===id);
 const [decision,setDecision]=useState<Decision|null>(null),[reason,setReason]=useState(''),[error,setError]=useState<string|null>(null);const lock=useRef(false);
 const decide=async()=>{if(!request||!decision||lock.current)return;lock.current=true;try{await host.store.mutate(`/host/viewings/${request.bookingId}/decision`,{status:decision.status,reason:decision.status==='REJECTED'?reason.trim():undefined,expectedScheduledDate:decision.scheduledDate});setReason('');}catch{/* Store shows the error and refreshes conflicts without optimistic status changes. */}finally{lock.current=false;setDecision(null);}};
 const choose=(status:Decision['status'])=>{if(!request)return;if(status==='REJECTED'&&!reason.trim()){setError('Vui lòng nhập lý do từ chối.');return;}setError(null);setDecision({status,scheduledDate:request.scheduledDate,roomType:request.roomType,propertyName:request.propertyName});};
 return <HostPage title="Yêu cầu xem phòng"><ResourceState resource="viewings"/><InlineError message={error||host.mutationError}/>{request?<><Text style={h.title}>{request.roomType}</Text><Text style={h.secondary}>{request.propertyName}</Text><Badge value={request.status}/><View style={h.card}><Text style={h.itemTitle}>{request.renterName}</Text><Text style={h.secondary}>{request.renterPhone}</Text><Text style={h.secondary}>{formatHostDate(request.scheduledDate)} · Giờ Việt Nam</Text>{Boolean(request.note)&&<Text style={h.secondary}>{request.note}</Text>}{Boolean(request.decisionReason)&&<Text style={h.secondary}>{request.decisionReason}</Text>}</View>{request.status==='PENDING'&&<><Text style={h.heading}>Phản hồi yêu cầu</Text><Action label="Xác nhận lịch" icon="check" disabled={host.busy||host.loading} onPress={()=>choose('APPROVED')}/><AuthInput label="Lý do từ chối" accessibilityLabel="Lý do từ chối" hint="Bắt buộc khi từ chối, tối đa 500 ký tự." value={reason} onChangeText={value=>{setReason(value);setError(null);}} multiline maxLength={500} editable={!host.busy} error={error||undefined}/><Action label="Từ chối" icon="x" disabled={host.busy||host.loading} onPress={()=>choose('REJECTED')}/></>}</>:host.data.viewings&&<Text style={h.secondary}>Không tìm thấy yêu cầu trong tài khoản này.</Text>}{decision&&<ConfirmDialog title={decision.status==='APPROVED'?'Xác nhận lịch xem?':'Từ chối yêu cầu?'} description={`${decision.roomType} · ${decision.propertyName}\n${formatHostDate(decision.scheduledDate)} (GMT+7)`} confirmLabel="Xác nhận phản hồi" busy={host.busy} onCancel={()=>setDecision(null)} onConfirm={()=>{void decide();}}/>}</HostPage>;
}
