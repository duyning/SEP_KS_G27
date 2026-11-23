import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { tokenStore } from '@/services/auth';
import {
  scanContractFilesNative,
  type ContractScanResult,
  type ScanLocalFile,
} from '@/services/contract-scan-upload';
import {
  SCAN_MAX_FILES,
  validateScanUploadFiles,
} from '@/services/contract-wizard';

export function ContractScanSheet({
  visible,
  roomId,
  roomNumber,
  scanAvailable,
  onClose,
  onApply,
}: {
  visible: boolean;
  roomId: number;
  roomNumber: string;
  scanAvailable: boolean;
  onClose: () => void;
  onApply: (payload: {
    terms: string;
    fullScannedTranscript: string;
    sourceName: string;
    scanFullDocument: boolean;
  }) => void;
}) {
  if (!visible) return null;
  return (
    <ContractScanSheetContent
      roomId={roomId}
      roomNumber={roomNumber}
      scanAvailable={scanAvailable}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function ContractScanSheetContent({
  roomId,
  roomNumber,
  scanAvailable,
  onClose,
  onApply,
}: {
  roomId: number;
  roomNumber: string;
  scanAvailable: boolean;
  onClose: () => void;
  onApply: (payload: {
    terms: string;
    fullScannedTranscript: string;
    sourceName: string;
    scanFullDocument: boolean;
  }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [files, setFiles] = useState<ScanLocalFile[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractScanResult | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);

  const handleClose = () => {
    if (!busy) onClose();
  };

  const addFile = (next: ScanLocalFile[]) => {
    setError(null);
    const merged = [...files, ...next].slice(0, SCAN_MAX_FILES);
    const validationErr = validateScanUploadFiles(merged);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setFiles(merged);
  };

  const pickPdfOrFile = async () => {
    if (busy || files.length >= SCAN_MAX_FILES) return;
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const mapped: ScanLocalFile[] = res.assets.map((a, idx) => ({
        id: `doc-${Date.now()}-${idx}`,
        uri: a.uri,
        fileName: a.name || `mau-hop-dong-${idx + 1}.pdf`,
        mimeType: a.mimeType || 'application/pdf',
        fileSize: a.size || 0,
        file: (a as unknown as { file?: globalThis.File }).file,
      }));
      addFile(mapped);
    } catch {
      setError('Không thể chọn tệp từ thiết bị. Vui lòng thử lại.');
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    if (busy || files.length >= SCAN_MAX_FILES) return;
    setError(null);
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(
          fromCamera
            ? 'Cần quyền camera để chụp trang hợp đồng.'
            : 'Cần quyền thư viện ảnh để chọn trang hợp đồng.'
        );
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: Math.max(1, SCAN_MAX_FILES - files.length),
            quality: 0.9,
          });
      if (res.canceled || !res.assets?.length) return;
      const mapped: ScanLocalFile[] = res.assets.map((a, idx) => ({
        id: `img-${Date.now()}-${idx}`,
        uri: a.uri,
        fileName: a.fileName || `trang-hop-dong-${idx + 1}.jpg`,
        mimeType: a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
        fileSize: a.fileSize || 0,
        file: (a as unknown as { file?: globalThis.File }).file,
      }));
      addFile(mapped);
    } catch {
      setError('Không thể mở camera hoặc thư viện ảnh.');
    }
  };

  const handleRunScan = async () => {
    const fileErr = validateScanUploadFiles(files);
    if (fileErr) {
      setError(fileErr);
      return;
    }
    if (!consent) {
      setError('Vui lòng xác nhận đồng ý gửi tài liệu để hệ thống trích xuất nội dung.');
      return;
    }

    setBusy(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const token = await tokenStore.get();
      const scanRes = await scanContractFilesNative(roomId, files, token || '', controller.signal);
      setResult(scanRes);
      const initialTexts: Record<string, string> = {};
      for (const page of scanRes.pages) {
        initialTexts[page.pageId] = page.text || '';
      }
      setEditedTexts(initialTexts);
      setVerified(false);
      triggerHaptic('success');
    } catch (err) {
      triggerHaptic('medium');
      setError(
        controller.signal.aborted
          ? 'Quá thời gian quét tài liệu. Hãy thử lại với ít trang hơn hoặc ảnh rõ hơn.'
          : err instanceof Error
          ? err.message
          : 'Không thể trích xuất nội dung từ tài liệu.'
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const handleApplyResult = () => {
    if (!result || !verified) return;
    const combined = result.pages
      .map(p => (editedTexts[p.pageId] ?? p.text ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    if (!combined.trim()) {
      setError('Nội dung văn bản trích xuất đang trống. Vui lòng kiểm tra hoặc nhập bổ sung.');
      return;
    }
    const sourceName = files.map(f => f.fileName).join(', ').slice(0, 255);
    onApply({
      terms: combined.slice(0, 30000),
      fullScannedTranscript: combined.slice(0, 60000),
      sourceName,
      scanFullDocument: true,
    });
    onClose();
  };

  return (
    <Modal
      animationType={reduced ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.header}>
          <AnimatedPressable
            disabled={busy}
            accessibilityLabel="Đóng quét mẫu hợp đồng"
            style={s.backBtn}
            onPress={handleClose}
          >
            <Feather name="arrow-left" size={20} color={c.forestInk} />
          </AnimatedPressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Quét mẫu hợp đồng riêng</Text>
            <Text style={s.headerSub}>Phòng {roomNumber} · Tối đa 5 tệp (10 MB)</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!scanAvailable && (
            <View style={s.warnBox}>
              <Feather name="info" size={16} color="#9A5B0A" style={{ marginTop: 2 }} />
              <Text style={s.warnText}>
                Máy chủ hiện chưa bật OCR ảnh/scan Gemini. Bạn vẫn có thể tải PDF có lớp văn bản
                hoặc chọn mẫu hợp đồng hệ thống.
              </Text>
            </View>
          )}

          {!result ? (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>1. Chọn tệp hoặc chụp trang hợp đồng</Text>
                <Text style={s.cardSub}>
                  Hỗ trợ JPG, PNG hoặc PDF (mỗi tệp tối đa 5 MB, tổng tối đa 10 MB, tối đa 5 tệp).
                </Text>

                <View style={s.pickGrid}>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy || files.length >= SCAN_MAX_FILES}
                    style={s.pickBtn}
                    onPress={() => {
                      void pickPdfOrFile();
                    }}
                  >
                    <Feather name="file-text" size={16} color={c.primary} />
                    <Text style={s.pickBtnText}>Chọn PDF / tệp</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy || files.length >= SCAN_MAX_FILES}
                    style={s.pickBtn}
                    onPress={() => {
                      void pickImage(false);
                    }}
                  >
                    <Feather name="image" size={16} color={c.primary} />
                    <Text style={s.pickBtnText}>Thư viện ảnh</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy || files.length >= SCAN_MAX_FILES}
                    style={s.pickBtn}
                    onPress={() => {
                      void pickImage(true);
                    }}
                  >
                    <Feather name="camera" size={16} color={c.primary} />
                    <Text style={s.pickBtnText}>Chụp ảnh</Text>
                  </AnimatedPressable>
                </View>

                {files.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {files.map((item, idx) => (
                      <View key={item.id} style={s.fileRow}>
                        <Feather
                          name={item.mimeType === 'application/pdf' ? 'file-text' : 'image'}
                          size={16}
                          color={c.primary}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.fileName} numberOfLines={1}>
                            {idx + 1}. {item.fileName}
                          </Text>
                          <Text style={s.fileMeta}>
                            {(item.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </Text>
                        </View>
                        <AnimatedPressable
                          disabled={busy}
                          accessibilityLabel={`Xóa tệp ${item.fileName}`}
                          style={s.removeBtn}
                          onPress={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                        >
                          <Feather name="trash-2" size={15} color={c.error} />
                        </AnimatedPressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={s.card}>
                <AnimatedPressable
                  scaleTo={0.99}
                  disabled={busy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consent }}
                  style={s.checkRow}
                  onPress={() => setConsent(v => !v)}
                >
                  <View style={[s.checkbox, consent && s.checkboxActive]}>
                    {consent && <Feather name="check" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={s.checkText}>
                    Tôi đồng ý gửi tài liệu đã chọn lên máy chủ HL_RCS để trích xuất nguyên văn nội
                    dung hợp đồng. Kết quả trích xuất chỉ mang tính hỗ trợ, tôi sẽ tự đối chiếu với
                    bản gốc trước khi sử dụng.
                  </Text>
                </AnimatedPressable>
              </View>
            </>
          ) : (
            <>
              <View style={s.warnBox}>
                <Feather name="alert-triangle" size={16} color="#9A5B0A" style={{ marginTop: 2 }} />
                <Text style={s.warnText}>
                  Kết quả trích xuất có thể chứa ký tự chưa rõ (`⟦KHÔNG ĐỌC RÕ:...⟧`). Hãy đối
                  chiếu từng trang với bản gốc và chỉnh sửa trực tiếp trước khi áp dụng.
                </Text>
              </View>

              {result.pages.map(page => (
                <View key={page.pageId} style={s.card}>
                  <View style={s.pageHeader}>
                    <Text style={s.pageTitle}>
                      Trang {page.pageNumber}/{page.totalPages} · {page.fileName}
                    </Text>
                    <View
                      style={[
                        s.statusBadge,
                        page.pageStatus === 'readable' ? s.badgeOk : s.badgeWarn,
                      ]}
                    >
                      <Text
                        style={[
                          s.statusBadgeText,
                          page.pageStatus === 'readable'
                            ? { color: c.primaryDark }
                            : { color: '#9A5B0A' },
                        ]}
                      >
                        {page.pageStatus === 'readable'
                          ? 'Đọc rõ'
                          : page.pageStatus === 'blank'
                          ? 'Trang trống'
                          : 'Cần đối chiếu'}
                      </Text>
                    </View>
                  </View>

                  {page.error ? <InlineError message={page.error} /> : null}

                  {page.uncertainSpans.length > 0 && (
                    <Text style={s.uncertainNote}>
                      Có {page.uncertainSpans.length} vị trí chưa đọc chắc cần bạn kiểm tra lại.
                    </Text>
                  )}

                  <TextInput
                    value={editedTexts[page.pageId] ?? ''}
                    onChangeText={val =>
                      setEditedTexts(prev => ({ ...prev, [page.pageId]: val }))
                    }
                    multiline
                    textAlignVertical="top"
                    placeholder="Nội dung trang hợp đồng..."
                    placeholderTextColor={c.placeholder}
                    style={s.transcriptInput}
                  />
                </View>
              ))}

              <View style={s.card}>
                <AnimatedPressable
                  scaleTo={0.99}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: verified }}
                  style={s.checkRow}
                  onPress={() => setVerified(v => !v)}
                >
                  <View style={[s.checkbox, verified && s.checkboxActive]}>
                    {verified && <Feather name="check" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={s.checkText}>
                    Tôi đã kiểm tra và đối chiếu nội dung trích xuất với tài liệu hợp đồng gốc.
                  </Text>
                </AnimatedPressable>
              </View>
            </>
          )}

          <InlineError message={error} />
        </ScrollView>

        <View style={s.footer}>
          {!result ? (
            <PrimaryButton
              title={busy ? 'Đang trích xuất nội dung…' : 'Trích xuất nội dung hợp đồng'}
              loading={busy}
              disabled={busy || files.length === 0 || !consent}
              onPress={() => {
                void handleRunScan();
              }}
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.secondaryBtn}
                onPress={() => {
                  setResult(null);
                  setVerified(false);
                }}
              >
                <Text style={s.secondaryBtnText}>Quét lại</Text>
              </AnimatedPressable>
              <View style={{ flex: 1.5 }}>
                <PrimaryButton
                  title="Áp dụng mẫu đã đối chiếu"
                  disabled={!verified}
                  onPress={handleApplyResult}
                />
              </View>
            </View>
          )}
        </View>

        {busy && (
          <View style={s.busyOverlay}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={s.busyText}>Đang trích xuất từng trang tài liệu…</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: c.forestInk },
  headerSub: { fontSize: 12, color: c.textSecondary },
  body: { padding: authSpacing.lg, gap: 14, paddingBottom: 30 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: c.forestInk },
  cardSub: { fontSize: 12.5, lineHeight: 18, color: c.textSecondary },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F5DCB0',
    borderRadius: authRadius.md,
    padding: 12,
  },
  warnText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#8A4F07' },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBtn: {
    flex: 1,
    minWidth: 100,
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  pickBtnText: { fontSize: 12.5, fontWeight: '700', color: c.primary },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
  },
  fileName: { fontSize: 13.5, fontWeight: '700', color: c.forestInk },
  fileMeta: { fontSize: 11.5, color: c.textSecondary },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  checkText: { flex: 1, fontSize: 13, lineHeight: 19, color: c.forestInk },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pageTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: c.forestInk },
  statusBadge: { borderRadius: authRadius.round, paddingHorizontal: 9, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#E8F5EE' },
  badgeWarn: { backgroundColor: '#FEF6E7' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  uncertainNote: { fontSize: 12, fontWeight: '600', color: '#9A5B0A' },
  transcriptInput: {
    minHeight: 140,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
    color: c.forestInk,
  },
  footer: {
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
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
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: c.forestInk },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(250, 250, 247, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  busyText: { fontSize: 14, fontWeight: '700', color: c.forestInk },
});
