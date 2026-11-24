import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { HostProperty } from '@/services/host';
import { formatHostDate } from '@/services/host';
import {
  documentStatus,
  listingLabels,
  propertyAddress,
  propertyAmenities,
  propertyCoordinates,
  propertyFields,
  propertyRule,
} from '@/services/host-property';
import { resolvePropertyChangeEntry } from '@/services/property-change';
import { hasPropertyChangeDraft } from '@/services/property-change-draft';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { Segments } from './management-ui';
import { HostPropertyGallery } from './property-gallery';

type FeatherName = ComponentProps<typeof Feather>['name'];

function getBadgeStyle(status: string, reverificationRequired?: boolean) {
  if (reverificationRequired || status === 'PENDING' || status === 'NEEDS_SUPPLEMENT') {
    return { bg: '#FEF6E7', fg: '#9A5B0A', border: '#F7DFB3', icon: 'clock' as FeatherName };
  }
  if (status === 'REJECTED') {
    return { bg: '#FDF2F2', fg: c.error, border: '#F8B4B4', icon: 'x-circle' as FeatherName };
  }
  if (status === 'VISIBLE' || status === 'APPROVED') {
    return { bg: '#E8F5EE', fg: c.primary, border: '#CBE6D8', icon: 'check-circle' as FeatherName };
  }
  return { bg: '#F1F5F3', fg: c.textSecondary, border: '#DCE5E1', icon: 'eye-off' as FeatherName };
}

export function PropertyDetailContent({ record }: { record: HostProperty }) {
  const { user } = useAuth();
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const [section, setSection] = useState<'info' | 'location' | 'documents'>('info');
  const [hasLocalChangeDraft, setHasLocalChangeDraft] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const sectionsY = useRef(0);

  const draftUserId = user?.userId ?? null;
  const draftRegId = record.changeRequest?.registrationId ?? record.registrationId ?? null;

  useFocusEffect(
    useCallback(() => {
      let ignore = false;
      async function checkDraft() {
        if (!draftUserId || !draftRegId) {
          if (!ignore) setHasLocalChangeDraft(false);
          return;
        }
        const exists = await hasPropertyChangeDraft(draftUserId, draftRegId);
        if (!ignore) setHasLocalChangeDraft(exists);
      }
      void checkDraft();
      return () => {
        ignore = true;
      };
    }, [draftUserId, draftRegId])
  );

  const changeEntry = useMemo(
    () => resolvePropertyChangeEntry(record, hasLocalChangeDraft),
    [record, hasLocalChangeDraft]
  );

  const handleOpenPropertyChange = () => {
    if (!changeEntry.visible || !changeEntry.registrationId) return;
    router.push({
      pathname: '/host/property-change',
      params: {
        registrationId: String(changeEntry.registrationId),
        ...(changeEntry.propertyId ? { propertyId: String(changeEntry.propertyId) } : {}),
        ...(changeEntry.mode === 'status' ? { mode: 'status' } : {}),
      },
    });
  };

  const changeSection = (next: string) => {
    setSection(next as 'info' | 'location' | 'documents');
    if (scrollY.current > sectionsY.current) {
      scroll.current?.scrollTo({ y: sectionsY.current, animated: false });
    }
  };

  const badgeStyle = getBadgeStyle(record.displayStatus, record.reverificationRequired);
  const statusText = record.reverificationRequired
    ? 'Chờ tái xác minh'
    : listingLabels[record.displayStatus] || record.displayStatus;

  const isApproved = ['VISIBLE', 'APPROVED'].includes(record.displayStatus);
  const activeFieldNotes = useMemo(
    () => (record.displayStatus === 'NEEDS_SUPPLEMENT' ? record.fieldNotes || {} : {}),
    [record.displayStatus, record.fieldNotes]
  );

  // Only show review feedback when NOT already approved/visible
  const showReviewBanner = Boolean(
    !isApproved &&
      !record.reverificationRequired &&
      ['PENDING', 'NEEDS_SUPPLEMENT', 'REJECTED'].includes(record.displayStatus)
  );

  return (
    <ScrollView
      ref={scroll}
      style={s.scroll}
      onScroll={e => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={32}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[2]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={host.loading}
          onRefresh={() => {
            void host.store.refresh();
          }}
          tintColor={c.primary}
          colors={[c.primary]}
        />
      }
    >
      {/* Index 0: Hero Gallery */}
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(240)}>
        <HostPropertyGallery photos={record.photos || []} verified={Boolean(record.verified)} />
      </Animated.View>

      {/* Index 1: Identity & Status Alerts */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(260).delay(40)}
        style={s.identityBlock}
      >
        <View style={s.badgeRow}>
          <View
            style={[
              s.statusBadge,
              { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
            ]}
          >
            <Feather name={badgeStyle.icon} size={13} color={badgeStyle.fg} />
            <Text style={[s.statusBadgeText, { color: badgeStyle.fg }]}>{statusText}</Text>
          </View>
        </View>

        <Text style={s.name}>{record.name}</Text>

        <View style={s.addressRow}>
          <Feather name="map-pin" size={14} color={c.primary} style={{ marginTop: 3 }} />
          <Text selectable style={s.addressText}>
            {propertyAddress(record)}
          </Text>
        </View>

        {/* Reverification Warning Banner */}
        {record.reverificationRequired && (
          <View style={[s.banner, s.bannerWarning]} accessibilityRole="alert">
            <View style={s.bannerIconBox}>
              <Feather name="alert-triangle" size={18} color="#9A5B0A" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.bannerTitle, { color: '#9A5B0A' }]}>
                Nhà trọ cần tái xác minh
              </Text>
              <Text style={s.bannerText}>
                Nhà trọ đang tạm ẩn trong khi chờ hoàn tất hồ sơ tái xác minh.
              </Text>
              {record.reverificationReasons?.length ? (
                <View style={{ gap: 3, marginTop: 2 }}>
                  {record.reverificationReasons.map((reason, idx) => (
                    <Text key={idx} style={s.bannerBullet}>
                      • {reason}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Review Feedback Banner (hidden when property is already approved/visible) */}
        {showReviewBanner && (
          <View
            style={[
              s.banner,
              record.displayStatus === 'REJECTED' ? s.bannerError : s.bannerWarning,
            ]}
          >
            <View style={s.bannerIconBox}>
              <Feather
                name={record.displayStatus === 'REJECTED' ? 'x-circle' : 'message-square'}
                size={18}
                color={record.displayStatus === 'REJECTED' ? c.error : '#9A5B0A'}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[
                  s.bannerTitle,
                  { color: record.displayStatus === 'REJECTED' ? c.error : '#9A5B0A' },
                ]}
              >
                {record.reasonNote || Object.keys(activeFieldNotes).length > 0
                  ? 'Phản hồi xét duyệt'
                  : 'Trạng thái xét duyệt'}
              </Text>
              {record.reasonNote ? <Text style={s.bannerText}>{record.reasonNote}</Text> : null}
              {record.requestedFields && record.requestedFields.length > 0 ? (
                <Text style={s.bannerMeta}>
                  Mục cần bổ sung:{' '}
                  {record.requestedFields.map(key => propertyFields[key] || key).join(' · ')}
                </Text>
              ) : null}
              {record.displayStatus === 'PENDING' ? (
                <Text style={s.bannerMeta}>
                  Hồ sơ đang được kiểm tra. Nhà trọ chưa hiển thị công khai.
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Property Change Request Entry Action Card */}
        {changeEntry.visible ? (
          <AnimatedPressable
            scaleTo={0.99}
            accessibilityRole="button"
            accessibilityLabel={`${changeEntry.ctaLabel} cho nhà trọ ${record.name}`}
            style={[
              s.changeEntryCard,
              changeEntry.tone === 'warning' && s.changeEntryWarn,
              changeEntry.tone === 'error' && s.changeEntryErr,
              changeEntry.tone === 'pending' && s.changeEntryPending,
            ]}
            onPress={handleOpenPropertyChange}
          >
            <View style={s.changeEntryTop}>
              <View style={s.changeEntryIcon}>
                <Feather
                  name={
                    changeEntry.mode === 'status'
                      ? 'clock'
                      : changeEntry.mode === 'supplement' || changeEntry.mode === 'resubmit_initial'
                        ? 'alert-triangle'
                        : 'edit-3'
                  }
                  size={16}
                  color={
                    changeEntry.tone === 'error'
                      ? c.error
                      : changeEntry.tone === 'warning'
                        ? '#9A5B0A'
                        : c.primary
                  }
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.changeEntryTitleRow}>
                  <Text style={s.changeEntryTitle} numberOfLines={1}>
                    {changeEntry.title}
                  </Text>
                  <View
                    style={[
                      s.changeEntryBadge,
                      changeEntry.tone === 'warning' && { backgroundColor: '#FEF3C7' },
                      changeEntry.tone === 'error' && { backgroundColor: '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        s.changeEntryBadgeText,
                        changeEntry.tone === 'warning' && { color: '#92400E' },
                        changeEntry.tone === 'error' && { color: '#991B1B' },
                      ]}
                    >
                      {changeEntry.badge}
                    </Text>
                  </View>
                </View>
                <Text style={s.changeEntrySub} numberOfLines={2}>
                  {changeEntry.subtitle}
                </Text>
              </View>
            </View>
            <View style={s.changeEntryFooter}>
              <Text style={s.changeEntryCta}>{changeEntry.ctaLabel}</Text>
              <Feather name="chevron-right" size={16} color={c.primary} />
            </View>
          </AnimatedPressable>
        ) : null}
      </Animated.View>

      {/* Index 2 (Sticky): Segmented Menu — 3 tabs only */}
      <View
        style={s.sectionsBar}
        onLayout={e => {
          sectionsY.current = e.nativeEvent.layout.y;
        }}
      >
        <Segments
          items={[
            ['info', 'Thông tin'],
            ['location', 'Vị trí'],
            ['documents', 'Hồ sơ'],
          ]}
          value={section}
          onChange={changeSection}
        />
      </View>

      {/* Index 3: Tab Content */}
      <View style={s.tabBody}>
        {section === 'info' ? (
          <InformationTab record={record} notesByKey={activeFieldNotes} />
        ) : section === 'location' ? (
          <LocationTab record={record} notesByKey={activeFieldNotes} />
        ) : (
          <DocumentsTab record={record} notesByKey={activeFieldNotes} />
        )}
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI Building Blocks                                                   */
/* -------------------------------------------------------------------------- */

function CardSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: FeatherName;
  children: ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderIcon}>
          <Feather name={icon} size={16} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.cardHeading}>{title}</Text>
          {subtitle ? <Text style={s.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function InfoField({
  label,
  value,
  note,
}: {
  label: string;
  value?: string | number | null;
  note?: string;
}) {
  const empty = value == null || value === '';
  return (
    <View style={[s.fieldBox, Boolean(note) && s.fieldFlagged]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text selectable style={[s.fieldValue, empty && s.fieldValueMuted]}>
        {empty ? 'Chưa cập nhật' : String(value)}
      </Text>
      {note ? <InlineNote text={note} /> : null}
    </View>
  );
}

function InlineNote({ text }: { text: string }) {
  return (
    <View style={s.inlineNote}>
      <Feather name="alert-circle" size={13} color="#9A5B0A" style={{ marginTop: 2 }} />
      <Text style={s.inlineNoteText}>
        <Text style={{ fontWeight: '700' }}>Cần bổ sung: </Text>
        {text}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 1: Thông tin                                                            */
/* -------------------------------------------------------------------------- */

function InformationTab({
  record: r,
  notesByKey,
}: {
  record: HostProperty;
  notesByKey: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const longDesc = Boolean(r.description && r.description.length > 240);

  const handleCallPhone = () => {
    if (!r.contactPhone) return;
    const cleaned = r.contactPhone.replace(/[^+0-9]/g, '');
    if (cleaned) {
      void Linking.openURL(`tel:${cleaned}`).catch(() => {});
    }
  };

  return (
    <>
      {/* Contact Card */}
      <CardSection title="Thông tin liên hệ" icon="phone">
        <InfoField label="Người quản lý" value={r.managerName} />

        <View style={s.fieldBox}>
          <Text style={s.fieldLabel}>Điện thoại</Text>
          {r.contactPhone ? (
            <AnimatedPressable
              scaleTo={0.98}
              onPress={handleCallPhone}
              accessibilityLabel={`Gọi điện thoại ${r.contactPhone}`}
              style={s.phonePill}
            >
              <Feather name="phone-call" size={14} color={c.primary} />
              <Text selectable style={s.phonePillText}>
                {r.contactPhone}
              </Text>
            </AnimatedPressable>
          ) : (
            <Text style={[s.fieldValue, s.fieldValueMuted]}>Chưa cập nhật</Text>
          )}
        </View>

        <InfoField label="Zalo" value={r.zaloPhone} />
        {r.contactInfo ? (
          <InfoField label="Thông tin liên hệ đã lưu" value={r.contactInfo} />
        ) : null}
        {notesByKey.contact ? <InlineNote text={notesByKey.contact} /> : null}
      </CardSection>

      {/* Core Property Facts Card */}
      <CardSection
        title="Thông tin nhà trọ"
        subtitle="Chi tiết loại hình, địa chỉ và khu vực cơ sở lưu trú"
        icon="home"
      >
        <InfoField label="Tên nhà trọ" value={r.name} note={notesByKey.name} />
        <InfoField label="Loại hình" value={r.propertyType} note={notesByKey.propertyType} />
        <InfoField
          label="Địa chỉ chi tiết"
          value={r.addressDetail || r.address}
          note={notesByKey.address || notesByKey.addressDetail}
        />
        <InfoField label="Xã / Khu vực" value={r.commune} note={notesByKey.commune} />
        {r.nearby || notesByKey.nearby ? (
          <InfoField label="Địa điểm lân cận" value={r.nearby} note={notesByKey.nearby} />
        ) : null}
      </CardSection>

      {/* Detailed Description Card */}
      <CardSection title="Mô tả chi tiết" icon="align-left">
        <View style={{ gap: 8 }}>
          <Text
            selectable
            style={[s.bodyText, !r.description && s.fieldValueMuted]}
            numberOfLines={longDesc && !expanded ? 5 : undefined}
          >
            {r.description || 'Chưa cập nhật mô tả.'}
          </Text>
          {longDesc && (
            <AnimatedPressable
              accessibilityLabel={expanded ? 'Thu gọn mô tả' : 'Xem thêm mô tả'}
              accessibilityState={{ expanded }}
              style={s.expandBtn}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={s.expandBtnText}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
              <Feather
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={c.primary}
              />
            </AnimatedPressable>
          )}
          {notesByKey.description ? <InlineNote text={notesByKey.description} /> : null}
        </View>
      </CardSection>

      {/* Common Amenities Card */}
      <CardSection title="Tiện ích chung" icon="check-square">
        {r.amenities?.length ? (
          <View style={s.tagsWrap}>
            {r.amenities.map((key, idx) => (
              <View key={`${key}:${idx}`} style={s.tagChip}>
                <Feather name="check" size={12} color={c.primary} />
                <Text style={s.tagChipText}>{propertyAmenities[key] || key}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.bodyText, s.fieldValueMuted]}>Chưa cập nhật tiện ích.</Text>
        )}
        {notesByKey.amenities ? <InlineNote text={notesByKey.amenities} /> : null}
      </CardSection>

      {/* House Rules Card — same color styling as Amenities */}
      <CardSection title="Quy định nhà trọ" icon="shield">
        {r.selectedRules?.length ? (
          <View style={s.tagsWrap}>
            {r.selectedRules.map((key, idx) => (
              <View key={`${key}:${idx}`} style={s.tagChip}>
                <Feather name="check" size={12} color={c.primary} />
                <Text style={s.tagChipText}>{propertyRule(key)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.bodyText, s.fieldValueMuted]}>Chưa cập nhật quy định đã chọn.</Text>
        )}
        {r.rules ? (
          <View style={s.extraRulesBox}>
            <Text style={s.extraRulesLabel}>Ghi chú quy định thêm</Text>
            <Text selectable style={s.bodyText}>
              {r.rules}
            </Text>
          </View>
        ) : null}
        {notesByKey.rules ? <InlineNote text={notesByKey.rules} /> : null}
      </CardSection>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 2: Vị trí (Removed coordinates display)                                 */
/* -------------------------------------------------------------------------- */

function LocationTab({
  record: r,
  notesByKey,
}: {
  record: HostProperty;
  notesByKey: Record<string, string>;
}) {
  const point = propertyCoordinates(r.latitude, r.longitude);
  const pointKey = point?.join(',');
  const mapUrl = pointKey ? `https://www.google.com/maps/search/?api=1&query=${pointKey}` : null;
  const directionsUrl = pointKey
    ? `https://www.google.com/maps/dir/?api=1&destination=${pointKey}`
    : null;

  const [available, setAvailable] = useState<{
    map: string;
    directions: string;
    canMap: boolean;
    canDirections: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (mapUrl && directionsUrl) {
      void Promise.all([Linking.canOpenURL(mapUrl), Linking.canOpenURL(directionsUrl)])
        .then(([canMap, canDirections]) => {
          if (active) setAvailable({ map: mapUrl, directions: directionsUrl, canMap, canDirections });
        })
        .catch(() => {
          if (active) {
            setAvailable({
              map: mapUrl,
              directions: directionsUrl,
              canMap: false,
              canDirections: false,
            });
          }
        });
    }
    return () => {
      active = false;
    };
  }, [mapUrl, directionsUrl]);

  const openExternal = async (url: string) => {
    try {
      await Linking.openURL(url);
      setError(null);
    } catch {
      setError('Chưa mở được bản đồ. Vui lòng thử lại.');
    }
  };

  return (
    <CardSection
      title="Vị trí nhà trọ"
      subtitle="Vị trí đã lưu trong hồ sơ nhà trọ của bạn"
      icon="map-pin"
    >
      <InfoField label="Địa chỉ" value={propertyAddress(r)} />
      <InfoField label="Xã / Khu vực" value={r.commune} />
      <InfoField label="Địa điểm lân cận / Ghi chú khoảng cách" value={r.nearby} />

      {notesByKey.coordinates ? <InlineNote text={notesByKey.coordinates} /> : null}

      {point ? (
        <>
          <View style={s.mapActionsRow}>
            {available?.map === mapUrl && available.canMap && (
              <AnimatedPressable
                scaleTo={0.97}
                accessibilityLabel="Xem trên bản đồ"
                style={s.mapPrimaryBtn}
                onPress={() => {
                  void openExternal(mapUrl!);
                }}
              >
                <Feather name="map" size={16} color="#FFFFFF" />
                <Text style={s.mapPrimaryBtnText}>Xem trên bản đồ</Text>
              </AnimatedPressable>
            )}

            {available?.directions === directionsUrl && available.canDirections && (
              <AnimatedPressable
                scaleTo={0.97}
                accessibilityLabel="Chỉ đường"
                style={s.mapSecondaryBtn}
                onPress={() => {
                  void openExternal(directionsUrl!);
                }}
              >
                <Feather name="navigation" size={16} color={c.primary} />
                <Text style={s.mapSecondaryBtnText}>Chỉ đường</Text>
              </AnimatedPressable>
            )}
          </View>

          {available?.map === mapUrl && !available.canMap && !available.canDirections && (
            <Text style={s.caption}>Thiết bị chưa hỗ trợ mở bản đồ.</Text>
          )}
        </>
      ) : (
        <View style={s.emptyCoordBox}>
          <Feather name="map-pin" size={16} color={c.textSecondary} />
          <Text style={s.caption}>Chưa có vị trí bản đồ đã lưu cho nhà trọ này.</Text>
        </View>
      )}

      {error && (
        <Text accessibilityRole="alert" style={[s.bodyText, { color: c.error }]}>
          {error}
        </Text>
      )}
    </CardSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 3: Hồ sơ                                                                */
/* -------------------------------------------------------------------------- */

function DocumentsTab({
  record: r,
  notesByKey,
}: {
  record: HostProperty;
  notesByKey: Record<string, string>;
}) {
  const hasBackIdCard = Boolean(r.documents?.some(doc => doc.type === 'ID_CARD_BACK'));
  const documentTypes: [string, string][] = [
    ['OWNERSHIP', 'Giấy phép kinh doanh'],
    ['ID_CARD', 'Căn cước công dân (CCCD / CMND) chủ trọ'],
    ...(hasBackIdCard ? ([['ID_CARD_BACK', 'Mặt sau CCCD chủ trọ']] as [string, string][]) : []),
    ['FIRE_SAFETY', 'Chứng nhận an toàn PCCC'],
  ];
  const knownTypeKeys = new Set(documentTypes.map(([type]) => type));
  const extraDocuments = r.documents?.filter(doc => !knownTypeKeys.has(doc.type || '')) || [];

  return (
    <>
      {/* Submitted Documents Card */}
      <CardSection
        title="Giấy tờ đã gửi"
        subtitle="Hồ sơ pháp lý lưu trữ bảo mật riêng cho Chủ trọ"
        icon="file-text"
      >
        <View style={{ gap: 10 }}>
          {documentTypes.map(([type, label]) => {
            const files = r.documents?.filter(doc => doc.type === type) || [];
            const primaryFile = files[0];
            const flagged = Boolean(notesByKey[type]);
            const isApproved =
              primaryFile && ['APPROVED', 'VERIFIED'].includes(primaryFile.verificationStatus || '');
            const isRejected = primaryFile?.verificationStatus === 'REJECTED';

            const statusColor = flagged
              ? '#9A5B0A'
              : isApproved
              ? c.primary
              : isRejected
              ? c.error
              : primaryFile
              ? '#9A5B0A'
              : c.textSecondary;

            const statusBg = flagged
              ? '#FEF6E7'
              : isApproved
              ? '#E8F5EE'
              : isRejected
              ? '#FDF2F2'
              : primaryFile
              ? '#FEF6E7'
              : '#F1F5F3';

            const statusText = flagged
              ? 'Cần bổ sung theo yêu cầu Staff'
              : isApproved
              ? 'Đã duyệt'
              : isRejected
              ? 'Tài liệu chưa hợp lệ'
              : primaryFile
              ? documentStatus(primaryFile.verificationStatus)
              : r.documents
              ? 'Chưa đính kèm'
              : 'Chưa có dữ liệu giấy tờ';

            return (
              <View key={type} style={[s.docCard, flagged && s.fieldFlagged]}>
                <View style={s.docHeader}>
                  <View style={[s.docIconBox, { backgroundColor: statusBg }]}>
                    <Feather
                      name={isApproved ? 'check-circle' : isRejected || flagged ? 'alert-circle' : 'file-text'}
                      size={17}
                      color={statusColor}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.docTitle}>{label}</Text>
                    <View style={[s.docStatusPill, { backgroundColor: statusBg }]}>
                      <Text style={[s.docStatusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>
                </View>

                {files.length > 0 && (
                  <View style={s.docFilesList}>
                    {files.map(file =>
                      file.fileName ? (
                        <View key={file.documentId} style={s.docFileRow}>
                          <Feather name="paperclip" size={12} color={c.textSecondary} />
                          <Text selectable style={s.docFileName} numberOfLines={1}>
                            {file.fileName}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                )}

                {notesByKey[type] ? <InlineNote text={notesByKey[type]} /> : null}
              </View>
            );
          })}

          {extraDocuments.map(doc => (
            <View key={doc.documentId} style={s.docCard}>
              <Text style={s.docTitle}>{doc.type || 'Tài liệu khác'}</Text>
              <Text style={s.caption}>
                {documentStatus(doc.verificationStatus)}
                {doc.fileName ? ` · ${doc.fileName}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.privacyBox}>
          <Feather name="lock" size={14} color={c.primary} style={{ marginTop: 1 }} />
          <Text style={s.privacyText}>
            Tài liệu được lưu trữ riêng tư, phục vụ xét duyệt nội bộ và không hiển thị công khai tới
            người tìm phòng.
          </Text>
        </View>
      </CardSection>

      {/* Timestamps Card */}
      <CardSection title="Thời gian hồ sơ" icon="clock">
        <View style={s.datesRow}>
          <View style={s.dateTile}>
            <Text style={s.fieldLabel}>Ngày khởi tạo</Text>
            <Text style={s.dateValue}>
              {r.createdAt ? formatHostDate(r.createdAt) : 'Chưa cập nhật'}
            </Text>
          </View>
          <View style={s.dateTile}>
            <Text style={s.fieldLabel}>Cập nhật gần nhất</Text>
            <Text style={s.dateValue}>
              {r.updatedAt ? formatHostDate(r.updatedAt) : 'Chưa cập nhật'}
            </Text>
          </View>
        </View>
      </CardSection>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.xs,
    paddingBottom: 32,
    gap: 16,
  },
  identityBlock: {
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: authRadius.xl,
    borderWidth: 1,
    marginTop: 4,
  },
  bannerWarning: {
    backgroundColor: '#FEF9EE',
    borderColor: '#F6DFB0',
  },
  bannerError: {
    backgroundColor: c.errorLight,
    borderColor: c.errorBorder,
  },
  bannerIconBox: {
    marginTop: 2,
  },
  bannerTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  bannerMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  bannerBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  sectionsBar: {
    backgroundColor: c.background,
    paddingVertical: 6,
  },
  tabBody: {
    gap: 14,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 14,
    shadowColor: c.forestInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  cardBody: {
    gap: 12,
  },
  fieldBox: {
    gap: 3,
  },
  fieldFlagged: {
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#F6DFB0',
    borderRadius: authRadius.md,
    padding: 10,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.textSecondary,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: c.forestInk,
  },
  fieldValueMuted: {
    color: c.textMuted,
    fontWeight: '400',
  },
  phonePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    marginTop: 2,
  },
  phonePillText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.forestInk,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 40,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#D4E8E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
  },
  tagChipText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.primaryDark,
  },
  extraRulesBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 4,
  },
  extraRulesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  inlineNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    backgroundColor: '#FEF6E7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: authRadius.sm,
  },
  inlineNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#7C4908',
  },
  mapActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  mapPrimaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapSecondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  emptyCoordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    padding: 12,
  },
  docCard: {
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 8,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  docStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  docStatusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  docFilesList: {
    gap: 4,
    paddingTop: 2,
  },
  docFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docFileName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTile: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 4,
  },
  dateValue: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  changeEntryCard: {
    marginTop: 4,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C5E3DC',
    padding: 14,
    gap: 10,
  },
  changeEntryPending: {
    backgroundColor: '#F4FBF9',
    borderColor: '#B5DFD6',
  },
  changeEntryWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  changeEntryErr: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  changeEntryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  changeEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeEntryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  changeEntryTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  changeEntryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  changeEntryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
  },
  changeEntrySub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  changeEntryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  changeEntryCta: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
});
