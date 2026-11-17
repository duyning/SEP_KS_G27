import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { usePreventRemove } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ConfirmDialog, ProfilePage, UserAvatar, profileStyles as p } from '@/components/profile/profile-ui';
import { PrivateProfileGate } from '@/components/profile/private-profile-gate';
import { AuthError, AuthFieldErrors, AuthUser, ProfileValues, PhoneChallenge, validateProfile } from '@/services/auth';
import { authColors as c } from '@/components/auth/tokens';
import {PhoneOtpDialog} from '@/components/profile/phone-otp-dialog';

export default function EditProfileScreen() {
  const { user } = useAuth();
  return <PrivateProfileGate title="Chỉnh sửa hồ sơ">{user && <EditProfileForm key={user.userId} user={user} />}</PrivateProfileGate>;
}
function EditProfileForm({ user }: { user: AuthUser }) {
  const { updateProfile,sendPhoneOtp } = useAuth();
  const initial = { fullName: user.fullName, phoneNumber: user.phoneNumber || '', organization: user.organization || '', preferredArea: user.preferredArea || '', avatar: user.avatar || '' };
  const [phoneChallenge,setPhoneChallenge]=useState<(PhoneChallenge&{payload:ProfileValues;normalized:typeof initial})|null>(null);
  const [form, setForm] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [discard, setDiscard] = useState<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = useState(false);
  const lock = useRef(false);
  const dirty = (Object.keys(form) as (keyof typeof form)[]).some(key => form[key] !== baseline[key]);
  usePreventRemove((dirty && !allowLeave) || busy, ({ repeat }) => {
    if (busy) return;
    setDiscard(() => () => { setAllowLeave(true); repeat(); });
  });
  const update = (key: keyof typeof form, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setMessage(null); setSuccess(false); };
  const pickAvatar = async () => {
    if (picking || busy) return;
    setPicking(true); setMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], base64: true, quality: 0.75 });
      if (result.canceled) return;
      const data = result.assets[0].base64;
      if (!data) throw new Error('Không đọc được ảnh. Vui lòng chọn ảnh khác.');
      const bytes = data.length * 3 / 4 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
      const mime = data.startsWith('/9j/') ? 'jpeg' : data.startsWith('iVBORw0KGgo') ? 'png' : data.startsWith('UklGR') ? 'webp' : null;
      if (!mime || bytes > 2621440) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 2,5 MB.');
      update('avatar', `data:image/${mime};base64,${data}`);
    } catch (err) { setErrors(previous => ({ ...previous, avatar: err instanceof Error ? err.message : 'Không thể mở thư viện ảnh.' })); }
    finally { setPicking(false); }
  };
  const save = async () => {
    if (lock.current || picking || !dirty) return;
    const normalized = { ...form, fullName: form.fullName.trim(), phoneNumber: form.phoneNumber.trim(), organization: form.organization.trim(), preferredArea: form.preferredArea.trim() };
    const payload: ProfileValues = { ...normalized, avatar: normalized.avatar !== baseline.avatar ? normalized.avatar : undefined };
    const validation = validateProfile(payload);
    if (baseline.phoneNumber && !normalized.phoneNumber) validation.phoneNumber = 'Máy chủ chưa hỗ trợ xóa số điện thoại đã lưu. Bạn có thể đổi sang số khác.';
    setErrors(validation); setMessage(null); setSuccess(false);
    if (Object.keys(validation).length) return;
    lock.current = true; setBusy(true);
    try {
      const normalize=(phone?:string)=>(phone||'').replace(/^\+84/,'0');
      if(user.googleAccount&&normalized.phoneNumber&&normalize(normalized.phoneNumber)!==normalize(user.phoneNumber)){
        setPhoneChallenge({...await sendPhoneOtp(normalized.phoneNumber),payload,normalized});
      }else{await updateProfile(payload);setForm(normalized);setBaseline(normalized);setSuccess(true);}
    }
    catch (err) { if (err instanceof AuthError) setErrors(err.fields); setMessage(err instanceof Error ? err.message : 'Chưa thể lưu hồ sơ.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ProfilePage title="Chỉnh sửa hồ sơ" footer={<PrimaryButton style={{ height: 'auto', minHeight: 54, paddingVertical: 14 }} title="Lưu thay đổi" disabled={!dirty || busy || picking} loading={busy} onPress={() => { void save(); }} />}>
    <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}><UserAvatar name={form.fullName} uri={form.avatar} /><View style={{ flex: 1, gap: 4 }}><AnimatedPressable disabled={busy || picking} accessibilityLabel="Đổi ảnh đại diện" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => { void pickAvatar(); }}>{picking ? <ActivityIndicator color={c.primary} /> : <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>Đổi ảnh đại diện</Text>}</AnimatedPressable>{!!form.avatar && <AnimatedPressable disabled={busy || picking} onPress={() => update('avatar', '')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={p.hint}>Xóa ảnh</Text></AnimatedPressable>}</View></View>
    <Text style={p.hint}>Chọn JPG, PNG hoặc WebP tối đa 2,5 MB. Ảnh được cập nhật khi bạn lưu thay đổi.</Text><InlineError message={errors.avatar} /><InlineError message={message} />{success && <Text accessibilityRole="status" style={p.message}>Đã lưu thay đổi hồ sơ.</Text>}
    <AuthInput label="Họ và tên" icon="user" value={form.fullName} onChangeText={value => update('fullName', value)} error={errors.fullName} maxLength={100} editable={!busy} autoComplete="name" />
    <AuthInput label="Email" icon="mail" value={user.email} editable={false} hint="Email đăng nhập không thể thay đổi tại đây." />
    <AuthInput label="Số điện thoại" icon="phone" value={form.phoneNumber} onChangeText={value => update('phoneNumber', value)} error={errors.phoneNumber} maxLength={20} editable={!busy} keyboardType="phone-pad" autoComplete="tel" hint={user.googleAccount?'Thêm hoặc đổi số điện thoại cần xác minh OTP qua SMS.':undefined} />
    <AuthInput label="Trường học / nơi làm việc" optionalLabel="Không bắt buộc" icon="briefcase" value={form.organization} onChangeText={value => update('organization', value)} error={errors.organization} maxLength={255} editable={!busy} />
    <AuthInput label="Khu vực ưu tiên" optionalLabel="Không bắt buộc" icon="map-pin" value={form.preferredArea} onChangeText={value => update('preferredArea', value)} error={errors.preferredArea} maxLength={255} editable={!busy} />
    {discard && <ConfirmDialog title="Bỏ thay đổi chưa lưu?" description="Bạn có thay đổi chưa được lưu. Quay lại sẽ bỏ các thay đổi này." confirmLabel="Bỏ thay đổi" onCancel={() => setDiscard(null)} onConfirm={() => { const action = discard; setDiscard(null); action(); }} />}
    {phoneChallenge&&<PhoneOtpDialog challenge={phoneChallenge} onCancel={()=>setPhoneChallenge(null)} onVerified={async()=>{await updateProfile(phoneChallenge.payload);setForm(phoneChallenge.normalized);setBaseline(phoneChallenge.normalized);setSuccess(true);setPhoneChallenge(null);}}/>}
  </ProfilePage>;
}


