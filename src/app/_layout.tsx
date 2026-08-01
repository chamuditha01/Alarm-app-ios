import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initNotifeeHandler, setNavigationCallback } from '@/lib/notifeeHandler';
import { loadPersistedState, getLockState } from '@/lib/lockState';
import { persistStep } from '@/lib/alarms';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // ── Deep-link handler: lockinapp://alarm/start ─────────────────────────────
  // Fired when the user taps "Start Reading" on the AlarmKit lock-screen alert.
  // The alarm alert dismisses, the app opens, and we navigate to Reading.
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;
    const parsed = Linking.parse(url);
    if (parsed.path === 'alarm/start') {
      // Immediately route to Reading — alarm state already set by setLockState
      persistStep('READING').catch(() => {});
      router.replace('/reading' as Href);
    }
  }, [url, router]);

  useEffect(() => {
    // ── Android: Notifee navigation callback ───────────────────────────────
    setNavigationCallback((path: string) => {
      router.replace(path as Href);
    });
    initNotifeeHandler();

    // ── iOS: Restore state after crash / reboot ────────────────────────────
    // If the app was killed while a reading/quiz session was active,
    // loadPersistedState() restores isLocked + currentStep from UserDefaults.
    (async () => {
      const restored = await loadPersistedState();
      if (restored) {
        const { currentStep } = getLockState();
        // Route to the correct screen based on persisted step
        if (currentStep === 'READING') {
          router.replace('/reading' as Href);
        } else if (currentStep === 'QUIZ') {
          router.replace('/quiz' as Href);
        } else if (currentStep === 'RINGING') {
          router.replace('/ringing' as Href);
        }
      }
    })();
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

