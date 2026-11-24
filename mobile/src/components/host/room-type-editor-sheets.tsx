import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { hostPrice, type HostRoomType } from '@/services/host';
import {
  ROOM_AMENITY_LABELS,
  roomAmenityLabel,
  type RoomTypeInventory,
} from '@/services/host-room-types';
import {
  evaluateRoomTypeDeletion,
  filterAmenityGroups,
} from '@/services/host-room-type-editor';

/* -------------------------------------------------------------------------- */
/* 1. Room Type Overflow Action Sheet (Menu `⋯`)                               */
/* -------------------------------------------------------------------------- */

export function RoomTypeActionSheet({
  target,
  propertyName,
  inventory,
  canEdit,
  canDelete,
  showViewDetail = true,
  showEdit = true,
  onClose,
  onViewDetail,
  onManageRooms,
  onEdit,
  onDelete,
}: {
  target: HostRoomType | null;
  propertyName?: string;
  inventory: RoomTypeInventory | null;
  canEdit: boolean;
  canDelete: boolean;
  showViewDetail?: boolean;
  showEdit?: boolean;
  onClose: () => void;
  onViewDetail?: () => void;
  onManageRooms: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!target) return null;

  const roomsLabel =
    inventory?.total != null ? `${inventory.total} phòng` : undefined;

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle} numberOfLines={2}>
                {target.roomType}
              </Text>
              <Text style={s.sheetSub} numberOfLines={1}>
                {[propertyName, hostPrice(target.price)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng menu thao tác"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={s.actionList}>
            {showViewDetail && onViewDetail && (
              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết loại phòng"
                style={s.actionItem}
                onPress={() => {
                  onClose();
                  onViewDetail();
                }}
              >
                <View style={s.actionIconBox}>
                  <Feather name="eye" size={17} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionLabel}>Xem chi tiết</Text>
                  <Text style={s.actionHint}>Hình ảnh, tiện nghi, phí dịch vụ và phòng</Text>
                </View>
                <Feather name="chevron-right" size={16} color={c.textMuted} />
              </AnimatedPressable>
            )}

            <AnimatedPressable
              scaleTo={0.99}
              accessibilityRole="button"
              accessibilityLabel="Quản lý phòng thuộc loại này"
              style={s.actionItem}
              onPress={() => {
                onClose();
                onManageRooms();
              }}
            >
              <View style={s.actionIconBox}>
                <Feather name="key" size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>Quản lý phòng</Text>
                <Text style={s.actionHint}>
                  Xem và cập nhật danh sách phòng thuộc loại này
                </Text>
              </View>
              {roomsLabel ? (
                <View style={s.countPill}>
                  <Text style={s.countPillText}>{roomsLabel}</Text>
                </View>
              ) : null}
              <Feather name="chevron-right" size={16} color={c.textMuted} />
            </AnimatedPressable>

            {showEdit && onEdit && (
              <AnimatedPressable
                scaleTo={0.99}
                disabled={!canEdit}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canEdit }}
                accessibilityLabel="Chỉnh sửa loại phòng"
                style={[s.actionItem, !canEdit && { opacity: 0.48 }]}
                onPress={() => {
                  if (!canEdit) return;
                  onClose();
                  onEdit();
                }}
              >
                <View style={s.actionIconBox}>
                  <Feather name="edit-2" size={17} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionLabel}>Chỉnh sửa loại phòng</Text>
                  <Text style={s.actionHint}>
                    {canEdit
                      ? 'Giá thuê, tiền cọc, hình ảnh, tiện nghi và chi phí'
                      : 'Nhà trọ cần đang hoạt động để chỉnh sửa loại phòng'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={c.textMuted} />
              </AnimatedPressable>
            )}

            <View style={s.menuDivider} />

            <AnimatedPressable
              scaleTo={0.99}
              disabled={!canDelete}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canDelete }}
              accessibilityLabel="Xóa loại phòng"
              style={[s.actionItemDanger, !canDelete && { opacity: 0.48 }]}
              onPress={() => {
                if (!canDelete) return;
                triggerHaptic('medium');
                onClose();
                onDelete();
              }}
            >
              <View style={s.actionIconDanger}>
                <Feather name="trash-2" size={17} color={c.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabelDanger}>Xóa loại phòng</Text>
                <Text style={s.actionHint}>
                  {inventory?.total && inventory.total > 0
                    ? `Đang có ${inventory.total} phòng liên kết — cần xử lý trước khi xóa`
                    : 'Kiểm tra ràng buộc và xác nhận trước khi xóa'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={c.error} />
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Safe Delete Room Type Bottom Sheet (Case 1 Blocked & Case 2 Confirm)     */
/* -------------------------------------------------------------------------- */

export function RoomTypeDeleteSheet({
  target,
  propertyName,
  inventory,
  canManage,
  busy,
  error,
  onClose,
  onInspectRooms,
  onConfirmDelete,
}: {
  target: HostRoomType | null;
  propertyName?: string;
  inventory: RoomTypeInventory | null;
  canManage: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onInspectRooms: () => void;
  onConfirmDelete: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!target) return null;

  const evaluation = evaluateRoomTypeDeletion(target, inventory, { canManage });

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={handleClose}
    >
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={s.deleteHeaderLeft}>
              <View
                style={[
                  s.deleteBadgeCircle,
                  evaluation.status === 'ELIGIBLE'
                    ? s.deleteBadgeDanger
                    : s.deleteBadgeWarn,
                ]}
              >
                <Feather
                  name={
                    evaluation.status === 'ELIGIBLE'
                      ? 'trash-2'
                      : evaluation.status === 'BLOCKED_ROOMS'
                      ? 'shield'
                      : 'lock'
                  }
                  size={18}
                  color={evaluation.status === 'ELIGIBLE' ? c.error : '#9A5B0A'}
                />
              </View>
              <Text style={s.sheetTitle}>{evaluation.title}</Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng hộp thoại xóa loại phòng"
              style={[s.closeBtn, busy && { opacity: 0.4 }]}
              onPress={handleClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Room Type Context Card */}
            <View style={s.contextCard}>
              <View style={s.contextIcon}>
                <Feather name="layers" size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.contextTitle} numberOfLines={2}>
                  {target.roomType}
                </Text>
                {propertyName ? (
                  <Text style={s.contextSub} numberOfLines={1}>
                    {propertyName}
                  </Text>
                ) : null}
              </View>
            </View>

            {evaluation.status === 'BLOCKED_ROOMS' ? (
              <>
                <Text style={s.bodyCopy}>{evaluation.message}</Text>

                {/* Mini Room Stats */}
                <View style={s.statsRow}>
                  <View style={s.statBox}>
                    <Text style={s.statValue}>{evaluation.roomCount}</Text>
                    <Text style={s.statLabel}>Tổng phòng</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={[s.statValue, { color: c.primary }]}>
                      {evaluation.vacantCount != null ? evaluation.vacantCount : '—'}
                    </Text>
                    <Text style={s.statLabel}>Còn trống</Text>
                  </View>
                  <View style={s.statBox}>
                    <Text style={s.statValue}>
                      {evaluation.occupiedCount != null ? evaluation.occupiedCount : '—'}
                    </Text>
                    <Text style={s.statLabel}>Đang thuê</Text>
                  </View>
                  {evaluation.otherCount != null && evaluation.otherCount > 0 ? (
                    <View style={s.statBox}>
                      <Text style={s.statValue}>{evaluation.otherCount}</Text>
                      <Text style={s.statLabel}>Khác</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.guardNotice}>
                  <Feather name="info" size={15} color={c.primary} style={{ marginTop: 2 }} />
                  <Text style={s.guardNoticeText}>
                    Hệ thống không tự xóa phòng, không tự chuyển loại phòng đang thuê và không
                    làm thay đổi hợp đồng hay lịch sử thuê đang có.
                  </Text>
                </View>
              </>
            ) : evaluation.status === 'BLOCKED_PERMISSION' ? (
              <Text style={s.bodyCopy}>{evaluation.message}</Text>
            ) : (
              <>
                <Text style={s.bodyCopy}>{evaluation.message}</Text>

                <View style={s.dangerWarningBox}>
                  <Feather name="alert-triangle" size={16} color={c.error} style={{ marginTop: 2 }} />
                  <Text style={s.dangerWarningText}>{evaluation.warning}</Text>
                </View>

                <InlineError message={error} />
              </>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          {evaluation.status === 'BLOCKED_ROOMS' ? (
            <View style={s.stackedFooter}>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.primaryFullBtn}
                accessibilityLabel="Xem các phòng liên quan"
                onPress={onInspectRooms}
              >
                <Feather name="key" size={16} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>Xem các phòng liên quan</Text>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.secondaryFullBtn}
                accessibilityLabel="Đóng"
                onPress={handleClose}
              >
                <Text style={s.secondaryBtnText}>Đóng</Text>
              </AnimatedPressable>
            </View>
          ) : evaluation.status === 'BLOCKED_PERMISSION' ? (
            <View style={s.stackedFooter}>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.secondaryFullBtn}
                accessibilityLabel="Đóng"
                onPress={handleClose}
              >
                <Text style={s.secondaryBtnText}>Đóng</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <View style={s.sheetFooter}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
                accessibilityLabel="Hủy xóa loại phòng"
                onPress={handleClose}
              >
                <Text style={s.secondaryBtnText}>Hủy</Text>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={[s.dangerBtn, busy && { opacity: 0.85 }]}
                accessibilityLabel="Xác nhận xóa loại phòng"
                accessibilityState={{ busy, disabled: busy }}
                onPress={onConfirmDelete}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                )}
                <Text style={s.primaryBtnText}>
                  {busy ? 'Đang xóa…' : 'Xác nhận xóa'}
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Grouped Amenities Multi-Select Sheet (Cancel vs Apply)                   */
/* -------------------------------------------------------------------------- */

export function RoomTypeAmenitiesSheet({
  visible,
  selected,
  onClose,
  onApply,
}: {
  visible: boolean;
  selected: readonly string[];
  onClose: () => void;
  onApply: (next: string[]) => void;
}) {
  if (!visible) return null;
  return (
    <RoomTypeAmenitiesSheetContent
      initialSelected={selected}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function RoomTypeAmenitiesSheetContent({
  initialSelected,
  onClose,
  onApply,
}: {
  initialSelected: readonly string[];
  onClose: () => void;
  onApply: (next: string[]) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [draft, setDraft] = useState<string[]>(() => [...initialSelected]);
  const [search, setSearch] = useState('');

  const totalCatalogCount = Object.keys(ROOM_AMENITY_LABELS).length;
  const groups = useMemo(() => filterAmenityGroups(search), [search]);
  const selectedSet = useMemo(() => new Set(draft), [draft]);

  const toggleKey = (key: string) => {
    triggerHaptic('selection');
    setDraft(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '88%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>Tiện nghi trong phòng</Text>
              <Text style={s.sheetSub}>
                Đã chọn {draft.length}/{totalCatalogCount} tiện nghi
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng danh sách tiện nghi"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          {/* Search Bar + Quick Clear */}
          <View style={s.searchRow}>
            <View style={s.searchInputBox}>
              <Feather name="search" size={16} color={c.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm tiện nghi (VD: điều hòa, wifi…)"
                placeholderTextColor={c.placeholder}
                accessibilityLabel="Tìm tiện nghi"
                style={s.searchInput}
              />
              {search.length > 0 && (
                <AnimatedPressable
                  accessibilityLabel="Xóa từ khóa tìm tiện nghi"
                  style={s.searchClearBtn}
                  onPress={() => setSearch('')}
                >
                  <Feather name="x" size={14} color={c.textSecondary} />
                </AnimatedPressable>
              )}
            </View>
            {draft.length > 0 && (
              <AnimatedPressable
                scaleTo={0.97}
                accessibilityLabel="Bỏ chọn tất cả tiện nghi"
                style={s.clearAllChip}
                onPress={() => setDraft([])}
              >
                <Text style={s.clearAllText}>Bỏ chọn</Text>
              </AnimatedPressable>
            )}
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 18, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {groups.length === 0 ? (
              <View style={s.emptySearch}>
                <Feather name="search" size={22} color={c.textMuted} />
                <Text style={s.emptySearchText}>Không tìm thấy tiện nghi phù hợp.</Text>
              </View>
            ) : (
              groups.map(group => {
                const groupSelectedCount = group.keys.filter(k => selectedSet.has(k)).length;
                return (
                  <View key={group.id} style={{ gap: 8 }}>
                    <View style={s.groupHeaderRow}>
                      <Text style={s.groupHeaderTitle}>{group.title}</Text>
                      <Text style={s.groupHeaderCount}>
                        {groupSelectedCount}/{group.keys.length}
                      </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      {group.keys.map(key => {
                        const checked = selectedSet.has(key);
                        const label = roomAmenityLabel(key);
                        return (
                          <AnimatedPressable
                            key={key}
                            scaleTo={0.99}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked }}
                            accessibilityLabel={label}
                            style={[s.checkRow, checked && s.checkRowActive]}
                            onPress={() => toggleKey(key)}
                          >
                            <View style={[s.checkBox, checked && s.checkBoxActive]}>
                              {checked && <Feather name="check" size={13} color="#FFFFFF" />}
                            </View>
                            <Text
                              style={[
                                s.checkLabel,
                                checked && { color: c.forestInk, fontWeight: '700' },
                              ]}
                            >
                              {label}
                            </Text>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Cancel vs Apply Footer */}
          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.secondaryBtn}
              accessibilityLabel="Hủy thay đổi tiện nghi"
              onPress={onClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.primaryBtn}
              accessibilityLabel={`Áp dụng ${draft.length} tiện nghi`}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={s.primaryBtnText}>Áp dụng ({draft.length})</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Editor Fullscreen Lightbox Modal (Server + Local Photos)                 */
/* -------------------------------------------------------------------------- */

export interface EditorPreviewPhotoItem {
  key: string;
  uri: string;
  requiresAuth: boolean;
  isCover: boolean;
  isNew: boolean;
  fileName?: string;
  canMakeCover: boolean;
}

export function RoomTypePhotoFullscreenModal({
  items,
  initialIndex,
  imageToken,
  disabled,
  onClose,
  onMakeCover,
  onReplace,
  onRemove,
}: {
  items: EditorPreviewPhotoItem[];
  initialIndex: number;
  imageToken: string | null;
  disabled: boolean;
  onClose: () => void;
  onMakeCover: (item: EditorPreviewPhotoItem) => void;
  onReplace: (item: EditorPreviewPhotoItem) => void;
  onRemove: (item: EditorPreviewPhotoItem) => void;
}) {
  const reduced = useReducedMotionPreference();
  const listRef = useRef<FlatList<EditorPreviewPhotoItem>>(null);
  const target = useRef<number | null>(null);
  const safeInit = Math.min(Math.max(initialIndex, 0), Math.max(0, items.length - 1));
  const [index, setIndex] = useState(safeInit);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  if (items.length === 0) return null;
  const clampedIndex = Math.min(index, items.length - 1);
  const activeItem = items[clampedIndex];

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
      <SafeAreaView style={s.viewerScreen}>
        <View style={s.viewerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.viewerTitle}>
              Ảnh {clampedIndex + 1}/{items.length}
            </Text>
            {activeItem.isCover && (
              <View style={s.viewerCoverPill}>
                <Text style={s.viewerCoverPillText}>Ảnh đại diện</Text>
              </View>
            )}
            <View style={s.viewerSourcePill}>
              <Text style={s.viewerSourcePillText}>
                {activeItem.isNew ? 'Ảnh mới' : 'Đã lưu'}
              </Text>
            </View>
          </View>
          <AnimatedPressable
            accessibilityLabel="Đóng xem ảnh"
            style={s.closeBtn}
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
              key={`${viewport.width}:${viewport.height}:${items.length}`}
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
                <View style={{ width: viewport.width, height: viewport.height, padding: 16 }}>
                  <Image
                    source={
                      item.requiresAuth && imageToken
                        ? { uri: item.uri, headers: { Authorization: `Bearer ${imageToken}` } }
                        : { uri: item.uri }
                    }
                    contentFit="contain"
                    cachePolicy={item.requiresAuth ? 'none' : 'memory-disk'}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              )}
            />
          )}
        </View>

        {items.length > 1 && (
          <View style={s.viewerNavRow}>
            <AnimatedPressable
              accessibilityLabel="Ảnh trước"
              disabled={clampedIndex === 0}
              style={[s.viewerNavBtn, clampedIndex === 0 && { opacity: 0.35 }]}
              onPress={() => move(clampedIndex - 1)}
            >
              <Feather name="chevron-left" size={20} color={c.primary} />
            </AnimatedPressable>
            <Text style={s.viewerCaption} numberOfLines={1}>
              {activeItem.fileName || 'Vuốt ngang để chuyển ảnh'}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Ảnh tiếp theo"
              disabled={clampedIndex === items.length - 1}
              style={[s.viewerNavBtn, clampedIndex === items.length - 1 && { opacity: 0.35 }]}
              onPress={() => move(clampedIndex + 1)}
            >
              <Feather name="chevron-right" size={20} color={c.primary} />
            </AnimatedPressable>
          </View>
        )}

        {/* Contextual Actions for Active Photo */}
        <View style={s.viewerActionBar}>
          {activeItem.canMakeCover && (
            <AnimatedPressable
              scaleTo={0.97}
              disabled={disabled}
              style={s.viewerActionBtn}
              onPress={() => {
                onMakeCover(activeItem);
                setIndex(0);
              }}
            >
              <Feather name="star" size={15} color={c.primary} />
              <Text style={s.viewerActionText}>Đặt làm bìa</Text>
            </AnimatedPressable>
          )}
          <AnimatedPressable
            scaleTo={0.97}
            disabled={disabled}
            style={s.viewerActionBtn}
            onPress={() => {
              onClose();
              onReplace(activeItem);
            }}
          >
            <Feather name="refresh-cw" size={15} color={c.forestInk} />
            <Text style={s.viewerActionText}>Thay ảnh</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.97}
            disabled={disabled}
            style={[s.viewerActionBtn, s.viewerActionDanger]}
            onPress={() => {
              onRemove(activeItem);
              if (items.length <= 1) onClose();
              else if (clampedIndex >= items.length - 1) setIndex(Math.max(0, clampedIndex - 1));
            }}
          >
            <Feather name="trash-2" size={15} color={c.error} />
            <Text style={[s.viewerActionText, { color: c.error }]}>Xóa ảnh</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.48)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.xl,
    paddingTop: 10,
    paddingBottom: authSpacing.lg,
    maxHeight: '84%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
  },
  sheetSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  actionList: {
    gap: 8,
    paddingBottom: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 58,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 58,
    borderRadius: authRadius.lg,
    backgroundColor: c.errorBackground,
    borderWidth: 1,
    borderColor: '#F5C2C0',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FCE5E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  actionLabelDanger: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.error,
  },
  actionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textSecondary,
    marginTop: 1,
  },
  countPill: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: 4,
  },
  deleteHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeDanger: {
    backgroundColor: c.errorBackground,
  },
  deleteBadgeWarn: {
    backgroundColor: '#FEF6E7',
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  contextSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  bodyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: c.forestInk,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  guardNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 12,
  },
  guardNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  dangerWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.errorBackground,
    borderWidth: 1,
    borderColor: '#F5C2C0',
    borderRadius: authRadius.md,
    padding: 12,
  },
  dangerWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8E1F1F',
  },
  stackedFooter: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  primaryFullBtn: {
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryFullBtn: {
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  primaryBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.forestInk,
    paddingVertical: 8,
  },
  searchClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptySearchText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupHeaderTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  groupHeaderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  checkRowActive: {
    backgroundColor: '#EFF7F4',
    borderColor: c.primary,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.textMuted,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: c.forestInk,
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
    fontSize: 16,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  viewerCoverPill: {
    backgroundColor: c.primary,
    borderRadius: authRadius.round,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  viewerCoverPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewerSourcePill: {
    backgroundColor: c.softMint,
    borderRadius: authRadius.round,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  viewerSourcePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primaryDark,
  },
  viewerNavRow: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  viewerNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCaption: {
    flex: 1,
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
  },
  viewerActionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  viewerActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  viewerActionDanger: {
    backgroundColor: c.errorBackground,
    borderColor: '#F5C2C0',
  },
  viewerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
});
