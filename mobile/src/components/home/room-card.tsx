import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { authColors, authRadius, authSpacing } from '@/components/auth/tokens';
import { MotionTokens, triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { AccommodationSummary, AMENITY_LABELS, formatPriceVND, resolveImageUrl } from '@/services/accommodations';
import { AnimatedPressable } from './animated-pressable';

interface RoomCardProps {
  item: AccommodationSummary;
  variant?: 'featured' | 'list' | 'compact';
  isFavorite?: boolean;
  favoritePending?: boolean;
  favoriteEnabled?: boolean;
  favoritePlacement?: 'image' | 'trailing';
  onToggleFavorite?: (roomTypeId: number) => void;
  onPressCard?: (item: AccommodationSummary) => void;
}

export function RoomCard({
  item,
  variant = 'featured',
  isFavorite = false,
  favoritePending = false,
  favoriteEnabled = true,
  favoritePlacement = 'image',
  onToggleFavorite,
  onPressCard,
}: RoomCardProps) {
  const [imageError, setImageError] = useState(false);
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotionPreference();
  const heartScale = useSharedValue(1);

  const resolvedImage = resolveImageUrl(item.imageUrl);

  const handleFavoritePress = () => {
    if (favoritePending || !favoriteEnabled) return;
    void triggerHaptic('selection');
    if (!reduceMotion) {
      heartScale.value = withSequence(
        withSpring(1.15, MotionTokens.spring.pop),
        withSpring(1, MotionTokens.spring.press)
      );
    }
    onToggleFavorite?.(item.roomTypeId);
  };

  const heartAnimatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [{ scale: heartScale.value }],
    };
  });

  const availableRooms = item.availableRooms ?? 0;
  const isVacant = availableRooms > 0;
  const areaText = item.areaSqm ? `${item.areaSqm} m²` : null;
  const firstAmenities = Array.isArray(item.amenities)
    ? item.amenities.slice(0, 2)
    : [];

  const imageSource =
    resolvedImage && !imageError
      ? { uri: resolvedImage }
      : require('@/assets/images/room-fallback.jpg');

  if (variant === 'compact') {
    const shortAddress = item.address?.split(',').map(part => part.trim()).filter(Boolean).slice(-2).join(', ');
    const expandedText = fontScale > 1.3;
    return (
      <AnimatedPressable
        accessibilityRole="link"
        accessibilityLabel={`Phòng ${item.roomTypeName}, ${item.propertyName}, ${formatPriceVND(item.price)}`}
        onPress={() => onPressCard?.(item)} scaleTo={0.98} style={styles.compactCard}
      >
        <View style={[styles.compactImageContainer, expandedText && { width: 88 }]}>
          <Image source={imageSource} style={styles.compactImage} contentFit="cover"
            recyclingKey={String(item.roomTypeId)} transition={reduceMotion ? 0 : 180}
            onError={() => setImageError(true)} />
          {favoriteEnabled && favoritePlacement === 'image' && <AnimatedPressable accessibilityLabel={isFavorite ? 'Bỏ lưu phòng' : 'Lưu phòng yêu thích'}
            disabled={favoritePending || !favoriteEnabled} accessibilityState={{ selected: isFavorite, disabled: favoritePending || !favoriteEnabled, busy: favoritePending }} haptic="none" style={styles.compactHeart}
            onPress={event => { event.stopPropagation(); handleFavoritePress(); }}>
            {favoritePending ? <ActivityIndicator color={authColors.primary} size="small" /> : <Animated.View style={heartAnimatedStyle}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? authColors.primary : authColors.forestInk} /></Animated.View>}
          </AnimatedPressable>}
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, favoritePlacement === 'trailing' && { paddingRight: 34, minHeight: 44 }]} numberOfLines={expandedText ? undefined : 2}>{item.roomTypeName}</Text>
          <Text style={styles.compactSecondary} numberOfLines={expandedText ? undefined : 1}>{item.propertyName}</Text>
          {!!shortAddress && <Text style={styles.compactSecondary} numberOfLines={expandedText ? undefined : 1}>{shortAddress}</Text>}
          <View style={styles.compactPriceRow}>
            <Text style={styles.compactPrice}>{formatPriceVND(item.price).replace('/tháng', '')}</Text>
            {item.price > 0 && <Text style={styles.compactSecondary}>/tháng</Text>}
          </View>
          <View style={styles.compactFacts}>
            {!!areaText && <Text style={styles.compactSecondary}>{areaText}</Text>}
            <Text style={[styles.compactAvailability, !isVacant && { color: authColors.textSecondary }]}>{isVacant ? `${availableRooms} phòng trống` : 'Hết phòng'}</Text>
          </View>
        </View>
        {favoriteEnabled && favoritePlacement === 'trailing' && <AnimatedPressable accessibilityLabel={isFavorite ? 'Bỏ lưu phòng' : 'Lưu phòng yêu thích'} disabled={favoritePending || !favoriteEnabled} accessibilityState={{ selected: isFavorite, busy: favoritePending }} haptic="none" style={[styles.compactHeart, { top: 8, right: 8, bottom: undefined }]} onPress={event => { event.stopPropagation(); handleFavoritePress(); }}>
          {favoritePending ? <ActivityIndicator color={authColors.primary} size="small" /> : <Animated.View style={heartAnimatedStyle}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={21} color={authColors.primary} /></Animated.View>}
        </AnimatedPressable>}
      </AnimatedPressable>
    );
  }

  // List Variant: Full-width editorial discovery card (Airbnb / Booking style)
  if (variant === 'list') {
    return (
      <AnimatedPressable
        accessibilityRole="link"
        scaleTo={0.98}
        onPress={() => onPressCard?.(item)}
        style={styles.editorialCard}
        accessibilityLabel={`Phòng ${item.propertyName}, ${formatPriceVND(item.price)}`}
      >
        {/* Large 16:10 Photo */}
        <View style={styles.editorialImageWrapper}>
          <Image
            source={imageSource}
            style={styles.editorialImage}
            contentFit="cover"
            transition={250}
            onError={() => setImageError(true)}
          />

          {/* Floating White Contrast Heart Button */}
          <AnimatedPressable
            onPress={event => { event.stopPropagation(); handleFavoritePress(); }}
            haptic="none"
            disabled={favoritePending || !favoriteEnabled}
            accessibilityState={{ busy: favoritePending, selected: isFavorite }}
            style={[styles.floatingHeartBtn, !favoriteEnabled && { display: 'none' }]}
            accessibilityLabel={isFavorite ? 'Bỏ lưu phòng' : 'Lưu phòng yêu thích'}
          >
            <Animated.View style={heartAnimatedStyle}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={17}
                color={isFavorite ? authColors.primary : authColors.forestInk}
              />
            </Animated.View>
          </AnimatedPressable>

          {/* Vacant Badge (Only when verified vacant) */}
          {isVacant && (
            <View style={styles.vacantPill}>
              <View style={styles.vacantDot} />
              <Text style={styles.vacantPillText}>Còn {availableRooms} phòng</Text>
            </View>
          )}
        </View>

        {/* Card Content (Clean white background, no heavy borders) */}
        <View style={styles.editorialContent}>
          <View style={styles.editorialRowTop}>
            <Text numberOfLines={2} style={styles.editorialTitle}>
              {item.propertyName}
            </Text>
            <Text numberOfLines={2} style={styles.metaText}>{item.roomTypeName}</Text>
          </View>

          <View style={styles.addressRow}>
            <Feather name="map-pin" size={13} color={authColors.textSecondary} />
            <Text numberOfLines={1} style={styles.addressText}>
              {item.address || 'Hòa Lạc, Hà Nội'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>{formatPriceVND(item.price)}</Text>
            {areaText && <Text style={styles.metaDivider}> · </Text>}
            {areaText && <Text style={styles.metaText}>{areaText}</Text>}
            {firstAmenities.length > 0 && (
              <>
                <Text style={styles.metaDivider}> · </Text>
                <Text style={styles.metaText}>{firstAmenities.map(key => AMENITY_LABELS[key] || key).join(', ')}</Text>
              </>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // Featured Variant: Horizontal Carousel Card
  return (
    <AnimatedPressable
      accessibilityRole="link"
      scaleTo={0.98}
      onPress={() => onPressCard?.(item)}
      style={styles.featuredCard}
      accessibilityLabel={`Phòng nổi bật ${item.propertyName}, ${formatPriceVND(item.price)}`}
    >
      {/* 4:3 Image Container */}
      <View style={styles.featuredImageWrapper}>
        <Image
          source={imageSource}
          style={styles.featuredImage}
          contentFit="cover"
          transition={250}
          onError={() => setImageError(true)}
        />

        {/* Top Floating White Heart Button */}
        <AnimatedPressable
          onPress={event => { event.stopPropagation(); handleFavoritePress(); }}
          haptic="none"
          disabled={favoritePending || !favoriteEnabled}
          accessibilityState={{ busy: favoritePending, selected: isFavorite }}
          style={[styles.floatingHeartBtn, !favoriteEnabled && { display: 'none' }]}
          accessibilityLabel={isFavorite ? 'Bỏ lưu phòng' : 'Lưu phòng yêu thích'}
        >
          <Animated.View style={heartAnimatedStyle}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={16}
              color={isFavorite ? authColors.primary : authColors.forestInk}
            />
          </Animated.View>
        </AnimatedPressable>

        {/* Vacant Badge */}
        {isVacant && (
          <View style={styles.vacantPill}>
            <View style={styles.vacantDot} />
            <Text style={styles.vacantPillText}>Còn {availableRooms} phòng</Text>
          </View>
        )}
      </View>

      {/* Card Body */}
      <View style={styles.featuredBody}>
        <Text numberOfLines={1} style={styles.featuredTitle}>
          {item.propertyName}
        </Text>
        <Text numberOfLines={1} style={styles.metaText}>{item.roomTypeName}</Text>

        <View style={styles.addressRow}>
          <Feather name="map-pin" size={12} color={authColors.textSecondary} />
          <Text numberOfLines={1} style={styles.addressText}>
            {item.address || 'Hòa Lạc, Hà Nội'}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>{formatPriceVND(item.price)}</Text>
          {areaText && <Text style={styles.metaDivider}> · </Text>}
          {areaText && <Text style={styles.metaText}>{areaText}</Text>}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  compactCard: { flexDirection: 'row', padding: 10, gap: 12, marginHorizontal: 20, marginBottom: 12, backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.border, borderRadius: 20 },
  compactImageContainer: { width: 112, minHeight: 144, alignSelf: 'stretch', borderRadius: 14, overflow: 'hidden', backgroundColor: authColors.softMint },
  compactImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  compactHeart: { position: 'absolute', bottom: 6, right: 6, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.95)' },
  compactContent: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4, paddingVertical: 2 },
  compactTitle: { color: authColors.forestInk, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  compactSecondary: { color: authColors.textSecondary, fontSize: 12, lineHeight: 18 },
  compactPriceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 3, marginTop: 4 },
  compactPrice: { color: authColors.primary, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  compactFacts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 2, marginTop: 2 },
  compactAvailability: { fontSize: 12, lineHeight: 18, color: authColors.primary, fontWeight: '500' },
  // Featured Variant (Horizontal Carousel)
  featuredCard: {
    width: 275,
    backgroundColor: authColors.surface,
    borderRadius: authRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: authColors.border,
  },
  featuredImageWrapper: {
    width: '100%',
    height: 170,
    position: 'relative',
    backgroundColor: authColors.softMint,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredBody: {
    padding: 14,
    gap: 4,
  },
  featuredTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: authColors.forestInk,
  },

  // Editorial List Variant (Full-width clean property discovery)
  editorialCard: {
    backgroundColor: authColors.surface,
    borderRadius: authRadius.xxl,
    marginHorizontal: authSpacing.xl,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: authColors.border,
  },
  editorialImageWrapper: {
    width: '100%',
    height: 185,
    position: 'relative',
    backgroundColor: authColors.softMint,
  },
  editorialImage: {
    width: '100%',
    height: '100%',
  },
  editorialContent: {
    padding: 16,
    gap: 5,
  },
  editorialRowTop: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  editorialTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: authColors.forestInk,
    flex: 1,
  },

  // Common Elements
  floatingHeartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vacantPill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(20, 45, 41, 0.82)',
  },
  vacantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  vacantPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    color: authColors.textSecondary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: 2,
  },
  priceAmount: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: authColors.primary,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: authColors.textMuted,
  },
  metaDivider: {
    fontSize: 13,
    color: authColors.textMuted,
  },
  metaText: {
    fontSize: 13,
    color: authColors.textSecondary,
    fontWeight: '500',
  },
});




