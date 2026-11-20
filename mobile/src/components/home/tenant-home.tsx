import { useRoomSearch } from '@/context/room-search-context';
import { applyCategory, filterGroupCount } from '@/services/room-search';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useListingFavorites } from '@/hooks/use-listing-favorites';
import { authColors, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { FeaturedRoomsSection } from '@/components/home/featured-section';
import { FilterBottomSheet } from '@/components/home/filter-bottom-sheet';
import { HomeCategories } from '@/components/home/home-categories';
import { HomeEmptyState, HomeErrorState, HomeSkeleton } from '@/components/home/home-feedback-states';
import { HomeHeader } from '@/components/home/home-header';
import { HomeHeroBanner } from '@/components/home/home-hero-banner';
import { HomeSearchBar } from '@/components/home/home-search-bar';
import { HomeWelcomeSection } from '@/components/home/home-welcome';
import { MapDiscoveryBanner } from '@/components/home/map-discovery-banner';
import { RoomCard } from '@/components/home/room-card';
import {
  AccommodationSummary,
  fetchAccommodations,
  SearchFilters,
} from '@/services/accommodations';

export default function HomeScreen() {
  const { user } = useAuth();
  const [accommodations, setAccommodations] = useState<AccommodationSummary[]>([]);
  const { favorites: favoritesMap, pendingFavorites, canFavorite, toggle: handleToggleFavorite } = useListingFavorites(accommodations.map(item => item.roomTypeId));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const { query: searchQuery, setQuery: setSearchQuery, filters, setFilters, submit, reset } = useRoomSearch();
  const selectedCategory = filters.type || 'all';
  const [filterModalVisible, setFilterModalVisible] = useState(false);


  // Fetch accommodations with React 19 safe async pattern
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchData() {
      try {
        const pageData = await fetchAccommodations({ sort: 'newest', size: 15 }, controller.signal);
        if (ignore) return;
        setAccommodations(pageData.items);
        setErrorMessage(null);

      } catch (error) {
        if (!ignore && !controller.signal.aborted) {
          const message =
            error instanceof Error
              ? error.message
              : 'Không thể kết nối đến máy chủ HL_RCS.';
          setErrorMessage(message);
        }
      } finally {
        if (!ignore && !controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void fetchData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [refreshIndex, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleRetry = () => {
    setLoading(true);
    setRefreshIndex(prev => prev + 1);
  };

  const handleCardPress = (item: AccommodationSummary) => {
    router.push({ pathname: '/rooms/[roomTypeId]', params: { roomTypeId: item.roomTypeId, propertyId: item.propertyId } });
  };

  const handleNavigateExplore = () => {
    router.navigate('/explore');
  };

  const handleSeeAll = () => { reset(); router.navigate('/explore'); };

  const handleSelectCategory = (catId: string) => {
    setFilters(previous => applyCategory(previous, catId));
    router.navigate('/explore');
  };

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    router.navigate('/explore');
  };

  const handleResetFilters = () => { reset(); handleRetry(); };

  // Derive featured rooms (first 4 items) and recommended list
  const featuredRooms = useMemo(() => {
    if (!accommodations.length) return [];
    return accommodations.slice(0, 4);
  }, [accommodations]);

  const recommendedRooms = useMemo(() => {
    if (accommodations.length <= 4) {
      return accommodations;
    }
    return accommodations.slice(4);
  }, [accommodations]);

  const activeFilterCount = filterGroupCount(filters);

  // List Header with all primary top sections
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      <HomeHeader
        onLocationPress={() => setFilterModalVisible(true)}
        onNotificationPress={() =>
          Alert.alert('Thông báo', 'Bạn có 2 thông báo mới về phòng trọ tại Hòa Lạc.')
        }
      />

      <HomeWelcomeSection />

      <HomeSearchBar
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onSubmitSearch={() => { submit(); router.navigate('/explore'); }}
        onOpenFilter={() => setFilterModalVisible(true)}
        activeFilterCount={activeFilterCount}
      />

      <HomeHeroBanner onExplorePress={handleNavigateExplore} />

      <HomeCategories
        selectedCategory={selectedCategory} availableOnly={Boolean(filters.availableOnly)}
        onSelectCategory={handleSelectCategory}
      />

      {/* Featured Rooms Section */}
      <FeaturedRoomsSection
        items={featuredRooms}
        favoritesMap={favoritesMap} pendingFavorites={pendingFavorites} favoriteEnabled={canFavorite}
        onToggleFavorite={handleToggleFavorite}
        onPressCard={handleCardPress}
        onSeeAllPress={handleSeeAll}
      />

      {/* Map Discovery Banner */}
      <MapDiscoveryBanner onOpenMap={handleNavigateExplore} />

      {/* Recommended Section Header */}
      <View style={styles.recommendedTitleRow}>
        <Text style={styles.recommendedTitle}>Phòng trọ dành cho bạn</Text>
        <AnimatedPressable onPress={handleSeeAll}>
          <Text style={styles.recommendedSeeAll}>Tất cả</Text>
        </AnimatedPressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {loading && !refreshing ? (
        <View style={styles.fullScreenWrapper}>
          <HomeHeader />
          <HomeWelcomeSection />
          <HomeSkeleton />
        </View>
      ) : errorMessage && !accommodations.length ? (
        <View style={styles.fullScreenWrapper}>
          <HomeHeader />
          <HomeErrorState
            onRetry={handleRetry}
            errorMessage={errorMessage}
          />
        </View>
      ) : (
        <FlatList
          data={recommendedRooms}
          keyExtractor={item => `rec-${item.propertyId}-${item.roomTypeId}`}
          ListHeaderComponent={renderListHeader()}
          renderItem={({ item }) => (
            <RoomCard
              item={item}
              variant="list"
              isFavorite={Boolean(favoritesMap[item.roomTypeId])} favoritePending={Boolean(pendingFavorites[item.roomTypeId])} favoriteEnabled={canFavorite}
              onToggleFavorite={handleToggleFavorite}
              onPressCard={handleCardPress}
            />
          )}
          ListEmptyComponent={
            <HomeEmptyState onReset={handleResetFilters} />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={authColors.primary}
              colors={[authColors.primary]}
            />
          }
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Bottom Sheet Modal */}
      {filterModalVisible && <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  headerContainer: {
    backgroundColor: authColors.background,
  },
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  listContentContainer: {
    paddingBottom: 40,
  },
  recommendedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.md,
    paddingBottom: authSpacing.sm,
  },
  recommendedTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  recommendedSeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: authColors.primary,
  },
});









