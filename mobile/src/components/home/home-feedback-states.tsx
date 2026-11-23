import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { useReducedMotionPreference } from '@/constants/motion';
import { AnimatedPressable } from './animated-pressable';

export function HomeSkeleton() {
  const opacity = useSharedValue(0.5);
  const reduceMotion = useReducedMotionPreference();

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      true
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 0.7 };
    return { opacity: opacity.value };
  });

  return (
    <View style={styles.skeletonContainer}>
      {/* Featured skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonRow}>
          {[1, 2].map(key => (
            <Animated.View
              key={key}
              style={[styles.skeletonCard, animatedStyle]}
            >
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonBody}>
                <View style={styles.skeletonLineShort} />
                <View style={styles.skeletonLineFull} />
                <View style={styles.skeletonLineMedium} />
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* List skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonTitle} />
        {[1, 2, 3].map(key => (
          <Animated.View
            key={key}
            style={[styles.skeletonListCard, animatedStyle]}
          >
            <View style={styles.skeletonThumb} />
            <View style={styles.skeletonListBody}>
              <View style={styles.skeletonLineMedium} />
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineSmall} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

interface HomeEmptyStateProps {
  onReset: () => void;
  message?: string;
}

export function HomeEmptyState({
  onReset,
  message = 'Chưa có phòng nào phù hợp với bộ lọc hiện tại.',
}: HomeEmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Feather name="search" size={28} color={authColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có phòng phù hợp</Text>
      <Text style={styles.emptySub}>{message}</Text>
      <AnimatedPressable onPress={onReset} style={styles.emptyBtn}>
        <Text style={styles.emptyBtnText}>Đặt lại bộ lọc</Text>
      </AnimatedPressable>
    </View>
  );
}

interface HomeErrorStateProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function HomeErrorState({
  onRetry,
  errorMessage = 'Chưa thể tải dữ liệu phòng trọ từ máy chủ.',
}: HomeErrorStateProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconCircle}>
        <Feather name="alert-triangle" size={28} color={authColors.error} />
      </View>
      <Text style={styles.errorTitle}>Đã xảy ra sự cố</Text>
      <Text style={styles.errorSub}>{errorMessage}</Text>
      <AnimatedPressable onPress={onRetry} style={styles.retryBtn} accessibilityLabel="Thử lại">
        <Feather name="refresh-cw" size={15} color="#FFFFFF" />
        <Text style={styles.retryBtnText}>Thử lại</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingVertical: authSpacing.md,
    gap: authSpacing.xl,
  },
  skeletonSection: {
    gap: authSpacing.sm,
  },
  skeletonTitle: {
    width: 140,
    height: 20,
    borderRadius: 6,
    backgroundColor: authColors.border,
    marginHorizontal: authSpacing.xl,
    marginBottom: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: authSpacing.xl,
  },
  skeletonCard: {
    width: 275,
    borderRadius: authRadius.xl,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E6ECE9',
  },
  skeletonBody: {
    padding: authSpacing.md,
    gap: 8,
  },
  skeletonLineShort: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: authColors.border,
  },
  skeletonLineFull: {
    width: '85%',
    height: 16,
    borderRadius: 4,
    backgroundColor: authColors.border,
  },
  skeletonLineMedium: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: authColors.border,
  },
  skeletonListCard: {
    flexDirection: 'row',
    backgroundColor: authColors.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: authColors.border,
    padding: 10,
    gap: 12,
    marginHorizontal: authSpacing.xl,
    marginBottom: 10,
  },
  skeletonThumb: {
    width: 92,
    height: 92,
    borderRadius: authRadius.md,
    backgroundColor: '#E6ECE9',
  },
  skeletonListBody: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  skeletonLineSmall: {
    width: '35%',
    height: 12,
    borderRadius: 4,
    backgroundColor: authColors.border,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: authSpacing.xxl,
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: authColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    color: authColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: authColors.primary,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: authSpacing.xxl,
    gap: 8,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: authColors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  errorSub: {
    fontSize: 13,
    lineHeight: 18,
    color: authColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: authColors.primary,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
