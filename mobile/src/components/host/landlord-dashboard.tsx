import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { roomCounts } from '@/services/host';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { HostPage, Section, PropertyCard, ViewingCard, Action, ResourceState, h } from './host-ui';
import { authColors as c } from '@/components/auth/tokens';
export function LandlordDashboard(){
 const {user}=useAuth(),host=useHost();const [propertyId,setProperty]=useState<number|null>(null),[selector,setSelector]=useState(false);const reduced=useReducedMotionPreference(),insets=useSafeAreaInsets();
 useFocusEffect(useCallback(()=>{void host.store.refresh();},[host.store]));
 const properties=host.data.dashboard?.properties||[];const selected=properties.find(p=>p.propertyId===propertyId);const scope=selected?.propertyId;
 const requests=host.data.viewings?.viewings.filter(v=>!scope||v.propertyId===scope);const pending=requests?.filter(v=>v.status==='PENDING').sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate));
 const records=host.data.properties?.records.filter(p=>!scope||p.propertyId===scope);const rooms=host.data.rooms?.rooms.filter(r=>!scope||r.propertyId===scope);const counts=rooms?roomCounts(rooms):null;
 const overview=host.data.dashboard; const stats=[{label:'Nhà trọ',value:overview?(scope?1:properties.length):undefined,go:()=>router.push('/host/properties')},{label:'Tổng số phòng',value:scope?counts?.total:overview?.totalRoomCount,go:()=>router.push({pathname:'/host/rooms',params:{propertyId:scope||''}})},{label:'Phòng đang trống',value:scope?counts?.vacant:overview?.availableRoomCount,go:()=>router.push({pathname:'/host/rooms',params:{propertyId:scope||'',status:'VACANT'}})},{label:'Yêu cầu chờ',value:scope?pending?.length:overview?.pendingViewingCount,go:()=>router.push({pathname:'/host/viewings',params:{propertyId:scope||'',status:'PENDING'}})}];
 return <HostPage title="Tổng quan" root><View style={h.between}><View style={{flex:1,gap:4}}><Text style={h.secondary}>Xin chào, {user?.fullName}</Text><Text style={h.title}>Tổng quan</Text></View><AnimatedPressable accessibilityLabel="Thông báo quản lý" onPress={()=>router.push('/host/notifications')} style={[h.icon,{width:48,height:48}]}><Feather name="bell" size={22} color={c.primary}/>{host.data.inbox&&host.data.inbox.unreadCount>0&&<Text style={{position:'absolute',top:-6,right:-6,paddingHorizontal:6,borderRadius:10,backgroundColor:c.primary,color:'#FFFFFF',fontSize:11}}>{host.data.inbox.unreadCount>99?'99+':host.data.inbox.unreadCount}</Text>}</AnimatedPressable></View>
 {properties.length>1?<Action icon="map-pin" label={selected?.name||'Tất cả nhà trọ'} onPress={()=>setSelector(true)}/>:properties.length===1?<Text style={h.itemTitle}>{properties[0].name}</Text>:null}
 <Section title="Cần xử lý" action="Xem tất cả" onPress={()=>router.push({pathname:'/host/viewings',params:{propertyId:scope||'',status:'PENDING'}})}><ResourceState resource="viewings"/>{pending?.length===0?<View style={h.card}><Text style={h.secondary}>Không có yêu cầu cần xử lý</Text></View>:pending?.slice(0,3).map(v=><ViewingCard key={v.bookingId} item={v} compact/>)}</Section>
 <Section title="Danh mục quản lý"><ResourceState resource="dashboard"/>{overview&&properties.length===0&&<View style={h.card}><Text style={h.itemTitle}>Bạn chưa có nhà trọ đang quản lý</Text><Text style={h.secondary}>{overview.pendingRegistrationCount>0?`${overview.pendingRegistrationCount} hồ sơ đang chờ duyệt. Xem thông tin trong Nhà trọ của tôi.`:'Đăng ký nhà trọ trên hệ thống web hiện có để bắt đầu quản lý tại đây.'}</Text></View>}{overview&&properties.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{stats.map((stat,index)=><AnimatedPressable key={stat.label} disabled={stat.value===undefined} accessibilityLabel={`${stat.label}: ${stat.value??'đang tải'}`} onPress={stat.go} scaleTo={0.98} style={[h.card,{width:'47%',flexGrow:1,gap:12}]}><Feather name={(['home','grid','key','calendar'] as const)[index]} size={20} color={c.primary}/><Text style={{fontSize:28,lineHeight:36,fontWeight:'700',color:c.forestInk}}>{stat.value??'—'}</Text><Text style={h.secondary}>{stat.label}</Text></AnimatedPressable>)}</View>}</Section>
 <Section title="Quản lý nhanh"><Action label="Quản lý nhà trọ" icon="home" onPress={()=>router.push('/host/properties')}/><Action label="Quản lý phòng" icon="key" onPress={()=>router.push({pathname:'/host/rooms',params:{propertyId:scope||''}})}/><Action label="Yêu cầu xem phòng" icon="calendar" onPress={()=>router.push({pathname:'/host/viewings',params:{propertyId:scope||''}})}/></Section>
 <Section title="Nhà trọ của tôi" action="Xem tất cả" onPress={()=>router.push('/host/properties')}><ResourceState resource="properties" empty={records?.length===0}/>{records?.slice(0,2).map(p=><PropertyCard key={`${p.propertyId}:${p.registrationId}`} item={p}/>)}</Section>
 <Action label="Khám phá phòng trọ" icon="search" onPress={()=>router.navigate('/explore')}/>
 <Modal transparent visible={selector} animationType={reduced?'none':'slide'} onRequestClose={()=>setSelector(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,45,41,0.3)'}}><Pressable style={{flex:1}} accessibilityLabel="Đóng chọn nhà trọ" onPress={()=>setSelector(false)}/><View style={{backgroundColor:c.surface,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'70%',padding:20,paddingBottom:Math.max(insets.bottom,20),gap:12}}><Text style={h.heading}>Chọn nhà trọ</Text><ScrollView contentContainerStyle={{gap:10}}>{[{propertyId:null,name:'Tất cả nhà trọ'},...properties].map(p=><Action key={p.propertyId??'all'} icon="home" label={p.name} onPress={()=>{setProperty(p.propertyId);setSelector(false);}}/>)}</ScrollView><Action icon="x" label="Đóng" onPress={()=>setSelector(false)}/></View></View></Modal>
 </HostPage>;
}



