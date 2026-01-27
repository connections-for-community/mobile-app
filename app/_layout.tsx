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
  const segments = useSegments();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarded = user?.user_metadata?.onboarding_complete === true;

    if (!isAuthenticated && !inAuthGroup && segments.length > 0) {
      // Redirect to the welcome screen if not authenticated and trying to access protected routes
      router.replace('/');
    } else if (isAuthenticated && (inAuthGroup || segments.length < 1)) {
      if (isOnboarded) {
        // Redirect to tabs ONLY if completely onboarded
        router.replace('/(tabs)/home');
      } 
      // If authenticatd but NOT onboarded, stay in auth group (login/signup) to finish details
    }
  }, [isAuthenticated, segments, user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
