import { StyleSheet, View } from 'react-native';
import { authColors as c } from '@/components/auth/tokens';

export function CompactRoomSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Đang tải danh sách loại phòng" style={styles.container}>
    {[0, 1, 2].map(index => <View key={index} style={styles.card}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={[styles.line, { width: '90%', height: 18 }]} />
        <View style={[styles.line, { width: '75%' }]} />
        <View style={[styles.line, { width: '85%' }]} />
        <View style={[styles.line, { width: '70%', height: 20, marginTop: 8 }]} />
        <View style={[styles.line, { width: '55%' }]} />
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  card: { marginHorizontal: 20, marginBottom: 12, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', gap: 12 },
  image: { width: 112, height: 144, borderRadius: 14, backgroundColor: c.softMint, opacity: 0.65 },
  content: { flex: 1, justifyContent: 'center', gap: 8 },
  line: { height: 12, borderRadius: 5, backgroundColor: c.border },
});
