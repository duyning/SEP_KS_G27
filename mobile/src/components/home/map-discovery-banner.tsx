import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

interface MapDiscoveryBannerProps {
  onOpenMap: () => void;
}

export function MapDiscoveryBanner({ onOpenMap }: MapDiscoveryBannerProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(250)}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Decorative Grid Lines */}
        <View style={styles.gridLineHorizontal} />
        <View style={styles.gridLineVertical} />

        <View style={styles.contentRow}>
          <View style={styles.iconBox}>
            <Feather name="map" size={24} color={authColors.primary} />
            <View style={styles.pinCircle}>
              <Feather name="map-pin" size={11} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.title}>Tìm phòng trên bản đồ</Text>
            <Text style={styles.description}>
              Khám phá nhà trọ xung quanh ĐH FPT, ĐHQG & CNC Hòa Lạc.
            </Text>
          </View>

          <AnimatedPressable
            onPress={onOpenMap}
            style={styles.mapButton}
            accessibilityLabel="Mở bản đồ tìm phòng trọ"
          >
            <Text style={styles.buttonText}>Bản đồ</Text>
            <Feather name="arrow-up-right" size={14} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
  },
  card: {
    backgroundColor: authColors.primaryLight,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: authRadius.xl,
    padding: authSpacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(8, 107, 98, 0.08)',
  },
  gridLineVertical: {
    position: 'absolute',
    left: 55,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(8, 107, 98, 0.08)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: authRadius.md,
    backgroundColor: authColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: authColors.border,
  },
  pinCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    color: authColors.textSecondary,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: authColors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.md,
    shadowColor: authColors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
