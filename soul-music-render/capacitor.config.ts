import type { CapacitorConfig } from '@capacitor/cli';

// The Android build is a thin native shell around the same app. Everything
// (search, streaming, imports, accounts) lives on the Node server, so the APK
// loads that server over your local network. Change this if your PC's LAN IP
// or port changes, then rebuild the APK.
const appUrl = process.env.SOUL_APP_URL || 'http://192.168.1.2:3001';

const config: CapacitorConfig = {
  appId: 'soulmusic.apk',
  appName: 'Soul Music',
  webDir: 'dist',
  server: {
    url: appUrl,
    cleartext: true,
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
