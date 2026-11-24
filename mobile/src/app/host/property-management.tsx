import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RoomTypesScreen } from '@/components/host/room-types-screen';
import { RoomsScreen } from '@/components/host/rooms-screen';
import { ViewingsScreen } from '@/components/host/viewings-screen';
import { HostPage, ResourceState, h } from '@/components/host/host-ui';
import { useHost } from '@/context/host-context';

// Stack entry for the same management components: preserve the property's section on Back.
export default function PropertyManagement(){
 const {propertyId,section}=useLocalSearchParams<{propertyId:string;section:string}>();const host=useHost();
 const owned=host.data.properties?.records.some(record=>String(record.propertyId)===propertyId&&record.propertyId!=null);
 const back=()=>{if(router.canGoBack())router.back();else router.replace({pathname:'/host/property',params:{id:propertyId}});};
 if(host.allowed&&!host.data.properties)return <HostPage title="Quản lý nhà trọ"><ResourceState resource="properties"/></HostPage>;
 if(!host.allowed||!owned)return <HostPage title="Quản lý nhà trọ"><Text style={h.secondary}>Không tìm thấy nhà trọ trong tài khoản này.</Text></HostPage>;
 if(section==='room-types')return <RoomTypesScreen scopedPropertyId={propertyId} onBack={back}/>;
 if(section==='rooms')return <RoomsScreen scopedPropertyId={propertyId} onBack={back}/>;
 if(section==='viewings')return <ViewingsScreen scopedPropertyId={propertyId} onBack={back}/>;
 return <HostPage title="Quản lý nhà trọ"><Text style={h.secondary}>Không tìm thấy mục quản lý.</Text></HostPage>;
}
