import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins || [])];
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (iosClientId) {
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(iosClientId)) throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID không hợp lệ.');
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`,
    }]);
  }
  return {
    ...config,
    name: config.name || 'mobile', slug: config.slug || 'mobile', plugins,
    ios: { ...config.ios, ...(process.env.HLRCS_IOS_BUNDLE_ID ? { bundleIdentifier: process.env.HLRCS_IOS_BUNDLE_ID.trim() } : {}) },
    android: { ...config.android, ...(process.env.HLRCS_ANDROID_PACKAGE ? { package: process.env.HLRCS_ANDROID_PACKAGE.trim() } : {}) },
  };
};
