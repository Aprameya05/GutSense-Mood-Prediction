import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const userId = useAppStore((state) => state.userId);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide splash screen on mount
    SplashScreen.hideAsync();
  }, []);

  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Only proceed if the navigation state is successfully initialized
    if (!rootNavigationState?.key) return;

    // Auth guarding navigation logic
    const inAuthGroup = segments[0] === '(auth)';

    // Use a short timeout to ensure the layout has completed its initial render cycle 
    // before we issue a replacement route command.
    setTimeout(() => {
      if (!userId && !inAuthGroup) {
        // Redirect to the login page.
        router.replace('/(auth)/login');
      } else if (userId && inAuthGroup) {
        // Redirect away from the login page.
        router.replace('/(drawer)');
      }
    }, 0);

  }, [userId, segments, rootNavigationState?.key]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}
