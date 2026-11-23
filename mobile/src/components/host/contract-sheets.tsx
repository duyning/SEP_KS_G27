import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  contractManagementMeta,
  contractTitle,
  evaluateSignatureProgress,
  formatContractIsoDate,
  formatSigningTimestamp,
  isInvitationExpired,
  maskPhoneForPreview,
  type ActiveSigningInvitation,
  type ContractTocItem,
  type RentalContractRecord,
} from '@/services/rental-contracts';

/* -------------------------------------------------------------------------- */
/* 1. Invite Tenant to Sign Confirmation Sheet (POST /{id}/signing-link)      */
/* -------------------------------------------------------------------------- */

export function ContractInviteSheet({
  visible,
  contract,
  invitation,
  busy,
  error,
  onClose,
  onCreateInvite,
}: {
  visible: boolean;
  contract: RentalContractRecord | null;
  invitation: ActiveSigningInvitation | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreateInvite: () => void;
}) {
  if (!visible || !contract) return null;
  return (
    <ContractInviteSheetContent
      key={`${contract.id}:${invitation?.expiresAt || 'none'}`}
      contract={contract}
      invitation={invitation}
      busy={busy}
      error={error}
      onClose={onClose}
      onCreateInvite={onCreateInvite}
    />
  );
}

function ContractInviteSheetContent({
  contract,
  invitation,
  busy,
  error,
  onClose,
  onCreateInvite,
}: {
  contract: RentalContractRecord;
  invitation: ActiveSigningInvitation | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreateInvite: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const [shareNote, setShareNote] = useState<string | null>(null);

  const sig = evaluateSignatureProgress(contract);
  const expired = isInvitationExpired(invitation);
  const hasActiveLink = Boolean(invitation && !expired);
  const title = contractTitle(contract);

  const handleShareLink = async () => {
    if (!invitation || expired) return;
    setShareNote(null);
    try {
      await Share.share({
        title: `Mời ký ${title} - Phòng ${contract.roomNumber || ''}`,
        message: `Mời bạn xem và ký ${title} (Phòng ${contract.roomNumber || '—'}). Liên kết có hiệu lực đến ${formatSigningTimestamp(
          invitation.expiresAt
        )}:\n${invitation.url}`,
      });
    } catch {
      setShareNote('Chưa thể mở hộp thoại chia sẻ. Bạn có thể chọn và sao chép liên kết ở trên.');
    }
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTap}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>
                {hasActiveLink ? 'Liên kết mời ký đã sẵn sàng' : 'Mời bên thuê ký hợp đồng'}
              </Text>
              <Text style={s.sheetSub}>
                Phòng {contract.roomNumber || '—'} · {title}
              </Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng hộp thoại mời ký"
              style={[s.closeBtn, busy && { opacity: 0.4 }]}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Confirmation Summary Block */}
            <View style={s.infoCard}>
              <KvRow label="Hợp đồng" value={title} />
              <KvRow label="Mã phòng" value={contract.roomNumber || 'Chưa rõ'} />
              <KvRow
                label="Người nhận"
                value={`${contract.details.tenantName || 'Chưa rõ'} (${maskPhoneForPreview(
                  contract.details.tenantPhone
                )})`}
              />
              <KvRow label="Trạng thái ký" value={sig.summaryLabel} />
              <KvRow
                label="Hiệu lực liên kết"
                value={
                  hasActiveLink && invitation
                    ? `Đến ${formatSigningTimestamp(invitation.expiresAt)}`
                    : '7 ngày kể từ lúc tạo (tạo mới sẽ thay liên kết cũ)'
                }
                last
              />
            </View>

            {expired && (
              <View style={s.warnBox}>
                <Feather name="clock" size={16} color="#9A6315" style={{ marginTop: 1 }} />
                <Text style={s.warnText}>
                  Liên kết mời ký trước đó đã hết hạn. Bạn có thể tạo lại liên kết mới bên dưới.
                </Text>
              </View>
            )}

            {hasActiveLink && invitation ? (
              <View style={s.linkReadyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="check-circle" size={16} color={c.primary} />
                  <Text style={s.linkReadyTitle}>Đã tạo liên kết mời ký từ hệ thống</Text>
                </View>
                <Text selectable style={s.linkUrlText}>
                  {invitation.url}
                </Text>
                <Text style={s.linkReadyNote}>
                  Người thuê cần đăng nhập NestHub bằng đúng số điện thoại đã xác minh trên hợp đồng để xem và ký. Việc mở liên kết không tự động ghi nhận chữ ký.
                </Text>
                {shareNote && <Text style={s.shareNoteText}>{shareNote}</Text>}
              </View>
            ) : (
              <View style={s.noticeBox}>
                <Feather name="shield" size={15} color={c.primary} style={{ marginTop: 1 }} />
                <Text style={s.noticeText}>
                  Hệ thống sẽ sinh mã lời mời bảo mật riêng cho người thuê ghi trên hợp đồng. Liên kết chỉ dùng được khi hợp đồng còn trạng thái Đang quản lý.
                </Text>
              </View>
            )}

            {error && <InlineError message={error} />}
          </ScrollView>

          <View style={s.sheetFooter}>
            {hasActiveLink ? (
              <>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
                  onPress={onCreateInvite}
                >
                  <Text style={s.secondaryBtnText}>Tạo lại</Text>
                </AnimatedPressable>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title="Chia sẻ liên kết"
                    icon="share-2"
                    onPress={() => {
                      void handleShareLink();
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
                  onPress={onClose}
                >
                  <Text style={s.secondaryBtnText}>Hủy</Text>
                </AnimatedPressable>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={busy ? 'Đang tạo lời mời…' : 'Tạo lời mời ký'}
                    loading={busy}
                    disabled={busy || !sig.canInviteTenant}
                    onPress={onCreateInvite}
                  />
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Owner Typed Signature Confirmation Sheet (POST /{id}/signature)         */
/* -------------------------------------------------------------------------- */

export function ContractOwnerSignSheet({
  visible,
  contract,
  busy,
  error,
  onClose,
  onConfirmSign,
}: {
  visible: boolean;
  contract: RentalContractRecord | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirmSign: () => void;
}) {
  if (!visible || !contract) return null;
  return (
    <ContractOwnerSignSheetContent
      key={contract.id}
      contract={contract}
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirmSign={onConfirmSign}
    />
  );
}

function ContractOwnerSignSheetContent({
  contract,
  busy,
  error,
  onClose,
  onConfirmSign,
}: {
  contract: RentalContractRecord;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirmSign: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const [confirmed, setConfirmed] = useState(false);
  const landlordName = contract.details.landlordName?.trim() || 'Bên cho thuê';

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTap}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Bên cho thuê xác nhận ký</Text>
              <Text style={s.sheetSub}>Ghi nhận chữ ký bằng họ tên trên hệ thống</Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng hộp thoại ký hợp đồng"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={{ gap: 14, paddingTop: 14, paddingBottom: 8 }}>
            <View style={s.typedPreviewBox}>
              <Text style={s.typedPreviewLabel}>Họ tên ghi nhận trên hợp đồng</Text>
              <Text style={s.typedPreviewName}>{landlordName}</Text>
            </View>

            <AnimatedPressable
              scaleTo={0.99}
              disabled={busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              style={s.consentRow}
              onPress={() => setConfirmed(prev => !prev)}
            >
              <View style={[s.checkbox, confirmed && s.checkboxActive]}>
                {confirmed && <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text style={s.consentText}>
                Tôi đã đọc toàn bộ nội dung hợp đồng này và đồng ý ghi nhận chữ ký bên cho thuê theo phiên bản hiện tại.
              </Text>
            </AnimatedPressable>

            {error && <InlineError message={error} />}
          </View>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.secondaryBtn}
              onPress={onClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={busy ? 'Đang lưu chữ ký…' : 'Xác nhận ký'}
                loading={busy}
                disabled={busy || !confirmed}
                onPress={onConfirmSign}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Table of Contents Bottom Sheet (Tab 2)                                  */
/* -------------------------------------------------------------------------- */

export function ContractTocSheet({
  visible,
  items,
  onClose,
  onSelect,
}: {
  visible: boolean;
  items: ContractTocItem[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Mục lục hợp đồng</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng mục lục"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, idx) => (
              <AnimatedPressable
                key={item.id}
                scaleTo={0.99}
                style={s.tocRow}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <View style={s.tocIndex}>
                  <Text style={s.tocIndexText}>{idx + 1}</Text>
                </View>
                <Text style={s.tocLabel} numberOfLines={2}>
                  {item.label}
                </Text>
                <Feather name="chevron-right" size={16} color={c.textMuted} />
              </AnimatedPressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Header Overflow Menu Sheet (PDF Export, Refresh, Contract History)      */
/* -------------------------------------------------------------------------- */

export function ContractMenuSheet({
  visible,
  contracts,
  selectedId,
  exportingPdf,
  onClose,
  onExportPdf,
  onRefresh,
  onSelectContract,
}: {
  visible: boolean;
  contracts: RentalContractRecord[];
  selectedId: number | null;
  exportingPdf: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  onRefresh: () => void;
  onSelectContract: (id: number) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Tùy chọn hợp đồng</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng menu tùy chọn"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <AnimatedPressable
              scaleTo={0.98}
              disabled={exportingPdf}
              style={[s.menuOption, exportingPdf && { opacity: 0.6 }]}
              onPress={() => {
                onClose();
                onExportPdf();
              }}
            >
              <View style={s.menuIcon}>
                {exportingPdf ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Feather name="download" size={18} color={c.primary} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuTitle}>Tải / Chia sẻ bản PDF</Text>
                <Text style={s.menuSub}>
                  Xác thực và xuất đúng phiên bản hợp đồng mới nhất từ hệ thống
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              style={s.menuOption}
              onPress={() => {
                onClose();
                onRefresh();
              }}
            >
              <View style={s.menuIcon}>
                <Feather name="refresh-cw" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuTitle}>Làm mới trạng thái</Text>
                <Text style={s.menuSub}>Cập nhật trạng thái quản lý và chữ ký mới nhất</Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            {contracts.length > 1 && (
              <View style={{ gap: 8, marginTop: 6 }}>
                <Text style={s.historyHeading}>
                  Lịch sử hợp đồng phòng này ({contracts.length})
                </Text>
                {contracts.map(record => {
                  const active = record.id === selectedId;
                  const meta = contractManagementMeta(record.status);
                  const dates = [
                    formatContractIsoDate(record.startDate),
                    formatContractIsoDate(record.endDate),
                  ]
                    .filter(Boolean)
                    .join(' – ');
                  return (
                    <AnimatedPressable
                      key={record.id}
                      scaleTo={0.99}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={[s.historyRow, active && s.historyRowActive]}
                      onPress={() => {
                        onSelectContract(record.id);
                        onClose();
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.historyName} numberOfLines={1}>
                          {record.details.tenantName || contractTitle(record)}
                        </Text>
                        <Text style={s.historyMeta}>
                          {meta.label}
                          {dates ? ` · ${dates}` : ''}
                        </Text>
                      </View>
                      {active && <Feather name="check" size={17} color={c.primary} />}
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function KvRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.kvRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    maxHeight: '85%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
  },
  sheetSub: {
    fontSize: 12.5,
    color: c.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingTop: 14,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  secondaryBtn: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  infoCard: {
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 10,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  kvLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  kvValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.primaryDark,
  },
  warnBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  warnText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#7A4D0D',
  },
  linkReadyCard: {
    backgroundColor: '#F3FAF7',
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    padding: 13,
    gap: 8,
  },
  linkReadyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  linkUrlText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.forestInk,
    backgroundColor: c.surface,
    borderRadius: authRadius.sm,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
  },
  linkReadyNote: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  shareNoteText: {
    fontSize: 12,
    color: '#9A6315',
  },
  typedPreviewBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  typedPreviewLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  typedPreviewName: {
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '700',
    color: c.primaryDark,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  tocIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: c.primaryDark,
  },
  tocLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  menuSub: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  historyHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  historyRowActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  historyMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
});
