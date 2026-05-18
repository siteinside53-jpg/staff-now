import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config για το StaffNow iOS / Android wrapper.
 *
 * Strategy:
 *   • Το static Next.js export (`webDir: 'out'`) είναι bundled μέσα στο
 *     binary — άμεση εκκίνηση, offline-capable. Αυτό αποφεύγει το App
 *     Review 4.2 "Minimum Functionality" rejection που χτυπάει τα καθαρά
 *     web-view wrappers.
 *   • Τα API calls πάνε στον production worker (μέσω
 *     NEXT_PUBLIC_API_URL που γίνεται baked στο build), άρα
 *     subscriptions / matches / messages μένουν live.
 *   • Για γρήγορη ανάπτυξη μπορείς προσωρινά να ενεργοποιήσεις το
 *     `server.url` block — αλλά ΜΗΝ το αφήσεις στο submission build.
 */
const config: CapacitorConfig = {
  appId: 'gr.staffnow.app',
  appName: 'StaffNow',
  webDir: 'out',
  // server: {
  //   url: 'https://staffnow.gr',
  //   cleartext: false,
  //   allowNavigation: ['staffnow.gr', '*.staffnow.gr'],
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0F2E',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0A0F2E',
    },
    PushNotifications: {
      // Apple requires aps-environment entitlement όταν αυτό το plugin είναι
      // εγκατεστημένο. Μετά το cap sync, στο Xcode → Capabilities ενεργοποίησε
      // Push Notifications + Background Modes (Remote notifications).
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    backgroundColor: '#0A0F2E',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0F2E',
    scheme: 'StaffNow',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
