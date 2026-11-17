import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c } from '@/components/auth/tokens';
import { useAuth } from '@/context/auth-context';
import { createViewing, validateViewingTime } from '@/services/accommodations';
import { useReducedMotionPreference } from '@/constants/motion';

export function ViewingSheet({ propertyId, roomTypeId, onClose }: { propertyId: number; roomTypeId: number; onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const reduceMotion = useReducedMotionPreference();
  const submit = async () => {
    if (lock.current) return;
    const normalizedPhone = phone.replace(/[\s.()-]/g, '');
    const scheduledDate = `${date}T${time}:00`;
    if (!name.trim() || !/^(?:0|\+84)[35789]\d{8}$/.test(normalizedPhone)) { setError('Nhập họ tên và số điện thoại Việt Nam hợp lệ.'); return; }
    const timeError = validateViewingTime(date, time);
    if (timeError) { setError(timeError); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await createViewing({ propertyId, roomTypeId, contactName: name.trim(), contactPhone: normalizedPhone, scheduledDate, note: note.trim() || undefined });
      const status = ({ PENDING: 'Đang chờ chủ trọ xác nhận', APPROVED: 'Chủ trọ đã xác nhận', REJECTED: 'Yêu cầu đã bị từ chối', CANCELLED: 'Yêu cầu đã bị hủy' } as Record<string, string>)[result.status] || result.status;
      Alert.alert('Lịch xem phòng', `Yêu cầu #${result.bookingId}: ${status}.\n${date} lúc ${time} (giờ Việt Nam).`);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa thể gửi lịch. Vui lòng thử lại.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Modal animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Text style={styles.title}>Đặt lịch xem phòng</Text><AnimatedPressable disabled={busy} style={styles.close} onPress={onClose} accessibilityLabel="Đóng đặt lịch"><Feather name="x" size={24} color={c.forestInk} /></AnimatedPressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Text style={styles.hint}>Chọn thời gian trong 30 ngày tới theo giờ Việt Nam. Chủ trọ sẽ xác nhận yêu cầu của bạn.</Text>
        <Text style={styles.label}>Họ và tên</Text><TextInput accessibilityLabel="Họ và tên liên hệ" style={styles.input} value={name} onChangeText={setName} maxLength={120} autoComplete="name" />
        <Text style={styles.label}>Số điện thoại</Text><TextInput accessibilityLabel="Số điện thoại liên hệ" style={styles.input} value={phone} onChangeText={setPhone} maxLength={40} keyboardType="phone-pad" autoComplete="tel" />
        <Text style={styles.label}>Ngày xem · Năm-Tháng-Ngày</Text><TextInput accessibilityLabel="Ngày xem, định dạng năm tháng ngày" style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>Giờ xem · Giờ:Phút</Text><TextInput accessibilityLabel="Giờ xem, định dạng 24 giờ" style={styles.input} value={time} onChangeText={setTime} placeholder="HH:mm" maxLength={5} keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>Lời nhắn (không bắt buộc)</Text><TextInput accessibilityLabel="Lời nhắn cho chủ trọ" style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline maxLength={1000} />
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
      <AnimatedPressable disabled={busy} onPress={submit} style={styles.submit}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Gửi yêu cầu xem phòng</Text>}</AnimatedPressable>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 }, title: { fontSize: 23, fontWeight: '700', color: c.forestInk, flex: 1 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 10 }, hint: { color: c.textSecondary, lineHeight: 22, marginBottom: 10 }, label: { color: c.forestInk, fontSize: 14, fontWeight: '600' }, input: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, minHeight: 52, fontSize: 16, color: c.forestInk, marginBottom: 8 }, error: { color: c.error, lineHeight: 22 }, submit: { margin: 20, minHeight: 54, padding: 14, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }, submitText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
