import { Feather } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInputInstance } from 'react-native';
import { AuthInput, AuthInputProps } from './auth-input';
import { authColors } from './tokens';

export interface PasswordInputProps extends Omit<AuthInputProps, 'icon' | 'rightElement'> {
  icon?: AuthInputProps['icon'];
}

export const PasswordInput = forwardRef<TextInputInstance, PasswordInputProps>(function PasswordInput(
  { icon = 'lock', label, editable = true, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    if (!editable) return;
    setVisible(prev => !prev);
  };

  const rightToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
      accessibilityState={{ disabled: !editable }}
      disabled={!editable}
      onPress={toggleVisibility}
      hitSlop={6}
      style={({ pressed }) => [
        styles.eyeButton,
        pressed && styles.eyeButtonPressed,
        !editable && styles.eyeButtonDisabled,
      ]}
    >
      <Feather
        name={visible ? 'eye-off' : 'eye'}
        size={19}
        color={visible ? authColors.primary : authColors.textSecondary}
      />
    </Pressable>
  );

  return (
    <AuthInput
      ref={ref}
      icon={icon}
      label={label}
      editable={editable}
      secureTextEntry={!visible}
      rightElement={rightToggle}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  eyeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  eyeButtonPressed: {
    opacity: 0.7,
  },
  eyeButtonDisabled: {
    opacity: 0.5,
  },
});
