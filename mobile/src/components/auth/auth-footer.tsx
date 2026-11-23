import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { authColors, authSpacing } from './tokens';

interface AuthFooterProps {
  mode: 'login' | 'register';
  onSwitch: () => void;
  disabled?: boolean;
}

export function AuthFooter({ mode, onSwitch, disabled = false }: AuthFooterProps) {
  const isLogin = mode === 'login';

  const promptText = isLogin ? 'Bạn chưa có tài khoản?' : 'Bạn đã có tài khoản?';
  const actionText = isLogin ? 'Đăng ký ngay' : 'Đăng nhập';

  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <Text style={styles.promptText}>{promptText}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={actionText}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onSwitch}
          hitSlop={8}
          style={({ pressed }) => [
            styles.switchLink,
            pressed && styles.switchLinkPressed,
            disabled && styles.disabled,
          ]}
        >
          <Text style={styles.actionText}>{actionText}</Text>
          <Feather name="arrow-up-right" size={14} color={authColors.primary} />
        </Pressable>
      </View>

      <View style={styles.bottomBrand}>
        <View style={styles.divider} />
        <Text style={styles.brandSubtext}>HL_RCS • Kết nối nơi ở, an tâm mỗi ngày</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: authSpacing.md,
    marginTop: authSpacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
    color: authColors.textSecondary,
  },
  switchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  switchLinkPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: authColors.primary,
  },
  bottomBrand: {
    alignItems: 'center',
    gap: 8,
    paddingTop: authSpacing.xs,
  },
  divider: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: authColors.border,
  },
  brandSubtext: {
    fontSize: 11,
    lineHeight: 16,
    color: authColors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
