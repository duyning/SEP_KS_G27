import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { authColors } from '@/components/auth/tokens';
import {
  GlobalLoadingOverlay,
  GlobalSplashLoading,
  LOADING_MESSAGES,
} from '@/components/loading';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { FavoritesProvider } from '@/context/favorites-context';
import { HostProvider } from '@/context/host-context';
import { HostModeProvider } from '@/context/host-mode-context';
import { LoadingProvider } from '@/context/loading-context';

void SplashScreen.preventAutoHideAsync();

function AppBootstrapShell() {
  const colorScheme = useColorScheme();
  const { user, loading, sessionError, retry } = useAuth();
  const [guestBypass, setGuestBypass] = useState(false);
  const splashHiddenRef = useRef(false);

  // Hide native splash cleanly after initial React frame renders (avoid blank screen or overlap)
  const handleRootLayout = () => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      /* Splash may already be hidden on reload. */
    });
  };

  // Fallback safeguard so native splash is never stuck if onLayout is delayed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashHiddenRef.current) {
        splashHiddenRef.current = true;
        void SplashScreen.hideAsync().catch(() => {});
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const showStartupLoading = loading && !user && !guestBypass;
  const showStartupError = !loading && Boolean(sessionError) && !user && !guestBypass;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF6' }} onLayout={handleRootLayout}>
      {showStartupLoading ? (
        <GlobalSplashLoading message={LOADING_MESSAGES.sessionRestore} />
      ) : showStartupError ? (
        <GlobalSplashLoading
          error={sessionError}
          errorTitle="Không thể xác thực phiên đăng nhập"
          onRetry={() => {
            void retry();
          }}
          retryLabel="Thử lại"
          onSecondaryAction={() => setGuestBypass(true)}
          secondaryLabel="Tiếp tục không đăng nhập"
        />
      ) : (
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
      )}
      <GlobalLoadingOverlay />
    </View>
  );
}

export default function RootLayout() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <FavoritesProvider>
          <HostProvider>
            <HostModeProvider>
              <AppBootstrapShell />
            </HostModeProvider>
          </HostProvider>
        </FavoritesProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}
