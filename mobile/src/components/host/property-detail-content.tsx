import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { HostProperty } from '@/services/host';
import { formatHostDate } from '@/services/host';
import { baseReview, documentStatus, listingLabels, propertyAddress, propertyAmenities, propertyChangeState, propertyCoordinates, propertyCount, propertyFields, propertyRule, reviewLabels } from '@/services/host-property';
import { useHost } from '@/context/host-context';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { Segments } from './management-ui';
import { HostPropertyGallery } from './property-gallery';
import { Action } from './host-ui';

export function PropertyDetailContent({record}:{record:HostProperty}){
 const host=useHost();const [section,setSection]=useState('info');
 const scroll=useRef<ComponentRef<typeof ScrollView>>(null),scrollY=useRef(0),sectionsY=useRef(0);
 const changeSection=(next:string)=>{setSection(next);if(scrollY.current>sectionsY.current)scroll.current?.scrollTo({y:sectionsY.current,animated:false});};
 const stats:[string,unknown][]=[['Loại phòng',record.roomTypeCount],['Tổng phòng',record.totalRooms],['Phòng trống',record.vacantRooms],['Yêu cầu chờ',record.pendingViewingCount]];
 const invalidInventory=record.totalRooms!=null&&record.vacantRooms!=null&&record.vacantRooms>record.totalRooms;
 return <><ScrollView ref={scroll} style={{flex:1}} onScroll={e=>{scrollY.current=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[3]} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={host.loading} onRefresh={()=>{void host.store.refresh();}} tintColor={c.primary}/>}>
  <View><HostPropertyGallery photos={record.photos||[]}/></View>
  <View style={s.identity}><Text style={s.name}>{record.name}</Text><Text selectable style={s.body}>{propertyAddress(record)}</Text><View style={s.status}><Feather accessible={false} name={record.displayStatus==='VISIBLE'?'eye':'eye-off'} size={14} color={c.primary}/><Text style={s.statusText}>{listingLabels[record.displayStatus]||record.displayStatus}</Text></View></View>
  <View style={s.summary}>{stats.map(([label,value],i)=><View key={label} style={s.stat}><Text style={[s.statValue,i===2&&{color:c.primary}]}>{record.propertyId==null||invalidInventory&&(i===1||i===2)?'—':propertyCount(value)}</Text><Text style={s.statLabel}>{label}</Text></View>)}</View>
  <View style={s.sections} onLayout={e=>{sectionsY.current=e.nativeEvent.layout.y;}}><Segments items={[["info","Thông tin"],["rooms","Phòng"],["location","Vị trí"],["documents","Hồ sơ"]]} value={section} onChange={changeSection}/></View>
  <View style={{gap:16}}>{section==='info'?<Information record={record}/>:section==='rooms'?<Management record={record}/>:section==='location'?<Location record={record}/>:<Documents record={record}/>}</View>
 </ScrollView><View style={s.footer}><Text style={s.footerTitle}>Đề nghị thay đổi thông tin</Text><Text style={s.caption}>{propertyChangeState(record)}</Text></View></>;
}
function Group({title,children}:{title:string;children:ReactNode}){return <View style={s.group}><Text style={s.heading}>{title}</Text>{children}</View>;}
function Field({label,value}:{label:string;value?:string|number|null}){return <View style={{gap:4}}><Text style={s.caption}>{label}</Text><Text selectable style={s.body}>{value==null||value===''?'Chưa cập nhật':String(value)}</Text></View>;}
function Information({record:r}:{record:HostProperty}){
 const [expanded,setExpanded]=useState(false);const long=Boolean(r.description&&r.description.length>240);
 return <><Group title="Thông tin nhà trọ"><Field label="Loại hình" value={r.propertyType}/><Field label="Xã / Khu vực" value={r.commune}/><Field label="Địa chỉ chi tiết đã lưu" value={r.addressDetail}/><View style={{gap:8}}><Text style={s.caption}>Mô tả</Text><Text selectable style={s.body} numberOfLines={long&&!expanded?5:undefined}>{r.description||'Chưa cập nhật'}</Text>{long&&<AnimatedPressable accessibilityLabel={expanded?'Thu gọn mô tả':'Xem thêm mô tả'} accessibilityState={{expanded}} style={s.touch} onPress={()=>setExpanded(!expanded)}><Text style={s.link}>{expanded?'Thu gọn':'Xem thêm'}</Text></AnimatedPressable>}</View></Group>
 <Group title="Tiện ích chung">{r.amenities?.length?r.amenities.map((key,i)=><Text key={`${key}:${i}`} style={s.body}>• {propertyAmenities[key]||key}</Text>):<Text style={s.body}>Chưa cập nhật</Text>}</Group>
 <Group title="Quy định nhà trọ">{r.selectedRules?.length?r.selectedRules.map((key,i)=><Text key={`${key}:${i}`} style={s.body}>• {propertyRule(key)}</Text>):<Text style={s.body}>Chưa cập nhật quy định đã chọn</Text>}{r.rules&&<Text selectable style={s.body}>{r.rules}</Text>}</Group>
 <Group title="Thông tin liên hệ"><Field label="Người quản lý" value={r.managerName}/><Field label="Điện thoại" value={r.contactPhone}/><Field label="Zalo" value={r.zaloPhone}/>{r.contactInfo&&<Field label="Thông tin liên hệ đã lưu" value={r.contactInfo}/>}</Group></>;
}
function Management({record:r}:{record:HostProperty}){
 const id=r.propertyId;
 const open=(section:'room-types'|'rooms'|'viewings')=>{if(id)router.push({pathname:'/host/property-management',params:{propertyId:id,section}});};
 return <Group title="Quản lý tại nhà trọ">{id?<><Action label="Loại phòng & giá" icon="layers" onPress={()=>open('room-types')}/><Action label="Danh sách phòng" icon="key" onPress={()=>open('rooms')}/><Action label="Yêu cầu xem phòng" icon="calendar" onPress={()=>open('viewings')}/></>:<Text style={s.body}>Hồ sơ chưa có nhà trọ được tạo để quản lý phòng và lịch xem.</Text>}</Group>;
}
function Location({record:r}:{record:HostProperty}){
 const point=propertyCoordinates(r.latitude,r.longitude);const pointKey=point?.join(',');
 const map=pointKey?`https://www.google.com/maps/search/?api=1&query=${pointKey}`:null;
 const directions=pointKey?`https://www.google.com/maps/dir/?api=1&destination=${pointKey}`:null;
 const [available,setAvailable]=useState<{map:string;directions:string;canMap:boolean;canDirections:boolean}|null>(null),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;if(map&&directions)void Promise.all([Linking.canOpenURL(map),Linking.canOpenURL(directions)]).then(([canMap,canDirections])=>{if(active)setAvailable({map,directions,canMap,canDirections});}).catch(()=>{if(active)setAvailable({map,directions,canMap:false,canDirections:false});});return()=>{active=false;};},[map,directions]);
 const open=async(url:string)=>{try{await Linking.openURL(url);setError(null);}catch{setError('Chưa mở được bản đồ. Vui lòng thử lại.');}};
 return <><Group title="Vị trí nhà trọ"><Field label="Địa chỉ" value={propertyAddress(r)}/><Field label="Xã / Khu vực" value={r.commune}/><Field label="Địa điểm lân cận / Ghi chú khoảng cách" value={r.nearby}/>{point?<><Field label="Tọa độ đã lưu" value={point.join(', ')}/>{available?.map===map&&available.canMap&&<Action label="Xem trên bản đồ" icon="map" onPress={()=>{void open(map!);}}/>}{available?.directions===directions&&available.canDirections&&<Action label="Chỉ đường" icon="navigation" onPress={()=>{void open(directions!);}}/>}{available?.map===map&&!available.canMap&&!available.canDirections&&<Text style={s.caption}>Thiết bị chưa hỗ trợ mở bản đồ.</Text>}</>:<Text style={s.caption}>Chưa có tọa độ hợp lệ đã lưu cho nhà trọ này.</Text>}{error&&<Text accessibilityRole="alert" style={[s.body,{color:c.error}]}>{error}</Text>}</Group></>;
}
function Feedback({note,fields,notes}:{note?:string|null;fields?:string[];notes?:Record<string,string>}){return <>{note&&<Field label="Phản hồi xét duyệt" value={note}/>}<Field label="Mục yêu cầu bổ sung" value={fields?.length?fields.map(key=>propertyFields[key]||key).join(' · '):'Không có mục yêu cầu bổ sung được ghi nhận'}/>{Object.entries(notes||{}).map(([key,value])=><Field key={key} label={`Ghi chú · ${propertyFields[key]||key}`} value={value}/>)}</>;}
function Documents({record:r}:{record:HostProperty}){
 const change=r.changeRequest;const knownTypes=['OWNERSHIP','ID_CARD','FIRE_SAFETY'];
 return <><Group title="Tin đăng & xét duyệt"><Field label="Trạng thái công khai" value={listingLabels[r.displayStatus]||r.displayStatus}/><Field label="Kết quả xét duyệt hồ sơ" value={baseReview(r)}/><Feedback note={r.reasonNote} fields={r.requestedFields} notes={r.fieldNotes}/></Group>
 <Group title="Xác minh"><Field label="Trạng thái xác minh" value={r.reverificationRequired?'Cần tái xác minh':r.verified===true?'Đã xác minh':r.verified===false?'Chưa xác minh':'Chưa có dữ liệu xác minh'}/>{r.reverificationReasons?.length?r.reverificationReasons.map((reason,i)=><Text key={i} style={s.body}>• {reason}</Text>):null}<Text style={s.caption}>Trạng thái công khai và trạng thái xác minh được theo dõi riêng.</Text></Group>
 {change&&<Group title="Đề nghị thay đổi đang theo dõi"><Field label="Mã đề nghị" value={change.registrationId}/><Field label="Kết quả đề nghị" value={reviewLabels[change.status]||change.status}/><Feedback note={change.reasonNote} fields={change.requestedFields} notes={change.fieldNotes}/></Group>}
 <Group title="Giấy tờ đã gửi">{knownTypes.map(type=>{const files=r.documents?.filter(doc=>doc.type===type);return <View key={type} style={{gap:8}}><Text style={s.body}>{propertyFields[type]}</Text>{files?.length?files.map(file=><View key={file.documentId} style={{gap:4}}><Text style={[s.caption,{color:c.primary}]}>{documentStatus(file.verificationStatus)}</Text>{file.fileName&&<Text selectable style={s.caption}>{file.fileName}</Text>}</View>):<Text style={s.caption}>{r.documents?'Chưa đính kèm':'Chưa có dữ liệu giấy tờ'}</Text>}</View>;})}{r.documents?.filter(doc=>!knownTypes.includes(doc.type||'')).map(doc=><Field key={doc.documentId} label={doc.type||'Tài liệu khác'} value={`${documentStatus(doc.verificationStatus)}${doc.fileName?` · ${doc.fileName}`:''}`}/>)}<Text style={s.caption}>Tài liệu là thông tin riêng của chủ trọ. Ứng dụng hiện chỉ hỗ trợ xem trạng thái giấy tờ.</Text></Group>
 <Group title="Thông tin hồ sơ"><Field label="Mã nhà trọ" value={r.propertyId}/><Field label="Mã hồ sơ gốc" value={r.registrationId}/><Field label="Ngày tạo (giờ Việt Nam)" value={r.createdAt?formatHostDate(r.createdAt):null}/><Field label="Cập nhật gần nhất (giờ Việt Nam)" value={r.updatedAt?formatHostDate(r.updatedAt):null}/></Group></>;
}
const s=StyleSheet.create({content:{paddingHorizontal:20,paddingTop:4,paddingBottom:24,gap:16},identity:{gap:8},name:{fontSize:24,lineHeight:31,fontWeight:'700',color:c.forestInk},body:{fontSize:14,lineHeight:22,color:c.forestInk},caption:{fontSize:12,lineHeight:19,color:c.textSecondary},status:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start'},statusText:{fontSize:12,lineHeight:19,color:c.primary,fontWeight:'600',flexShrink:1},summary:{backgroundColor:c.surface,borderRadius:14,padding:12,flexDirection:'row',flexWrap:'wrap',gap:8},stat:{flex:1,minWidth:50,gap:3},statValue:{fontSize:20,lineHeight:26,fontWeight:'700',color:c.forestInk,fontVariant:['tabular-nums']},statLabel:{fontSize:11,lineHeight:17,color:c.textSecondary},sections:{backgroundColor:c.background,paddingVertical:4},group:{backgroundColor:c.surface,borderRadius:16,padding:16,gap:16},heading:{fontSize:17,lineHeight:24,fontWeight:'600',color:c.forestInk},touch:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},link:{fontSize:14,lineHeight:22,fontWeight:'600',color:c.primary},footer:{backgroundColor:c.surface,paddingHorizontal:20,paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.border,gap:4},footerTitle:{fontSize:13,lineHeight:20,fontWeight:'600',color:c.primary}});

