import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/auth-context';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

interface HomeHeaderProps {
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onLoginPress?: () => void;
  unreadNotifications?: number;
}

export function HomeHeader({
  onLocationPress,
  onNotificationPress,
  onLoginPress,
  unreadNotifications = 0,
}: HomeHeaderProps) {
  const { user } = useAuth();

  const handleNavigateLogin = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      router.push('/login');
    }
  };


  const handleNotificationPress = () => {
    if (!user) {
      Alert.alert(
        'Thông báo',
        'Vui lòng đăng nhập để nhận thông báo mới nhất về phòng trọ.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: handleNavigateLogin },
        ]
      );
      return;
    }
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      Alert.alert('Thông báo', 'Bạn không có thông báo mới.');
    }
  };


  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.container}>
      {/* Left side: Location discovery info */}
      <AnimatedPressable
        onPress={onLocationPress}
        style={styles.locationGroup}
        accessibilityLabel="Khu vực tìm kiếm: Hòa Lạc, Hà Nội"
      >
        <Text style={styles.locationSubtitle}>Khu vực tìm kiếm</Text>
        <View style={styles.locationTitleRow}>
          <Feather name="map-pin" size={13} color={authColors.primary} />
          <Text style={styles.locationTitle} numberOfLines={1}>Hòa Lạc, Hà Nội</Text>
        </View>
      </AnimatedPressable>

      {/* Right side: Login button (Guest) or Notification (Logged in) */}
      <View style={styles.rightGroup}>
        {user ? (
          <>
            <AnimatedPressable
              onPress={handleNotificationPress}
              style={styles.iconButton}
              accessibilityLabel="Thông báo"
            >
              <Feather name="bell" size={19} color={authColors.forestInk} />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          </>
        ) : (
          <AnimatedPressable
            onPress={handleNavigateLogin}
            style={styles.loginButton}
            accessibilityLabel="Đăng nhập tài khoản"
          >
            <Feather name="user" size={15} color={authColors.surface} />
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </AnimatedPressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: authSpacing.sm,
    paddingHorizontal: authSpacing.xl,
  },
  locationGroup: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  locationSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: authColors.textSecondary,
    fontWeight: '500',
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationTitle: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: authColors.forestInk,
  },
  rightGroup: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: authColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: authRadius.lg,
    minHeight: 44,
    boxShadow: '0px 3px 8px rgba(8, 107, 98, 0.16)',
  },
  loginButtonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: authColors.surface,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: authRadius.round,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: authColors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: authColors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 11,
  },
});


