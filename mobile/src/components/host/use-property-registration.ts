import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { tokenStore } from '@/services/auth';
import { hostRequest } from '@/services/host';
import { clearRegistrationDraft, readRegistrationDraft, writeRegistrationDraft } from '@/services/registration-draft';
import { checkRegistrationAsset, uploadRegistration } from '@/services/registration-upload';
import {
  DOCUMENTS, DOCUMENT_TYPES, STEPS, draftSnapshot, emptyFiles, registrationValues, restoreDraft, validateRegistration,
  type DocumentKey, type RegistrationAsset, type RegistrationErrors, type RegistrationFiles, type RegistrationValues,
} from '@/services/property-registration';

type HostAccount = { userId: number; fullName?: string; phoneNumber?: string };
type Eligibility = { canRegister: boolean; reason: string; identityApplicationId?: number | null };

export function usePropertyRegistration(user: HostAccount) {
  const { userId, fullName, phoneNumber } = user;
  const [values, setValues] = useState(() => registrationValues(user));
  const [files, setFiles] = useState(emptyFiles);
  const [missing, setMissing] = useState<string[]>([]);
  const [step, setStep] = useState(0), [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<RegistrationErrors>({}), [fileErrors, setFileErrors] = useState<RegistrationErrors>({});
  const [message, setMessage] = useState(''), [draftMessage, setDraftMessage] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [restoring, setRestoring] = useState(true), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false), [picking, setPicking] = useState<keyof RegistrationFiles | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState(''), [attempt, setAttempt] = useState(0);
  const [reuse, setReuse] = useState(true), [receipt, setReceipt] = useState<number | null>(null);
  const pending = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const revision = useRef(0);
  const canReuse = Boolean(eligibility?.identityApplicationId) && reuse && !files.idCard;

  useEffect(() => {
    let active = true;
    void readRegistrationDraft(userId).then(raw => {
      if (!active || !raw) return;
      const draft = restoreDraft(raw, registrationValues({ fullName, phoneNumber }));
      setValues(draft.values); setStep(draft.step); setMissing(draft.missing); setReuse(draft.reuse);
      setDraftMessage(draft.missing.length ? 'Đã khôi phục nháp. Một số tệp cần chọn lại.' : 'Đã khôi phục bản nháp.');
    }).catch(() => { if (active) setDraftMessage('Không đọc được bản nháp trên thiết bị.'); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; pending.current?.abort(); };
  }, [userId, fullName, phoneNumber]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await tokenStore.get();
        const data = await hostRequest<Eligibility>('/host/property-registrations/eligibility', token || '', controller.signal);
        if (typeof data?.canRegister !== 'boolean') throw new Error('Chưa xác nhận được quyền đăng ký.');
        if (!controller.signal.aborted) setEligibility(data);
      } catch (error) {
        if (!controller.signal.aborted) setEligibilityError(error instanceof Error ? error.message : 'Không kiểm tra được quyền đăng ký.');
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  const changed = () => { revision.current++; setDirty(true); setDraftSaved(false); };
  function update<K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    changed();
  }
  function clearIssue(key: keyof RegistrationFiles) {
    setMissing(current => current.filter(item => item !== key));
    setFileErrors(current => ({ ...current, [key]: undefined }));
    setErrors(current => ({ ...current, [key]: undefined }));
    changed();
  }
  function go(next: number, nextErrors: RegistrationErrors = {}) {
    setStep(next); setErrors(nextErrors);
  }
  function invalid(index: number, nextErrors: RegistrationErrors) {
    if (step === 5 && index < 5) setEditing(true);
    go(index, nextErrors);
  }
  function checkAll() {
    for (let index = 0; index < STEPS.length; index++) {
      const nextErrors = validateRegistration(values, files, index, canReuse);
      if (Object.keys(nextErrors).length) { invalid(index, nextErrors); return false; }
    }
    return true;
  }

  async function saveDraft(resume = step, silent = false) {
    if (lock.current) return;
    lock.current = true; setSaving(true);
    const savedRevision = revision.current;
    try {
      const draft = draftSnapshot(values, files, resume, missing, reuse);
      await writeRegistrationDraft(userId, JSON.stringify(draft));
      if (!silent) {
        setDraftSaved(true);
        setDraftMessage('');
      }
      if (revision.current === savedRevision) setDirty(false);
    } catch {
      if (!silent) {
        setDraftSaved(false);
        setDraftMessage('Chưa lưu được bản nháp. Vui lòng thử lại.');
      }
    } finally { lock.current = false; setSaving(false); }
  }

  async function pickPhotos(camera: boolean) {
    if (lock.current || files.photos.length >= 10) return;
    lock.current = true; setPicking('photos');
    try {
      if (camera && Platform.OS !== 'web' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        throw new Error('Cho phép dùng camera hoặc chọn ảnh từ thư viện.');
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true, selectionLimit: 10 - files.photos.length });
      if (result.canceled) return;
      await addPhotos(result.assets);
    } catch (error) {
      setFileErrors(current => ({ ...current, photos: error instanceof Error ? error.message : 'Không thể chọn ảnh. Vui lòng thử lại.' }));
    } finally { lock.current = false; setPicking(null); }
  }

  async function addPhotos(assets: RegistrationAsset[]) {
    const checked = await Promise.allSettled(assets.map(asset => checkRegistrationAsset(asset, false)));
    const valid = checked.flatMap(item => item.status === 'fulfilled' ? [item.value] : []);
    const failed = checked.find(item => item.status === 'rejected');
    if (valid.length) {
      setFiles(current => ({ ...current, photos: [...new Map([...current.photos, ...valid].map(asset => [asset.uri, asset])).values()].slice(0, 10) }));
      clearIssue('photos');
    }
    if (failed?.status === 'rejected') setFileErrors(current => ({ ...current, photos: failed.reason?.message || 'Có ảnh không đọc được. Hãy chọn lại.' }));
  }

  async function pickDocument(key: DocumentKey) {
    if (lock.current) return;
    lock.current = true; setPicking(key);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES, copyToCacheDirectory: true, base64: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      const checked = await checkRegistrationAsset({ uri: asset.uri, fileName: asset.name, file: asset.file, mimeType: asset.mimeType, fileSize: asset.size }, true);
      setFiles(current => ({ ...current, [key]: checked }));
      clearIssue(key);
    } catch (error) {
      setFileErrors(current => ({ ...current, [key]: error instanceof Error ? error.message : 'Không đọc được tài liệu. Vui lòng thử lại.' }));
    } finally { lock.current = false; setPicking(null); }
  }

  function removePhoto(asset: RegistrationAsset) {
    setFiles(current => ({ ...current, photos: current.photos.filter(item => item.uri !== asset.uri) }));
    clearIssue('photos');
  }
  function makeCover(asset: RegistrationAsset) {
    setFiles(current => ({ ...current, photos: [asset, ...current.photos.filter(item => item.uri !== asset.uri)] }));
    changed();
  }
  function removeDocument(key: DocumentKey) {
    setFiles(current => ({ ...current, [key]: null }));
    clearIssue(key);
  }

  async function advance() {
    if (lock.current) return false;
    if (step === 5) return checkAll();
    const nextErrors = validateRegistration(values, files, step, canReuse);
    if (Object.keys(nextErrors).length) { invalid(step, nextErrors); return false; }
    const target = editing ? 5 : step + 1;
    setEditing(false); go(target);
    await saveDraft(target, true);
    return false;
  }

  async function submit(): Promise<number | null> {
    if (lock.current || eligibility?.canRegister !== true || !checkAll()) return null;
    lock.current = true; setBusy(true); setMessage('');
    const controller = new AbortController();
    pending.current = controller;
    let sending = false;
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      for (const [key, assets] of [...DOCUMENTS.map(([key]) => [key, files[key] ? [files[key]!] : []] as const), ['photos', files.photos] as const]) {
        try { for (const asset of assets) await checkRegistrationAsset(asset, key !== 'photos'); }
        catch (error) {
          invalid(key === 'photos' ? 3 : 4, { [key]: error instanceof Error ? error.message : 'Chọn lại tệp.' });
          return null;
        }
      }
      const token = await tokenStore.get();
      if (controller.signal.aborted) return null;
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      sending = true;
      const id = await uploadRegistration(values, files, token, controller.signal);
      if (controller.signal.aborted) return null;
      setReceipt(id); setDirty(false); setFiles(emptyFiles);
      try { await clearRegistrationDraft(userId); } catch { /* The server has already accepted the registration. */ }
      return id;
    } catch (error) {
      if (controller.signal.aborted && sending) {
        setMessage('Máy chủ chưa xác nhận kết quả. Bạn có thể kiểm tra Nhà trọ của tôi hoặc thử gửi lại.');
      } else if (error instanceof TypeError || (error instanceof Error && /network request failed|failed to fetch/i.test(error.message))) {
        setMessage('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử gửi lại.');
      } else setMessage(error instanceof Error ? error.message : 'Chưa gửi được hồ sơ. Vui lòng thử lại.');
      return null;
    } finally { clearTimeout(timer); pending.current = null; lock.current = false; setBusy(false); }
  }

  return {
    values, files, missing, step, editing, errors, fileErrors, message, draftMessage, draftSaved, restoring, saving, dirty, busy,
    picking, eligibility, eligibilityError, canReuse, reuse, receipt, update, saveDraft, pickPhotos, pickDocument,
    makeCover, removePhoto, removeDocument, advance, submit,
    dismissDraftMessage() { setDraftMessage(''); },
    retryEligibility() { setEligibility(null); setEligibilityError(''); setAttempt(current => current + 1); },
    toggleReuse() { setReuse(!reuse); clearIssue('idCard'); },
    edit(index: number) { setEditing(true); go(index); },
    back() { setEditing(false); go(editing ? 5 : Math.max(0, step - 1)); },
  };
}
