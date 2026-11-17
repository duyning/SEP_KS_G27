import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useHost } from '@/context/host-context';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { getApiBase } from '@/services/accommodations';
import { vacancyOverview, type HostProperty } from '@/services/host';
import { statusLabel } from './host-ui';

export function MyPropertiesScreen(){
 const host=useHost();
 useFocusEffect(useCallback(()=>{void host.store.refresh();},[host.store]));
 const totals=vacancyOverview(host.data.dashboard,host.data.rooms?.rooms);
 const records=host.data.properties?.records;
 const error=host.errors.properties;
 const intro=<View style={s.intro}>
  {totals?<View style={s.overview} accessibilityLabel={`${totals.vacant} phòng trống trên ${totals.total} phòng`}><Text style={s.lightLabel}>TÌNH TRẠNG PHÒNG</Text><Text style={s.vacancies}>{totals.vacant}<Text style={s.vacancyLabel}> phòng trống</Text></Text><Text style={s.total}>trên {totals.total} phòng</Text></View>:!host.errors.dashboard&&!host.errors.rooms?<View style={[s.skeleton,s.summarySkeleton]} accessibilityRole="progressbar" accessibilityLabel="Đang tải tình trạng phòng"/>:<View style={s.message}><Text style={s.muted}>Chưa tải được tổng số phòng.</Text><Retry onPress={()=>{void host.store.refresh();}}/></View>}
  {(host.errors.dashboard||host.errors.rooms)&&totals&&<Text style={s.muted}>Tình trạng phòng hiển thị theo lần tải thành công gần nhất.</Text>}
  {error&&<View style={s.message}><Text style={s.muted}>Không thể tải danh sách nhà trọ. {records?'Đang giữ dữ liệu đã tải.':''}</Text><Retry onPress={()=>{void host.store.refresh();}}/></View>}
  {records&&records.length>0&&<Text style={s.section}>Nhà trọ đang quản lý</Text>}
 </View>;
 return <SafeAreaView style={s.screen} edges={['top','left','right']}>
  <View style={s.header}><Text style={s.title}>Nhà trọ của tôi</Text><AnimatedPressable scaleTo={0.98} accessibilityLabel="Đăng ký nhà trọ" style={s.register} onPress={()=>router.push('/host/property-registration')}><Feather name="plus" size={17} color={c.primary}/><Text style={s.registerText}>Đăng ký</Text></AnimatedPressable></View>
  {host.allowed?<FlatList data={records||[]} keyExtractor={p=>`${p.propertyId}:${p.registrationId}`} ListHeaderComponent={intro} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.content} refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}}
   renderItem={({item,index})=><PropertyRow item={item} first={index===0} last={index===(records?.length||0)-1}/>}
   ListEmptyComponent={!records&&!error?<View accessibilityRole="progressbar" accessibilityLabel="Đang tải nhà trọ">{[0,1].map(n=><View key={n} style={s.loadingRow}><View style={[s.skeleton,{width:48,height:48}]}/><View style={{flex:1,gap:10}}><View style={[s.skeleton,{height:18}]}/><View style={[s.skeleton,{height:12,width:'70%'}]}/></View></View>)}</View>:records?.length===0&&!error?<View style={s.empty}><Feather name="home" size={26} color={c.primary}/><Text style={s.emptyTitle}>Bạn chưa có nhà trọ</Text><Text style={s.muted}>Nhấn “+ Đăng ký” phía trên để gửi hồ sơ nhà trọ.</Text></View>:undefined}
  />:<View style={s.empty}><Text style={s.emptyTitle}>Bạn không có quyền quản lý nhà trọ.</Text></View>}
 </SafeAreaView>;
}
function Retry({onPress}:{onPress():void}){return <AnimatedPressable accessibilityLabel="Thử lại" style={s.retry} onPress={onPress}><Text style={s.registerText}>Thử lại</Text></AnimatedPressable>;}
function PropertyRow({item,last,first}:{item:HostProperty;last:boolean;first:boolean}){
 const {imageToken}=useHost();const [failed,setFailed]=useState<number|null>(null);const photo=item.photos?.[0]?.documentId;
 const known=Number.isSafeInteger(item.vacantRooms)&&Number.isSafeInteger(item.totalRooms)&&item.vacantRooms!>=0&&item.totalRooms!>=item.vacantRooms!;
 const unusual=item.reverificationRequired?'Cần tái xác minh':!['VISIBLE','ACTIVE','APPROVED'].includes(item.displayStatus)?statusLabel[item.displayStatus]||item.displayStatus:null;
 return <View style={[s.rowSurface,first&&{borderTopLeftRadius:16,borderTopRightRadius:16},last&&s.last]}><AnimatedPressable scaleTo={0.98} accessibilityLabel={`Quản lý nhà trọ ${item.name}${known?`, ${item.vacantRooms} phòng trống trên ${item.totalRooms} phòng`:''}`} style={s.row} onPress={()=>router.push({pathname:'/host/property',params:{id:item.propertyId||'',registrationId:item.registrationId||''}})}>
  <View style={s.thumb}>{photo&&imageToken&&failed!==photo?<Image source={{uri:`${getApiBase()}/api/host/property/photos/${photo}`,headers:{Authorization:`Bearer ${imageToken}`}}} style={{width:48,height:48}} contentFit="cover" cachePolicy="none" onError={()=>setFailed(photo)}/>:<Feather name="home" size={21} color={c.textSecondary}/>}</View>
  <View style={s.rowBody}><View style={s.identity}><Text style={s.name}>{item.name}</Text><Text style={s.address} numberOfLines={2}>{item.address}</Text>{unusual&&<Text style={s.warning}>{unusual}</Text>}</View><View style={s.counts}>{known?<><Text style={s.rowVacant}>{item.vacantRooms}<Text style={s.countLabel}> trống</Text></Text><Text style={s.address}>/{item.totalRooms} phòng</Text></>:<Text style={s.address}>{item.propertyId?'Chưa rõ':'Chưa có số liệu'}</Text>}</View></View>
 </AnimatedPressable>{!last&&<View style={s.divider}/>}</View>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:c.background},header:{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:24,lineHeight:31,fontWeight:'700',color:c.forestInk,letterSpacing:-0.6},register:{minHeight:44,minWidth:92,flexDirection:'row',gap:3,alignItems:'center',justifyContent:'flex-end'},registerText:{fontSize:14,lineHeight:21,fontWeight:'600',color:c.primary},content:{paddingHorizontal:20,paddingBottom:20},intro:{gap:12,paddingBottom:12},overview:{backgroundColor:c.primary,borderRadius:18,padding:20,gap:4},lightLabel:{fontSize:11,lineHeight:17,letterSpacing:1,color:'#DDECE6',fontWeight:'600'},vacancies:{fontSize:36,lineHeight:45,fontWeight:'700',color:'#FFFFFF',fontVariant:['tabular-nums']},vacancyLabel:{fontSize:20,fontWeight:'600'},total:{fontSize:14,lineHeight:21,color:'#DDECE6'},section:{fontSize:15,lineHeight:22,fontWeight:'600',color:c.forestInk,marginTop:4},rowSurface:{backgroundColor:c.surface},last:{borderBottomLeftRadius:16,borderBottomRightRadius:16},row:{flexDirection:'row',alignItems:'flex-start',paddingVertical:16,paddingHorizontal:12,gap:12,minHeight:88},thumb:{width:48,height:48,borderRadius:10,backgroundColor:c.background,alignItems:'center',justifyContent:'center',overflow:'hidden'},rowBody:{flex:1,flexDirection:'row',gap:8,alignItems:'flex-start',flexWrap:'wrap'},identity:{flex:1,minWidth:100,gap:4},name:{fontSize:15,lineHeight:22,fontWeight:'600',color:c.forestInk},address:{fontSize:12,lineHeight:18,color:c.textSecondary},counts:{maxWidth:84,alignItems:'flex-end',gap:3,marginLeft:'auto'},rowVacant:{fontSize:23,lineHeight:29,fontWeight:'700',fontVariant:['tabular-nums'],color:c.primary},countLabel:{fontSize:12,lineHeight:18,fontWeight:'500'},warning:{fontSize:12,lineHeight:18,color:'#A35B08'},divider:{marginHorizontal:12,height:StyleSheet.hairlineWidth,backgroundColor:c.border},message:{gap:4},muted:{fontSize:13,lineHeight:21,color:c.textSecondary},retry:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},skeleton:{backgroundColor:c.border,borderRadius:8},summarySkeleton:{height:135,borderRadius:18},loadingRow:{flexDirection:'row',alignItems:'center',gap:12,padding:16,backgroundColor:c.surface,marginBottom:1},empty:{padding:20,gap:12,alignItems:'flex-start'},emptyTitle:{fontSize:18,lineHeight:26,fontWeight:'600',color:c.forestInk}});
