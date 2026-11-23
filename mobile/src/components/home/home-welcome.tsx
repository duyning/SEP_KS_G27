import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/auth-context';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

export function HomeWelcomeSection() {
  const { user } = useAuth();
  const displayName = user?.fullName?.trim();

  return (
    <View style={styles.container}>
      {displayName ? (
        <Animated.Text
          entering={FadeInDown.duration(240).delay(40)}
          style={styles.greeting}
        >
          Xin chào, {displayName}
        </Animated.Text>
      ) : (
        <Animated.Text
          entering={FadeInDown.duration(240).delay(40)}
          style={styles.greeting}
        >
          NestHub • Hòa Lạc Rental Community
        </Animated.Text>
      )}

      <Animated.Text
        entering={FadeInDown.duration(280).delay(displayName ? 80 : 40)}
        accessibilityRole="header"
        style={styles.headline}
      >
        Tìm phòng trọ tại Hòa Lạc
      </Animated.Text>

      {!user ? (
        <Animated.View entering={FadeInDown.duration(280).delay(90)} style={styles.guestBannerWrapper}>
          <AnimatedPressable
            onPress={() => router.push('/login')}
            style={styles.guestBanner}
            accessibilityLabel="Đăng nhập tài khoản NestHub"
          >
            <View style={styles.guestBannerLeft}>
              <View style={styles.guestIconCircle}>
                <Feather name="heart" size={18} color={authColors.primary} />
              </View>
              <View style={styles.guestBannerCopy}>
                <Text style={styles.guestBannerTitle}>Lưu lại căn phòng bạn thích</Text>
                <Text style={styles.guestBannerText}>
                  Đăng nhập để lưu và xem lại dễ dàng
                </Text>
              </View>
            </View>
            <View style={styles.guestBannerCta}>
              <Feather name="arrow-up-right" size={18} color={authColors.primary} />
            </View>
          </AnimatedPressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.xs,
    paddingBottom: 2,
    gap: 3,
  },
  greeting: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: authColors.primary,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: authColors.forestInk,
  },
  guestBannerWrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F6F3',
    borderWidth: 1,
    borderColor: '#DCE9E2',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: authRadius.xl,
    gap: 12,
  },
  guestBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestIconCircle: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: authColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBannerCopy: {
    flex: 1,
    gap: 3,
  },
  guestBannerTitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: authColors.forestInk,
  },
  guestBannerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: authColors.textSecondary,
  },
  guestBannerCta: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: authRadius.round,
    backgroundColor: authColors.surface,
  },
});
