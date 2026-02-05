// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
<<<<<<< HEAD
=======
import { Image, View } from "react-native";

function AvatarTabIcon({
  uri,
  focused,
}: {
  uri?: string | null;
  focused: boolean;
}) {
  const size = 28;
  const border = 2;
  const inner = size - border * 2;

  if (!uri) {
    return (
      <IconSymbol
        size={size}
        name="person.crop.circle.fill"
        color={focused ? "#FFB347" : "#8a9ba8"}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: border,
        borderColor: focused ? "#FFB347" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: inner, height: inner }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}
>>>>>>> 32a4da890f8887630b2d0a884aea9c7f4f944e89

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const meta = user?.user_metadata ?? {};
  const customAvatarUrl =
    (meta.custom_avatar_url as string | undefined) ?? null;
  const providerAvatarUrl = (meta.avatar_url as string | undefined) ?? null;
  const avatarUrl = customAvatarUrl ?? providerAvatarUrl;

  const role = user?.user_metadata?.role;
  const isInstructor = role === "instructor";

  // Optional but recommended: forces Tabs to remount when role changes (prevents stale tab state after login/logout)
  const tabsKey = isInstructor ? "tabs-instructor" : "tabs-user";

  return (
    <Tabs
      key={tabsKey}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
<<<<<<< HEAD
=======
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="sparkles" color={color} />
          ),
        }}
      />

      <Tabs.Screen
>>>>>>> 32a4da890f8887630b2d0a884aea9c7f4f944e89
        name="events"
        options={{
          title: "My Events",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar" color={color} />
          ),
        }}
      />

      {/* Always define create to prevent router auto-adding it, but hide it for non-instructors */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          href: isInstructor ? "/(tabs)/create" : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="message.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <AvatarTabIcon uri={avatarUrl} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
