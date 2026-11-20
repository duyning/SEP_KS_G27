import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c } from '@/components/auth/tokens';
import { Badge, ResourceState, h } from './host-ui';
import { ManagementHeader, PropertySelector, Segments, m, useManagedProperty } from './management-ui';
export function RoomsScreen({scopedPropertyId,onBack}:{scopedPropertyId?:string;onBack?():void}={}){
 const routeParams=useLocalSearchParams<{propertyId?:string;roomTypeId?:string;status?:string}>();const params={...routeParams,...(scopedPropertyId?{propertyId:scopedPropertyId}:{})};
 return <RoomsContent key={`${params.propertyId||''}:${params.roomTypeId||''}:${params.status||''}`} params={params} onBack={onBack}/>;
}
function RoomsContent({params,onBack}:{params:{propertyId?:string;roomTypeId?:string;status?:string};onBack?():void}){
 const host=useHost();
 const {properties,property,select}=useManagedProperty(params.propertyId);const [status,setStatus]=useState(params.status||'all'),[query,setQuery]=useState(''),[typeId,setTypeId]=useState(params.roomTypeId);
 const propertyId=property?.propertyId;
 const rows=(host.data.rooms?.rooms||[]).filter(r=>r.propertyId===propertyId&&(!typeId||String(r.roomTypeId)===typeId)&&(status==='all'||r.status===status)&&r.roomNumber.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
 return <SafeAreaView style={h.screen} edges={onBack?['top','bottom','left','right']:['top','left','right']}><ManagementHeader title="Quản lý phòng" onBack={onBack} action={host.allowed&&property?.status==='ACTIVE'&&host.data.roomTypes?.roomTypes.some(t=>t.propertyId===propertyId)?'Thêm phòng':undefined} onAction={()=>{if(host.allowed&&propertyId)router.push({pathname:'/host/room',params:{propertyId}});}}/>{host.allowed?<FlatList data={rows} keyExtractor={r=>String(r.roomId)} contentInsetAdjustmentBehavior={onBack?'never':'automatic'} keyboardShouldPersistTaps="handled" contentContainerStyle={m.list} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}}
 ListHeaderComponent={<View style={m.listIntro}><PropertySelector properties={properties} property={property} onSelect={id=>{select(id);setTypeId(undefined);setQuery('');}}/><View style={[m.row,{minHeight:48,borderRadius:12,paddingVertical:0}]}><Feather name="search" size={18} color={c.textSecondary}/><TextInput accessibilityLabel="Tìm theo mã phòng" placeholder="Tìm theo mã phòng…" value={query} onChangeText={setQuery} style={{flex:1,minHeight:48,fontSize:15,color:c.forestInk}}/></View><Segments value={status} onChange={setStatus} items={[['all','Tất cả'],['VACANT','Trống'],['OCCUPIED','Đã thuê']]}/>{typeId&&<AnimatedPressable style={{minHeight:44,justifyContent:'center'}} onPress={()=>setTypeId(undefined)}><Text style={m.link}>Bỏ lọc loại phòng</Text></AnimatedPressable>}<ResourceState resource="rooms"/></View>}
 ListEmptyComponent={host.data.rooms?<Text style={h.secondary}>{query||status!=='all'||typeId?'Không có phòng khớp bộ lọc.':'Nhà trọ này chưa có phòng.'}</Text>:undefined}
 renderItem={({item,index})=><View style={{overflow:'hidden',borderTopLeftRadius:index===0?16:0,borderTopRightRadius:index===0?16:0,borderBottomLeftRadius:index===rows.length-1?16:0,borderBottomRightRadius:index===rows.length-1?16:0}}><AnimatedPressable style={m.row} accessibilityLabel={`Phòng ${item.roomNumber} · ${item.roomType}`} onPress={()=>router.push({pathname:'/host/room',params:{id:item.roomId}})}><Feather name="log-in" size={22} color={c.primary}/><View style={{flex:1,gap:4}}><Text style={m.rowTitle}>{item.roomNumber}</Text><Text style={m.secondary}>{item.roomType}</Text><Badge value={item.status}/></View><Feather name="chevron-right" size={18} color={c.textMuted}/></AnimatedPressable>{index<rows.length-1&&<View style={m.divider}/>}</View>}
 />:<Text style={h.secondary}>Bạn không có quyền truy cập.</Text>}</SafeAreaView>;
}

