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
  hintRight?: ReactNode;
  rightElement?: ReactNode;
}

export const AuthInput = forwardRef<TextInputInstance, AuthInputProps>(function AuthInput(
  {
    label,
    optionalLabel,
    icon,
    error,
    hint,
    hintRight,
    rightElement,
    style,
    onFocus,
    onBlur,
    editable = true,
    multiline = false,
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
        {!!optionalLabel && <Text style={styles.optionalLabel}>{optionalLabel}</Text>}
      </View>

      <View
        style={[
          styles.inputContainerBase,
          multiline ? styles.inputContainerMultiline : styles.inputContainerSingle,
          { borderColor: getBorderColor() },
          focused && styles.inputFocused,
          isInvalid && styles.inputInvalid,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon && (
          <View
            style={[styles.leftIconWrapper, multiline && styles.leftIconMultiline]}
            pointerEvents="none"
          >
            <Feather name={icon} size={18} color={getIconColor()} />
          </View>
        )}

        <TextInput
          ref={ref}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            multiline ? styles.inputMultiline : styles.inputSingle,
            style,
          ]}
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
        <View style={styles.metaFooterRow}>
          <View style={styles.errorRow} accessibilityRole="alert">
            <Feather name="alert-circle" size={13} color={authColors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          {hintRight}
        </View>
      ) : hint || hintRight ? (
        <View style={styles.metaFooterRow}>
          {hint ? <Text style={styles.hintText}>{hint}</Text> : <View style={{ flex: 1 }} />}
          {hintRight}
        </View>
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
  inputContainerBase: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: authRadius.md,
    backgroundColor: authColors.surface,
    paddingHorizontal: 14,
  },
  inputContainerSingle: {
    alignItems: 'center',
    minHeight: 50,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    minHeight: 112,
    maxHeight: 220,
    paddingVertical: 12,
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
  leftIconMultiline: {
    marginTop: 2,
  },
  inputSingle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: authColors.forestInk,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputMultiline: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: authColors.forestInk,
    paddingVertical: 0,
    minHeight: 88,
    maxHeight: 196,
    textAlignVertical: 'top',
  },
  metaFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorRow: {
    flex: 1,
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
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: authColors.textSecondary,
    paddingHorizontal: 2,
  },
});
