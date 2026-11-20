import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c } from '@/components/auth/tokens';
import { useHost } from '@/context/host-context';
import { useReducedMotionPreference } from '@/constants/motion';

export function useManagedProperty(initial?:string){
 const host=useHost();
 const properties=host.data.roomTypes?.properties||host.data.properties?.records.filter(p=>p.propertyId!=null).map(p=>({propertyId:p.propertyId!,name:p.name,status:p.displayStatus}))||[];
 const [selected,setSelected]=useState(initial?Number(initial):null);
 const property=properties.find(p=>p.propertyId===selected)||(selected==null?properties[0]:undefined);
 return {properties,property,select:setSelected};
}
export function ManagementHeader({title,action,onAction,onBack}:{title:string;action?:string;onAction?():void;onBack?():void}){return <View style={m.header}>{onBack&&<AnimatedPressable accessibilityLabel="Quay lại" style={[m.headerAction,{justifyContent:'center'}]} onPress={onBack}><Feather name="arrow-left" size={22} color={c.forestInk}/></AnimatedPressable>}<Text style={[m.title,onBack&&{fontSize:20,lineHeight:27}]}>{title}</Text>{action&&<AnimatedPressable accessibilityLabel={action} onPress={onAction} style={m.headerAction}><Feather name="plus" size={17} color={c.primary}/><Text style={m.link}>{action}</Text></AnimatedPressable>}</View>;}
export function PropertySelector({properties,property,onSelect}:{properties:{propertyId:number;name:string}[];property?:{propertyId:number;name:string};onSelect(id:number):void}){
 const [open,setOpen]=useState(false);const reduced=useReducedMotionPreference();
 const content=<><View style={{flex:1,gap:4}}><Text style={m.selectorLabel}>Nhà trọ đang quản lý</Text><Text style={m.selectorName}>{property?.name||'Chưa có nhà trọ để quản lý'}</Text></View>{properties.length>1&&<Feather name="chevron-down" size={20} color={c.surface}/>}</>;
 return <>{properties.length>1?<AnimatedPressable style={m.selector} accessibilityLabel="Chọn nhà trọ" accessibilityState={{expanded:open}} onPress={()=>setOpen(true)}>{content}</AnimatedPressable>:<View style={m.selector}>{content}</View>}{open&&<Modal transparent animationType={reduced?'none':'slide'} onRequestClose={()=>setOpen(false)}><View style={m.overlay}><SafeAreaView edges={['bottom','left','right']} style={m.sheet}><View style={m.header}><Text style={m.rowTitle}>Chọn nhà trọ</Text><AnimatedPressable accessibilityLabel="Đóng bộ chọn nhà trọ" onPress={()=>setOpen(false)} style={m.headerAction}><Feather name="x" size={22} color={c.forestInk}/></AnimatedPressable></View><ScrollView>{properties.map(p=><AnimatedPressable key={p.propertyId} accessibilityRole="radio" accessibilityState={{checked:p.propertyId===property?.propertyId}} aria-checked={p.propertyId===property?.propertyId} accessibilityLabel={p.name} style={m.row} onPress={()=>{onSelect(p.propertyId);setOpen(false);}}><Text style={[m.rowTitle,{flex:1}]}>{p.name}</Text>{p.propertyId===property?.propertyId&&<Feather name="check" size={20} color={c.primary}/>}</AnimatedPressable>)}</ScrollView></SafeAreaView></View></Modal>}</>;
}
export function Segments({items,value,onChange}:{items:[string,string][];value:string;onChange(value:string):void}){return <View style={m.segments}>{items.map(([key,label])=><AnimatedPressable key={key} accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{checked:value===key}} aria-checked={value===key} style={[m.segment,value===key&&m.segmentActive]} onPress={()=>onChange(key)}><Text style={[m.segmentLabel,value===key&&{color:c.primary,fontWeight:'600'}]}>{label}</Text></AnimatedPressable>)}</View>;}
export const m=StyleSheet.create({
 header:{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:24,lineHeight:31,fontWeight:'700',color:c.forestInk},headerAction:{minHeight:44,minWidth:44,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:3},link:{fontSize:13,lineHeight:20,color:c.primary,fontWeight:'600'},
 selector:{backgroundColor:c.primary,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12},selectorLabel:{fontSize:12,lineHeight:18,color:c.softMint},selectorName:{fontSize:17,lineHeight:24,fontWeight:'600',color:c.surface},overlay:{flex:1,backgroundColor:'rgba(20,45,41,0.4)',justifyContent:'flex-end'},sheet:{backgroundColor:c.background,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'75%'},
 list:{paddingHorizontal:20,paddingBottom:24},listIntro:{gap:12,paddingBottom:16},row:{minHeight:76,backgroundColor:c.surface,paddingHorizontal:14,paddingVertical:16,flexDirection:'row',gap:12,alignItems:'center'},rowTitle:{fontSize:15,lineHeight:22,color:c.forestInk,fontWeight:'600'},secondary:{fontSize:12,lineHeight:19,color:c.textSecondary},group:{borderRadius:16,overflow:'hidden',backgroundColor:c.surface},divider:{height:StyleSheet.hairlineWidth,backgroundColor:c.border,marginHorizontal:14},
 segments:{flexDirection:'row',flexWrap:'wrap',gap:4,backgroundColor:c.border,borderRadius:14,padding:4},segment:{minHeight:44,flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:8,paddingVertical:8,borderRadius:10},segmentActive:{backgroundColor:c.surface},segmentLabel:{fontSize:13,lineHeight:20,color:c.textSecondary},
});


