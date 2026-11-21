import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError, hostRequest, type HostRoomType } from '@/services/host';
import { updateHostType } from '@/services/host-type-upload';
import { typePayload, validateTypeDraft, type TypeDraft } from '@/services/host-edit';
import {
  availabilityPresentation,
  canConfirmRoomTypeAvailability,
  confirmRoomTypeAvailability,
  roomTypeInventory,
  roomTypeOperationalStatus,
} from '@/services/host-room-types';
import { Action, HostPage, h } from '@/components/host/host-ui';
import { AvailabilityConfirmSheet } from '@/components/host/room-types-sheets';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { authColors as c, authRadius } from '@/components/auth/tokens';

const empty: TypeDraft = { roomType: '', areaSqm: '', capacity: '', price: '' };
const draft = (v: HostRoomType): TypeDraft => ({
  roomType: v.roomType,
  areaSqm: String(v.areaSqm ?? ''),
  capacity: String(v.capacity ?? ''),
  price: String(v.price ?? ''),
});

export default function RoomType() {
  const params = useLocalSearchParams<{ id?: string; propertyId: string }>();
  const { user } = useAuth();
  return (
    <HostPage title={params.id ? 'Chỉnh sửa loại phòng' : 'Thêm loại phòng'}>
      <TypeForm
        key={`${user?.userId}:${params.id || 'new'}:${params.propertyId}`}
        id={params.id ? Number(params.id) : undefined}
        propertyId={Number(params.propertyId)}
      />
    </HostPage>
  );
}

function TypeForm({ id, propertyId }: { id?: number; propertyId: number }) {
  const host = useHost();
  const [form, setForm] = useState(empty);
  const [baseline, setBaseline] = useState(empty);
  const [original, setOriginal] = useState<HostRoomType>();
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [discard, setDiscard] = useState<(() => void) | null>(null);

  // Availability confirmation sheet state for detail view
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

  const lock = useRef(false);
  const confirmLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const property =
    host.data.roomTypes?.properties?.find(p => p.propertyId === propertyId) ||
    host.data.properties?.records.find(p => p.propertyId === propertyId);

  const propertyRooms = useMemo(
    () => host.data.rooms?.rooms.filter(r => r.propertyId === propertyId),
    [host.data.rooms?.rooms, propertyId]
  );

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 20000);
    void (async () => {
      try {
        const token = await tokenStore.get();
        const value = await hostRequest<HostRoomType>(
          `/host/room-types/${id}`,
          token || '',
          controller.signal
        );
        if (value.propertyId !== propertyId) {
          throw new Error('Loại phòng không thuộc nhà trọ đã chọn.');
        }
        if (active && !controller.signal.aborted) {
          setOriginal(value);
          setForm(draft(value));
          setBaseline(draft(value));
        }
      } catch (e) {
        if (active) {
          setError(
            controller.signal.aborted
              ? 'Tải dữ liệu quá lâu. Vui lòng thử lại.'
              : e instanceof Error
              ? e.message
              : 'Chưa tải được loại phòng.'
          );
        }
      } finally {
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, propertyId, attempt]);

  const canEdit = Boolean(
    property &&
      ('status' in property
        ? property.status === 'ACTIVE'
        : ['ACTIVE', 'VISIBLE'].includes(property.displayStatus))
  );
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  usePreventRemove((dirty && !saved) || busy || confirmBusy, ({ repeat }) => {
    if (!busy && !confirmBusy) setDiscard(() => repeat);
  });

  useEffect(() => {
    if (saved) {
      if (router.canGoBack()) router.back();
      else router.replace('/host/room-types');
    }
  }, [saved]);

  const save = async () => {
    if (lock.current || !property || !canEdit || loading || (id && !original)) return;
    const next = validateTypeDraft(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const body = typePayload(propertyId, form, original);
    try {
      await host.store.mutate(
        id ? `/host/room-types/${id}` : '/host/room-types',
        body,
        id ? 'PUT' : 'POST',
        undefined,
        id
          ? async (token, signal) => {
              const latest = await hostRequest<HostRoomType>(
                `/host/room-types/${id}`,
                token,
                signal
              );
              if (
                latest.propertyId !== propertyId ||
                JSON.stringify(typePayload(propertyId, draft(latest), latest)) !==
                  JSON.stringify(typePayload(propertyId, draft(original!), original))
              ) {
                if (mounted.current) {
                  setOriginal(latest);
                  setForm(draft(latest));
                  setBaseline(draft(latest));
                }
                throw new HostError(
                  'Loại phòng đã thay đổi. Đã tải lại dữ liệu; kiểm tra trước khi lưu lại.',
                  409
                );
              }
              return updateHostType(id, body, token, signal);
            }
          : undefined
      );
      if (mounted.current) setSaved(true);
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Chưa thể lưu loại phòng.');
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const handleConfirmAvailability = async () => {
    if (!id || !original || confirmLock.current) return;
    confirmLock.current = true;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      let confirmed: HostRoomType | null = null;
      await host.store.mutate(
        `/host/room-types/${id}/availability-confirmation`,
        undefined,
        'POST',
        undefined,
        async (token, signal) => {
          confirmed = await confirmRoomTypeAvailability(id, token, signal);
          return confirmed;
        }
      );
      if (mounted.current) {
        if (confirmed) {
          setOriginal(prev => (prev ? { ...prev, ...confirmed } : confirmed!));
        }
        setConfirmOpen(false);
        setConfirmNotice('Đã xác nhận tình trạng phòng trống.');
      }
    } catch (e) {
      if (mounted.current) {
        setConfirmError(
          e instanceof Error ? e.message : 'Không thể xác nhận tình trạng phòng. Vui lòng thử lại.'
        );
      }
    } finally {
      confirmLock.current = false;
      if (mounted.current) setConfirmBusy(false);
    }
  };

  if (loading) {
    return (
      <Text style={h.secondary} accessibilityRole="progressbar">
        Đang tải loại phòng…
      </Text>
    );
  }

  if (!property || (id && !original)) {
    return (
      <View style={{ gap: 12 }}>
        <Text style={h.secondary}>
          {error || 'Chưa tải được nhà trọ hoặc loại phòng trong tài khoản này.'}
        </Text>
        <PrimaryButton
          title="Thử lại"
          onPress={() => {
            setLoading(Boolean(id));
            setError(null);
            setAttempt(v => v + 1);
            void host.store.refresh();
          }}
        />
      </View>
    );
  }

  const inventory = original ? roomTypeInventory(original, propertyRooms) : null;
  const opStatus = inventory ? roomTypeOperationalStatus(inventory) : null;
  const canConfirm = inventory ? canConfirmRoomTypeAvailability(inventory) : false;
  const availability = original ? availabilityPresentation(original) : null;

  return (
    <>
      <View style={h.card}>
        <Text style={h.small}>Nhà trọ đang thao tác</Text>
        <Text style={h.itemTitle}>{property.name}</Text>
      </View>

      {/* Detail Quick Overview & Actions (when viewing an existing room type) */}
      {id && original && inventory && opStatus && availability && (
        <View style={s.summaryCard}>
          <View style={s.badgesRow}>
            <View style={s.opBadge}>
              <Text style={s.opBadgeText}>{opStatus.label}</Text>
            </View>
            {canConfirm && (
              <View
                style={[
                  s.availBadge,
                  availability.state === 'CURRENT' ? s.availCurrent : s.availPending,
                ]}
              >
                <Feather
                  name={
                    availability.state === 'CURRENT'
                      ? 'check-circle'
                      : availability.state === 'STALE'
                      ? 'alert-triangle'
                      : 'clock'
                  }
                  size={12}
                  color={availability.state === 'CURRENT' ? c.primary : '#9A5B0A'}
                />
                <Text
                  style={[
                    s.availBadgeText,
                    { color: availability.state === 'CURRENT' ? c.primary : '#9A5B0A' },
                  ]}
                >
                  {availability.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={s.inventorySummary}>
            {inventory.total === 0
              ? 'Chưa có phòng thực tế'
              : `${inventory.total ?? '—'} phòng · ${inventory.vacant ?? '—'} trống · ${
                  inventory.occupied ?? '—'
                } đang thuê${inventory.other ? ` · ${inventory.other} khác` : ''}`}
          </Text>

          {canConfirm && (
            <View style={s.confirmRow}>
              <Text style={s.confirmSub}>{availability.detail}</Text>
              <AnimatedPressable
                scaleTo={0.97}
                disabled={busy || confirmBusy}
                style={s.confirmChipBtn}
                accessibilityLabel="Xác nhận tình trạng phòng"
                onPress={() => {
                  setConfirmError(null);
                  setConfirmOpen(true);
                }}
              >
                <Feather name="check-circle" size={14} color={c.primary} />
                <Text style={s.confirmChipBtnText}>Xác nhận tình trạng</Text>
              </AnimatedPressable>
            </View>
          )}

          {confirmNotice && (
            <View style={s.noticePill}>
              <Feather name="check" size={13} color={c.primary} />
              <Text style={s.noticePillText}>{confirmNotice}</Text>
            </View>
          )}

          <Action
            label="Quản lý phòng"
            icon="key"
            disabled={busy || confirmBusy}
            onPress={() =>
              router.push({
                pathname: '/host/rooms',
                params: { propertyId: String(propertyId), roomTypeId: String(id) },
              })
            }
          />
        </View>
      )}

      <InlineError message={error} />

      {(['roomType', 'areaSqm', 'capacity', 'price'] as const).map(key => (
        <AuthInput
          key={key}
          label={
            {
              roomType: 'Tên loại phòng',
              areaSqm: 'Diện tích (m²)',
              capacity: 'Sức chứa (người)',
              price: 'Giá thuê (₫/tháng)',
            }[key]
          }
          accessibilityLabel={
            {
              roomType: 'Tên loại phòng',
              areaSqm: 'Diện tích (m²)',
              capacity: 'Sức chứa (người)',
              price: 'Giá thuê (₫/tháng)',
            }[key]
          }
          value={form[key]}
          maxLength={key === 'roomType' ? 100 : 12}
          keyboardType={
            key === 'roomType' ? 'default' : key === 'areaSqm' ? 'decimal-pad' : 'number-pad'
          }
          editable={!busy && canEdit}
          error={errors[key]}
          onChangeText={value => {
            setForm(v => ({ ...v, [key]: value }));
            setErrors(e => ({ ...e, [key]: '' }));
          }}
        />
      ))}

      <Text style={h.secondary}>
        Giá này là cấu hình của loại phòng. Giá riêng của từng phòng và hợp đồng không được tự động
        thay đổi. Ảnh, tiện nghi và các khoản phí hiện tại được giữ nguyên.
      </Text>

      <PrimaryButton
        title="Lưu loại phòng"
        loading={busy}
        disabled={host.busy || host.loading || busy || !canEdit}
        onPress={() => {
          void save();
        }}
      />

      {discard && (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Thông tin loại phòng chưa được lưu."
          confirmLabel="Bỏ thay đổi"
          onCancel={() => setDiscard(null)}
          onConfirm={() => {
            const leave = discard;
            setDiscard(null);
            leave();
          }}
        />
      )}

      <AvailabilityConfirmSheet
        target={confirmOpen && original ? original : null}
        propertyName={property.name}
        inventory={inventory}
        busy={confirmBusy}
        error={confirmError}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmOpen(false);
            setConfirmError(null);
          }
        }}
        onInspectRooms={() => {
          if (confirmBusy || !id) return;
          setConfirmOpen(false);
          setConfirmError(null);
          router.push({
            pathname: '/host/rooms',
            params: { propertyId: String(propertyId), roomTypeId: String(id) },
          });
        }}
        onConfirm={() => {
          void handleConfirmAvailability();
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  opBadge: {
    backgroundColor: c.softMint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  opBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: c.primary,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  availCurrent: {
    backgroundColor: '#E8F5EE',
    borderColor: '#CBE6D8',
  },
  availPending: {
    backgroundColor: '#FEF6E7',
    borderColor: '#F7DFB3',
  },
  availBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  inventorySummary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  confirmSub: {
    flex: 1,
    minWidth: 130,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  confirmChipBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmChipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  noticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5EE',
    borderRadius: authRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noticePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.primaryDark,
  },
});
