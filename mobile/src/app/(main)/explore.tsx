import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { FilterBottomSheet } from '@/components/home/filter-bottom-sheet';
import { HomeSearchBar } from '@/components/home/home-search-bar';
import { RoomCard } from '@/components/home/room-card';
import { CompactRoomSkeleton } from '@/components/listings/compact-room-skeleton';
import { useListingFavorites } from '@/hooks/use-listing-favorites';
import { useListings } from '@/hooks/use-listings';
import { useRoomSearch } from '@/context/room-search-context';
import { AMENITY_LABELS, type SearchFilters } from '@/services/accommodations';
import { defaultFilters, filterGroupCount, LOCATIONS, PRICE_OPTIONS, ROOM_TYPES, SORT_OPTIONS } from '@/services/room-search';

export default function ExploreScreen() {
  const { query, setQuery, keyword, filters, setFilters, submit, searching } = useRoomSearch();
  const [sheet, setSheet] = useState<'filters' | 'sort' | null>(null);
  const data = useListings({ ...filters, q: keyword });
  const { favorites, pendingFavorites, canFavorite, toggle } = useListingFavorites(data.items.map(item => item.roomTypeId));
  const count = filterGroupCount(filters);
  const open = (mode: 'filters' | 'sort') => { Keyboard.dismiss(); setSheet(mode); };
  const applied: { key: keyof SearchFilters; label: string; value?: string }[] = [];
  for (const [key, options] of [['price', PRICE_OPTIONS], ['type', ROOM_TYPES], ['location', LOCATIONS]] as const) {
    if (filters[key] && filters[key] !== 'all') applied.push({ key, label: options.find(option => option.id === filters[key])?.label || '' });
  }
  if (filters.availableOnly) applied.push({ key: 'availableOnly', label: 'Còn phòng' });
  for (const value of filters.amenities?.split(',').filter(Boolean) || []) applied.push({ key: 'amenities', value, label: AMENITY_LABELS[value] });
  const remove = (chip: typeof applied[number]) => setFilters(previous => ({ ...previous, [chip.key]: chip.key === 'amenities' ? previous.amenities?.split(',').filter(x => x !== chip.value).join(',') || undefined : chip.key === 'availableOnly' ? false : 'all' }));
  const header = <View>
    <View style={s.header}><Text style={s.title}>Tìm phòng trọ</Text><Text style={s.subtitle}>Khám phá nơi ở phù hợp tại Hòa Lạc</Text></View>
    <HomeSearchBar query={query} onChangeQuery={setQuery} onSubmitSearch={submit} onOpenFilter={() => open('filters')} activeFilterCount={count} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{ROOM_TYPES.map(option => <AnimatedPressable key={option.id} scaleTo={0.97} accessibilityLabel={`Loại phòng: ${option.label}`} accessibilityState={{ selected: filters.type === option.id }} style={[s.chip, filters.type === option.id && s.active]} onPress={() => setFilters(previous => ({ ...previous, type: option.id }))}><>{filters.type === option.id && <Feather name="check" size={14} color="#FFFFFF" />}<Text style={[s.chipText, filters.type === option.id && { color: '#FFFFFF' }]}>{option.label}</Text></></AnimatedPressable>)}</ScrollView>
    {applied.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{applied.map(chip => <AnimatedPressable key={`${chip.key}:${chip.value || ''}`} scaleTo={0.97} style={[s.chip, s.applied]} accessibilityLabel={`Bỏ lọc ${chip.label}`} onPress={() => remove(chip)}><Text style={s.chipText}>{chip.label}</Text><Feather name="x" size={14} color={c.primary} /></AnimatedPressable>)}</ScrollView>}
    <View style={s.summary}><Text accessibilityLiveRegion="polite" style={s.result}>{searching || data.loading ? 'Đang tìm kiếm…' : data.error ? 'Chưa thể tải kết quả' : `${data.total} loại phòng phù hợp`}</Text><AnimatedPressable style={s.sort} accessibilityLabel="Sắp xếp kết quả" onPress={() => open('sort')}><Feather name="arrow-down" size={15} color={c.primary} /><Text style={s.link}>{SORT_OPTIONS.find(x => x.id === filters.sort)?.label}</Text></AnimatedPressable></View>
    {count > 0 && <AnimatedPressable style={s.reset} accessibilityLabel="Xóa bộ lọc" onPress={() => setFilters({ ...defaultFilters(), sort: filters.sort })}><Text style={s.link}>Xóa bộ lọc</Text></AnimatedPressable>}
    {data.error && data.items.length > 0 && <View style={s.message}><Text style={s.subtitle}>{data.error}</Text><AnimatedPressable onPress={data.retry}><Text style={s.link}>Thử lại</Text></AnimatedPressable></View>}
  </View>;
  return <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
    <FlatList ListHeaderComponent={header} data={data.items} keyExtractor={item => String(item.roomTypeId)}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      renderItem={({ item }) => <RoomCard item={item} variant="compact" isFavorite={Boolean(favorites[item.roomTypeId])} favoritePending={Boolean(pendingFavorites[item.roomTypeId])} favoriteEnabled={canFavorite} onToggleFavorite={toggle} onPressCard={room => router.push({ pathname: '/rooms/[roomTypeId]', params: { roomTypeId: room.roomTypeId, propertyId: room.propertyId } })} />}
      contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }} refreshing={data.refreshing} onRefresh={data.refresh}
      onEndReached={() => { if (!searching && !data.moreError) data.loadMore(); }} onEndReachedThreshold={0.3}
      ListEmptyComponent={searching || data.loading ? <CompactRoomSkeleton /> : data.error ? <View style={s.empty}><Feather name="wifi-off" size={30} color={c.primary} /><Text style={s.emptyTitle}>Không thể tải kết quả tìm kiếm</Text><Text style={s.subtitle}>Vui lòng kiểm tra kết nối và thử lại.</Text><Text style={s.subtitle}>{data.error}</Text><AnimatedPressable style={s.touch} onPress={data.retry}><Text style={s.link}>Thử lại</Text></AnimatedPressable></View> : <View style={s.empty}><Feather name="search" size={30} color={c.primary} /><Text style={s.emptyTitle}>Không tìm thấy phòng phù hợp</Text><Text style={s.subtitle}>Thử thay đổi khoảng giá, khu vực hoặc tiện ích để có thêm lựa chọn.</Text>{count > 0 && <AnimatedPressable style={s.touch} onPress={() => setFilters(defaultFilters())}><Text style={s.link}>Xóa bộ lọc</Text></AnimatedPressable>}{Boolean(query) && <AnimatedPressable style={s.touch} onPress={() => setQuery('')}><Text style={s.link}>Xóa từ khóa</Text></AnimatedPressable>}</View>}
      ListFooterComponent={data.loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={c.primary} /> : data.moreError ? <View style={s.empty}><Text style={s.subtitle}>{data.moreError}</Text><AnimatedPressable style={s.touch} onPress={data.loadMore}><Text style={s.link}>Thử tải thêm</Text></AnimatedPressable></View> : data.hasMore === false && data.items.length > 0 && !data.loading ? <Text style={s.end}>Bạn đã xem hết kết quả</Text> : undefined} />
    {sheet && <FilterBottomSheet key={sheet} visible mode={sheet} filters={filters} onClose={() => setSheet(null)} onApplyFilters={setFilters} />}
  </SafeAreaView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: c.background }, header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 5 }, title: { fontSize: 28, lineHeight: 35, fontWeight: '700', color: c.forestInk }, subtitle: { fontSize: 13, lineHeight: 21, color: c.textSecondary }, chips: { paddingHorizontal: 20, paddingTop: 12, gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, active: { backgroundColor: c.primary, borderColor: c.primary }, applied: { backgroundColor: c.softMint }, chipText: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: c.primary }, summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingHorizontal: 20, paddingTop: 12 }, result: { fontSize: 13, lineHeight: 21, color: c.forestInk, fontWeight: '600' }, sort: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }, link: { fontSize: 13, lineHeight: 21, color: c.primary, fontWeight: '600' }, reset: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' }, touch: { minHeight: 44, justifyContent: 'center' }, message: { padding: 20, gap: 8 }, empty: { padding: 28, gap: 12, alignItems: 'center' }, emptyTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: c.forestInk, textAlign: 'center' }, end: { padding: 20, textAlign: 'center', color: c.textSecondary, fontSize: 12 }, });



