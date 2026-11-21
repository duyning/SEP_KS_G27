import { useHostMode } from '@/context/host-mode-context';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authColors as c } from '@/components/auth/tokens';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { LOADING_MESSAGES, useLoading } from '@/components/loading';
import { ConfirmDialog, ProfileMenuRow, ProfilePage, ProfileSkeleton, UserAvatar, profileStyles as p, roleLabels } from '@/components/profile/profile-ui';
import { useAuth } from '@/context/auth-context';
import { tokenStore } from '@/services/auth';

export default function ProfileScreen() {
  const { isHostMode, setDiscovery } = useHostMode();
  const { user, loading, sessionError, retry, signOut } = useAuth();
  const { startLoading, stopLoading, withLoading } = useLoading();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const switchWorkspace = (toDiscovery: boolean) => {
    const taskId = startLoading({
      message: LOADING_MESSAGES.switchWorkspace,
      mode: 'overlay',
      immediate: true,
    });
    setDiscovery(toDiscovery);
    router.replace('/home');
    setTimeout(() => {
      stopLoading(taskId);
    }, 120);
  };

  const logout = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      await withLoading(
        async () => {
          await signOut();
        },
        { message: LOADING_MESSAGES.signingOut, mode: 'overlay' }
      );
      setConfirm(false);
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đăng xuất. Vui lòng thử lại.';
      setConfirm(false); setError(message);
      // The existing auth flow clears local state even if remote logout fails.
      // Preserve its error, and let the guest overview replace private identity.
      try { if (!await tokenStore.get()) setError(`Phiên trên thiết bị đã đóng. ${message}`); } catch { /* Existing auth error is shown. */ }
    } finally { lock.current = false; setBusy(false); }
  };
  if(user?.role==='ROOM_HOST'&&isHostMode)return <ProfilePage title="Cá nhân" rootTab>
    <InlineError message={error}/>
    <View style={s.hostIdentity}><UserAvatar name={user.fullName} uri={user.avatar} size={64}/><View style={{flex:1,minWidth:0,gap:4}}><Text style={[s.name,{color:c.surface}]}>{user.fullName}</Text><Text style={[s.email,{color:c.softMint}]}>{user.email}</Text><Text style={[s.role,{color:c.softMint}]}>{roleLabels[user.role]}</Text></View></View>
    <View style={p.group}><ProfileMenuRow icon="user" title="Thông tin cá nhân" onPress={()=>router.push('/account/edit')}/><View style={p.divider}/><ProfileMenuRow icon="lock" title="Đổi mật khẩu" onPress={()=>router.push('/account/security')}/></View>
    <View style={p.group}><ProfileMenuRow icon="search" title="Chuyển sang tìm phòng" subtitle="Khám phá và xem phòng đã lưu" onPress={()=>{switchWorkspace(true);}}/></View>
    <View style={[p.group,{marginTop:4}]}><ProfileMenuRow icon="log-out" title="Đăng xuất" danger disabled={loading||busy} onPress={()=>setConfirm(true)}/></View>
    {confirm&&<ConfirmDialog title="Đăng xuất tài khoản?" description="Phiên làm việc và dữ liệu riêng trên thiết bị sẽ được đóng." confirmLabel="Đăng xuất" cancelLabel="Ở lại" busy={busy} onCancel={()=>setConfirm(false)} onConfirm={()=>{void logout();}}/>}
  </ProfilePage>;
  return <ProfilePage title="Tài khoản" rootTab>
    <InlineError message={error || (!user ? sessionError : null)} />
    {loading && !user ? <ProfileSkeleton /> : !user && sessionError ? <View style={{ gap: 16 }}><Text style={p.hint}>Chưa thể xác nhận phiên đăng nhập. Thử tải lại khi có kết nối.</Text><PrimaryButton title="Thử lại" onPress={() => { void retry(); }} /></View> : !user ? <View style={s.guest}>
      <UserAvatar size={76} /><Text style={s.guestTitle}>Chào mừng đến với HL_RCS</Text><Text style={s.guestDescription}>Đăng nhập để lưu phòng yêu thích và quản lý lịch hẹn của bạn.</Text><PrimaryButton title="Đăng nhập" onPress={() => router.push('/login')} /><AnimatedPressable style={s.register} onPress={() => router.push('/register')}><Text style={s.edit}>Tạo tài khoản</Text></AnimatedPressable>
    </View> : <View style={{ gap: 24 }}>
      <AnimatedPressable accessibilityLabel="Chỉnh sửa hồ sơ" scaleTo={0.98} onPress={() => router.push('/account/edit')} style={s.identity}>
        <UserAvatar name={user.fullName} uri={user.avatar} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={s.name}>{user.fullName}</Text><Text style={s.email}>{user.email}</Text><Text style={s.role}>{roleLabels[user.role]}</Text><Text style={s.edit}>Chỉnh sửa hồ sơ</Text></View>
      </AnimatedPressable>
      <Text style={p.sectionLabel}>QUẢN LÝ TÀI KHOẢN</Text>{user.role === 'ROOM_HOST' && <ProfileMenuRow icon="home" title="Quản lý nhà trọ" onPress={() => { switchWorkspace(false); }} />}
      <View style={p.group}>
        {['USER', 'ROOM_HOST'].includes(user.role) && <><ProfileMenuRow icon="heart" title="Phòng đã lưu" subtitle="Những nơi ở bạn đang quan tâm" onPress={() => router.push('/favorites')} /><View style={p.divider} /></>}
        <ProfileMenuRow icon="user" title="Thông tin cá nhân" subtitle="Tên, liên hệ và khu vực ưu tiên" onPress={() => router.push('/account/edit')} />
        <View style={p.divider} />
        <ProfileMenuRow icon="lock" title="Bảo mật & mật khẩu" subtitle="Cập nhật mật khẩu đăng nhập" onPress={() => router.push('/account/security')} />
      </View>
      <View style={p.group}><ProfileMenuRow icon="log-out" title="Đăng xuất" danger disabled={loading || busy} onPress={() => setConfirm(true)} /></View>
    </View>}
    {user?.role==='ROOM_HOST' && <ProfileMenuRow icon="search" title={isHostMode?'Chuyển sang tìm phòng':'Về quản lý nhà trọ'} onPress={()=>{switchWorkspace(isHostMode);}}/>}
    {!!Constants.expoConfig?.version && <Text style={s.version}>HL_RCS · Phiên bản {Constants.expoConfig.version}</Text>}
    {confirm && <ConfirmDialog title="Đăng xuất tài khoản?" description="Bạn có chắc chắn muốn đăng xuất khỏi HL_RCS?" confirmLabel="Đăng xuất" busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => { void logout(); }} />}
  </ProfilePage>;
}
const s = StyleSheet.create({
  hostIdentity:{backgroundColor:c.primary,borderRadius:18,padding:20,flexDirection:'row',alignItems:'center',gap:16},
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }, name: { fontSize: 22, lineHeight: 29, fontWeight: '700', color: c.forestInk }, email: { fontSize: 13, lineHeight: 20, color: c.textSecondary }, role: { fontSize: 12, lineHeight: 18, color: c.textSecondary }, edit: { color: c.primary, fontSize: 14, fontWeight: '600', lineHeight: 22 }, version: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 8 }, guest: { gap: 20, paddingVertical: 16 }, guestTitle: { fontSize: 25, lineHeight: 33, fontWeight: '700', color: c.forestInk }, guestDescription: { fontSize: 15, lineHeight: 24, color: c.textSecondary }, register: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
});



