import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { authColors, authRadius, authSpacing } from './tokens';

interface InlineErrorProps {
  message?: string | null;
}

export function InlineError({ message }: InlineErrorProps) {
  if (!message) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Feather name="alert-circle" size={18} color={authColors.error} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: authColors.errorLight,
    borderWidth: 1,
    borderColor: authColors.errorBorder,
    borderRadius: authRadius.md,
    padding: authSpacing.md,
    gap: authSpacing.sm,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: authColors.error,
    fontWeight: '500',
  },
});
