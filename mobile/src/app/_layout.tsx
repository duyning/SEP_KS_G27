import { HostModeProvider } from '@/context/host-mode-context';
import { HostProvider } from '@/context/host-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { authColors } from '@/components/auth/tokens';
import { AuthProvider } from '@/context/auth-context';
import { FavoritesProvider } from '@/context/favorites-context';
void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  return (
    <AuthProvider>
      <FavoritesProvider><HostProvider><HostModeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: authColors.background },
          }}
        >
          <Stack.Screen name="(main)" />
          <Stack.Screen name="rooms/[roomTypeId]" />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </ThemeProvider>
      </HostModeProvider></HostProvider></FavoritesProvider>
    </AuthProvider>
  );
}

