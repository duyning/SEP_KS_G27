import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useIsCompact } from './auth-screen-layout';
import { authColors, authRadius, authSpacing } from './tokens';

export function HeroIllustration({ compact: forceCompact }: { compact?: boolean }) {
  const isScreenCompact = useIsCompact();
  const compact = forceCompact ?? isScreenCompact;

  // On very small screens, collapse illustration to preserve vertical space for the form
  if (compact) {
    return (
      <View style={styles.compactContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Feather name="map-pin" size={12} color={authColors.primary} />
        <Text style={styles.compactText}>Khu CNC & ĐHQG Hòa Lạc</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Decorative background pattern */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      <View style={styles.contentRow}>
        {/* Real Estate Graphics Motif */}
        <View style={styles.graphicGroup}>
          <View style={styles.houseCard}>
            <Feather name="home" size={24} color={authColors.primary} />
          </View>
          <View style={styles.keyBadge}>
            <Feather name="key" size={13} color={authColors.primary} />
          </View>
        </View>

        {/* Textual Information */}
        <View style={styles.textGroup}>
          <Text style={styles.headingText}>Căn hộ & Phòng trọ Hòa Lạc</Text>
          <Text style={styles.subText}>Tìm phòng nhanh chóng • Giá minh bạch</Text>

          <View style={styles.locationPill}>
            <Feather name="map-pin" size={11} color={authColors.primary} />
            <Text style={styles.locationPillText}>Khu CNC & ĐHQG, ĐH FPT</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 114,
    backgroundColor: authColors.primaryLight,
    borderRadius: authRadius.xl,
    borderWidth: 1,
    borderColor: authColors.border,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: authSpacing.md,
    justifyContent: 'center',
    marginBottom: authSpacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: authColors.primaryLight,
    marginBottom: authSpacing.md,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
    color: authColors.primary,
  },
  bgCircleLarge: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(8, 127, 119, 0.05)',
  },
  bgCircleSmall: {
    position: 'absolute',
    left: 40,
    bottom: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(8, 127, 119, 0.04)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.lg,
  },
  graphicGroup: {
    position: 'relative',
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  houseCard: {
    width: 50,
    height: 50,
    borderRadius: authRadius.lg,
    backgroundColor: authColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: authColors.border,
    shadowColor: authColors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  keyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: authColors.primaryLight,
    borderWidth: 1.5,
    borderColor: authColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  headingText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  subText: {
    fontSize: 11,
    lineHeight: 15,
    color: authColors.textSecondary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.border,
  },
  locationPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: authColors.primary,
  },
});
