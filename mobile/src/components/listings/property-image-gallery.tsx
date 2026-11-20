import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c } from '@/components/auth/tokens';
import { resolveImageUrl } from '@/services/accommodations';
import { useReducedMotionPreference } from '@/constants/motion';

function GalleryPhoto({ url, caption, width, height, full }: { url: string; caption?: string; width: number; height: number; full: boolean }) {
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotionPreference();
  return <View style={{ width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: full ? '#142D29' : c.softMint }}>
    {failed ? <View style={styles.placeholder}><Feather name="image" size={32} color={c.textMuted} /><Text style={styles.placeholderText}>Không thể tải ảnh</Text></View> : <Image source={{ uri: resolveImageUrl(url)! }} accessibilityLabel={caption || 'Ảnh phòng trọ'} contentFit={full ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} cachePolicy="memory-disk" transition={reduceMotion ? 0 : 180} onError={() => setFailed(true)} />}
  </View>;
}

export function PropertyImageGallery({ photos }: { photos: { url: string; caption?: string }[] }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fullHeight = Math.max(100, height - insets.top - insets.bottom - 48);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullIndex, setFullIndex] = useState(0);
  const reduceMotion = useReducedMotionPreference();
  const valid = [...new Map(photos.filter(photo => photo.url).map(photo => [photo.url, photo])).values()];
  if (!valid.length) return <View style={[styles.empty, { height: width * 0.78 }]}><Feather name="image" size={36} color={c.textMuted} /><Text style={styles.placeholderText}>Chưa có hình ảnh</Text></View>;
  return <>
    <View style={{ height: width * 0.78, backgroundColor: c.softMint }}>
      <FlatList key={width} data={valid} horizontal pagingEnabled initialScrollIndex={Math.min(index, valid.length - 1)} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} showsHorizontalScrollIndicator={false} keyExtractor={photo => photo.url}
        onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: photoIndex }) => <AnimatedPressable style={{ width, height: width * 0.78 }} haptic="none" accessibilityLabel="Mở ảnh toàn màn hình" onPress={() => { setFullIndex(photoIndex); setFullscreen(true); }}><GalleryPhoto url={item.url} caption={item.caption} width={width} height={width * 0.78} full={false} /></AnimatedPressable>} />
      <View style={styles.counter}><Text style={styles.counterText}>{Math.min(index + 1, valid.length)} / {valid.length}</Text></View>
    </View>
    <Modal visible={fullscreen} animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setFullscreen(false)}>
      {fullscreen && <SafeAreaView style={styles.full}>
        <View style={styles.fullHeader}><Text style={styles.counterText}>{fullIndex + 1} / {valid.length}</Text><AnimatedPressable style={styles.close} accessibilityLabel="Đóng ảnh" onPress={() => setFullscreen(false)}><Feather name="x" size={24} color="white" /></AnimatedPressable></View>
        <FlatList key={width} data={valid} horizontal pagingEnabled initialScrollIndex={Math.min(fullIndex, valid.length - 1)} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })} keyExtractor={photo => photo.url}
          onMomentumScrollEnd={event => setFullIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => <GalleryPhoto url={item.url} caption={item.caption} width={width} height={fullHeight} full />} />
      </SafeAreaView>}
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.softMint },
  placeholder: { alignItems: 'center', gap: 12 }, placeholderText: { color: c.textSecondary, fontSize: 14 },
  counter: { position: 'absolute', right: 20, bottom: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(20,45,41,0.75)', borderRadius: 99 },
  counterText: { fontSize: 13, fontWeight: '600', color: 'white' },
  full: { flex: 1, backgroundColor: c.forestInk }, fullHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});

