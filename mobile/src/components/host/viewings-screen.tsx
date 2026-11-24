import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { formatHostDate } from '@/services/host';
import { authColors as c } from '@/components/auth/tokens';
import { Badge, ResourceState, h } from './host-ui';
import { ManagementHeader, Segments, m } from './management-ui';
export function ViewingsScreen({scopedPropertyId,onBack}:{scopedPropertyId?:string;onBack?():void}={}){
 const host=useHost();const params=useLocalSearchParams<{propertyId?:string}>();const propertyId=scopedPropertyId||params.propertyId;const [group,setGroup]=useState('pending');
 const all=host.data.viewings?.viewings;const scoped=all?.filter(v=>!propertyId||String(v.propertyId)===propertyId);const pending=scoped?.filter(v=>v.status==='PENDING').length;
 const rows=(scoped||[]).filter(v=>group==='pending'?v.status==='PENDING':v.status!=='PENDING').sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
 return <SafeAreaView style={h.screen} edges={onBack?['top','bottom','left','right']:['top','left','right']}><ManagementHeader title="Yêu cầu xem phòng" onBack={onBack}/>{host.allowed?<FlatList data={rows} keyExtractor={v=>String(v.bookingId)} contentContainerStyle={m.list} contentInsetAdjustmentBehavior={onBack?'never':'automatic'} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}}
 ListHeaderComponent={<View style={m.listIntro}>{propertyId&&<Text style={m.rowTitle}>{host.data.properties?.records.find(p=>String(p.propertyId)===propertyId)?.name}</Text>}<Segments value={group} onChange={setGroup} items={[["pending",`Chờ phản hồi${pending!=null?` (${pending})`:''}`],['processed','Đã xử lý']]}/><Text style={m.secondary}>Giờ Việt Nam (GMT+7)</Text><ResourceState resource="viewings"/></View>}
 ListEmptyComponent={all?<Text style={h.secondary}>{group==='pending'?'Không có yêu cầu cần phản hồi.':'Chưa có yêu cầu đã xử lý.'}</Text>:undefined}
 renderItem={({item,index})=>{const date=formatHostDate(item.scheduledDate);return <View style={{overflow:'hidden',borderTopLeftRadius:index===0?16:0,borderTopRightRadius:index===0?16:0,borderBottomLeftRadius:index===rows.length-1?16:0,borderBottomRightRadius:index===rows.length-1?16:0}}><AnimatedPressable style={[m.row,{alignItems:'flex-start'}]} accessibilityLabel={`Yêu cầu ${item.bookingId}`} onPress={()=>router.push({pathname:'/host/viewing',params:{id:item.bookingId}})}><View style={{width:48,borderRadius:10,backgroundColor:c.softMint,padding:8,alignItems:'center'}}><Text style={[m.rowTitle,{color:c.primary}]}>{date.match(/\d{2}\/\d{2}/)?.[0]||'—'}</Text></View><View style={{flex:1,gap:3}}><Text style={m.rowTitle}>{item.renterName}</Text><Text style={m.secondary}>{item.roomType} · {item.propertyName}</Text><Text style={[m.secondary,{color:c.primary}]}>{date}</Text><Badge value={item.status}/></View></AnimatedPressable>{index<rows.length-1&&<View style={m.divider}/>}</View>;}}
 />:<Text style={h.secondary}>Bạn không có quyền truy cập.</Text>}</SafeAreaView>;
}
