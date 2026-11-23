import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandIcon } from '@/components/brand/brand-logo';
import { BRAND } from '@/config/brand';
import { authColors, authRadius, authSpacing } from './tokens';

interface AuthHeaderProps {
  mode: 'login' | 'register';
  onBack?: () => void;
  disabled?: boolean;
}

export function AuthHeader({ mode, onBack, disabled = false }: AuthHeaderProps) {
  const handleBack = () => {
    if (disabled) return;
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  if (mode === 'register') {
    return (
      <View style={styles.registerContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại màn hình đăng nhập"
          hitSlop={8}
          onPress={handleBack}
          disabled={disabled}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
            disabled && styles.disabled,
          ]}
        >
          <Feather name="arrow-left" size={20} color={authColors.primary} />
          <Text style={styles.backButtonText}>Đăng nhập</Text>
        </Pressable>

        <View style={styles.centerBrand}>
          <View style={styles.miniLogo}>
            <BrandIcon size={16} variant="white" />
          </View>
          <Text style={styles.miniBrandName}>{BRAND.name}</Text>
        </View>

        <View style={styles.campusBadge}>
          <View style={styles.campusDot} />
          <Text style={styles.campusText}>Hòa Lạc</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.loginContainer}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <BrandIcon size={22} variant="white" />
        </View>
        <View style={styles.brandMeta}>
          <Text style={styles.brandName}>{BRAND.name}</Text>
          <Text style={styles.brandTagline}>Một nơi ở. Một khởi đầu.</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Về trang chủ"
        disabled={disabled} onPress={() => router.replace('/home')}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed, disabled && styles.disabled]}>
        <Feather name="arrow-left" size={18} color={authColors.primary} />
        <Text style={styles.backButtonText}>Trang chủ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: authSpacing.sm,
    marginBottom: authSpacing.md,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: authSpacing.xs,
    marginBottom: authSpacing.sm,
    minHeight: 44,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.md,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: authRadius.md,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: authColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  brandMeta: {
    gap: 1,
  },
  brandName: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: authColors.textPrimary,
  },
  brandTagline: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
    color: authColors.textSecondary,
  },
  centerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniLogo: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBrandName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: authColors.textPrimary,
  },
  campusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: authColors.primaryLight,
  },
  campusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: authColors.primary,
  },
  campusText: {
    fontSize: 11,
    fontWeight: '600',
    color: authColors.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 8,
    paddingRight: 10,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
