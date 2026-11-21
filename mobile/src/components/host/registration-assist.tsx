import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { useReducedMotionPreference } from '@/constants/motion';
import { tokenStore } from '@/services/auth';
import { hostRequest } from '@/services/host';
import {
  AMENITIES,
  PROPERTY_AREAS,
  registrationPoint,
  ruleLabel,
  type RegistrationValues,
} from '@/services/property-registration';
import { RegistrationLocationMap, type RegistrationPoint } from './registration-location-map';

export function RegistrationSheet({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose(): void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <Modal animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={s.sheetScreen} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Đóng"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={21} color={c.forestInk} />
            </AnimatedPressable>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={s.sheetFooter}>{footer}</View> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact Inline AI Description Assist (Placed beside character counter)      */
/* -------------------------------------------------------------------------- */

export function useDescriptionAssist(values: RegistrationValues) {
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ source: string; text: string } | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const facts = {
    name: values.name.trim(),
    propertyType: values.propertyType.trim(),
    commune: values.commune,
    nearby: values.nearby,
    amenities: AMENITIES.filter(([id]) => values.amenities.includes(id)).map(([, label]) => label),
    rules: values.selectedRules.map(ruleLabel),
    existingDescription: values.description,
  };
  const source = JSON.stringify(facts);
  const suggestion = preview?.source === source ? preview.text : '';

  const generate = async () => {
    if (request.current) return;
    if (facts.name.length < 3 || facts.propertyType.length < 2) {
      setError('Nhập tên và loại hình nhà trọ trước khi tạo gợi ý.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const token = await tokenStore.get();
      const data = await hostRequest<{ description: string }>(
        '/property-writing/description',
        token || '',
        controller.signal,
        facts,
        'POST',
        {
          // The backend allows the AI provider up to 30 seconds.
          timeoutMs: 40_000,
          timeoutMessage: 'AI phản hồi quá lâu. Bạn có thể thử lại hoặc tự nhập mô tả.',
        }
      );
      if (
        typeof data?.description !== 'string' ||
        data.description.trim().length < 30 ||
        data.description.length > 2000
      ) {
        throw new Error('Gợi ý chưa hợp lệ. Vui lòng thử lại.');
      }
      if (!controller.signal.aborted) {
        setPreview({ source, text: data.description.trim() });
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Chưa tạo được gợi ý.');
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return {
    busy,
    error,
    suggestion,
    generate,
    dismiss() {
      setPreview(null);
      setError('');
    },
  };
}

export function DescriptionAssistTrigger({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      scaleTo={0.97}
      disabled={busy}
      accessibilityLabel="Gợi ý mô tả bằng AI"
      style={[s.aiInlineBtn, busy && { opacity: 0.65 }]}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator size="small" color={c.primary} />
      ) : (
        <Feather name="edit-3" size={13} color={c.primary} />
      )}
      <Text style={s.aiInlineText}>{busy ? 'Đang tạo…' : 'Gợi ý bằng AI'}</Text>
    </AnimatedPressable>
  );
}

export function DescriptionAssistResult({
  error,
  suggestion,
  onApply,
  onDismiss,
}: {
  error: string;
  suggestion: string;
  onApply: (text: string) => void;
  onDismiss: () => void;
}) {
  if (!error && !suggestion) return null;

  return (
    <View style={{ gap: 8 }}>
      <InlineError message={error} />
      {!!suggestion && (
        <View style={s.aiPreviewCard}>
          <View style={s.aiPreviewHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="edit-3" size={14} color={c.primary} />
              <Text style={s.aiPreviewTitle}>Gợi ý mô tả</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng gợi ý mô tả"
              style={s.aiDismissHit}
              onPress={onDismiss}
            >
              <Feather name="x" size={16} color={c.textSecondary} />
            </AnimatedPressable>
          </View>
          <Text selectable style={s.aiPreviewText}>
            {suggestion}
          </Text>
          <Text style={s.aiPreviewNote}>
            Kiểm tra lại và chỉ giữ các chi tiết đúng thực tế nhà trọ.
          </Text>
          <View style={s.aiPreviewActions}>
            <AnimatedPressable scaleTo={0.98} style={s.aiSecondaryBtn} onPress={onDismiss}>
              <Text style={s.aiSecondaryText}>Bỏ qua</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.aiPrimaryBtn}
              onPress={() => {
                onApply(suggestion);
                onDismiss();
              }}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
              <Text style={s.aiPrimaryText}>Áp dụng mô tả</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Location Picker Sheet (Map-first, collapsible link/coordinate lookup)       */
/* -------------------------------------------------------------------------- */

type LocationSuggestion = RegistrationPoint & {
  addressDetail?: string;
  commune?: string;
  nearby?: string;
  warnings?: string[];
  attribution?: string;
};

type LinkLookup = {
  location: LocationSuggestion | null;
  addressQuery: string | null;
};

type AddressMatch = { refId: string; display: string };

export function LocationSheet({
  values,
  onApply,
  onClose,
}: {
  values: RegistrationValues;
  onApply(
    point: RegistrationPoint,
    suggested?: Pick<LocationSuggestion, 'addressDetail' | 'commune' | 'nearby'>
  ): void;
  onClose(): void;
}) {
  const [point, setPoint] = useState(() => registrationPoint(values.latitude, values.longitude));
  const [suggestion, setSuggestion] = useState<LocationSuggestion | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState<string | null>(null);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [addressError, setAddressError] = useState('');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const runLookup = async (
    task: (token: string, signal: AbortSignal) => Promise<void>,
    onError: (cause: unknown) => void
  ) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const token = await tokenStore.get();
      if (!controller.signal.aborted) await task(token || '', controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) onError(cause);
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  };

  const showLocation = (result: LocationSuggestion) => {
    const resolved = registrationPoint(String(result?.latitude), String(result?.longitude));
    if (!resolved) throw new Error('Máy chủ chưa trả về tọa độ hợp lệ.');
    setPoint(resolved);
    setSuggestion(result);
    setMapKey(key => key + 1);
  };

  const findAddress = async (text: string, token: string, signal: AbortSignal) => {
    const search = (query: string) =>
      hostRequest<AddressMatch[]>('/property-location/autocomplete', token, signal, { text: query }, 'POST');
    try {
      let results = await search(text);
      const addressOnly = text.includes(',') ? text.slice(text.indexOf(',') + 1).trim() : '';
      if (!results.length && addressOnly.length >= 3 && !signal.aborted) {
        results = await search(addressOnly);
      }
      if (!signal.aborted) {
        setMatches(results);
        setAddressError(
          results.length ? '' : 'Không tìm thấy địa chỉ phù hợp. Hãy sửa từ khóa hoặc đặt ghim trên bản đồ.'
        );
      }
    } catch (cause) {
      if (!signal.aborted) setAddressError(cause instanceof Error ? cause.message : 'Chưa tìm được địa chỉ.');
    }
  };

  const lookup = () => {
    if (request.current) return;
    const raw = input.trim();
    if (raw.length < 3) {
      setError('Dán liên kết Google Maps hoặc nhập tọa độ (ví dụ 21.0188, 105.5215).');
      return;
    }
    const pair = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)$/);
    const localPoint = pair ? registrationPoint(pair[1], pair[2]) : null;
    setError('');
    setAddress(null);
    setMatches([]);
    setAddressError('');
    void runLookup(async (token, signal) => {
      const result = await hostRequest<LinkLookup>(
        '/host/property-registrations/location/resolve-mobile',
        token,
        signal,
        { input: localPoint ? `${localPoint.latitude},${localPoint.longitude}` : raw },
        'POST',
        { timeoutMs: 40_000 }
      );
      if (signal.aborted) return;
      if (result.location) {
        showLocation(result.location);
      } else if (result.addressQuery) {
        setAddress(result.addressQuery);
        await findAddress(result.addressQuery, token, signal);
      } else {
        throw new Error('Chưa đọc được vị trí từ liên kết này.');
      }
    }, cause => {
      if (localPoint) {
        showLocation(localPoint);
        setError('Đã đặt ghim theo tọa độ nhập. Chưa lấy được địa chỉ gợi ý.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Chưa tra cứu được vị trí.');
      }
    });
  };

  const canApplyAddress = Boolean(
    suggestion &&
      (suggestion.addressDetail ||
        suggestion.nearby ||
        PROPERTY_AREAS.includes(suggestion.commune || ''))
  );

  return (
    <RegistrationSheet
      title="Chọn vị trí trên bản đồ"
      onClose={onClose}
      footer={
        <View style={{ gap: 8 }}>
          {point && canApplyAddress && suggestion && (
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.applyWithSuggestBtn}
              onPress={() => onApply(point, suggestion)}
            >
              <Feather name="check-circle" size={16} color={c.primary} />
              <Text style={s.applyWithSuggestText}>Dùng ghim và điền địa chỉ gợi ý</Text>
            </AnimatedPressable>
          )}
          <PrimaryButton
            title={point ? 'Lưu ghim vị trí' : 'Chạm bản đồ để đặt ghim'}
            disabled={!point || busy}
            onPress={() => {
              if (point) onApply(point);
            }}
          />
        </View>
      }
    >
      {/* Map takes priority at top */}
      <RegistrationLocationMap
        key={mapKey}
        point={point}
        onSelect={next => {
          if (request.current) {
            request.current.abort();
            request.current = null;
            setBusy(false);
          }
          setPoint(next);
          setSuggestion(null);
        }}
      />

      {/* Collapsible Link or Coordinate Lookup */}
      <View style={s.lookupCard}>
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="button"
          accessibilityState={{ expanded: linkOpen }}
          style={s.lookupToggle}
          onPress={() => setLinkOpen(v => !v)}
        >
          <View style={s.lookupIconBox}>
            <Feather name="link" size={15} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={s.lookupTitle}>Dán liên kết hoặc tọa độ</Text>
            <Text style={s.lookupSub}>Tùy chọn · Hỗ trợ link Google Maps hoặc vĩ độ, kinh độ</Text>
          </View>
          <Feather
            name={linkOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={c.textSecondary}
          />
        </AnimatedPressable>

        {linkOpen && (
          <View style={s.lookupBody}>
            <AuthInput
              label="Liên kết bản đồ hoặc tọa độ"
              placeholder="Dán link Google Maps hoặc nhập 21.0188, 105.5215"
              value={input}
              onChangeText={val => {
                setInput(val);
                setError('');
                setAddress(null);
                setMatches([]);
                setAddressError('');
              }}
              maxLength={1500}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              error={error}
              style={{ minHeight: 72, maxHeight: 132 }}
            />
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.lookupActionBtn, busy && { opacity: 0.65 }]}
              onPress={() => {
                void lookup();
              }}
            >
              {busy ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Feather name="search" size={15} color={c.primary} />
              )}
              <Text style={s.lookupActionText}>
                {busy ? 'Đang tra cứu…' : 'Tra cứu vị trí'}
              </Text>
            </AnimatedPressable>
            {address !== null && (
              <View style={s.addressResults}>
                <Text style={s.suggestionLine}>
                  Link chỉ chứa địa chỉ. Chọn kết quả phù hợp hoặc đặt ghim trực tiếp.
                </Text>
                <AuthInput
                  label="Địa chỉ từ liên kết"
                  value={address}
                  onChangeText={text => {
                    setAddress(text);
                    setMatches([]);
                    setAddressError('');
                  }}
                  maxLength={200}
                  editable={!busy}
                  error={addressError}
                />
                <AnimatedPressable
                  accessibilityRole="button"
                  disabled={busy || address.trim().length < 3}
                  style={[s.lookupActionBtn, (busy || address.trim().length < 3) && { opacity: 0.65 }]}
                  onPress={() => {
                    setAddressError('');
                    void runLookup((token, signal) => findAddress(address.trim(), token, signal),
                      () => setAddressError('Chưa tìm được địa chỉ.'));
                  }}
                >
                  <Text style={s.lookupActionText}>Tìm địa chỉ</Text>
                </AnimatedPressable>
                {matches.map(match => (
                  <AnimatedPressable
                    key={match.refId}
                    accessibilityRole="button"
                    disabled={busy}
                    style={s.addressMatch}
                    onPress={() => {
                      setAddressError('');
                      void runLookup(async (token, signal) => {
                        const result = await hostRequest<LocationSuggestion>(
                          '/property-location/place', token, signal, { refId: match.refId }, 'POST'
                        );
                        if (signal.aborted) return;
                        showLocation(result);
                        setAddress(null);
                        setMatches([]);
                      }, cause => setAddressError(
                        cause instanceof Error ? cause.message : 'Chưa lấy được tọa độ. Hãy thử lại.'
                      ));
                    }}
                  >
                    <Feather name="map-pin" size={16} color={c.primary} />
                    <Text style={[s.suggestionLine, { flex: 1 }]}>{match.display}</Text>
                    <Feather name="chevron-right" size={15} color={c.textSecondary} />
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Suggestion Preview Card (optional apply — never silently overwrites address) */}
      {suggestion && (
        <View style={s.suggestionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={14} color={c.primary} />
            <Text style={s.suggestionTitle}>Thông tin gợi ý từ vị trí đã tra cứu</Text>
          </View>
          {[
            suggestion.addressDetail,
            suggestion.commune,
            suggestion.nearby,
            ...(suggestion.warnings || []),
            suggestion.attribution,
          ]
            .filter(Boolean)
            .map((line, index) => (
              <Text style={s.suggestionLine} key={index}>
                {line}
              </Text>
            ))}
        </View>
      )}
    </RegistrationSheet>
  );
}

const s = StyleSheet.create({
  sheetScreen: {
    flex: 1,
    backgroundColor: c.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  sheetBody: {
    padding: authSpacing.xl,
    gap: 14,
    paddingBottom: 24,
  },
  sheetFooter: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  aiInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
  },
  aiInlineText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: c.primary,
  },
  aiPreviewCard: {
    backgroundColor: '#F5FBF8',
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    padding: 14,
    gap: 8,
  },
  aiPreviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
  aiDismissHit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPreviewText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.forestInk,
  },
  aiPreviewNote: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
  },
  aiPreviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  aiSecondaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  aiPrimaryBtn: {
    flex: 1.4,
    minHeight: 40,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lookupCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  lookupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 56,
  },
  lookupIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  lookupSub: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
  },
  lookupBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 10,
  },
  lookupActionBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lookupActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  addressResults: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  addressMatch: {
    minHeight: 44,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.md,
  },
  suggestionCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    padding: 14,
    gap: 6,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
  suggestionLine: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  applyWithSuggestBtn: {
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
  applyWithSuggestText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
});
