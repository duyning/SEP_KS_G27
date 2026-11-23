import { useHostMode } from '@/context/host-mode-context';
import TenantHome from '@/components/home/tenant-home';
import { MyPropertiesScreen } from '@/components/host/my-properties-screen';
export default function HomeScreen(){const {isHostMode}=useHostMode();return isHostMode?<MyPropertiesScreen/>:<TenantHome/>;}
