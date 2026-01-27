import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inProfileSetup = segments[0] === 'profile-setup';
    const isOnboarded = user?.user_metadata?.onboarding_complete === true;
    const atRoot = segments.length === 0 || segments[0] === 'index';

    if (!isAuthenticated) {
      if (!inAuthGroup && !atRoot) {
        // Redirect to the welcome screen if not authenticated and trying to access protected routes
        router.replace('/');
      }
    } else if (isAuthenticated) {
      if (isOnboarded) {
        // If onboarded, generally shouldn't be in auth or setup screens
        // Also redirect from Root (Welcome) to Home
        if (inAuthGroup || inProfileSetup || atRoot) {
            router.replace('/(tabs)/home');
        }
      } else {
        // If authenticated but NOT onboarded, force to profile setup
        if (!inProfileSetup) {
            router.replace('/profile-setup');
        }
      }
    }
  }, [isAuthenticated, segments, user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
