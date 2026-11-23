import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { getApiBase, resolveImageUrl } from '@/services/accommodations';

export interface RoomTypeGalleryItem {
  key: string;
  uri: string;
  requiresAuth: boolean;
  fileName?: string;
}

function RoomTypeImageView({
  item,
  imageToken,
  contain = false,
  compact = false,
}: {
  item: RoomTypeGalleryItem;
  imageToken: string | null;
  contain?: boolean;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if ((item.requiresAuth && !imageToken) || failed) {
    return (
      <View style={s.fallback}>
        <Feather name="image" size={compact ? 18 : 28} color={c.textSecondary} />
        {!compact && (
          <Text style={s.fallbackText}>
            {failed ? 'Không thể tải ảnh' : 'Đang xác nhận phiên xem ảnh…'}
          </Text>
        )}
        {!compact && failed && (
          <AnimatedPressable
            style={s.retryBtn}
            accessibilityLabel="Thử tải lại ảnh"
            onPress={() => {
              setAttempt(v => v + 1);
              setFailed(false);
            }}
          >
            <Feather name="refresh-cw" size={13} color={c.primary} />
            <Text style={s.retryText}>Thử lại</Text>
          </AnimatedPressable>
        )}
      </View>
    );
  }

  return (
    <Image
      key={`${item.key}:${attempt}`}
      source={
        item.requiresAuth
          ? { uri: item.uri, headers: { Authorization: `Bearer ${imageToken}` } }
          : { uri: item.uri }
      }
      accessibilityLabel={item.fileName ? `Ảnh loại phòng ${item.fileName}` : 'Ảnh loại phòng'}
      contentFit={contain ? 'contain' : 'cover'}
      style={s.fullImage}
      cachePolicy={item.requiresAuth ? 'none' : 'memory-disk'}
      onError={() => setFailed(true)}
    />
  );
}

export function RoomTypeImageGallery({
  roomTypeId,
  images,
  imageUrl,
  imageToken,
}: {
  roomTypeId: number;
  images?: { imageId: number; fileName?: string }[];
  imageUrl?: string | null;
  imageToken: string | null;
}) {
  const reduced = useReducedMotionPreference();
  const carouselRef = useRef<FlatList<RoomTypeGalleryItem>>(null);
  const targetIndex = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const items = useMemo<RoomTypeGalleryItem[]>(() => {
    if (images && images.length > 0) {
      const base = getApiBase();
      return images.map(img => ({
        key: `img-${img.imageId}`,
        uri: `${base}/api/host/room-types/${roomTypeId}/images/${img.imageId}`,
        requiresAuth: true,
        fileName: img.fileName,
      }));
    }
    const resolved = resolveImageUrl(imageUrl);
    if (resolved) {
      return [
        {
          key: `url-${roomTypeId}`,
          uri: resolved,
          requiresAuth: false,
        },
      ];
    }
    return [];
  }, [images, imageUrl, roomTypeId]);

  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  const goToIndex = (next: number) => {
    if (carouselWidth <= 0) {
      setActiveIndex(next);
      return;
    }
    targetIndex.current = next;
    setActiveIndex(next);
    carouselRef.current?.scrollToOffset({
      offset: next * carouselWidth,
      animated: !reduced,
    });
  };

  if (items.length === 0) {
    return (
      <View style={s.emptyBox} accessibilityLabel="Chưa có hình ảnh cho loại phòng này">
        <Feather name="image" size={30} color={c.textMuted} />
        <Text style={s.emptyText}>Chưa có hình ảnh cho loại phòng này</Text>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      {/* Main Swipeable Carousel */}
      <View
        style={s.heroContainer}
        onLayout={e => {
          const width = Math.round(e.nativeEvent.layout.width);
          if (width > 0 && width !== carouselWidth) {
            setCarouselWidth(width);
          }
        }}
      >
        {carouselWidth > 0 && (
          <FlatList
            ref={carouselRef}
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.key}
            getItemLayout={(_, i) => ({
              length: carouselWidth,
              offset: carouselWidth * i,
              index: i,
            })}
            onScrollBeginDrag={() => {
              targetIndex.current = null;
            }}
            onScroll={e => {
              const offset = e.nativeEvent.contentOffset.x / carouselWidth;
              if (targetIndex.current != null) {
                if (Math.abs(offset - targetIndex.current) < 0.02) {
                  setActiveIndex(targetIndex.current);
                  targetIndex.current = null;
                }
                return;
              }
              const next = Math.min(items.length - 1, Math.max(0, Math.round(offset)));
              if (next !== activeIndex) setActiveIndex(next);
            }}
            scrollEventThrottle={32}
            renderItem={({ item, index }) => (
              <AnimatedPressable
                scaleTo={0.995}
                accessibilityLabel={`Xem toàn màn hình ảnh ${index + 1} trên ${items.length}`}
                style={{ width: carouselWidth, height: 236 }}
                onPress={() => setViewerIndex(index)}
              >
                <RoomTypeImageView item={item} imageToken={imageToken} />
              </AnimatedPressable>
            )}
          />
        )}

        {/* Counter Pill e.g. 1/3 */}
        <View style={s.counterPill} pointerEvents="none">
          <Feather name="image" size={12} color="#FFFFFF" />
          <Text style={s.counterText}>
            {safeIndex + 1}/{items.length}
          </Text>
        </View>

        {/* Fullscreen hint badge */}
        <AnimatedPressable
          scaleTo={0.95}
          accessibilityLabel="Mở xem ảnh toàn màn hình"
          style={s.expandHintBtn}
          onPress={() => setViewerIndex(safeIndex)}
        >
          <Feather name="maximize-2" size={14} color={c.forestInk} />
        </AnimatedPressable>
      </View>

      {/* Thumbnail Strip (when multiple photos exist) */}
      {items.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.thumbStrip}
        >
          {items.map((item, idx) => {
            const active = idx === safeIndex;
            return (
              <AnimatedPressable
                key={item.key}
                scaleTo={0.96}
                accessibilityLabel={`Chuyển đến ảnh ${idx + 1}`}
                accessibilityState={{ selected: active }}
                style={[s.thumbTile, active && s.thumbTileActive]}
                onPress={() => goToIndex(idx)}
              >
                <RoomTypeImageView item={item} imageToken={imageToken} compact />
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

      {/* Fullscreen Modal Viewer */}
      {viewerIndex !== null && (
        <FullscreenPhotoModal
          items={items}
          initialIndex={viewerIndex}
          imageToken={imageToken}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

function FullscreenPhotoModal({
  items,
  initialIndex,
  imageToken,
  onClose,
}: {
  items: RoomTypeGalleryItem[];
  initialIndex: number;
  imageToken: string | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const listRef = useRef<FlatList<RoomTypeGalleryItem>>(null);
  const target = useRef<number | null>(null);
  const safeInit = Math.min(Math.max(initialIndex, 0), items.length - 1);
  const [index, setIndex] = useState(safeInit);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const move = (next: number) => {
    const clamped = Math.min(items.length - 1, Math.max(0, next));
    target.current = clamped;
    setIndex(clamped);
    listRef.current?.scrollToOffset({
      offset: clamped * viewport.width,
      animated: !reduced,
    });
  };

  return (
    <Modal animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <SafeAreaView style={s.modalScreen}>
        <View style={s.modalHeader}>
          <Text accessibilityLiveRegion="polite" style={s.modalTitle}>
            Ảnh {index + 1}/{items.length}
          </Text>
          <AnimatedPressable
            accessibilityLabel="Đóng xem ảnh toàn màn hình"
            style={s.modalCloseBtn}
            onPress={onClose}
          >
            <Feather name="x" size={22} color={c.forestInk} />
          </AnimatedPressable>
        </View>

        <View
          style={{ flex: 1 }}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          {viewport.width > 0 && viewport.height > 0 && (
            <FlatList
              ref={listRef}
              key={`${viewport.width}:${viewport.height}`}
              data={items}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={safeInit}
              keyExtractor={item => item.key}
              getItemLayout={(_, i) => ({
                length: viewport.width,
                offset: viewport.width * i,
                index: i,
              })}
              onScrollBeginDrag={() => {
                target.current = null;
              }}
              onScroll={e => {
                const offset = e.nativeEvent.contentOffset.x / viewport.width;
                if (target.current != null) {
                  if (Math.abs(offset - target.current) < 0.02) {
                    setIndex(target.current);
                    target.current = null;
                  }
                  return;
                }
                setIndex(Math.min(items.length - 1, Math.max(0, Math.round(offset))));
              }}
              scrollEventThrottle={32}
              renderItem={({ item }) => (
                <View style={{ width: viewport.width, height: viewport.height }}>
                  <View style={{ flex: 1, padding: authSpacing.md }}>
                    <RoomTypeImageView item={item} imageToken={imageToken} contain />
                  </View>
                  {item.fileName ? (
                    <Text style={s.modalCaption} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                  ) : null}
                </View>
              )}
            />
          )}
        </View>

        {items.length > 1 && (
          <View style={s.modalFooter}>
            <AnimatedPressable
              accessibilityLabel="Ảnh trước"
              disabled={index === 0}
              style={[s.modalNavBtn, index === 0 && { opacity: 0.35 }]}
              onPress={() => move(index - 1)}
            >
              <Feather name="chevron-left" size={22} color={c.primary} />
            </AnimatedPressable>
            <Text style={s.modalHint}>Vuốt ngang để chuyển ảnh</Text>
            <AnimatedPressable
              accessibilityLabel="Ảnh tiếp theo"
              disabled={index === items.length - 1}
              style={[s.modalNavBtn, index === items.length - 1 && { opacity: 0.35 }]}
              onPress={() => move(index + 1)}
            >
              <Feather name="chevron-right" size={22} color={c.primary} />
            </AnimatedPressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  heroContainer: {
    height: 236,
    borderRadius: authRadius.xxl,
    overflow: 'hidden',
    backgroundColor: '#EEF4F1',
    borderWidth: 1,
    borderColor: c.border,
    position: 'relative',
  },
  emptyBox: {
    height: 180,
    borderRadius: authRadius.xxl,
    backgroundColor: '#EEF4F1',
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: authSpacing.xl,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: authSpacing.lg,
    backgroundColor: '#EEF4F1',
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  counterPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20, 45, 41, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  expandHintBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbStrip: {
    gap: 8,
    paddingVertical: 2,
  },
  thumbTile: {
    width: 68,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EEF4F1',
    borderWidth: 1.5,
    borderColor: c.border,
  },
  thumbTileActive: {
    borderColor: c.primary,
    borderWidth: 2,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: c.background,
  },
  modalHeader: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
    textAlign: 'center',
    paddingHorizontal: authSpacing.xl,
    paddingBottom: authSpacing.sm,
  },
  modalFooter: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  modalNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHint: {
    fontSize: 12,
    color: c.textSecondary,
  },
});
