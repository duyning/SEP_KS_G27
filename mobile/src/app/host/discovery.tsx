import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useHostMode } from '@/context/host-mode-context';
export default function Discovery(){const {isHostMode,setDiscovery}=useHostMode();useEffect(()=>{if(isHostMode)setDiscovery(true);},[isHostMode,setDiscovery]);return isHostMode?null:<Redirect href="/explore"/>;}
