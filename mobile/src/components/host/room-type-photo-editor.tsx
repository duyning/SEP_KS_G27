import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { getApiBase } from '@/services/accommodations';
import { checkRegistrationAsset } from '@/services/registration-upload';
import {
  ROOM_TYPE_MAX_PHOTOS,
  activeRoomTypePhotos,
  promoteNewPhotoToFront,
  type ExistingRoomTypeImage,
  type NewRoomTypePhoto,
  type RoomTypeEditorDraft,
} from '@/services/host-room-type-editor';
import {
  RoomTypePhotoFullscreenModal,
  type EditorPreviewPhotoItem,
} from './room-type-editor-sheets';

interface GridPhotoTile {
  key: string;
  kind: 'existing' | 'new';
  existing?: ExistingRoomTypeImage;
  added?: NewRoomTypePhoto;
  uri: string;
  requiresAuth: boolean;
  isCover: boolean;
  canMakeCover: boolean;
  fileName?: string;
}

export function RoomTypePhotoEditor({
  roomTypeId,
  draft,
  imageToken,
  disabled,
  error,
  onChangeImages,
}: {
  roomTypeId?: number;
  draft: RoomTypeEditorDraft;
  imageToken: string | null;
  disabled: boolean;
  error?: string;
  onChangeImages: (
    updater: (prev: {
      existingImages: ExistingRoomTypeImage[];
      newPhotos: NewRoomTypePhoto[];
    }) => {
      existingImages: ExistingRoomTypeImage[];
      newPhotos: NewRoomTypePhoto[];
    }
  ) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [gridWidth, setGridWidth] = useState(0);
  const [picking, setPicking] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [menuTile, setMenuTile] = useState<GridPhotoTile | null>(null);

  const summary = useMemo(() => activeRoomTypePhotos(draft), [draft]);

  const tiles = useMemo<GridPhotoTile[]>(() => {
    const base = getApiBase();
    const list: GridPhotoTile[] = [];

    for (const img of summary.retained) {
      const key = `existing:${img.imageId}`;
      list.push({
        key,
        kind: 'existing',
        existing: img,
        uri: roomTypeId
          ? `${base}/api/host/room-types/${roomTypeId}/images/${img.imageId}`
          : '',
        requiresAuth: true,
        isCover: summary.coverKey === key,
        canMakeCover: false,
        fileName: img.fileName,
      });
    }

    summary.newPhotos.forEach((photo, idx) => {
      const key = `new:${photo.id}`;
      // Backend assigns auto-increment IDs to newly uploaded photos in upload order.
      // When no retained server images remain, moving a new photo to index 0 makes it the persisted cover photo.
      const canMakeCover = summary.retained.length === 0 && idx > 0;
      list.push({
        key,
        kind: 'new',
        added: photo,
        uri: photo.uri,
        requiresAuth: false,
        isCover: summary.coverKey === key,
        canMakeCover,
        fileName: photo.fileName,
      });
    });

    return list;
  }, [roomTypeId, summary]);

  const previewItems = useMemo<EditorPreviewPhotoItem[]>(
    () =>
      tiles.map(t => ({
        key: t.key,
        uri: t.uri,
        requiresAuth: t.requiresAuth,
        isCover: t.isCover,
        isNew: t.kind === 'new',
        fileName: t.fileName,
        canMakeCover: t.canMakeCover,
      })),
    [tiles]
  );

  const validateAndProcessPicked = async (
    assets: ImagePicker.ImagePickerAsset[],
    replaceTarget?: GridPhotoTile
  ) => {
    if (!assets.length) return;
    setPicking(true);
    setLocalNotice(null);

    const warnings: string[] = [];
    const maxToAdd = replaceTarget ? 1 : summary.remainingSlots;
    const batch = assets.slice(0, Math.max(0, maxToAdd));

    if (!replaceTarget && assets.length > maxToAdd) {
      warnings.push(
        `Chỉ có thể thêm tối đa ${maxToAdd} ảnh nữa (giới hạn ${ROOM_TYPE_MAX_PHOTOS} ảnh/loại phòng).`
      );
    }

    // Create loading placeholders immediately so per-photo loading is visible
    const pendingEntries = batch.map((raw, idx) => ({
      id: `rt-edit-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      raw,
    }));

    if (replaceTarget) {
      const first = pendingEntries[0];
      if (!first) {
        setPicking(false);
        return;
      }
      const placeholder: NewRoomTypePhoto = {
        id: first.id,
        uri: first.raw.uri,
        fileName: first.raw.fileName || undefined,
        mimeType: first.raw.mimeType || undefined,
        fileSize: first.raw.fileSize || undefined,
        file: (first.raw as unknown as { file?: File }).file,
        status: 'loading',
      };
      onChangeImages(prev => {
        if (replaceTarget.kind === 'existing' && replaceTarget.existing) {
          return {
            existingImages: prev.existingImages.map(img =>
              img.imageId === replaceTarget.existing!.imageId
                ? { ...img, markedForDeletion: true }
                : img
            ),
            newPhotos: [...prev.newPhotos, placeholder],
          };
        }
        return {
          existingImages: prev.existingImages,
          newPhotos: prev.newPhotos.map(p => (p.id === replaceTarget.added?.id ? placeholder : p)),
        };
      });
    } else {
      const placeholders: NewRoomTypePhoto[] = pendingEntries.map(({ id, raw }) => ({
        id,
        uri: raw.uri,
        fileName: raw.fileName || undefined,
        mimeType: raw.mimeType || undefined,
        fileSize: raw.fileSize || undefined,
        file: (raw as unknown as { file?: File }).file,
        status: 'loading',
      }));
      onChangeImages(prev => ({
        existingImages: prev.existingImages,
        newPhotos: [...prev.newPhotos, ...placeholders],
      }));
    }

    for (const entry of pendingEntries) {
      try {
        const checked = await checkRegistrationAsset(
          {
            uri: entry.raw.uri,
            fileName: entry.raw.fileName || undefined,
            mimeType: entry.raw.mimeType || undefined,
            fileSize: entry.raw.fileSize || undefined,
            file: (entry.raw as unknown as { file?: File }).file,
          },
          false
        );
        onChangeImages(prev => ({
          existingImages: prev.existingImages,
          newPhotos: prev.newPhotos.map(p =>
            p.id === entry.id
              ? {
                  ...p,
                  uri: checked.uri,
                  fileName: checked.fileName || undefined,
                  mimeType: checked.mimeType || undefined,
                  fileSize: checked.fileSize,
                  file: checked.file,
                  status: 'ready',
                  error: undefined,
                }
              : p
          ),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ảnh không hợp lệ.';
        warnings.push(msg);
        onChangeImages(prev => ({
          existingImages: prev.existingImages,
          newPhotos: prev.newPhotos.map(p =>
            p.id === entry.id ? { ...p, status: 'error', error: msg } : p
          ),
        }));
      }
    }

    if (warnings.length > 0) {
      setLocalNotice(warnings[0]);
    } else {
      triggerHaptic('selection');
    }
    setPicking(false);
  };

  const handleRetryNewPhoto = async (photo: NewRoomTypePhoto) => {
    onChangeImages(prev => ({
      existingImages: prev.existingImages,
      newPhotos: prev.newPhotos.map(p =>
        p.id === photo.id ? { ...p, status: 'loading', error: undefined } : p
      ),
    }));
    try {
      const checked = await checkRegistrationAsset(
        {
          uri: photo.uri,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          file: photo.file,
        },
        false
      );
      onChangeImages(prev => ({
        existingImages: prev.existingImages,
        newPhotos: prev.newPhotos.map(p =>
          p.id === photo.id
            ? {
                ...p,
                uri: checked.uri,
                fileName: checked.fileName || undefined,
                mimeType: checked.mimeType || undefined,
                fileSize: checked.fileSize,
                file: checked.file,
                status: 'ready',
                error: undefined,
              }
            : p
        ),
      }));
      setLocalNotice(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ảnh không hợp lệ.';
      onChangeImages(prev => ({
        existingImages: prev.existingImages,
        newPhotos: prev.newPhotos.map(p =>
          p.id === photo.id ? { ...p, status: 'error', error: msg } : p
        ),
      }));
      setLocalNotice(msg);
    }
  };

  const pickFromLibrary = async (replaceTarget?: GridPhotoTile) => {
    if (disabled || picking) return;
    if (!replaceTarget && summary.remainingSlots <= 0) {
      setLocalNotice(`Đã đạt giới hạn tối đa ${ROOM_TYPE_MAX_PHOTOS} ảnh cho loại phòng.`);
      return;
    }
    setLocalNotice(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setLocalNotice('Cần cấp quyền truy cập thư viện ảnh để chọn ảnh loại phòng.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: !replaceTarget,
        selectionLimit: replaceTarget ? 1 : summary.remainingSlots,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.length) {
        await validateAndProcessPicked(res.assets, replaceTarget);
      }
    } catch {
      setLocalNotice('Không thể mở thư viện ảnh. Vui lòng thử lại.');
    }
  };

  const takePhoto = async (replaceTarget?: GridPhotoTile) => {
    if (disabled || picking) return;
    if (!replaceTarget && summary.remainingSlots <= 0) {
      setLocalNotice(`Đã đạt giới hạn tối đa ${ROOM_TYPE_MAX_PHOTOS} ảnh cho loại phòng.`);
      return;
    }
    setLocalNotice(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setLocalNotice('Cần cấp quyền camera để chụp ảnh loại phòng.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.length) {
        await validateAndProcessPicked(res.assets, replaceTarget);
      }
    } catch {
      setLocalNotice('Không thể mở camera trên thiết bị này.');
    }
  };

  const handleRemoveTile = (tile: GridPhotoTile) => {
    triggerHaptic('selection');
    setLocalNotice(null);
    if (tile.kind === 'existing' && tile.existing) {
      // Soft mark only — server image is NOT deleted until the host taps "Lưu thay đổi".
      onChangeImages(prev => ({
        existingImages: prev.existingImages.map(img =>
          img.imageId === tile.existing!.imageId ? { ...img, markedForDeletion: true } : img
        ),
        newPhotos: prev.newPhotos,
      }));
      return;
    }
    if (tile.kind === 'new' && tile.added) {
      onChangeImages(prev => ({
        existingImages: prev.existingImages,
        newPhotos: prev.newPhotos.filter(p => p.id !== tile.added!.id),
      }));
    }
  };

  const handleMakeCoverTile = (tile: GridPhotoTile) => {
    if (tile.kind !== 'new' || !tile.added || !tile.canMakeCover) return;
    triggerHaptic('selection');
    onChangeImages(prev => ({
      existingImages: prev.existingImages,
      newPhotos: promoteNewPhotoToFront(prev.newPhotos, tile.added!.id),
    }));
  };

  const handleRestoreAllRemoved = () => {
    const canRestore = Math.min(summary.markedRemoved.length, summary.remainingSlots);
    if (canRestore <= 0) {
      setLocalNotice(`Đã đạt giới hạn ${ROOM_TYPE_MAX_PHOTOS} ảnh. Bỏ bớt ảnh mới trước khi khôi phục.`);
      return;
    }
    const idsToRestore = new Set(summary.markedRemoved.slice(0, canRestore).map(i => i.imageId));
    onChangeImages(prev => ({
      existingImages: prev.existingImages.map(img =>
        idsToRestore.has(img.imageId) ? { ...img, markedForDeletion: false } : img
      ),
      newPhotos: prev.newPhotos,
    }));
    setLocalNotice(null);
  };

  const gap = 8;
  const tileSize = gridWidth > 0 ? Math.floor((gridWidth - gap * 2) / 3) : 96;

  return (
    <View style={s.section}>
      {/* Header Row */}
      <View style={s.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.sectionTitle}>Hình ảnh loại phòng</Text>
          <Text style={s.sectionSub}>
            Ảnh đầu tiên là ảnh đại diện · JPG, PNG, WEBP tối đa 5 MB/ảnh
          </Text>
        </View>
        <View
          style={[
            s.countBadge,
            summary.totalActive >= ROOM_TYPE_MAX_PHOTOS && s.countBadgeFull,
          ]}
        >
          <Text
            style={[
              s.countBadgeText,
              summary.totalActive >= ROOM_TYPE_MAX_PHOTOS && { color: '#9A5B0A' },
            ]}
          >
            {summary.totalActive}/{ROOM_TYPE_MAX_PHOTOS} ảnh
          </Text>
        </View>
      </View>

      {/* Camera & Library Buttons */}
      <View style={s.pickButtonsRow}>
        <AnimatedPressable
          scaleTo={0.98}
          disabled={disabled || picking || summary.remainingSlots <= 0}
          accessibilityLabel="Chụp ảnh loại phòng"
          style={[
            s.pickBtn,
            (disabled || picking || summary.remainingSlots <= 0) && { opacity: 0.48 },
          ]}
          onPress={() => {
            void takePhoto();
          }}
        >
          <Feather name="camera" size={16} color={c.primary} />
          <Text style={s.pickBtnText}>Chụp ảnh</Text>
        </AnimatedPressable>

        <AnimatedPressable
          scaleTo={0.98}
          disabled={disabled || picking || summary.remainingSlots <= 0}
          accessibilityLabel="Chọn ảnh từ thư viện"
          style={[
            s.pickBtn,
            s.pickBtnPrimary,
            (disabled || picking || summary.remainingSlots <= 0) && { opacity: 0.48 },
          ]}
          onPress={() => {
            void pickFromLibrary();
          }}
        >
          {picking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="image" size={16} color="#FFFFFF" />
          )}
          <Text style={s.pickBtnPrimaryText}>
            {picking ? 'Đang xử lý…' : 'Chọn từ thư viện'}
          </Text>
        </AnimatedPressable>
      </View>

      {/* 3-Column Photo Grid */}
      <View
        style={s.gridContainer}
        onLayout={e => {
          const w = Math.floor(e.nativeEvent.layout.width);
          if (w > 0 && w !== gridWidth) setGridWidth(w);
        }}
      >
        {tiles.length === 0 ? (
          <View style={s.emptyPhotos}>
            <Feather name="image" size={24} color={c.textMuted} />
            <Text style={s.emptyPhotosTitle}>Chưa có hình ảnh nào</Text>
            <Text style={s.emptyPhotosSub}>
              Thêm ảnh thực tế giúp người thuê dễ hình dung không gian loại phòng.
            </Text>
          </View>
        ) : (
          <View style={s.gridWrap}>
            {tiles.map((tile, idx) => (
              <PhotoGridItem
                key={tile.key}
                tile={tile}
                index={idx}
                size={tileSize}
                imageToken={imageToken}
                disabled={disabled}
                onPressPreview={() => setViewerIndex(idx)}
                onPressMenu={() => setMenuTile(tile)}
                onPressRemove={() => handleRemoveTile(tile)}
                onRetryNew={
                  tile.added
                    ? () => {
                        void handleRetryNewPhoto(tile.added!);
                      }
                    : undefined
                }
              />
            ))}
          </View>
        )}
      </View>

      {/* Pending Server Image Deletions (Reversible before Save!) */}
      {summary.markedRemoved.length > 0 && (
        <View style={s.pendingDeleteBar}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.pendingDeleteTitle}>
              Đã đánh dấu xóa {summary.markedRemoved.length} ảnh đã lưu
            </Text>
            <Text style={s.pendingDeleteSub}>
              Ảnh chỉ bị xóa khỏi máy chủ khi bạn bấm Lưu thay đổi.
            </Text>
          </View>
          <AnimatedPressable
            scaleTo={0.97}
            disabled={disabled}
            accessibilityLabel="Khôi phục ảnh đã đánh dấu xóa"
            style={s.restoreBtn}
            onPress={handleRestoreAllRemoved}
          >
            <Feather name="rotate-ccw" size={13} color={c.primary} />
            <Text style={s.restoreBtnText}>Hoàn tác</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Server Cover Ordering Transparency Hint */}
      {summary.retained.length > 0 && summary.totalActive > 1 && (
        <Text style={s.orderHint}>
          Ảnh đã lưu giữ theo thứ tự trên máy chủ; ảnh đầu tiên hiển thị làm ảnh đại diện. Chạm vào
          ảnh để xem lớn, thay ảnh hoặc xóa ảnh.
        </Text>
      )}

      {(localNotice || error) && (
        <View style={s.errorRow} accessibilityRole="alert">
          <Feather name="alert-circle" size={14} color={c.error} style={{ marginTop: 2 }} />
          <Text style={s.errorText}>{error || localNotice}</Text>
        </View>
      )}

      {/* Fullscreen Lightbox */}
      {viewerIndex !== null && (
        <RoomTypePhotoFullscreenModal
          items={previewItems}
          initialIndex={viewerIndex}
          imageToken={imageToken}
          disabled={disabled}
          onClose={() => setViewerIndex(null)}
          onMakeCover={item => {
            const tile = tiles.find(t => t.key === item.key);
            if (tile) handleMakeCoverTile(tile);
          }}
          onReplace={item => {
            const tile = tiles.find(t => t.key === item.key);
            if (tile) void pickFromLibrary(tile);
          }}
          onRemove={item => {
            const tile = tiles.find(t => t.key === item.key);
            if (tile) handleRemoveTile(tile);
          }}
        />
      )}

      {/* Per-Photo Action Sheet */}
      {menuTile && (
        <Modal
          transparent
          animationType={reduced ? 'none' : 'fade'}
          onRequestClose={() => setMenuTile(null)}
        >
          <View style={s.sheetBackdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setMenuTile(null)} />
            <SafeAreaView edges={['bottom', 'left', 'right']} style={s.photoMenuSheet}>
              <View style={s.sheetHandle} />
              <Text style={s.photoMenuTitle} numberOfLines={1}>
                {menuTile.isCover ? 'Ảnh đại diện' : 'Tùy chọn hình ảnh'}
              </Text>

              <AnimatedPressable
                scaleTo={0.99}
                style={s.photoMenuRow}
                onPress={() => {
                  const idx = tiles.findIndex(t => t.key === menuTile.key);
                  setMenuTile(null);
                  if (idx >= 0) setViewerIndex(idx);
                }}
              >
                <Feather name="maximize-2" size={17} color={c.primary} />
                <Text style={s.photoMenuText}>Xem toàn màn hình</Text>
              </AnimatedPressable>

              {menuTile.canMakeCover && (
                <AnimatedPressable
                  scaleTo={0.99}
                  style={s.photoMenuRow}
                  onPress={() => {
                    const target = menuTile;
                    setMenuTile(null);
                    handleMakeCoverTile(target);
                  }}
                >
                  <Feather name="star" size={17} color={c.primary} />
                  <Text style={s.photoMenuText}>Đặt làm ảnh đại diện</Text>
                </AnimatedPressable>
              )}

              <AnimatedPressable
                scaleTo={0.99}
                style={s.photoMenuRow}
                onPress={() => {
                  const target = menuTile;
                  setMenuTile(null);
                  void pickFromLibrary(target);
                }}
              >
                <Feather name="image" size={17} color={c.forestInk} />
                <Text style={s.photoMenuText}>Thay bằng ảnh từ thư viện</Text>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.99}
                style={s.photoMenuRow}
                onPress={() => {
                  const target = menuTile;
                  setMenuTile(null);
                  void takePhoto(target);
                }}
              >
                <Feather name="camera" size={17} color={c.forestInk} />
                <Text style={s.photoMenuText}>Thay bằng ảnh chụp mới</Text>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.99}
                style={[s.photoMenuRow, s.photoMenuRowDanger]}
                onPress={() => {
                  const target = menuTile;
                  setMenuTile(null);
                  handleRemoveTile(target);
                }}
              >
                <Feather name="trash-2" size={17} color={c.error} />
                <Text style={[s.photoMenuText, { color: c.error }]}>
                  {menuTile.kind === 'existing' ? 'Đánh dấu xóa ảnh' : 'Xóa ảnh mới này'}
                </Text>
              </AnimatedPressable>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Individual 3-Col Thumbnail Tile                                             */
/* -------------------------------------------------------------------------- */

function PhotoGridItem({
  tile,
  index,
  size,
  imageToken,
  disabled,
  onPressPreview,
  onPressMenu,
  onPressRemove,
  onRetryNew,
}: {
  tile: GridPhotoTile;
  index: number;
  size: number;
  imageToken: string | null;
  disabled: boolean;
  onPressPreview: () => void;
  onPressMenu: () => void;
  onPressRemove: () => void;
  onRetryNew?: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const isProcessing = tile.kind === 'new' && tile.added?.status === 'loading';
  const isError = tile.kind === 'new' && tile.added?.status === 'error';

  return (
    <View style={[s.tileOuter, { width: size }]}>
      <AnimatedPressable
        scaleTo={0.98}
        accessibilityLabel={`Ảnh loại phòng ${index + 1}${tile.isCover ? ', ảnh đại diện' : ''}`}
        style={[s.tileFrame, { width: size, height: size }]}
        onPress={isProcessing || isError ? undefined : onPressPreview}
      >
        {isProcessing ? (
          <View style={s.tileOverlayState}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={s.tileOverlayText}>Đang kiểm tra</Text>
          </View>
        ) : isError ? (
          <View style={s.tileOverlayState}>
            <Feather name="alert-triangle" size={18} color={c.error} />
            {onRetryNew && (
              <AnimatedPressable
                accessibilityLabel="Thử lại xử lý ảnh"
                style={s.retryMiniBtn}
                onPress={onRetryNew}
              >
                <Text style={s.retryMiniText}>Thử lại</Text>
              </AnimatedPressable>
            )}
          </View>
        ) : (tile.requiresAuth && !imageToken) || imgFailed ? (
          <View style={s.tileOverlayState}>
            <Feather name="image" size={18} color={c.textSecondary} />
            {imgFailed && (
              <AnimatedPressable
                accessibilityLabel="Thử tải lại ảnh"
                style={s.retryMiniBtn}
                onPress={() => {
                  setAttempt(v => v + 1);
                  setImgFailed(false);
                }}
              >
                <Text style={s.retryMiniText}>Thử lại</Text>
              </AnimatedPressable>
            )}
          </View>
        ) : (
          <Image
            key={`${tile.key}:${attempt}`}
            source={
              tile.requiresAuth && imageToken
                ? { uri: tile.uri, headers: { Authorization: `Bearer ${imageToken}` } }
                : { uri: tile.uri }
            }
            contentFit="cover"
            cachePolicy={tile.requiresAuth ? 'none' : 'memory-disk'}
            style={s.tileImg}
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Top-left badge: Cover OR New */}
        {tile.isCover ? (
          <View style={s.coverPill}>
            <Text style={s.coverPillText}>Ảnh bìa</Text>
          </View>
        ) : tile.kind === 'new' ? (
          <View style={s.newPill}>
            <Text style={s.newPillText}>Mới</Text>
          </View>
        ) : null}

        {/* Top-right Quick Remove */}
        <AnimatedPressable
          disabled={disabled}
          accessibilityLabel={`Xóa ảnh ${index + 1}`}
          style={s.tileRemoveBtn}
          onPress={onPressRemove}
        >
          <Feather name="x" size={13} color="#FFFFFF" />
        </AnimatedPressable>

        {/* Bottom-right More Options */}
        {!isProcessing && !isError && (
          <AnimatedPressable
            disabled={disabled}
            accessibilityLabel={`Tùy chọn cho ảnh ${index + 1}`}
            style={s.tileMenuBtn}
            onPress={onPressMenu}
          >
            <Feather name="more-horizontal" size={13} color="#FFFFFF" />
          </AnimatedPressable>
        )}
      </AnimatedPressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  section: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  countBadge: {
    backgroundColor: c.softMint,
    borderRadius: authRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeFull: {
    backgroundColor: '#FEF6E7',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  pickBtnPrimary: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  pickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  pickBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gridContainer: {
    width: '100%',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyPhotos: {
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.background,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyPhotosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  emptyPhotosSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
    textAlign: 'center',
  },
  tileOuter: {
    borderRadius: 12,
  },
  tileFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEF4F1',
    borderWidth: 1,
    borderColor: c.border,
    position: 'relative',
  },
  tileImg: {
    width: '100%',
    height: '100%',
  },
  tileOverlayState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
    backgroundColor: '#F3F7F5',
  },
  tileOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textSecondary,
    textAlign: 'center',
  },
  retryMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  retryMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
  },
  coverPill: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: c.primary,
    borderRadius: authRadius.round,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coverPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newPill: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: 'rgba(20, 45, 41, 0.78)',
    borderRadius: authRadius.round,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tileRemoveBtn: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 45, 41, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMenuBtn: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 26,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 45, 41, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDeleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F5DCB0',
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingDeleteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A4F07',
  },
  pendingDeleteSub: {
    fontSize: 11,
    lineHeight: 15,
    color: '#9A5B0A',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  orderHint: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.error,
    fontWeight: '600',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    justifyContent: 'flex-end',
  },
  photoMenuSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.xl,
    paddingTop: 10,
    paddingBottom: authSpacing.lg,
    gap: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  photoMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.forestInk,
    marginBottom: 4,
  },
  photoMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  photoMenuRowDanger: {
    backgroundColor: c.errorBackground,
    borderColor: '#F5C2C0',
  },
  photoMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
});
