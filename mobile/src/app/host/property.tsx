import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ResourceState, h } from '@/components/host/host-ui';
import { PropertyDetailContent } from '@/components/host/property-detail-content';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';

export default function PropertyDetail() {
  const { id, registrationId } = useLocalSearchParams<{
    id?: string;
    registrationId?: string;
  }>();
  const host = useHost();
  const { user } = useAuth();

  const record = host.data.properties?.records.find(p =>
    id ? String(p.propertyId) === id : String(p.registrationId) === registrationId
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.dismissTo('/home');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={h.screen}>
      {/* Top Navigation Bar */}
      <View style={s.topBar}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          style={s.backBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <Text style={s.topTitle} numberOfLines={1}>
          Chi tiết nhà trọ
        </Text>
        <View style={s.topSpacer} />
      </View>

      {!host.allowed ? (
        <View style={s.centerCard}>
          <Feather name="lock" size={26} color={c.textSecondary} />
          <Text style={s.centerTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.centerSubtitle}>
            Tài khoản hiện tại không có quyền xem chi tiết nhà trọ này.
          </Text>
        </View>
      ) : (
        <>
          {host.errors.properties && (
            <View style={{ paddingHorizontal: authSpacing.xl, paddingTop: authSpacing.sm }}>
              <ResourceState resource="properties" />
            </View>
          )}

          {record ? (
            <PropertyDetailContent
              key={`${user?.userId}:${record.propertyId || record.registrationId}`}
              record={record}
            />
          ) : host.data.properties ? (
            <View style={s.centerCard}>
              <Feather name="home" size={26} color={c.primary} />
              <Text style={s.centerTitle}>Không tìm thấy nhà trọ</Text>
              <Text style={s.centerSubtitle}>
                Nhà trọ hoặc hồ sơ này không tồn tại trong tài khoản của bạn.
              </Text>
            </View>
          ) : !host.errors.properties ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Đang tải chi tiết nhà trọ"
              style={s.skeletonWrap}
            >
              <View style={[s.skeleton, { height: 220, borderRadius: authRadius.xxl }]} />
              <View style={[s.skeleton, { height: 28, width: '72%' }]} />
              <View style={[s.skeleton, { height: 18, width: '90%' }]} />
              <View style={[s.skeleton, { height: 48, borderRadius: 14 }]} />
              <View style={[s.skeleton, { height: 160, borderRadius: 18 }]} />
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: {
    paddingHorizontal: authSpacing.lg,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: c.forestInk,
  },
  topSpacer: {
    width: 44,
    height: 44,
  },
  centerCard: {
    margin: authSpacing.xl,
    padding: authSpacing.xxl,
    borderRadius: authRadius.xxl,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: 8,
  },
  centerTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  skeletonWrap: {
    padding: authSpacing.xl,
    gap: 14,
  },
  skeleton: {
    backgroundColor: c.border,
    borderRadius: 10,
  },
});
