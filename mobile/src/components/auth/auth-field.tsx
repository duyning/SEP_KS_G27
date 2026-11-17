import { Feather } from '@expo/vector-icons';
import { ComponentProps, forwardRef } from 'react';
import { TextInputInstance, TextInputProps } from 'react-native';
import { AuthInput } from './auth-input';
import { PasswordInput } from './password-input';

type Props = TextInputProps & {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  error?: string;
  password?: boolean;
  hint?: string;
};

export const AuthField = forwardRef<TextInputInstance, Props>(function AuthField(
  { password, ...props },
  ref
) {
  if (password) {
    return <PasswordInput ref={ref} {...props} />;
  }
  return <AuthInput ref={ref} {...props} />;
});
