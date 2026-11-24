import { Feather } from '@expo/vector-icons';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authColors, authSpacing } from '@/components/auth/tokens';
import { AccommodationSummary } from '@/services/accommodations';
import { AnimatedPressable } from './animated-pressable';
import { RoomCard } from './room-card';

interface FeaturedSectionProps {
  items: AccommodationSummary[];
  favoritesMap: Record<number, number>;
  pendingFavorites?: Record<number, boolean>;
  favoriteEnabled?: boolean;
  onToggleFavorite: (roomTypeId: number) => void;
  onPressCard: (item: AccommodationSummary) => void;
  onSeeAllPress: () => void;
}

export function FeaturedRoomsSection({
  items,
  favoritesMap,
  pendingFavorites = {},
  favoriteEnabled = true,
  onToggleFavorite,
  onPressCard,
  onSeeAllPress,
}: FeaturedSectionProps) {
  if (!items.length) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(220)}
      style={styles.container}
    >
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.sectionTitle}>Phòng nổi bật</Text>
          <View style={styles.featuredBadge}>
            <Feather name="star" size={10} color="#FFFFFF" />
            <Text style={styles.featuredBadgeText}>HOT</Text>
          </View>
        </View>

        <AnimatedPressable
          onPress={onSeeAllPress}
          style={styles.seeAllBtn}
          accessibilityLabel="Xem tất cả phòng nổi bật"
        >
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <Feather name="chevron-right" size={14} color={authColors.primary} />
        </AnimatedPressable>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        keyExtractor={item => `${item.propertyId}-${item.roomTypeId}`}
        renderItem={({ item }) => (
          <RoomCard
            item={item}
            variant="featured"
            isFavorite={Boolean(favoritesMap[item.roomTypeId])}
            favoritePending={Boolean(pendingFavorites[item.roomTypeId])}
            favoriteEnabled={favoriteEnabled}
            onToggleFavorite={onToggleFavorite}
            onPressCard={onPressCard}
          />
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: authSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.xl,
    marginBottom: authSpacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: authColors.primary,
  },
  carouselContent: {
    paddingHorizontal: authSpacing.xl,
    gap: 14,
    paddingBottom: authSpacing.xs,
  },
});
