import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

// export const unstable_settings = {
//   anchor: '(tabs)',
// };

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    // Don't navigate while still loading auth state
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inProfileSetup = segments[0] === "profile-setup";
    const atRoot = segments.length === 0 || segments[0] === "index";

    const hasPersonality = !!user?.user_metadata?.personality_type;
    const isOnboarded = user?.user_metadata?.onboarding_complete === true;

    if (!isAuthenticated) {
      // User is NOT authenticated
      if (!inAuthGroup) {
        router.replace("/welcome");
      }
      // If in auth group, stay where they are
    } else {
      // User IS authenticated - check onboarding status
      if (!hasPersonality && !isOnboarded) {
        // Step 1: Missing Personality/Role (Questionnaire) - only for brand new users
        if (!inAuthGroup) {
          router.replace("/(auth)/sign-up");
        }
      } else if (!isOnboarded) {
        // Step 2: Profile Setup (Bio, Avatar)
        if (!inProfileSetup) {
          router.replace("/profile-setup");
        }
      } else {
        // Step 3: Fully Onboarded
        // If onboarded, generally shouldn't be in auth or setup screens
        if (inAuthGroup || inProfileSetup || atRoot) {
          router.replace("/(tabs)?tab=home");
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile-setup"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
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
