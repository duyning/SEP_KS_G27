import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import type { HostRoom } from '@/services/host';
import { formatFloorLabel } from '@/services/host-room-types';
import {
  formatVndIntegerInput,
  parseVndDigitsInput,
} from '@/services/host-room-type-editor';
import { HOUSE_RENTAL_TEMPLATE, formatContractIsoDate } from '@/services/rental-contracts';
import {
  findContractBlanks,
  joinSystemTermsClauses,
  splitSystemTermsClauses,
  type ContractTemplateCatalog,
  type ContractTemplateId,
  type ContractTemplateItem,
  type ContractWizardDraft,
} from '@/services/contract-wizard';
import type { RoomTenancy } from '@/services/room-tenancy';
import { DateFieldButton, IsoDatePickerSheet } from './date-picker-sheet';

/* -------------------------------------------------------------------------- */
/* STEP 1: Chọn mẫu hợp đồng                                                   */
/* -------------------------------------------------------------------------- */

export function ContractStepSource({
  draft,
  catalog,
  catalogLoading,
  catalogError,
  errors,
  onRetryCatalog,
  onSelectTemplate,
  onOpenScan,
}: {
  draft: ContractWizardDraft;
  catalog: ContractTemplateCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  errors: Record<string, string>;
  onRetryCatalog: () => void;
  onSelectTemplate: (template: ContractTemplateItem) => void;
  onOpenScan: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplateItem | null>(null);

  return (
    <View style={{ gap: 14 }}>
      <View style={s.card}>
        <Text style={s.cardTitle}>Mẫu hợp đồng hệ thống</Text>
        <Text style={s.cardSub}>
          Chọn mẫu phù hợp để điền thông tin. Chạm Xem trước để đọc nhanh nội dung mẫu.
        </Text>

        {catalogLoading && !catalog ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={s.mutedText}>Đang tải danh mục mẫu hợp đồng…</Text>
          </View>
        ) : catalogError && !catalog ? (
          <View style={{ gap: 10 }}>
            <InlineError message={catalogError} />
            <AnimatedPressable style={s.retryBtn} onPress={onRetryCatalog}>
              <Feather name="refresh-cw" size={14} color={c.primary} />
              <Text style={s.retryText}>Tải lại danh mục mẫu</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(catalog?.templates || []).map(item => {
              const selected =
                draft.sourceMode === 'template' && draft.template === (item.id as ContractTemplateId);
              return (
                <View
                  key={item.id}
                  style={[s.radioCard, selected && s.radioCardSelected]}
                >
                  <AnimatedPressable
                    scaleTo={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={s.radioMain}
                    onPress={() => {
                      triggerHaptic('selection');
                      onSelectTemplate(item);
                    }}
                  >
                    <View style={[s.radioDotOuter, selected && s.radioDotOuterActive]}>
                      {selected && <View style={s.radioDotInner} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[s.radioTitle, selected && { color: c.primaryDark }]}>
                        {item.name}
                      </Text>
                      <Text style={s.radioDesc}>{item.description}</Text>
                    </View>
                  </AnimatedPressable>
                  <View style={s.radioFoot}>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.previewMiniBtn}
                      onPress={() => setPreviewTemplate(item)}
                    >
                      <Feather name="eye" size={13} color={c.primary} />
                      <Text style={s.previewMiniText}>Xem trước mẫu</Text>
                    </AnimatedPressable>
                    {selected && (
                      <View style={s.selectedPill}>
                        <Feather name="check" size={11} color={c.primaryDark} />
                        <Text style={s.selectedPillText}>Đang chọn</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Quét mẫu riêng của chủ trọ */}
      <View style={[s.card, draft.sourceMode === 'scan' && s.radioCardSelected]}>
        <View style={s.scanRow}>
          <View style={s.scanIconBox}>
            <Feather name="camera" size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cardTitle}>Quét mẫu của tôi</Text>
            <Text style={s.cardSub}>
              Tải tệp PDF hoặc chụp ảnh mẫu hợp đồng riêng để trích xuất và tự đối chiếu.
            </Text>
          </View>
        </View>

        {draft.template === 'OWNER_SCAN' && draft.terms.trim() ? (
          <View style={s.scanAppliedBox}>
            <Feather name="check-circle" size={15} color={c.primary} />
            <Text style={s.scanAppliedText} numberOfLines={2}>
              Đã áp dụng bản quét{draft.sourceName ? ` (${draft.sourceName})` : ''} ·{' '}
              {draft.terms.length.toLocaleString('vi-VN')} ký tự
            </Text>
          </View>
        ) : null}

        <AnimatedPressable
          scaleTo={0.98}
          style={s.scanTriggerBtn}
          onPress={onOpenScan}
        >
          <Feather name="upload" size={15} color={c.primary} />
          <Text style={s.scanTriggerText}>
            {draft.template === 'OWNER_SCAN' ? 'Quét hoặc chọn lại mẫu riêng' : 'Tải PDF / Chụp ảnh mẫu riêng'}
          </Text>
        </AnimatedPressable>
      </View>

      {errors.source ? <InlineError message={errors.source} /> : null}

      {/* Quick Template Preview Sheet */}
      {previewTemplate && (
        <Modal
          transparent
          animationType={reduced ? 'none' : 'fade'}
          onRequestClose={() => setPreviewTemplate(null)}
        >
          <View style={s.modalBackdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setPreviewTemplate(null)} />
            <SafeAreaView edges={['bottom', 'left', 'right']} style={s.previewSheet}>
              <View style={s.handle} />
              <View style={s.sheetHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>{previewTemplate.name}</Text>
                  <Text style={s.cardSub}>{previewTemplate.description}</Text>
                </View>
                <AnimatedPressable
                  accessibilityLabel="Đóng xem trước mẫu"
                  style={s.closeBtn}
                  onPress={() => setPreviewTemplate(null)}
                >
                  <Feather name="x" size={20} color={c.forestInk} />
                </AnimatedPressable>
              </View>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={s.previewBodyText}>{previewTemplate.terms}</Text>
              </ScrollView>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.applyTemplateBtn}
                onPress={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
              >
                <Feather name="check" size={15} color="#FFFFFF" />
                <Text style={s.applyTemplateBtnText}>Chọn mẫu này</Text>
              </AnimatedPressable>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STEP 2: Thông tin hai bên                                                   */
/* -------------------------------------------------------------------------- */

export function ContractStepParties({
  draft,
  currentTenancy,
  errors,
  onUpdate,
}: {
  draft: ContractWizardDraft;
  currentTenancy: RoomTenancy | null;
  errors: Record<string, string>;
  onUpdate: <K extends keyof ContractWizardDraft>(key: K, value: ContractWizardDraft[K]) => void;
}) {
  const isHouse = draft.template === HOUSE_RENTAL_TEMPLATE;
  const [landlordExtra, setLandlordExtra] = useState(false);
  const [tenantExtra, setTenantExtra] = useState(false);
  const [dateTarget, setDateTarget] = useState<
    null | 'landlordBirthDate' | 'landlordIdentityDate' | 'tenantBirthDate' | 'tenantIdentityDate'
  >(null);

  const blanks = useMemo(() => findContractBlanks(draft.terms), [draft.terms]);
  const primary = currentTenancy?.occupants.find(p => p.primaryTenant) ?? currentTenancy?.occupants[0];

  return (
    <View style={{ gap: 14 }}>
      {/* Bên A — Bên cho thuê */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.iconBox}>
            <Feather name="user-check" size={16} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Bên A — Bên cho thuê</Text>
            <Text style={s.cardSub}>
              Kiểm tra và xác nhận thông tin đưa vào hợp đồng (không tự thay đổi hồ sơ tài khoản).
            </Text>
          </View>
        </View>

        <FormInput
          label="Họ và tên Bên A"
          required
          value={draft.landlordName}
          maxLength={150}
          placeholder="Nhập họ tên bên cho thuê"
          error={errors.landlordName}
          onChangeText={v => onUpdate('landlordName', v)}
        />
        <FormInput
          label="Số điện thoại"
          required
          keyboardType="phone-pad"
          value={draft.landlordPhone}
          maxLength={20}
          placeholder="VD: 0912345678"
          error={errors.landlordPhone}
          onChangeText={v => onUpdate('landlordPhone', v)}
        />
        <FormInput
          label="Số CMND / CCCD"
          keyboardType="number-pad"
          value={draft.landlordIdentity}
          maxLength={30}
          placeholder="Nhập số CMND/CCCD (tùy chọn)"
          error={errors.landlordIdentity}
          onChangeText={v => onUpdate('landlordIdentity', v)}
        />
        <FormInput
          label="Nơi đăng ký thường trú / Địa chỉ liên hệ"
          value={draft.landlordAddress}
          maxLength={300}
          placeholder="Địa chỉ thường trú hoặc liên hệ của Bên A"
          error={errors.landlordAddress}
          onChangeText={v => onUpdate('landlordAddress', v)}
        />

        {!isHouse && (
          <>
            <AnimatedPressable
              style={s.extraToggle}
              onPress={() => setLandlordExtra(v => !v)}
            >
              <Text style={s.extraToggleText}>
                Thông tin bổ sung (Ngày sinh, ngày cấp & nơi cấp CCCD)
              </Text>
              <Feather
                name={landlordExtra ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.primary}
              />
            </AnimatedPressable>
            {landlordExtra && (
              <View style={{ gap: 12 }}>
                <DateFieldButton
                  label="Sinh ngày"
                  value={draft.landlordBirthDate}
                  placeholder="Chọn ngày sinh"
                  error={errors.landlordBirthDate}
                  onPress={() => setDateTarget('landlordBirthDate')}
                />
                <DateFieldButton
                  label="Ngày cấp CMND / CCCD"
                  value={draft.landlordIdentityDate}
                  placeholder="Chọn ngày cấp"
                  error={errors.landlordIdentityDate}
                  onPress={() => setDateTarget('landlordIdentityDate')}
                />
                <FormInput
                  label="Nơi cấp CMND / CCCD"
                  value={draft.landlordIdentityPlace}
                  maxLength={150}
                  placeholder="VD: Cục CSQLHC về TTXH"
                  error={errors.landlordIdentityPlace}
                  onChangeText={v => onUpdate('landlordIdentityPlace', v)}
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Bên B — Bên thuê */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.iconBox}>
            <Feather name="users" size={16} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Bên B — Bên thuê</Text>
            <Text style={s.cardSub}>
              Nhập thông tin người đại diện thuê phòng (không tự ghi đè hồ sơ đợt thuê khi soạn).
            </Text>
          </View>
        </View>

        {primary && (
          <AnimatedPressable
            scaleTo={0.98}
            style={s.prefillChip}
            onPress={() => {
              onUpdate('tenantName', primary.name || '');
              onUpdate('tenantPhone', primary.phone || '');
            }}
          >
            <Feather name="user-check" size={14} color={c.primary} />
            <Text style={s.prefillChipText} numberOfLines={1}>
              Điền từ hồ sơ đợt thuê: {primary.name}
            </Text>
          </AnimatedPressable>
        )}

        <FormInput
          label="Họ và tên Bên B"
          required
          value={draft.tenantName}
          maxLength={150}
          placeholder="Nhập họ tên người thuê"
          error={errors.tenantName}
          onChangeText={v => onUpdate('tenantName', v)}
        />
        <FormInput
          label="Số điện thoại"
          required
          keyboardType="phone-pad"
          value={draft.tenantPhone}
          maxLength={20}
          placeholder="VD: 0987654321"
          helper="Dùng để xác thực khi gửi liên kết mời ký hợp đồng."
          error={errors.tenantPhone}
          onChangeText={v => onUpdate('tenantPhone', v)}
        />
        <FormInput
          label="Số CMND / CCCD"
          keyboardType="number-pad"
          value={draft.tenantIdentity}
          maxLength={30}
          placeholder="Nhập số CMND/CCCD (tùy chọn)"
          error={errors.tenantIdentity}
          onChangeText={v => onUpdate('tenantIdentity', v)}
        />
        <FormInput
          label="Địa chỉ thường trú"
          value={draft.tenantAddress}
          maxLength={300}
          placeholder="Địa chỉ đăng ký thường trú"
          error={errors.tenantAddress}
          onChangeText={v => onUpdate('tenantAddress', v)}
        />

        {isHouse && (
          <>
            <FormInput
              label="Chỗ ở hiện tại"
              value={draft.tenantCurrentAddress}
              maxLength={300}
              placeholder="Địa chỉ chỗ ở hiện tại"
              error={errors.tenantCurrentAddress}
              onChangeText={v => onUpdate('tenantCurrentAddress', v)}
            />
            <FormInput
              label="Số người ở"
              keyboardType="number-pad"
              value={draft.occupantCount}
              maxLength={3}
              placeholder="VD: 2"
              error={errors.occupantCount}
              onChangeText={v => onUpdate('occupantCount', v.replace(/[^0-9]/g, ''))}
            />
          </>
        )}

        {!isHouse && (
          <>
            <AnimatedPressable
              style={s.extraToggle}
              onPress={() => setTenantExtra(v => !v)}
            >
              <Text style={s.extraToggleText}>
                Thông tin bổ sung (Ngày sinh, ngày cấp & nơi cấp CCCD)
              </Text>
              <Feather
                name={tenantExtra ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.primary}
              />
            </AnimatedPressable>
            {tenantExtra && (
              <View style={{ gap: 12 }}>
                <DateFieldButton
                  label="Sinh ngày"
                  value={draft.tenantBirthDate}
                  placeholder="Chọn ngày sinh"
                  error={errors.tenantBirthDate}
                  onPress={() => setDateTarget('tenantBirthDate')}
                />
                <DateFieldButton
                  label="Ngày cấp CMND / CCCD"
                  value={draft.tenantIdentityDate}
                  placeholder="Chọn ngày cấp"
                  error={errors.tenantIdentityDate}
                  onPress={() => setDateTarget('tenantIdentityDate')}
                />
                <FormInput
                  label="Nơi cấp CMND / CCCD"
                  value={draft.tenantIdentityPlace}
                  maxLength={150}
                  placeholder="VD: Cục CSQLHC về TTXH"
                  error={errors.tenantIdentityPlace}
                  onChangeText={v => onUpdate('tenantIdentityPlace', v)}
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Template blanks if scanned contract contains fill-in lines */}
      {blanks.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Điền chỗ trống trong mẫu ({blanks.length})</Text>
          <Text style={s.cardSub}>
            Nội dung điền vào sẽ hiển thị đúng vị trí trên bản hợp đồng. Có thể để trống các dòng ký
            tay.
          </Text>
          {blanks.map((blank, idx) => (
            <View key={blank.key} style={s.field}>
              <Text style={s.blankContext} numberOfLines={2}>
                Dòng {blank.line + 1}: {blank.context}
              </Text>
              <TextInput
                value={draft.blankValues[blank.key] || ''}
                onChangeText={val =>
                  onUpdate('blankValues', { ...draft.blankValues, [blank.key]: val })
                }
                placeholder={`Điền nội dung vị trí #${idx + 1}`}
                placeholderTextColor={c.placeholder}
                style={s.input}
              />
            </View>
          ))}
          {errors.blankValues ? <InlineError message={errors.blankValues} /> : null}
        </View>
      )}

      <IsoDatePickerSheet
        visible={dateTarget !== null}
        title="Chọn ngày"
        value={dateTarget ? draft[dateTarget] : ''}
        allowClear
        onClose={() => setDateTarget(null)}
        onSelect={iso => {
          if (dateTarget) onUpdate(dateTarget, iso);
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STEP 3: Kỳ thuê & Chi phí                                                   */
/* -------------------------------------------------------------------------- */

export function ContractStepLease({
  room,
  propertyName,
  propertyAddress,
  draft,
  errors,
  onUpdate,
}: {
  room: HostRoom;
  propertyName?: string;
  propertyAddress?: string;
  draft: ContractWizardDraft;
  errors: Record<string, string>;
  onUpdate: <K extends keyof ContractWizardDraft>(key: K, value: ContractWizardDraft[K]) => void;
}) {
  const isHouse = draft.template === HOUSE_RENTAL_TEMPLATE;
  const [dateTarget, setDateTarget] = useState<
    null | 'leaseStartDate' | 'leaseEndDate' | 'contractDate' | 'firstPaymentDate'
  >(null);

  return (
    <View style={{ gap: 14 }}>
      {/* Thông tin phòng summary */}
      <View style={s.roomSummaryBox}>
        <View style={s.iconBox}>
          <Feather name="home" size={16} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.roomSummaryTitle}>
            Phòng {room.roomNumber} · {formatFloorLabel(room.floor)}
          </Text>
          <Text style={s.roomSummarySub} numberOfLines={2}>
            {[room.roomType, propertyName, propertyAddress].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {/* Thời gian thuê */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Thời gian thuê</Text>
        <DateFieldButton
          label="Ngày bắt đầu thuê"
          required
          value={draft.leaseStartDate}
          error={errors.leaseStartDate}
          onPress={() => setDateTarget('leaseStartDate')}
        />
        <DateFieldButton
          label="Ngày kết thúc thuê"
          required
          value={draft.leaseEndDate}
          error={errors.leaseEndDate}
          onPress={() => setDateTarget('leaseEndDate')}
        />
        {isHouse ? (
          <View style={s.readonlyRow}>
            <Text style={s.label}>Ngày lập hợp đồng</Text>
            <Text style={s.readonlyVal}>
              {formatContractIsoDate(draft.contractDate) || 'Hôm nay'} (tự động theo Mẫu 2)
            </Text>
          </View>
        ) : (
          <DateFieldButton
            label="Ngày lập hợp đồng (tùy chọn)"
            value={draft.contractDate}
            placeholder="Chọn ngày lập hợp đồng"
            error={errors.contractDate}
            onPress={() => setDateTarget('contractDate')}
          />
        )}
      </View>

      {/* Chi phí & thanh toán */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Chi phí & thanh toán</Text>
        <Text style={s.cardSub}>
          Giá thỏa thuận trong hợp đồng không tự thay đổi giá niêm yết loại phòng và không tự tạo
          phiếu thu.
        </Text>

        <MoneyInput
          label="Tiền thuê mỗi tháng"
          required
          unit="đ/tháng"
          value={draft.rent}
          error={errors.rent}
          onChangeDigits={v => onUpdate('rent', v)}
        />
        <MoneyInput
          label="Tiền đặt cọc"
          required
          unit="đ"
          value={draft.deposit}
          error={errors.deposit}
          onChangeDigits={v => onUpdate('deposit', v)}
        />
        <FormInput
          label="Ngày thanh toán hằng tháng (1–28)"
          required
          keyboardType="number-pad"
          value={draft.paymentDay}
          maxLength={2}
          placeholder="VD: 5"
          error={errors.paymentDay}
          onChangeText={v => onUpdate('paymentDay', v.replace(/[^0-9]/g, ''))}
        />
        <FormInput
          label="Hình thức thanh toán"
          value={draft.paymentMethod}
          maxLength={200}
          placeholder="VD: Chuyển khoản hoặc tiền mặt"
          error={errors.paymentMethod}
          onChangeText={v => onUpdate('paymentMethod', v)}
        />

        {isHouse && (
          <>
            <FormInput
              label="Chu kỳ thanh toán"
              value={draft.paymentCycle}
              maxLength={100}
              placeholder="VD: 1 tháng/lần"
              error={errors.paymentCycle}
              onChangeText={v => onUpdate('paymentCycle', v)}
            />
            <DateFieldButton
              label="Ngày thanh toán lần đầu"
              value={draft.firstPaymentDate}
              placeholder="Chọn ngày thanh toán lần đầu"
              error={errors.firstPaymentDate}
              onPress={() => setDateTarget('firstPaymentDate')}
            />
          </>
        )}
      </View>

      {/* Điện nước & dịch vụ */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Điện, nước & dịch vụ</Text>
        <Text style={s.cardSub}>
          Điền sẵn từ cấu hình loại phòng nếu có. Để trống để ghi Chưa thiết lập trên hợp đồng.
        </Text>

        <MoneyInput
          label="Tiền điện"
          unit="đ/kWh"
          value={draft.electricityPrice}
          placeholder="Chưa thiết lập"
          error={errors.electricityPrice}
          onChangeDigits={v => onUpdate('electricityPrice', v)}
        />

        <View style={{ gap: 8 }}>
          <MoneyInput
            label="Tiền nước"
            unit={`đ/${draft.waterUnit}`}
            value={draft.waterPrice}
            placeholder="Chưa thiết lập"
            error={errors.waterPrice}
            onChangeDigits={v => onUpdate('waterPrice', v)}
          />
          <View style={s.unitSwitchRow}>
            <Text style={s.unitSwitchLabel}>Đơn vị tiền nước:</Text>
            {(['người', 'm³'] as const).map(unit => {
              const active = draft.waterUnit === unit;
              return (
                <AnimatedPressable
                  key={unit}
                  scaleTo={0.97}
                  style={[s.unitChip, active && s.unitChipActive]}
                  onPress={() => {
                    triggerHaptic('selection');
                    onUpdate('waterUnit', unit);
                  }}
                >
                  <Text style={[s.unitChipText, active && { color: c.primaryDark }]}>
                    đ/{unit}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <MoneyInput
          label="Internet / Wi-Fi"
          unit="đ/phòng"
          value={draft.internetPrice}
          placeholder="Chưa thiết lập"
          error={errors.internetPrice}
          onChangeDigits={v => onUpdate('internetPrice', v)}
        />

        <MoneyInput
          label="Dịch vụ chung"
          unit="đ/người"
          value={draft.servicePrice}
          placeholder="Chưa thiết lập"
          error={errors.servicePrice}
          onChangeDigits={v => onUpdate('servicePrice', v)}
        />
      </View>

      {/* Diện tích & trang thiết bị (read-only compact card) */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Diện tích & trang thiết bị bàn giao</Text>
        <Text style={s.cardSub}>
          Chỉ đọc từ cấu hình phòng hiện tại; không làm thay đổi tiện nghi của loại phòng.
        </Text>
        <View style={s.readonlyRow}>
          <Text style={s.label}>Diện tích phòng</Text>
          <Text style={s.readonlyVal}>{draft.rentalScope || 'Chưa có dữ liệu'}</Text>
        </View>
        <View style={s.readonlyRow}>
          <Text style={s.label}>Trang thiết bị đi kèm</Text>
          <Text style={s.readonlyVal}>
            {draft.includedEquipment || 'Không có thiết bị ghi nhận'}
          </Text>
        </View>
      </View>

      <IsoDatePickerSheet
        visible={dateTarget !== null}
        title={
          dateTarget === 'leaseStartDate'
            ? 'Chọn ngày bắt đầu thuê'
            : dateTarget === 'leaseEndDate'
            ? 'Chọn ngày kết thúc thuê'
            : dateTarget === 'firstPaymentDate'
            ? 'Chọn ngày thanh toán lần đầu'
            : 'Chọn ngày lập hợp đồng'
        }
        value={dateTarget ? draft[dateTarget] : ''}
        minDate={dateTarget === 'leaseEndDate' ? draft.leaseStartDate : undefined}
        allowClear={dateTarget === 'contractDate' || dateTarget === 'firstPaymentDate'}
        onClose={() => setDateTarget(null)}
        onSelect={iso => {
          if (dateTarget) onUpdate(dateTarget, iso);
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STEP 4: Điều khoản & Duyệt                                                  */
/* -------------------------------------------------------------------------- */

export function ContractStepReview({
  roomNumber,
  draft,
  errors,
  onUpdate,
  onOpenFullPreview,
}: {
  roomNumber: string;
  draft: ContractWizardDraft;
  errors: Record<string, string>;
  onUpdate: <K extends keyof ContractWizardDraft>(key: K, value: ContractWizardDraft[K]) => void;
  onOpenFullPreview: () => void;
}) {
  const [openClauses, setOpenClauses] = useState<Record<string, boolean>>({ '1': true });
  const clauses = useMemo(
    () => (draft.template === 'OWNER_SCAN' ? null : splitSystemTermsClauses(draft.terms)),
    [draft.template, draft.terms]
  );

  const toggleClause = (idx: string) => {
    setOpenClauses(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateClauseBody = (position: number, body: string) => {
    if (!clauses) return;
    const next = clauses.map((sec, idx) => (idx === position ? { ...sec, body } : sec));
    onUpdate('terms', joinSystemTermsClauses(next));
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Prominent Full-Screen Preview CTA (replaces desktop right preview panel!) */}
      <View style={s.previewBannerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.iconBox}>
            <Feather name="file-text" size={17} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Xem trước toàn văn hợp đồng</Text>
            <Text style={s.cardSub}>
              Bản xem trước được dựng từ toàn bộ dữ liệu bạn vừa nhập. Quay lại không mất dữ liệu.
            </Text>
          </View>
        </View>
        <AnimatedPressable
          scaleTo={0.98}
          style={s.previewFullBtn}
          accessibilityLabel="Xem bản hợp đồng đầy đủ"
          onPress={onOpenFullPreview}
        >
          <Feather name="maximize-2" size={15} color={c.primary} />
          <Text style={s.previewFullBtnText}>Xem bản hợp đồng đầy đủ</Text>
        </AnimatedPressable>
      </View>

      {/* Điều khoản dạng Accordion */}
      <View style={s.card}>
        <Text style={s.cardTitle}>
          Điều khoản hợp đồng <Text style={{ color: c.error }}>*</Text>
        </Text>
        <Text style={s.cardSub}>
          Mở từng mục để đọc toàn bộ nội dung hoặc điều chỉnh khi cần. Không cắt bỏ nội dung pháp lý
          của hợp đồng thật.
        </Text>

        {clauses ? (
          <View style={{ gap: 10 }}>
            {clauses.map((clause, idx) => {
              const expanded = Boolean(openClauses[clause.index]);
              const snippet = clause.body.trim().replace(/\s+/g, ' ');
              return (
                <View key={clause.index} style={s.accordionItem}>
                  <AnimatedPressable
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={s.accordionHead}
                    onPress={() => toggleClause(clause.index)}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.accordionTitle}>{clause.heading}</Text>
                      {!expanded && snippet ? (
                        <Text style={s.accordionSnippet} numberOfLines={2}>
                          {snippet}
                        </Text>
                      ) : null}
                    </View>
                    <Feather
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={c.textSecondary}
                    />
                  </AnimatedPressable>
                  {expanded && (
                    <View style={s.accordionBody}>
                      <TextInput
                        value={clause.body}
                        onChangeText={val => updateClauseBody(idx, val)}
                        multiline
                        textAlignVertical="top"
                        style={s.clauseInput}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <TextInput
            value={draft.terms}
            onChangeText={val => onUpdate('terms', val)}
            multiline
            maxLength={30000}
            textAlignVertical="top"
            placeholder="Nội dung điều khoản hợp đồng..."
            placeholderTextColor={c.placeholder}
            style={[s.clauseInput, { minHeight: 180 }]}
          />
        )}

        <Text style={s.counterText}>
          {draft.terms.length.toLocaleString('vi-VN')}/30.000 ký tự
        </Text>
        {errors.terms ? <InlineError message={errors.terms} /> : null}
      </View>

      {/* Confirmation Checkbox */}
      <View style={[s.card, draft.reviewed && s.confirmCardActive]}>
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.reviewed }}
          style={s.checkRow}
          onPress={() => {
            triggerHaptic('selection');
            onUpdate('reviewed', !draft.reviewed);
          }}
        >
          <View style={[s.checkbox, draft.reviewed && s.checkboxActive]}>
            {draft.reviewed && <Feather name="check" size={13} color="#FFFFFF" />}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.confirmTitle}>
              Tôi đã kiểm tra thông tin và đọc bản hợp đồng trước khi lưu.
            </Text>
            <Text style={s.cardSub}>
              Áp dụng cho phòng {roomNumber}. Lưu hợp đồng sẽ tạo bản hợp đồng ở trạng thái Chưa ký
              (không tự động ký kết).
            </Text>
          </View>
        </AnimatedPressable>
        {errors.reviewed ? <InlineError message={errors.reviewed} /> : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared Form Helpers                                                         */
/* -------------------------------------------------------------------------- */

function FormInput({
  label,
  value,
  required = false,
  placeholder,
  helper,
  error,
  maxLength,
  keyboardType = 'default',
  onChangeText,
}: {
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  error?: string;
  maxLength?: number;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  onChangeText: (val: string) => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: c.error }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        style={[s.input, Boolean(error) && s.inputInvalid]}
      />
      {helper && !error ? <Text style={s.helperText}>{helper}</Text> : null}
      {error ? <Text style={s.errText}>{error}</Text> : null}
    </View>
  );
}

function MoneyInput({
  label,
  unit,
  value,
  required = false,
  placeholder = '0',
  error,
  onChangeDigits,
}: {
  label: string;
  unit: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  onChangeDigits: (digits: string) => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: c.error }}> *</Text> : null}
      </Text>
      <View style={[s.unitInputWrap, Boolean(error) && s.inputInvalid]}>
        <TextInput
          value={formatVndIntegerInput(value)}
          onChangeText={text => onChangeDigits(parseVndDigitsInput(text))}
          keyboardType="number-pad"
          maxLength={14}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          style={s.unitInput}
        />
        <View style={s.unitBadge}>
          <Text style={s.unitBadgeText}>{unit}</Text>
        </View>
      </View>
      {error ? <Text style={s.errText}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: c.forestInk },
  cardSub: { fontSize: 12.5, lineHeight: 18, color: c.textSecondary },
  loadingBox: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  mutedText: { fontSize: 13, color: c.textSecondary },
  retryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  retryText: { fontSize: 13, fontWeight: '700', color: c.primaryDark },
  radioCard: {
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 12,
    gap: 10,
  },
  radioCardSelected: {
    borderColor: c.primary,
    backgroundColor: '#EFF7F4',
  },
  radioMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  radioDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDotOuterActive: { borderColor: c.primary },
  radioDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  radioTitle: { fontSize: 14.5, fontWeight: '700', color: c.forestInk },
  radioDesc: { fontSize: 12.5, lineHeight: 18, color: c.textSecondary },
  radioFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 30,
  },
  previewMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  previewMiniText: { fontSize: 12.5, fontWeight: '700', color: c.primary },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.softMint,
    borderRadius: authRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedPillText: { fontSize: 11, fontWeight: '700', color: c.primaryDark },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAppliedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5EE',
    borderRadius: authRadius.md,
    padding: 10,
  },
  scanAppliedText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: c.primaryDark },
  scanTriggerBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanTriggerText: { fontSize: 13.5, fontWeight: '700', color: c.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.48)',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.xl,
    paddingTop: 10,
    paddingBottom: authSpacing.lg,
    gap: 12,
    maxHeight: '84%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: c.forestInk },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBodyText: { fontSize: 13.5, lineHeight: 21, color: c.forestInk },
  applyTemplateBtn: {
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyTemplateBtnText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: c.forestInk },
  input: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 14,
    fontSize: 15,
    color: c.forestInk,
  },
  inputInvalid: { borderColor: c.error, borderWidth: 1.5 },
  helperText: { fontSize: 12, color: c.textSecondary },
  errText: { fontSize: 12, fontWeight: '600', color: c.error },
  extraToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  extraToggleText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: c.primary },
  prefillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  prefillChipText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: c.primaryDark },
  blankContext: { fontSize: 12, color: c.textSecondary, fontStyle: 'italic' },
  roomSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: 16,
    padding: 14,
  },
  roomSummaryTitle: { fontSize: 15, fontWeight: '800', color: c.forestInk },
  roomSummarySub: { fontSize: 12.5, color: c.primaryDark },
  readonlyRow: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 3,
  },
  readonlyVal: { fontSize: 13.5, lineHeight: 19, color: c.textSecondary },
  unitInputWrap: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    gap: 8,
  },
  unitInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  unitBadge: {
    backgroundColor: '#E9F0ED',
    borderRadius: authRadius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  unitBadgeText: { fontSize: 12, fontWeight: '700', color: c.primaryDark },
  unitSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitSwitchLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
  unitChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  unitChipActive: { backgroundColor: c.softMint, borderColor: c.primary },
  unitChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  previewBannerCard: {
    backgroundColor: '#EFF7F4',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    padding: 16,
    gap: 12,
  },
  previewFullBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewFullBtnText: { fontSize: 14, fontWeight: '700', color: c.primary },
  accordionItem: {
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  accordionTitle: { fontSize: 13.5, fontWeight: '700', color: c.forestInk },
  accordionSnippet: { fontSize: 12, lineHeight: 17, color: c.textSecondary },
  accordionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    padding: 10,
    backgroundColor: c.surface,
  },
  clauseInput: {
    minHeight: 110,
    fontSize: 13.5,
    lineHeight: 20,
    color: c.forestInk,
    backgroundColor: c.background,
    borderRadius: authRadius.sm,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
  },
  counterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  confirmCardActive: {
    borderColor: c.primary,
    backgroundColor: '#EFF7F4',
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.textMuted,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: c.primary, borderColor: c.primary },
  confirmTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: c.forestInk },
});
