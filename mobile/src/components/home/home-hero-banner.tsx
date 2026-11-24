import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { useReducedMotionPreference } from '@/constants/motion';
import type { OnboardingBannerPresentation } from '@/services/host-onboarding';
import { AnimatedPressable } from './animated-pressable';

interface HomeHeroBannerProps {
  onExplorePress: () => void;
  hostBanner?: OnboardingBannerPresentation | null;
  onHostBannerPress?: () => void;
}

const AUTO_ADVANCE_MS = 6500;

export function HomeHeroBanner({
  onExplorePress,
  hostBanner,
  onHostBannerPress,
}: HomeHeroBannerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotionPreference();
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const userInteractedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const showHostSlide = Boolean(hostBanner?.visible && onHostBannerPress);
  const slideCount = showHostSlide ? 2 : 1;
  const pageWidth = Math.max(280, windowWidth);
  const currentIndex = activeIndex >= slideCount ? 0 : activeIndex;

  useEffect(() => {
    if (slideCount <= 1 || reducedMotion) return;

    const timer = setInterval(() => {
      if (userInteractedRef.current) return;
      setActiveIndex(prev => {
        const next = (prev + 1) % slideCount;
        scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [slideCount, reducedMotion, pageWidth]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIdx = Math.round(offsetX / pageWidth);
    setActiveIndex(Math.max(0, Math.min(slideCount - 1, nextIdx)));
  };

  const renderDiscoveryCard = () => (
    <View style={styles.card}>
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      <View style={styles.contentRow}>
        <View style={styles.leftColumn}>
          <View style={styles.tagBadge}>
            <Feather name="zap" size={11} color="#FFFFFF" />
            <Text style={styles.tagText}>NestHub Độc quyền</Text>
          </View>

          <Text style={styles.headline}>Gần trường. Gần cuộc sống.</Text>
          <Text style={styles.subline}>
            Khám phá nơi ở phù hợp với bạn tại Hòa Lạc.
          </Text>

          <AnimatedPressable
            onPress={onExplorePress}
            style={styles.ctaButton}
            accessibilityLabel="Khám phá ngay"
          >
            <Text style={styles.ctaText}>Khám phá ngay</Text>
            <Feather name="arrow-right" size={14} color={authColors.primary} />
          </AnimatedPressable>
        </View>

        <View style={styles.graphicColumn}>
          <View style={styles.mainHouseCard}>
            <Feather name="home" size={28} color={authColors.primary} />
            <View style={styles.miniKeyBadge}>
              <Feather name="key" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHostPartnerCard = () => {
    if (!hostBanner || !onHostBannerPress) return null;
    const isWarningState = hostBanner.state === 'needs_supplement';

    return (
      <View style={[styles.card, styles.hostCard]}>
        <View style={styles.hostBgCircleLarge} />
        <View style={styles.hostBgCircleSmall} />

        <View style={styles.contentRow}>
          <View style={styles.leftColumn}>
            <View
              style={[
                styles.tagBadge,
                isWarningState && styles.warningTagBadge,
              ]}
            >
              <Feather
                name={isWarningState ? 'alert-circle' : 'award'}
                size={11}
                color={isWarningState ? '#FEF3C7' : '#FFFFFF'}
              />
              <Text style={styles.tagText}>{hostBanner.badge}</Text>
            </View>

            <Text style={styles.headline} numberOfLines={2}>
              {hostBanner.title}
            </Text>
            <Text style={styles.subline} numberOfLines={2}>
              {hostBanner.description}
            </Text>

            <AnimatedPressable
              onPress={onHostBannerPress}
              style={styles.ctaButton}
              accessibilityLabel={hostBanner.ctaLabel}
            >
              <Text style={styles.ctaText}>{hostBanner.ctaLabel}</Text>
              <Feather name="arrow-right" size={14} color={authColors.primaryDark} />
            </AnimatedPressable>
          </View>

          <View style={styles.graphicColumn}>
            <View style={styles.mainHouseCard}>
              <Feather name="briefcase" size={26} color={authColors.primaryDark} />
              <View style={styles.miniShieldBadge}>
                <Feather name="check" size={12} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (slideCount === 1) {
    return (
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(320).delay(180)}
        style={styles.singleContainer}
      >
        {renderDiscoveryCard()}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(320).delay(180)}
      style={styles.carouselWrapper}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          userInteractedRef.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        <View style={[styles.slidePage, { width: pageWidth }]}>
          {renderHostPartnerCard()}
        </View>
        <View style={[styles.slidePage, { width: pageWidth }]}>
          {renderDiscoveryCard()}
        </View>
      </ScrollView>

      <View style={styles.dotsRow} accessibilityLabel={`Banner ${currentIndex + 1} trên ${slideCount}`}>
        {[0, 1].map(dotIdx => {
          const active = currentIndex === dotIdx;
          return (
            <AnimatedPressable
              key={dotIdx}
              accessibilityLabel={`Chuyển đến banner ${dotIdx + 1}`}
              onPress={() => {
                userInteractedRef.current = true;
                setActiveIndex(dotIdx);
                scrollRef.current?.scrollTo({ x: dotIdx * pageWidth, animated: !reducedMotion });
              }}
              hitSlop={8}
            >
              <View style={[styles.dot, active && styles.dotActive]} />
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  singleContainer: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.xs,
  },
  carouselWrapper: {
    paddingVertical: authSpacing.xs,
    gap: 8,
  },
  slidePage: {
    paddingHorizontal: authSpacing.xl,
  },
  card: {
    backgroundColor: authColors.primary,
    borderRadius: authRadius.xxl,
    padding: authSpacing.lg,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 152,
    justifyContent: 'center',
    shadowColor: authColors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  hostCard: {
    backgroundColor: authColors.primaryDark,
  },
  bgCircleLarge: {
    position: 'absolute',
    right: -20,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bgCircleSmall: {
    position: 'absolute',
    right: 70,
    bottom: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  hostBgCircleLarge: {
    position: 'absolute',
    right: -24,
    top: -26,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(221, 236, 230, 0.11)',
  },
  hostBgCircleSmall: {
    position: 'absolute',
    left: -30,
    bottom: -48,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    paddingRight: authSpacing.md,
    gap: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 2,
  },
  warningTagBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.45)',
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subline: {
    fontSize: 12,
    lineHeight: 16.5,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 6,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: authRadius.md,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: authColors.primary,
  },
  graphicColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: authSpacing.xs,
  },
  mainHouseCard: {
    width: 60,
    height: 60,
    borderRadius: authRadius.lg,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  miniKeyBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: authColors.primaryDark,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniShieldBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0D9488',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: authColors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: authColors.primary,
  },
});
