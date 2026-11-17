import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useHostMode } from '@/context/host-mode-context';
import { useAuth } from '@/context/auth-context';
export default function Properties(){const {user}=useAuth();const {isHostMode,setDiscovery}=useHostMode();useEffect(()=>{if(user?.role==='ROOM_HOST'&&!isHostMode)setDiscovery(false);},[user?.role,isHostMode,setDiscovery]);return user?.role==='ROOM_HOST'&&!isHostMode?null:<Redirect href="/home"/>;}
