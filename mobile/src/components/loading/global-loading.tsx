import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/auth/primary-button';
import { BrandIcon } from '@/components/brand/brand-logo';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { BRAND } from '@/config/brand';
import { useReducedMotionPreference } from '@/constants/motion';
import { useLoading } from '@/context/loading-context';
import {
  LOADING_MESSAGES,
  normalizeLoadingMessage,
} from '@/services/loading-manager';

/**
 * Unified NestHub Global Loading Brand Tokens
 */
export const loadingColors = {
  background: '#F8FAFC',
  overlayBackdrop: 'rgba(248, 250, 252, 0.92)',
  surface: '#FFFFFF',
  primary: '#0D9488',
  primaryDark: '#0F766E',
  ringTrack: 'rgba(13, 148, 136, 0.14)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  skeletonBase: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
} as const;

/* -------------------------------------------------------------------------- */
/* Brand Orbital Emblem + Subtle Dots (Reanimated, Reduced-Motion Safe)       */
/* -------------------------------------------------------------------------- */

function BrandOrbitalLogo({
  size = 'lg',
  reducedMotion,
}: {
  size?: 'lg' | 'sm';
  reducedMotion: boolean;
}) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      rotation.value = 0;
      pulse.value = 1;
      return;
    }

    // Smooth 1.6s orbital ring rotation (1.4–1.8s target); logo itself NEVER rotates
    rotation.value = withRepeat(
      withTiming(360, { duration: 1600, easing: Easing.linear }),
      -1,
      false
    );

    // Subtle breathing scale on the official NestHub emblem
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
    };
  }, [pulse, reducedMotion, rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const isLarge = size === 'lg';
  const outerSize = isLarge ? 96 : 64;
  const emblemSize = isLarge ? 56 : 38;
  const iconSize = isLarge ? 26 : 18;
  const ringBorder = isLarge ? 3.5 : 3;

  return (
    <View
      style={[s.orbitContainer, { width: outerSize, height: outerSize }]}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Static subtle ring track */}
      <View
        style={[
          s.ringTrack,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: ringBorder,
          },
        ]}
      />

      {/* Rotating orbital arc */}
      <Animated.View
        style={[
          s.ringArc,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: ringBorder,
            borderTopColor: loadingColors.primary,
            borderRightColor: reducedMotion ? loadingColors.primary : 'rgba(8, 127, 114, 0.28)',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
          },
          ringStyle,
        ]}
      />

      {/* Official NestHub Rounded Teal Emblem */}
      <Animated.View
        style={[
          s.emblem,
          {
            width: emblemSize,
            height: emblemSize,
            borderRadius: isLarge ? 18 : 12,
          },
          emblemStyle,
        ]}
      >
        <BrandIcon size={isLarge ? 30 : 20} variant="white" />
      </Animated.View>
    </View>
  );
}

function SubtleLoadingDots({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <View style={s.dotsRow} importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map(idx => (
        <AnimatedDot key={idx} index={idx} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

function AnimatedDot({
  index,
  reducedMotion,
}: {
  index: number;
  reducedMotion: boolean;
}) {
  const opacity = useSharedValue(reducedMotion ? 0.65 : 0.3);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.65;
      return;
    }

    opacity.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.28, { duration: 540, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [index, opacity, reducedMotion]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[s.dot, dotStyle]} />;
}

/* -------------------------------------------------------------------------- */
/* 1. GlobalSplashLoading — App Startup & Auth Session Restore                */
/* -------------------------------------------------------------------------- */

export function GlobalSplashLoading({
  message = LOADING_MESSAGES.startup,
  submessage,
  showBrandName = true,
  error,
  errorTitle = 'Không thể khởi tạo phiên làm việc',
  onRetry,
  retryLabel = 'Thử lại',
  onSecondaryAction,
  secondaryLabel = 'Tiếp tục không đăng nhập',
}: {
  message?: string;
  submessage?: string;
  showBrandName?: boolean;
  error?: string | null;
  errorTitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
}) {
  const reducedMotion = useReducedMotionPreference();
  const label = normalizeLoadingMessage(message, LOADING_MESSAGES.startup);

  if (error) {
    return (
      <SafeAreaView style={s.fullScreen} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.errorCard} accessibilityRole="alert">
          <View style={s.errorBadge}>
            <Feather name="alert-circle" size={28} color={loadingColors.error} />
          </View>
          <Text style={s.errorTitle}>{errorTitle}</Text>
          <Text style={s.errorDesc}>{error}</Text>

          <View style={s.errorActions}>
            {onRetry && (
              <View style={{ width: '100%' }}>
                <PrimaryButton title={retryLabel} icon="refresh-cw" onPress={onRetry} />
              </View>
            )}
            {onSecondaryAction && (
              <AnimatedPressable
                scaleTo={0.98}
                style={s.secondaryBtn}
                onPress={onSecondaryAction}
              >
                <Text style={s.secondaryBtnText}>{secondaryLabel}</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={s.fullScreen}
      edges={['top', 'bottom', 'left', 'right']}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${BRAND.name}. ${label}`}
      accessibilityLiveRegion="polite"
    >
      <View style={s.centerCard}>
        <BrandOrbitalLogo size="lg" reducedMotion={reducedMotion} />
        <View style={s.copyWrap}>
          {showBrandName && <Text style={s.brandName}>{BRAND.name}</Text>}
          <Text style={s.messageText}>{label}</Text>
          {submessage ? <Text style={s.submessageText}>{submessage}</Text> : null}
          <SubtleLoadingDots reducedMotion={reducedMotion} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. GlobalLoadingOverlay — Single Root-Mounted Blocking Overlay             */
/* -------------------------------------------------------------------------- */

export function GlobalLoadingOverlay() {
  const { snapshot } = useLoading();
  const reducedMotion = useReducedMotionPreference();

  if (!snapshot.visible) return null;

  const isFullscreen = snapshot.mode === 'fullscreen';
  const label = normalizeLoadingMessage(snapshot.message, LOADING_MESSAGES.loadingData);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(160)}
      exiting={reducedMotion ? undefined : FadeOut.duration(160)}
      style={[
        s.overlayRoot,
        {
          backgroundColor: isFullscreen
            ? loadingColors.background
            : loadingColors.overlayBackdrop,
        },
      ]}
      pointerEvents="auto"
      accessible
      accessibilityViewIsModal
      accessibilityRole="progressbar"
      accessibilityLabel={`${BRAND.name}. ${label}`}
      accessibilityLiveRegion="polite"
    >
      <View style={s.centerCard}>
        <BrandOrbitalLogo size="lg" reducedMotion={reducedMotion} />
        <View style={s.copyWrap}>
          <Text style={s.brandName}>{BRAND.name}</Text>
          <Text style={s.messageText}>{label}</Text>
          <SubtleLoadingDots reducedMotion={reducedMotion} />
        </View>
      </View>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. ContentLoading — Skeleton & Inline Data Section Loader                  */
/* -------------------------------------------------------------------------- */

export function ContentLoading({
  variant = 'list',
  count = 3,
  message = LOADING_MESSAGES.loadingData,
}: {
  variant?: 'list' | 'cards' | 'detail' | 'inline';
  count?: number;
  message?: string;
}) {
  const reducedMotion = useReducedMotionPreference();
  const shimmer = useSharedValue(0.6);

  useEffect(() => {
    if (reducedMotion || variant === 'inline') {
      cancelAnimation(shimmer);
      shimmer.value = 0.75;
      return;
    }

    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmer);
    };
  }, [reducedMotion, shimmer, variant]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  if (variant === 'inline') {
    return (
      <View
        style={s.inlineWrap}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <BrandOrbitalLogo size="sm" reducedMotion={reducedMotion} />
        <Text style={s.inlineText}>{message}</Text>
      </View>
    );
  }

  if (variant === 'detail') {
    return (
      <View
        style={s.skeletonStack}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <Animated.View style={[s.skeletonCard, pulseStyle]}>
          <View style={[s.skLine, { height: 22, width: '58%' }]} />
          <View style={[s.skLine, { height: 14, width: '84%' }]} />
          <View style={[s.skLine, { height: 14, width: '42%' }]} />
        </Animated.View>
        <Animated.View style={[s.skeletonCard, pulseStyle]}>
          <View style={[s.skLine, { height: 16, width: '46%' }]} />
          <View style={[s.skLine, { height: 14, width: '92%' }]} />
          <View style={[s.skLine, { height: 14, width: '76%' }]} />
        </Animated.View>
      </View>
    );
  }

  const items = Array.from({ length: Math.max(1, count) }, (_, idx) => idx);

  if (variant === 'cards') {
    return (
      <View
        style={s.skeletonStack}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        {items.map(idx => (
          <Animated.View key={idx} style={[s.skeletonCard, pulseStyle]}>
            <View style={s.skRow}>
              <View style={s.skThumb} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={[s.skLine, { height: 16, width: '72%' }]} />
                <View style={[s.skLine, { height: 13, width: '48%' }]} />
                <View style={[s.skLine, { height: 12, width: '60%' }]} />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={s.skeletonStack}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      {items.map(idx => (
        <Animated.View key={idx} style={[s.skeletonRowCard, pulseStyle]}>
          <View style={[s.skLine, { height: 15, width: '62%' }]} />
          <View style={[s.skLine, { height: 12, width: '40%' }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: loadingColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlayRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 320,
  },
  orbitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringTrack: {
    position: 'absolute',
    borderColor: loadingColors.ringTrack,
  },
  ringArc: {
    position: 'absolute',
  },
  emblem: {
    backgroundColor: loadingColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: loadingColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  copyWrap: {
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: loadingColors.textPrimary,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: loadingColors.textSecondary,
    textAlign: 'center',
  },
  submessageText: {
    fontSize: 13,
    lineHeight: 19,
    color: loadingColors.textSecondary,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: loadingColors.primary,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: loadingColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: loadingColors.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: loadingColors.errorBg,
    borderWidth: 1,
    borderColor: loadingColors.errorBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: loadingColors.textPrimary,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: loadingColors.textSecondary,
    textAlign: 'center',
  },
  errorActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: loadingColors.border,
    backgroundColor: loadingColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: loadingColors.textPrimary,
  },
  inlineWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  inlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: loadingColors.textSecondary,
    textAlign: 'center',
  },
  skeletonStack: {
    width: '100%',
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: loadingColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: loadingColors.border,
    padding: 16,
    gap: 10,
  },
  skeletonRowCard: {
    backgroundColor: loadingColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: loadingColors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  skRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: loadingColors.skeletonBase,
  },
  skLine: {
    borderRadius: 8,
    backgroundColor: loadingColors.skeletonBase,
  },
});
