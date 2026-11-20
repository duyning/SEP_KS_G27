import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useAuth } from '@/context/auth-context';
import { useFavorites } from '@/context/favorites-context';
import { authColors as c } from '@/components/auth/tokens';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { RoomCard } from '@/components/home/room-card';
import { CompactRoomSkeleton } from '@/components/listings/compact-room-skeleton';
import { ProfileHeader } from '@/components/profile/profile-ui';

export default function FavoritesScreen() {
  const { user, loading: authLoading, sessionError } = useAuth();
  const data = useFavorites();
  const allowed = Boolean(user && ['USER', 'ROOM_HOST'].includes(user.role));
  useFocusEffect(useCallback(() => { if (allowed) void data.store.refresh(); }, [allowed, data.store]));
  const discover = () => { router.dismissAll(); router.navigate(user?.role === 'ROOM_HOST' ? '/host/discovery' : '/explore'); };
  const remove = (id: number) => { void data.store.toggle(id).catch(() => undefined); };
  const header = <View style={s.intro}><Text style={s.subtitle}>Những nơi ở bạn đang quan tâm</Text>{allowed && data.loaded && <Text style={s.count}>{data.total} loại phòng đã lưu</Text>}<InlineError message={data.mutationError} />{data.error && data.items.length > 0 && <View style={{ gap: 8 }}><InlineError message={data.error} /><AnimatedPressable accessibilityLabel="Thử lại" onPress={() => { void data.store.refresh(); }}><Text style={s.link}>Thử lại</Text></AnimatedPressable></View>}</View>;
  return <SafeAreaView style={s.screen}>
    <ProfileHeader title="Phòng đã lưu" />
    {authLoading && !user ? <CompactRoomSkeleton /> : !user ? <ScrollView contentContainerStyle={s.empty}>
      <View style={s.icon}><Feather name="heart" size={30} color={c.primary} /></View><Text style={s.emptyTitle}>Lưu lại nơi ở bạn yêu thích</Text><Text style={s.subtitle}>Đăng nhập để lưu phòng trọ và xem lại danh sách yêu thích của bạn.</Text><InlineError message={sessionError} /><PrimaryButton title="Đăng nhập" onPress={() => router.push('/login')} /><AnimatedPressable style={s.action} onPress={() => router.push('/register')}><Text style={s.link}>Tạo tài khoản</Text></AnimatedPressable>
    </ScrollView> : !allowed ? <ScrollView contentContainerStyle={s.empty}><Text style={s.emptyTitle}>Tài khoản không có quyền truy cập</Text><Text style={s.subtitle}>Phòng đã lưu dành cho người thuê và chủ trọ theo quyền hiện tại của hệ thống.</Text></ScrollView> : <FlatList
      data={data.items} keyExtractor={item => String(item.favoriteId)} ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 24 }} refreshing={data.refreshing} onRefresh={() => { void data.store.refresh(); }}
      onEndReached={() => { if (!data.moreError) void data.store.loadMore(); }} onEndReachedThreshold={0.3}
      renderItem={({ item }) => <Animated.View layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}>
        {item.available && item.accommodation ? <RoomCard item={item.accommodation} variant="compact" favoritePlacement="trailing" isFavorite={Boolean(data.states[item.roomTypeId])} favoritePending={Boolean(data.pending[item.roomTypeId])} onToggleFavorite={remove} onPressCard={room => router.push({ pathname: '/rooms/[roomTypeId]', params: { propertyId: room.propertyId, roomTypeId: room.roomTypeId } })} /> : <View style={s.unavailable}>
          <View style={s.unavailableImage}><Feather name="home" size={28} color={c.textMuted} /></View><View style={{ flex: 1, gap: 6 }}><Text style={s.unavailableTitle}>Loại phòng không còn công khai</Text><Text style={s.subtitle}>Tham chiếu đã lưu #{item.roomTypeId}</Text><Text style={s.small}>Không thể mở chi tiết hoặc đặt lịch. Bạn vẫn có thể bỏ lưu.</Text><AnimatedPressable disabled={Boolean(data.pending[item.roomTypeId])} style={s.action} accessibilityLabel="Bỏ lưu phòng không khả dụng" onPress={() => remove(item.roomTypeId)}>{data.pending[item.roomTypeId] ? <ActivityIndicator color={c.primary} /> : <Text style={s.link}>Bỏ lưu phòng</Text>}</AnimatedPressable></View>
        </View>}
      </Animated.View>}
      ListEmptyComponent={data.loading || !data.loaded && !data.error ? <CompactRoomSkeleton /> : data.error ? <View style={s.empty}><Feather name="wifi-off" size={30} color={c.primary} /><Text style={s.emptyTitle}>Không thể tải phòng yêu thích</Text><Text style={s.subtitle}>Vui lòng kiểm tra kết nối và thử lại.</Text><InlineError message={data.error} /><PrimaryButton title="Thử lại" onPress={() => { void data.store.refresh(); }} /></View> : <View style={s.empty}><View style={s.icon}><Feather name="heart" size={30} color={c.primary} /></View><Text style={s.emptyTitle}>Chưa có phòng yêu thích</Text><Text style={s.subtitle}>Lưu những phòng bạn quan tâm để dễ dàng quay lại xem sau.</Text><PrimaryButton title="Khám phá phòng trọ" onPress={discover} /></View>}
      ListFooterComponent={data.loadingMore ? <ActivityIndicator color={c.primary} style={{ padding: 16 }} /> : data.moreError ? <View style={s.intro}><InlineError message={data.moreError} /><AnimatedPressable style={s.action} onPress={() => { void data.store.loadMore(); }}><Text style={s.link}>Thử tải thêm</Text></AnimatedPressable></View> : undefined}
    />}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, intro: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 }, subtitle: { fontSize: 13, lineHeight: 21, color: c.textSecondary }, count: { color: c.primary, fontSize: 13, lineHeight: 20, fontWeight: '600' }, empty: { padding: 24, gap: 18 }, icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: c.softMint, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700', color: c.forestInk }, action: { minHeight: 44, justifyContent: 'center' }, link: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: c.primary }, unavailable: { flexDirection: 'row', padding: 12, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.surface, gap: 12 }, unavailableImage: { width: 88, borderRadius: 12, backgroundColor: c.softMint, justifyContent: 'center', alignItems: 'center' }, unavailableTitle: { color: c.forestInk, fontSize: 15, lineHeight: 22, fontWeight: '600' }, small: { color: c.textSecondary, fontSize: 12, lineHeight: 18 },
});

