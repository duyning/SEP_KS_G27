import { useHostMode } from '@/context/host-mode-context';
import { NativeTabs } from 'expo-router/native-tabs';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { authColors } from '@/components/auth/tokens';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
 const {isHostMode}=useHostMode();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={isHostMode?authColors.surface:colors.background}
      indicatorColor={authColors.primaryLight}
      iconColor={{ default: '#84928D', selected: authColors.primary }}
      labelStyle={{
        selected: { color: authColors.primary },
        default: { color: authColors.textSecondary },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{isHostMode?'Nhà trọ':'Trang chủ'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden={isHostMode}>
        <NativeTabs.Trigger.Label>Tìm phòng</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={Feather} name="search" />}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="host/room-types" hidden={!isHostMode}><NativeTabs.Trigger.Label>Loại &amp; giá</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Feather} name="layers"/>} renderingMode="template"/></NativeTabs.Trigger>
<NativeTabs.Trigger name="host/rooms" hidden={!isHostMode}><NativeTabs.Trigger.Label>Phòng</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Feather} name="key"/>} renderingMode="template"/></NativeTabs.Trigger>
<NativeTabs.Trigger name="host/viewings" hidden={!isHostMode}><NativeTabs.Trigger.Label>Yêu cầu</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Feather} name="calendar"/>} renderingMode="template"/></NativeTabs.Trigger><NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Cá nhân</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={Feather} name="user" />}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

