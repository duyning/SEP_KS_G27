import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BRAND } from '@/config/brand';

const ICON_TEAL = require('@/assets/images/nesthub-icon.png');
const ICON_WHITE = require('@/assets/images/nesthub-icon-white.png');

export function BrandIcon({
  size = 28,
  variant = 'teal',
}: {
  size?: number;
  variant?: 'teal' | 'white';
}) {
  return (
    <Image
      source={variant === 'white' ? ICON_WHITE : ICON_TEAL}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function BrandLogo({
  size = 'md',
  tone = 'light',
  iconOnly = false,
  subtitle,
  style,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'light' | 'dark';
  iconOnly?: boolean;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const iconSize = size === 'sm' ? 22 : size === 'lg' ? 34 : 28;
  const fontSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 19;
  const isDark = tone === 'dark';

  return (
    <View style={[s.row, style]}>
      <BrandIcon size={iconSize} variant={isDark ? 'white' : 'teal'} />
      {!iconOnly && (
        <View style={s.copy}>
          <Text
            style={[
              s.wordmark,
              { fontSize, color: isDark ? '#FFFFFF' : BRAND.wordmarkColor },
            ]}
          >
            {BRAND.name}
          </Text>
          {subtitle ? (
            <Text style={[s.subtitle, { color: isDark ? 'rgba(255,255,255,0.8)' : '#475569' }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copy: {
    flexDirection: 'column',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
