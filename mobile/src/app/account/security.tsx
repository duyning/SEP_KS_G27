import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { AuthError, AuthFieldErrors, PasswordValues, validatePasswordChange } from '@/services/auth';
import { PrivateProfileGate } from '@/components/profile/private-profile-gate';
import { ProfilePage, profileStyles as p } from '@/components/profile/profile-ui';
import { PasswordInput } from '@/components/auth/password-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';

export default function SecurityScreen() {
  const { user } = useAuth();
  return <PrivateProfileGate title="Đổi mật khẩu">{user && <PasswordForm key={user.userId} />}</PrivateProfileGate>;
}
function PasswordForm() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState<PasswordValues>({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const update = (key: keyof PasswordValues, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(null); setSuccess(false); };
  const save = async () => {
    if (lock.current) return;
    const validation = validatePasswordChange(form); setErrors(validation); setError(null); setSuccess(false);
    if (Object.keys(validation).length) return;
    lock.current = true; setBusy(true);
    try { await changePassword(form); setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' }); setSuccess(true); }
    catch (err) { if (err instanceof AuthError) setErrors(err.fields); setError(err instanceof Error ? err.message : 'Chưa thể cập nhật mật khẩu.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ProfilePage title="Đổi mật khẩu" footer={<PrimaryButton style={{ height: 'auto', minHeight: 54, paddingVertical: 14 }} title="Cập nhật mật khẩu" onPress={() => { void save(); }} loading={busy} disabled={busy} />}>
    <Text style={p.hint}>Dùng mật khẩu hiện tại của tài khoản để thay đổi. Mật khẩu mới có ít nhất 6 ký tự và khác mật khẩu cũ.</Text>
    <InlineError message={error} />{success && <Text accessibilityRole="status" style={p.message}>Đã cập nhật mật khẩu. Phiên đăng nhập hiện tại được giữ nguyên.</Text>}
    <PasswordInput label="Mật khẩu hiện tại" value={form.oldPassword} onChangeText={value => update('oldPassword', value)} error={errors.oldPassword} editable={!busy} autoComplete="current-password" />
    <PasswordInput label="Mật khẩu mới" value={form.newPassword} onChangeText={value => update('newPassword', value)} error={errors.newPassword} editable={!busy} autoComplete="new-password" />
    <PasswordInput label="Xác nhận mật khẩu mới" value={form.confirmNewPassword} onChangeText={value => update('confirmNewPassword', value)} error={errors.confirmNewPassword} editable={!busy} autoComplete="new-password" />
  </ProfilePage>;
}

