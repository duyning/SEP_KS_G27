import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from './animated-pressable';

interface HomeHeroBannerProps {
  onExplorePress: () => void;
}

export function HomeHeroBanner({ onExplorePress }: HomeHeroBannerProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(200)}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Background decorative circles */}
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />

        <View style={styles.contentRow}>
          {/* Left Text & CTA */}
          <View style={styles.leftColumn}>
            <View style={styles.tagBadge}>
              <Feather name="zap" size={11} color="#FFFFFF" />
              <Text style={styles.tagText}>HL_RCS Độc quyền</Text>
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

          {/* Right Graphic Motif */}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.xs,
  },
  card: {
    backgroundColor: authColors.primary,
    borderRadius: authRadius.xxl,
    padding: authSpacing.lg,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 145,
    justifyContent: 'center',
    shadowColor: authColors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
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
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.85)',
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
});
