import { useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useHost } from '@/context/host-context';
import { getApiBase } from '@/services/accommodations';
import type { HostAttachment } from '@/services/host';
import { documentStatus } from '@/services/host-property';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';

function PrivatePhoto({
  photo,
  contain = false,
  compact = false,
}: {
  photo?: HostAttachment;
  contain?: boolean;
  compact?: boolean;
}) {
  const { imageToken } = useHost();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!photo || failed || !imageToken) {
    return (
      <View style={s.fallback}>
        <Feather name="image" size={compact ? 20 : 28} color={c.textSecondary} />
        {!compact && (
          <Text style={s.fallbackText}>
            {!photo
              ? 'Chưa có ảnh nhà trọ'
              : failed
              ? 'Không thể tải ảnh'
              : 'Đang xác nhận phiên xem ảnh…'}
          </Text>
        )}
        {!compact && photo && failed && (
          <AnimatedPressable
            style={s.retryBtn}
            onPress={() => {
              setAttempt(v => v + 1);
              setFailed(false);
            }}
            accessibilityLabel="Thử lại ảnh"
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
      key={attempt}
      source={{
        uri: `${getApiBase()}/api/host/property/photos/${photo.documentId}`,
        headers: { Authorization: `Bearer ${imageToken}` },
      }}
      accessibilityLabel={photo.fileName ? `Ảnh nhà trọ ${photo.fileName}` : 'Ảnh nhà trọ'}
      contentFit={contain ? 'contain' : 'cover'}
      style={s.fullImage}
      cachePolicy="none"
      onError={() => setFailed(true)}
    />
  );
}

export function HostPropertyGallery({
  photos,
  verified = false,
}: {
  photos: HostAttachment[];
  verified?: boolean;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <View style={s.coverWrapper}>
        <AnimatedPressable
          scaleTo={0.99}
          disabled={!photos.length}
          accessibilityLabel={
            photos.length ? `Xem ảnh đại diện và tất cả ${photos.length} ảnh` : 'Chưa có ảnh nhà trọ'
          }
          style={s.cover}
          onPress={() => {
            if (photos.length > 0) setViewerIndex(0);
          }}
        >
          <PrivatePhoto key={photos[0]?.documentId || 'empty'} photo={photos[0]} />

          {verified && (
            <View style={s.verifiedBadge}>
              <Feather name="shield" size={12} color={c.primary} />
              <Text style={s.verifiedText}>Đã xác minh</Text>
            </View>
          )}

          {photos.length > 0 && (
            <View style={s.countPill}>
              <Feather name="grid" size={14} color={c.forestInk} />
              <Text style={s.countPillText}>Xem tất cả {photos.length} ảnh</Text>
            </View>
          )}
        </AnimatedPressable>
      </View>

      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

export function HostPropertyPhotoStrip({ photos }: { photos: HostAttachment[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!photos.length) {
    return <Text style={s.emptyStripText}>Chưa có ảnh nhà trọ.</Text>;
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.stripContent}
      >
        {photos.map((photo, idx) => (
          <AnimatedPressable
            key={photo.documentId}
            scaleTo={0.97}
            accessibilityLabel={`Xem ảnh ${idx + 1} trong tổng số ${photos.length} ảnh`}
            style={s.stripTile}
            onPress={() => setViewerIndex(idx)}
          >
            <PrivatePhoto photo={photo} compact />
            <View style={s.stripIndexBadge}>
              <Text style={s.stripIndexText}>{idx + 1}</Text>
            </View>
          </AnimatedPressable>
        ))}
      </ScrollView>

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

function PhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
}: {
  photos: HostAttachment[];
  initialIndex?: number;
  onClose(): void;
}) {
  const reduced = useReducedMotionPreference();
  const list = useRef<FlatList<HostAttachment>>(null);
  const target = useRef<number | null>(null);
  const safeInitial = Math.min(Math.max(initialIndex, 0), photos.length - 1);
  const [index, setIndex] = useState(safeInitial);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const move = (next: number) => {
    const clamped = Math.min(photos.length - 1, Math.max(0, next));
    target.current = clamped;
    setIndex(clamped);
    list.current?.scrollToOffset({ offset: clamped * viewport.width, animated: !reduced });
  };

  return (
    <Modal animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={s.viewerScreen} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.viewerHeader}>
          <Text accessibilityLiveRegion="polite" style={s.viewerTitle}>
            Ảnh {index + 1} / {photos.length}
          </Text>
          <AnimatedPressable
            accessibilityLabel="Đóng thư viện ảnh"
            style={s.viewerCloseBtn}
            onPress={onClose}
          >
            <Feather name="x" size={22} color={c.forestInk} />
          </AnimatedPressable>
        </View>

        <View
          style={s.viewerBody}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          {viewport.width > 0 && viewport.height > 0 && (
            <FlatList
              testID="host-property-photo-pages"
              ref={list}
              key={`${viewport.width}:${viewport.height}`}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={safeInitial}
              keyExtractor={p => String(p.documentId)}
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
                  if (Math.abs(offset - target.current) < 0.01) {
                    setIndex(target.current);
                    target.current = null;
                  }
                  return;
                }
                setIndex(Math.min(photos.length - 1, Math.max(0, Math.round(offset))));
              }}
              scrollEventThrottle={32}
              renderItem={({ item }) => (
                <View style={{ width: viewport.width, height: viewport.height, gap: 8 }}>
                  <View style={s.viewerImageBox}>
                    <PrivatePhoto key={item.documentId} photo={item} contain />
                  </View>
                  <View style={s.viewerCaptionBox}>
                    {item.fileName && <Text style={s.viewerMeta}>{item.fileName}</Text>}
                    {item.verificationStatus && (
                      <Text style={s.viewerMeta}>
                        Kiểm tra ảnh: {documentStatus(item.verificationStatus)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>

        <View style={s.viewerFooter}>
          <AnimatedPressable
            accessibilityLabel="Ảnh trước"
            disabled={index === 0}
            style={[s.viewerNavBtn, index === 0 && s.viewerNavDisabled]}
            onPress={() => move(index - 1)}
          >
            <Feather name="chevron-left" size={22} color={c.primary} />
          </AnimatedPressable>
          <Text style={s.viewerMeta}>Vuốt ngang để xem ảnh</Text>
          <AnimatedPressable
            accessibilityLabel="Ảnh tiếp theo"
            disabled={index === photos.length - 1}
            style={[s.viewerNavBtn, index === photos.length - 1 && s.viewerNavDisabled]}
            onPress={() => move(index + 1)}
          >
            <Feather name="chevron-right" size={22} color={c.primary} />
          </AnimatedPressable>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  fullImage: {
    width: '100%',
    height: '100%',
  },
  coverWrapper: {
    borderRadius: authRadius.xxl,
    overflow: 'hidden',
    backgroundColor: c.border,
  },
  cover: {
    height: 220,
    width: '100%',
    backgroundColor: c.softMint,
    position: 'relative',
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
    color: c.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
  },
  verifiedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: c.primary,
  },
  countPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minHeight: 38,
    borderRadius: authRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPillText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: c.forestInk,
  },
  stripContent: {
    gap: 10,
    paddingVertical: 2,
  },
  stripTile: {
    width: 108,
    height: 82,
    borderRadius: authRadius.md,
    overflow: 'hidden',
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: c.border,
    position: 'relative',
  },
  stripIndexBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(20, 45, 41, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyStripText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  viewerScreen: {
    flex: 1,
    backgroundColor: c.background,
  },
  viewerHeader: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  viewerTitle: {
    color: c.forestInk,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  viewerCloseBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: authRadius.round,
  },
  viewerBody: {
    flex: 1,
  },
  viewerImageBox: {
    flex: 1,
    paddingHorizontal: authSpacing.md,
    paddingTop: authSpacing.md,
  },
  viewerCaptionBox: {
    paddingHorizontal: authSpacing.xl,
    paddingBottom: authSpacing.md,
    gap: 4,
  },
  viewerMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  viewerFooter: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  viewerNavBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerNavDisabled: {
    opacity: 0.35,
  },
});
