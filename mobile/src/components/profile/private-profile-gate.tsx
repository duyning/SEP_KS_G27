import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { ProfilePage, ProfileSkeleton, profileStyles as p } from './profile-ui';

export function PrivateProfileGate({ title, children }: { title: string; children: ReactNode }) {
  const { user, loading, sessionError, retry } = useAuth();
  if (user) return children;
  return <ProfilePage title={title}>{loading ? <ProfileSkeleton /> : <View style={{ gap: 16 }}><InlineError message={sessionError} /><Text style={p.hint}>{sessionError ? 'Chưa thể xác nhận phiên đăng nhập.' : 'Đăng nhập để quản lý tài khoản của bạn.'}</Text><PrimaryButton title={sessionError ? 'Thử lại' : 'Đăng nhập'} onPress={() => { if (sessionError) void retry(); else router.push('/login'); }} /></View>}</ProfilePage>;
}
