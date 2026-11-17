import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ResourceState, h } from './host-ui';
import { ManagementHeader, PropertySelector, m, useManagedProperty } from './management-ui';
import { authColors as c } from '@/components/auth/tokens';
export function RoomTypesScreen({scopedPropertyId,onBack}:{scopedPropertyId?:string;onBack?():void}={}){
 const params=useLocalSearchParams<{propertyId?:string}>();const initialPropertyId=scopedPropertyId||params.propertyId;
 return <RoomTypesContent key={initialPropertyId||'all'} initialPropertyId={initialPropertyId} onBack={onBack}/>;
}
function RoomTypesContent({initialPropertyId,onBack}:{initialPropertyId?:string;onBack?():void}){
 const host=useHost();const {properties,property,select}=useManagedProperty(initialPropertyId);
 const propertyId=property?.propertyId;
 const rows=(host.data.roomTypes?.roomTypes||[]).filter(r=>r.propertyId===propertyId);
 return <SafeAreaView style={h.screen} edges={onBack?['top','bottom','left','right']:['top','left','right']}><ManagementHeader title="Loại phòng & Giá" onBack={onBack} action={host.allowed&&property?.status==='ACTIVE'?'Thêm loại':undefined} onAction={()=>{if(host.allowed&&propertyId)router.push({pathname:'/host/room-type',params:{propertyId}});}}/>{host.allowed?<FlatList data={rows} keyExtractor={r=>String(r.roomTypeId)} contentInsetAdjustmentBehavior={onBack?'never':'automatic'} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}} contentContainerStyle={m.list}
 ListHeaderComponent={<View style={m.listIntro}><PropertySelector properties={properties} property={property} onSelect={select}/><ResourceState resource="roomTypes"/></View>}
 ListEmptyComponent={host.data.roomTypes?<Text style={h.secondary}>{property?'Nhà trọ này chưa có loại phòng.':'Chưa có nhà trọ để quản lý loại phòng.'}</Text>:undefined}
 renderItem={({item,index})=><View style={{overflow:'hidden',borderTopLeftRadius:index===0?16:0,borderTopRightRadius:index===0?16:0,borderBottomLeftRadius:index===rows.length-1?16:0,borderBottomRightRadius:index===rows.length-1?16:0}}><AnimatedPressable accessibilityLabel={`Chỉnh sửa loại phòng ${item.roomType}`} style={[m.row,{flexWrap:'wrap'}]} onPress={()=>router.push({pathname:'/host/room-type',params:{propertyId:item.propertyId,id:item.roomTypeId}})}><View style={{flex:1,minWidth:110,gap:4}}><Text style={m.rowTitle}>{item.roomType}</Text><Text style={m.secondary}>{[item.areaSqm!=null?`${item.areaSqm} m²`:null,item.capacity!=null?`${item.capacity} người`:null,item.totalRooms!=null?`${item.totalRooms} phòng`:null].filter(Boolean).join(' · ')}</Text></View><View style={{alignItems:'flex-end',marginLeft:'auto'}}><Text style={[m.rowTitle,{color:c.primary}]}>{item.price!=null?new Intl.NumberFormat('vi-VN').format(item.price):'Chưa có giá'}</Text>{item.price!=null&&<Text style={m.secondary}>₫/tháng</Text>}</View></AnimatedPressable>{index<rows.length-1&&<View style={m.divider}/>}</View>}
 />:<Text style={h.secondary}>Bạn không có quyền truy cập.</Text>}</SafeAreaView>;
}
