import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ResourceState, h } from '@/components/host/host-ui';
import { PropertyDetailContent } from '@/components/host/property-detail-content';
import { authColors as c } from '@/components/auth/tokens';

export default function PropertyDetail(){
 const {id,registrationId}=useLocalSearchParams<{id?:string;registrationId?:string}>();const host=useHost();const {user}=useAuth();
 const record=host.data.properties?.records.find(p=>id?String(p.propertyId)===id:String(p.registrationId)===registrationId);
 return <SafeAreaView edges={['top','bottom','left','right']} style={h.screen}>
  <View style={{paddingHorizontal:20,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:12}}><AnimatedPressable accessibilityLabel="Quay lại" style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}} onPress={()=>router.dismissTo('/home')}><Feather name="arrow-left" size={22} color={c.forestInk}/></AnimatedPressable><Text style={[h.itemTitle,{flex:1}]}>Chi tiết nhà trọ</Text></View>
  {!host.allowed?<View style={h.body}><Text style={h.heading}>Bạn không có quyền truy cập</Text></View>:<><View style={{paddingHorizontal:20}}>{host.errors.properties&&<ResourceState resource="properties"/>}</View>{record?<PropertyDetailContent key={`${user?.userId}:${record.propertyId||record.registrationId}`} record={record}/>:host.data.properties?<View style={h.body}><Text style={h.secondary}>Không tìm thấy nhà trọ trong tài khoản này.</Text></View>:!host.errors.properties?<View accessibilityRole="progressbar" accessibilityLabel="Đang tải chi tiết nhà trọ" style={{padding:20,gap:16}}><View style={{height:180,borderRadius:18,backgroundColor:c.border}}/><View style={{height:28,width:'70%',borderRadius:8,backgroundColor:c.border}}/><View style={{height:64,borderRadius:12,backgroundColor:c.border}}/></View>:null}</>}
 </SafeAreaView>;
}

