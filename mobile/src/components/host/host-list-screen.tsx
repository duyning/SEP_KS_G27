import { useHostMode } from '@/context/host-mode-context';
import { hostPrice } from '@/services/host';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ProfileHeader } from '@/components/profile/profile-ui';
import { PropertyCard, ResourceState, ViewingCard, Action, h } from '@/components/host/host-ui';
import { useHost } from '@/context/host-context';

export function HostListScreen({kind}:{kind:'properties'|'rooms'|'viewings'}){
 const {isHostMode}=useHostMode(); const host=useHost(),params=useLocalSearchParams<{propertyId?:string;roomTypeId?:string;status?:string}>(); const [status,setStatus]=useState(params.status||'all');
 const properties=host.data.properties?.records||[],rooms=(host.data.rooms?.rooms||[]).filter(r=>(!params.propertyId||String(r.propertyId)===params.propertyId)&&(!params.roomTypeId||String(r.roomTypeId)===params.roomTypeId)&&(status==='all'||r.status===status)),viewings=(host.data.viewings?.viewings||[]).filter(v=>(!params.propertyId||String(v.propertyId)===params.propertyId)&&(status==='all'||v.status===status));
 const title=kind==='properties'?'Nhà trọ của tôi':kind==='rooms'?'Quản lý phòng':'Yêu cầu xem phòng';
 const filters=kind==='rooms'?[['all','Tất cả'],['VACANT','Đang trống'],['OCCUPIED','Đang thuê']]:[['all','Tất cả'],['PENDING','Chờ phản hồi'],['APPROVED','Đã xác nhận']];
 const count=kind==='properties'?properties.length:kind==='rooms'?rooms.length:viewings.length;
 const header=<View style={{gap:12,marginBottom:16}}>{kind!=='properties'&&<View style={{gap:8}}>{filters.map(([key,label])=><Action key={key} label={`${status===key?'✓ ':''}${label}`} icon="filter" onPress={()=>setStatus(key)}/>)}</View>}<ResourceState resource={kind}/>{host.data[kind]&&<Text style={h.secondary}>{count} {kind==='properties'?'hồ sơ/nhà trọ':kind==='rooms'?'phòng':'yêu cầu'}</Text>}</View>;
 return <SafeAreaView style={h.screen} edges={isHostMode&&kind!=='properties'?['top','left','right']:['top','left','right','bottom']}><ProfileHeader title={title} showBack={!isHostMode||kind==='properties'}/>{!host.allowed?<View style={h.body}><Text style={h.heading}>Bạn không có quyền truy cập</Text></View>:kind==='properties'?<FlatList data={properties} keyExtractor={p=>`${p.propertyId}:${p.registrationId}`} renderItem={({item})=><PropertyCard item={item}/>} ItemSeparatorComponent={()=><View style={{height:12}}/>} ListHeaderComponent={header} ListEmptyComponent={host.data.properties?<Text style={h.secondary}>Chưa có nhà trọ. Bạn có thể đăng ký nhà trọ trên hệ thống web hiện có.</Text>:undefined} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{padding:20,paddingBottom:24}}/>:kind==='rooms'?<FlatList data={rooms} keyExtractor={r=>String(r.roomId)} renderItem={({item})=><Action icon="key" label={`Phòng ${item.roomNumber} · ${item.roomType} · ${item.status==='VACANT'?'Đang trống':item.status==='OCCUPIED'?'Đang thuê':item.status} · ${hostPrice(item.price)}`} onPress={()=>router.push({pathname:'/host/room',params:{id:item.roomId}})}/>} ItemSeparatorComponent={()=><View style={{height:12}}/>} ListHeaderComponent={header} ListEmptyComponent={host.data.rooms?<Text style={h.secondary}>Không có phòng trong danh sách này.</Text>:undefined} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{padding:20,paddingBottom:24}}/>:<FlatList data={viewings} keyExtractor={v=>String(v.bookingId)} renderItem={({item})=><ViewingCard item={item}/>} ItemSeparatorComponent={()=><View style={{height:12}}/>} ListHeaderComponent={header} ListEmptyComponent={host.data.viewings?<Text style={h.secondary}>Không có yêu cầu trong danh sách này.</Text>:undefined} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{padding:20,paddingBottom:24}}/>}</SafeAreaView>;
}




