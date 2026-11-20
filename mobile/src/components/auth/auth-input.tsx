import { Feather } from '@expo/vector-icons';
import { ComponentProps, forwardRef, ReactNode, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
} from 'react-native';
import { authColors, authRadius } from './tokens';

export interface AuthInputProps extends TextInputProps {
  label: string;
  optionalLabel?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const AuthInput = forwardRef<TextInputInstance, AuthInputProps>(function AuthInput(
  {
    label,
    optionalLabel,
    icon,
    error,
    hint,
    rightElement,
    style,
    onFocus,
    onBlur,
    editable = true,
    testID,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);

  const isInvalid = Boolean(error);

  const getBorderColor = () => {
    if (isInvalid) return authColors.error;
    if (focused) return authColors.borderFocus;
    return authColors.border;
  };

  const getIconColor = () => {
    if (isInvalid) return authColors.error;
    if (focused) return authColors.primary;
    return authColors.textMuted;
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label} nativeID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
        {!!optionalLabel && (
          <Text style={styles.optionalLabel}>{optionalLabel}</Text>
        )}
      </View>

      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          focused && styles.inputFocused,
          isInvalid && styles.inputInvalid,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon && (
          <View style={styles.leftIconWrapper} pointerEvents="none">
            <Feather name={icon} size={18} color={getIconColor()} />
          </View>
        )}

        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={authColors.placeholder}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          testID={testID}
          {...rest}
        />

        {rightElement}
      </View>

      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <Feather name="alert-circle" size={13} color={authColors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: authColors.forestInk,
  },
  optionalLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: authColors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: authRadius.md,
    backgroundColor: authColors.surface,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderWidth: 1.5,
    backgroundColor: authColors.surface,
  },
  inputInvalid: {
    borderWidth: 1.5,
    backgroundColor: '#FFFDFD',
  },
  inputDisabled: {
    backgroundColor: '#F7F9F8',
    opacity: 0.7,
  },
  leftIconWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: authColors.forestInk,
    paddingVertical: 0,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: authColors.error,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
    color: authColors.textSecondary,
    paddingHorizontal: 2,
  },
});
