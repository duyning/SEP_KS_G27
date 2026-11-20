import { useRef, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useHost } from '@/context/host-context';
import { getApiBase } from '@/services/accommodations';
import type { HostAttachment } from '@/services/host';
import { documentStatus } from '@/services/host-property';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';

function PrivatePhoto({photo,contain=false}:{photo?:HostAttachment;contain?:boolean}){
 const {imageToken}=useHost();const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 if(!photo||failed||!imageToken)return <View style={s.fallback}><Feather name="image" size={28} color={c.textSecondary}/><Text style={s.secondary}>{!photo?'Chưa có ảnh nhà trọ':failed?'Không thể tải ảnh':'Đang xác nhận phiên xem ảnh…'}</Text>{photo&&failed&&<AnimatedPressable style={s.touch} onPress={()=>{setAttempt(v=>v+1);setFailed(false);}} accessibilityLabel="Thử lại ảnh"><Text style={s.link}>Thử lại</Text></AnimatedPressable>}</View>;
 return <Image key={attempt} source={{uri:`${getApiBase()}/api/host/property/photos/${photo.documentId}`,headers:{Authorization:`Bearer ${imageToken}`}}} accessibilityLabel="Ảnh nhà trọ" contentFit={contain?'contain':'cover'} style={{width:'100%',height:'100%'}} cachePolicy="none" onError={()=>setFailed(true)}/>;
}
export function HostPropertyGallery({photos}:{photos:HostAttachment[]}){
 const [open,setOpen]=useState(false);
 return <><View style={s.cover}><PrivatePhoto key={photos[0]?.documentId||'empty'} photo={photos[0]}/>{photos.length>0&&<AnimatedPressable accessibilityLabel={`Xem tất cả ${photos.length} ảnh`} style={s.open} onPress={()=>setOpen(true)}><Feather name="grid" size={16} color={c.forestInk}/><Text style={s.openText}>Xem tất cả {photos.length} ảnh</Text></AnimatedPressable>}</View>{open&&photos.length>0&&<PhotoViewer photos={photos} onClose={()=>setOpen(false)}/>}</>;
}
function PhotoViewer({photos,onClose}:{photos:HostAttachment[];onClose():void}){
 const reduced=useReducedMotionPreference(),list=useRef<FlatList<HostAttachment>>(null),target=useRef<number|null>(null);
 const [index,setIndex]=useState(0),[viewport,setViewport]=useState({width:0,height:0});
 const move=(next:number)=>{target.current=next;list.current?.scrollToOffset({offset:next*viewport.width,animated:!reduced});};
 return <Modal animationType={reduced?'none':'fade'} onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:c.background}}><View style={s.viewerHeader}><Text accessibilityLiveRegion="polite" style={s.title}>Ảnh {index+1} / {photos.length}</Text><AnimatedPressable accessibilityLabel="Đóng thư viện ảnh" style={s.touch} onPress={onClose}><Feather name="x" size={24} color={c.forestInk}/></AnimatedPressable></View>
 <View style={{flex:1}} onLayout={e=>{const {width,height}=e.nativeEvent.layout;setViewport({width,height});}}>{viewport.width>0&&viewport.height>0&&<FlatList testID="host-property-photo-pages" ref={list} key={`${viewport.width}:${viewport.height}`} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={Math.min(index,photos.length-1)} keyExtractor={p=>String(p.documentId)} getItemLayout={(_,i)=>({length:viewport.width,offset:viewport.width*i,index:i})} onScrollBeginDrag={()=>{target.current=null;}} onScroll={e=>{const offset=e.nativeEvent.contentOffset.x/viewport.width;if(target.current!=null){if(Math.abs(offset-target.current)<0.01){setIndex(target.current);target.current=null;}return;}setIndex(Math.min(photos.length-1,Math.max(0,Math.round(offset))));}} scrollEventThrottle={32} renderItem={({item})=><View style={{width:viewport.width,height:viewport.height,gap:8}}><View style={{flex:1}}><PrivatePhoto key={item.documentId} photo={item} contain/></View><View style={{paddingHorizontal:20,paddingBottom:12,gap:4}}>{item.fileName&&<Text style={s.secondary}>{item.fileName}</Text>}{item.verificationStatus&&<Text style={s.secondary}>Kiểm tra ảnh: {documentStatus(item.verificationStatus)}</Text>}</View></View>}/>}</View>
 <View style={s.viewerHeader}><AnimatedPressable accessibilityLabel="Ảnh trước" disabled={index===0} style={[s.touch,index===0&&{opacity:0.35}]} onPress={()=>move(index-1)}><Feather name="chevron-left" size={24} color={c.primary}/></AnimatedPressable><Text style={s.secondary}>Vuốt để xem ảnh</Text><AnimatedPressable accessibilityLabel="Ảnh tiếp theo" disabled={index===photos.length-1} style={[s.touch,index===photos.length-1&&{opacity:0.35}]} onPress={()=>move(index+1)}><Feather name="chevron-right" size={24} color={c.primary}/></AnimatedPressable></View>
 </SafeAreaView></Modal>;
}
const s=StyleSheet.create({cover:{height:180,borderRadius:18,overflow:'hidden',backgroundColor:c.border},fallback:{flex:1,alignItems:'center',justifyContent:'center',gap:8,padding:16},open:{position:'absolute',right:12,bottom:12,minHeight:44,borderRadius:12,backgroundColor:c.surface,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},openText:{fontSize:12,lineHeight:18,fontWeight:'600',color:c.forestInk},touch:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},secondary:{fontSize:13,lineHeight:20,color:c.textSecondary},link:{color:c.primary,fontSize:14,fontWeight:'600'},title:{color:c.forestInk,fontSize:17,lineHeight:24,fontWeight:'600'},viewerHeader:{paddingHorizontal:20,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}});


