import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { getApiBase } from '@/services/accommodations';
import type { RegistrationMapProps } from './registration-location-map';

// Center the viewport over Hòa Lạc. A marker only appears after an explicit selection.
const areaCenter = { latitude: 21.0188, longitude: 105.5215 };
const mapPage = '/mobile-property-map.html';

function systemMapUrl() {
  const configured = process.env.EXPO_PUBLIC_PROPERTY_MAP_URL?.trim();
  try {
    const url = configured
      ? new URL(configured)
      : __DEV__ ? new URL(`http://${new URL(getApiBase()).hostname}:5173${mapPage}`) : null;
    if (!url?.hostname || url.origin.includes('@') || !url.pathname.endsWith(mapPage)) return null;
    if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export function RegistrationLocationMap({ point, onSelect }: RegistrationMapProps) {
  const [page] = useState(systemMapUrl);
  const [source] = useState(() => {
    if (!page) return null;
    return { uri: point ? `${page}?lat=${point.latitude}&lng=${point.longitude}` : page };
  });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!source) return;
    const timeout = setTimeout(() => setFailed(true), 10_000);
    timer.current = timeout;
    return () => clearTimeout(timeout);
  }, [source]);

  function markFailed() {
    if (timer.current) clearTimeout(timer.current);
    setFailed(true);
  }

  const systemMap = Boolean(source && !failed);
  return (
    <View style={s.mapWrap}>
      {systemMap && source ? (
        <View style={s.mapFrame}>
          <WebView
            accessibilityLabel="Bản đồ hệ thống HL_RCS"
            source={source}
            incognito
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            mixedContentMode="never"
            allowFileAccess={false}
            setSupportMultipleWindows={false}
            nestedScrollEnabled
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={request => request.url.split(/[?#]/)[0] === page}
            onError={markFailed}
            onHttpError={event => {
              if (event.nativeEvent.url.split(/[?#]/)[0] === page) markFailed();
            }}
            onMessage={event => {
              if (event.nativeEvent.url.split(/[?#]/)[0] !== page) return;
              try {
                const { type, latitude, longitude } = JSON.parse(event.nativeEvent.data);
                if (type === 'property-map-ready') {
                  if (timer.current) clearTimeout(timer.current);
                  setReady(true);
                } else if (type === 'property-map-error') {
                  markFailed();
                } else if (type === 'property-pin' && Number.isFinite(latitude) &&
                    Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
                  onSelect({ latitude, longitude });
                }
              } catch {
                // Ignore messages outside the map's data contract.
              }
            }}
          />
          {!ready && (
            <View style={s.mapLoading} pointerEvents="none">
              <ActivityIndicator color={c.primary} />
              <Text style={s.notice}>Đang mở bản đồ hệ thống…</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          {failed && <Text style={s.notice}>Chưa mở được bản đồ hệ thống. Bạn vẫn có thể dùng bản đồ thiết bị hoặc tra địa chỉ.</Text>}
          <DeviceMap point={point} onSelect={onSelect} />
        </>
      )}
      {(point || systemMap) && (
        <View style={s.hintRow}>
          <Feather name="crosshair" size={13} color={c.primary} />
          <Text style={s.hintText}>
            {point
              ? `Đã ghim ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)} · Kéo ghim để chỉnh`
              : 'Chạm lên bản đồ để đặt ghim vị trí nhà trọ'}
          </Text>
        </View>
      )}
    </View>
  );
}

function DeviceMap({ point, onSelect }: RegistrationMapProps) {
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment !== 'storeClient' &&
    Constants.expoConfig?.extra?.androidRegistrationMap !== true
  ) {
    return (
      <View style={s.fallbackCard}>
        <Feather name="map" size={22} color={c.primary} />
        <Text style={s.fallbackText}>
          Bản đồ chưa được cấu hình trên bản build này. Bạn vẫn có thể mở mục “Dán liên kết hoặc tọa
          độ” bên dưới hoặc quay lại dùng địa chỉ nhập tay.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.mapWrap}>
      <View style={s.mapFrame}>
        <MapView
          accessibilityLabel="Bản đồ chọn vị trí nhà trọ"
          style={s.map}
          initialRegion={{ ...(point || areaCenter), latitudeDelta: 0.022, longitudeDelta: 0.022 }}
          onPress={event => onSelect(event.nativeEvent.coordinate)}
        >
          {point && (
            <Marker
              draggable
              coordinate={point}
              onDragEnd={event => onSelect(event.nativeEvent.coordinate)}
            />
          )}
        </MapView>
      </View>
      {!point && <Text style={s.notice}>Chạm lên bản đồ để đặt ghim vị trí nhà trọ</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  mapWrap: {
    gap: 8,
  },
  mapFrame: {
    height: 360,
    borderRadius: authRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: '#EEF4F1',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notice: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  fallbackCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
