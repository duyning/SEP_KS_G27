import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { HomeErrorState, HomeSkeleton } from '@/components/home/home-feedback-states';
import { RoomCard } from '@/components/home/room-card';
import { PropertyImageGallery } from '@/components/listings/property-image-gallery';
import { ViewingSheet } from '@/components/listings/viewing-sheet';
import { useAuth } from '@/context/auth-context';
import { useListingFavorites } from '@/hooks/use-listing-favorites';
import { AccommodationDetail, AMENITY_LABELS, fetchAccommodationDetail, formatPriceVND } from '@/services/accommodations';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={{ gap: 6 }}><Text style={styles.body} numberOfLines={expanded ? undefined : 4}>{text}</Text>{text.length > 180 && <AnimatedPressable onPress={() => setExpanded(value => !value)}><Text style={styles.link}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text></AnimatedPressable>}</View>;
}
function Amenities({ values }: { values: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const unique = [...new Set(values)];
  return <View style={{ gap: 12 }}><View style={styles.amenities}>{(expanded ? unique : unique.slice(0, 6)).map(value => <View key={value} style={styles.amenity}><Feather name="check" size={16} color={c.primary} /><Text style={styles.amenityText}>{AMENITY_LABELS[value] || value}</Text></View>)}</View>{unique.length > 6 && <AnimatedPressable onPress={() => setExpanded(value => !value)}><Text style={styles.link}>{expanded ? 'Thu gọn' : `Xem tất cả ${unique.length} tiện ích`}</Text></AnimatedPressable>}</View>;
}
export default function RoomDetailScreen() {
  const params = useLocalSearchParams<{ propertyId: string; roomTypeId: string }>();
  const propertyId = Number(params.propertyId);
  const roomTypeId = Number(params.roomTypeId);
  return <RoomDetailContent key={`${propertyId}:${roomTypeId}`} propertyId={propertyId} roomTypeId={roomTypeId} />;
}
function RoomDetailContent({ propertyId, roomTypeId }: { propertyId: number; roomTypeId: number }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [detail, setDetail] = useState<AccommodationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [booking, setBooking] = useState(false);
  const allIds = [roomTypeId, ...(detail?.roomTypes || []).map(item => item.roomTypeId)];
  const { favorites, pendingFavorites, canFavorite, toggle } = useListingFavorites(allIds);
  useEffect(() => {
    const controller = new AbortController();
    void fetchAccommodationDetail(propertyId, roomTypeId, controller.signal).then(value => {
      if (!controller.signal.aborted) setDetail(value);
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể tải phòng.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [propertyId, roomTypeId, revision]);
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };
  const openUrl = async (url: string) => {
    try { await Linking.openURL(url); } catch { Alert.alert('Không thể mở liên kết', 'Thiết bị chưa hỗ trợ ứng dụng này.'); }
  };
  const startBooking = () => {
    if (!user) { router.push('/login'); return; }
    if (!['USER', 'ROOM_HOST'].includes(user.role)) { Alert.alert('Thông báo', 'Đặt lịch xem phòng dành cho tài khoản người thuê và chủ trọ.'); return; }
    setBooking(true);
  };
  const share = async () => {
    if (!detail) return;
    try { await Share.share({ message: `${detail.summary.roomTypeName} · ${detail.summary.propertyName}\n${detail.summary.address || ''}\n${formatPriceVND(detail.summary.price)}` }); } catch { Alert.alert('Chưa thể chia sẻ', 'Vui lòng thử lại.'); }
  };
  const summary = detail?.summary;
  const otherTypes = (detail?.roomTypes || []).filter(item => item.roomTypeId !== roomTypeId);
  const fees: [string, number | undefined, string][] = detail ? [
    ['Đặt cọc', detail.deposit, ''],
    ['Điện', detail.electricityPrice, ' / kWh'], ['Nước', detail.waterPrice, ' / m³'],
    ['Internet', detail.internetPrice, ' / phòng / tháng'], ['Dịch vụ', detail.servicePrice, ' / tháng'],
  ] : [];
  const roomAmenities = [...new Set(detail?.amenities || [])];
  const commonAmenities = [...new Set(detail?.propertyAmenities || [])].filter(value => !roomAmenities.includes(value));
  const normalizeDescription = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';
  const propertyDescription = normalizeDescription(detail?.propertyDescription) !== normalizeDescription(detail?.description) ? detail?.propertyDescription : undefined;
  const shortAddress = summary?.address?.split(',').map(part => part.trim()).filter(Boolean).slice(-2).join(', ');
  return <View style={styles.screen}>
    {loading ? <SafeAreaView style={{ flex: 1 }}><AnimatedPressable style={styles.back} onPress={back} accessibilityLabel="Quay lại"><Feather name="arrow-left" size={22} color={c.forestInk} /></AnimatedPressable><HomeSkeleton /></SafeAreaView> : error || !detail || !summary ? <SafeAreaView style={{ flex: 1 }}><AnimatedPressable style={styles.back} onPress={back} accessibilityLabel="Quay lại"><Feather name="arrow-left" size={22} color={c.forestInk} /></AnimatedPressable><HomeErrorState errorMessage={error || 'Không tìm thấy phòng.'} onRetry={() => { setLoading(true); setError(null); setRevision(value => value + 1); }} /></SafeAreaView> : <>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <PropertyImageGallery photos={detail.gallery || []} />
          <View style={[styles.overlay, { top: insets.top + 8 }]} pointerEvents="box-none">
            <AnimatedPressable style={styles.circle} onPress={back} accessibilityLabel="Quay lại"><Feather name="arrow-left" size={22} color={c.forestInk} /></AnimatedPressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable style={styles.circle} onPress={share} accessibilityLabel="Chia sẻ phòng"><Feather name="share-2" size={20} color={c.forestInk} /></AnimatedPressable>
              <AnimatedPressable style={[styles.circle, !canFavorite && { display: 'none' }]} disabled={Boolean(pendingFavorites[roomTypeId]) || !canFavorite} onPress={() => toggle(roomTypeId)} accessibilityLabel={favorites[roomTypeId] ? 'Bỏ lưu phòng' : 'Lưu phòng'} accessibilityState={{ selected: Boolean(favorites[roomTypeId]), busy: Boolean(pendingFavorites[roomTypeId]) }}>{pendingFavorites[roomTypeId] ? <ActivityIndicator color={c.primary} /> : <Ionicons name={favorites[roomTypeId] ? "heart" : "heart-outline"} size={21} color={favorites[roomTypeId] ? c.primary : c.forestInk} />}</AnimatedPressable>
            </View>
          </View>
        </View>
        <View style={[styles.overview, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
          <Text style={styles.eyebrow}>LOẠI PHÒNG · {summary.propertyName}</Text>
          <Text style={styles.title}>{summary.roomTypeName}</Text>
          {!!summary.address && <View style={styles.address}><Feather name="map-pin" size={16} color={c.primary} /><Text style={styles.subtitle}>{shortAddress}</Text></View>}
          <Text style={styles.price}>{formatPriceVND(summary.price)}</Text>
          <View style={styles.quickInfo}>
            {summary.areaSqm != null && <View style={styles.fact}><Feather name="maximize" size={18} color={c.primary} /><Text style={styles.factText}>{summary.areaSqm} m²</Text></View>}
            {detail.capacity != null && <View style={styles.fact}><Feather name="users" size={18} color={c.primary} /><Text style={styles.factText}>Tối đa {detail.capacity} người</Text></View>}
            <View style={styles.fact}><Feather name="home" size={18} color={c.primary} /><Text style={styles.factText}>{summary.availableRooms > 0 ? `Còn ${summary.availableRooms} phòng` : 'Hiện hết phòng'}</Text></View>
          </View>
          {summary.availabilityStale && <Text style={styles.subtitle}>Tình trạng phòng chưa được chủ trọ xác nhận gần đây. Vui lòng hỏi lại trước khi đến.</Text>}
        </View>
        {!!detail.description && <Section title="Giới thiệu loại phòng"><Description key={roomTypeId} text={detail.description} /></Section>}
        {!!propertyDescription && <Section title="Về nhà trọ"><Description key={propertyId} text={propertyDescription} /></Section>}
        {!!roomAmenities.length && <Section title="Tiện ích trong phòng"><Amenities values={roomAmenities} /></Section>}
        {!!commonAmenities.length && <Section title="Tiện ích chung"><Amenities values={commonAmenities} /></Section>}
        {fees.some(([, value]) => value != null && Number.isFinite(value)) && <Section title="Chi phí thuê">{fees.filter(([, value]) => value != null && Number.isFinite(value)).map(([label, value, unit]) => <View style={styles.fee} key={label}><Text style={styles.subtitle}>{label}</Text><Text style={styles.feeValue}>{new Intl.NumberFormat('vi-VN').format(value!)} đ{unit}</Text></View>)}</Section>}
        {!!summary.address && <Section title="Vị trí">{summary.address !== shortAddress && <Text style={styles.body}>{summary.address}</Text>}{!!detail.nearby && <Text style={styles.subtitle}>{detail.nearby}</Text>}{!!detail.mapUrl && /^https:\/\//.test(detail.mapUrl) && <AnimatedPressable style={styles.outline} onPress={() => openUrl(detail.mapUrl!)}><Feather name="map" size={18} color={c.primary} /><Text style={styles.link}>Xem trên bản đồ</Text><Feather name="external-link" size={15} color={c.primary} /></AnimatedPressable>}</Section>}
        {!!detail.rules && <Section title="Nội quy nhà trọ"><Description text={detail.rules} /></Section>}
        {!!detail.publicContact && <Section title="Thông tin chủ trọ"><View style={styles.host}><View style={styles.avatar}><Feather name="user" size={24} color={c.primary} /></View><View style={{ flex: 1 }}><Text style={styles.hostName}>{detail.publicContact.hostName || 'Liên hệ nhà trọ'}</Text><Text style={styles.subtitle}>Thông tin liên hệ được công khai</Text></View></View>{!!detail.publicContact.phone && <AnimatedPressable style={styles.outline} onPress={() => openUrl(`tel:${detail.publicContact!.phone}`)}><Feather name="phone" size={18} color={c.primary} /><Text style={styles.link}>{detail.publicContact.phone}</Text></AnimatedPressable>}{!!detail.publicContact.zaloPhone && <AnimatedPressable style={styles.outline} onPress={() => openUrl(`https://zalo.me/${detail.publicContact!.zaloPhone!.replace(/^\+84/, '0')}`)}><Feather name="message-circle" size={18} color={c.primary} /><Text style={styles.link}>Liên hệ qua Zalo</Text></AnimatedPressable>}</Section>}
        {!!otherTypes.length && <><View style={styles.section}><Text style={styles.sectionTitle}>Loại phòng khác cùng nhà trọ</Text><Text style={styles.subtitle}>Giá và tình trạng riêng cho từng loại phòng.</Text></View>{otherTypes.map(item => <RoomCard key={item.roomTypeId} item={item} variant="compact" isFavorite={Boolean(favorites[item.roomTypeId])} favoritePending={Boolean(pendingFavorites[item.roomTypeId])} favoriteEnabled={canFavorite} onToggleFavorite={toggle} onPressCard={room => router.push({ pathname: '/rooms/[roomTypeId]', params: { propertyId: room.propertyId, roomTypeId: room.roomTypeId } })} />)}</>}
      </ScrollView>
      <View style={[styles.bookingBar, { paddingBottom: Math.max(insets.bottom, 12), paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
        <View style={{ flex: 1, minWidth: 120 }}><Text style={styles.caption}>Giá thuê</Text><Text style={styles.bottomPrice}>{formatPriceVND(summary.price)}</Text></View>
        <AnimatedPressable style={styles.primary} onPress={startBooking}><Text style={styles.primaryText}>Đặt lịch xem phòng</Text><Feather name="arrow-up-right" size={18} color="white" /></AnimatedPressable>
      </View>
      {booking && <ViewingSheet propertyId={propertyId} roomTypeId={roomTypeId} onClose={() => setBooking(false)} />}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, overlay: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' }, circle: { width: 44, height: 44, backgroundColor: c.surface, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border }, back: { margin: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  overview: { padding: 20, gap: 12 }, eyebrow: { color: c.primary, fontSize: 12, fontWeight: '700', lineHeight: 18, letterSpacing: 0.7 }, title: { color: c.forestInk, fontSize: 28, fontWeight: '800', lineHeight: 35, letterSpacing: -0.5 }, address: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' }, subtitle: { fontSize: 14, lineHeight: 22, color: c.textSecondary, flexShrink: 1 }, price: { fontSize: 25, color: c.primary, fontWeight: '800', lineHeight: 32 },
  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }, fact: { backgroundColor: c.softMint, padding: 12, flexDirection: 'row', gap: 8, borderRadius: 14, alignItems: 'center' }, factText: { color: c.forestInk, fontSize: 13, fontWeight: '600' },
  section: { marginHorizontal: 20, paddingVertical: 24, borderTopWidth: 1, borderTopColor: c.border, gap: 14 }, sectionTitle: { fontSize: 21, fontWeight: '700', color: c.forestInk, lineHeight: 28 }, body: { color: c.forestInk, fontSize: 15, lineHeight: 25 }, link: { color: c.primary, fontSize: 14, fontWeight: '700', paddingVertical: 8 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, amenity: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%' }, amenityText: { flex: 1, color: c.forestInk, fontSize: 14, lineHeight: 22 }, fee: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingVertical: 5 }, feeValue: { color: c.forestInk, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  outline: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, host: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.softMint, alignItems: 'center', justifyContent: 'center' }, hostName: { fontWeight: '700', fontSize: 16, color: c.forestInk },
  bookingBar: { paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }, caption: { fontSize: 12, color: c.textSecondary, lineHeight: 18 }, bottomPrice: { fontSize: 17, lineHeight: 24, color: c.primary, fontWeight: '700' }, primary: { backgroundColor: c.primary, borderRadius: 16, padding: 16, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, minWidth: 170 }, primaryText: { color: 'white', fontSize: 15, lineHeight: 21, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});







