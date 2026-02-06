import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/utils/supabase';

import HomeScreen from './home';
import DiscoverScreen from './discover';
import EventsScreen from './events';
import CreateScreen from './create';
import MessagesScreen from './messages';
import ProfileScreen from './profile';

type TabKey = 'home' | 'discover' | 'events' | 'create' | 'messages' | 'profile';

type TabConfig = {
  key: TabKey;
  title: string;
  icon: string;
  component: JSX.Element;
};

const appendCacheBuster = (url?: string | null) => {
  if (!url) return null;
  if (url.includes('t=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

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
        color={focused ? '#FFB347' : '#8a9ba8'}
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
        borderColor: focused ? '#FFB347' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: 'hidden',
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

export default function TabsPagerScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const selectedTab = Array.isArray(tab) ? tab[0] : tab;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();

  const meta = user?.user_metadata ?? {};
  const providerAvatarUrl =
    (meta.custom_avatar_url as string | undefined) ??
    (meta.avatar_url as string | undefined) ??
    null;
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const avatarUrl = profileAvatarUrl ?? providerAvatarUrl;

  const isInstructor = user?.user_metadata?.role === 'instructor';

  const tabs = useMemo<TabConfig[]>(() => {
    const base: TabConfig[] = [
      { key: 'home', title: 'Home', icon: 'house.fill', component: <HomeScreen /> },
      {
        key: 'discover',
        title: 'Discover',
        icon: 'sparkles',
        component: <DiscoverScreen />,
      },
      {
        key: 'events',
        title: 'My Events',
        icon: 'calendar',
        component: <EventsScreen />,
      },
    ];

    if (isInstructor) {
      base.push({
        key: 'create',
        title: 'Create',
        icon: 'plus.circle.fill',
        component: <CreateScreen />,
      });
    }

    base.push(
      {
        key: 'messages',
        title: 'Messages',
        icon: 'message.fill',
        component: <MessagesScreen />,
      },
      {
        key: 'profile',
        title: 'Profile',
        icon: 'profile',
        component: <ProfileScreen />,
      }
    );

    return base;
  }, [isInstructor]);

  const pagerRef = useRef<PagerView>(null);
  const initialIndex = Math.max(
    0,
    tabs.findIndex((item) => item.key === selectedTab)
  );
  const [pageIndex, setPageIndex] = useState(initialIndex);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileAvatar() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        console.error('Profile avatar load error:', error);
        setProfileAvatarUrl(null);
      } else {
        setProfileAvatarUrl(appendCacheBuster(data?.profile_image_url ?? null));
      }
    }

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!providerAvatarUrl) return;
    setProfileAvatarUrl(appendCacheBuster(providerAvatarUrl));
  }, [providerAvatarUrl]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profiles-avatar:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nextUrl =
            (payload.new as { profile_image_url?: string | null })
              .profile_image_url ?? null;
          setProfileAvatarUrl(appendCacheBuster(nextUrl));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const nextIndex = tabs.findIndex((item) => item.key === selectedTab);
    if (nextIndex >= 0 && nextIndex !== pageIndex) {
      setPageIndex(nextIndex);
      pagerRef.current?.setPage(nextIndex);
    }
  }, [pageIndex, selectedTab, tabs]);

  useEffect(() => {
    if (pageIndex >= tabs.length) {
      setPageIndex(0);
      pagerRef.current?.setPage(0);
    }
  }, [pageIndex, tabs.length]);

  const handlePageSelected = (index: number) => {
    if (index === pageIndex) return;
    setPageIndex(index);
    const next = tabs[index];
    if (next && next.key !== selectedTab) {
      router.setParams({ tab: next.key });
    }
  };

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialIndex}
        onPageSelected={(event) => handlePageSelected(event.nativeEvent.position)}
        onPageScrollStateChanged={(event) => {
          const state = event.nativeEvent.pageScrollState;
          if (state === 'dragging') {
            Keyboard.dismiss();
          }
        }}
      >
        {tabs.map((item) => (
          <View key={item.key} style={styles.page}>
            {item.component}
          </View>
        ))}
      </PagerView>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 12 }]}>
        {tabs.map((item, index) => {
          const focused = index === pageIndex;
          return (
            <Pressable
              key={item.key}
              style={styles.tabItem}
              onPress={() => {
                if (index === pageIndex) return;
                setPageIndex(index);
                router.setParams({ tab: item.key });
                pagerRef.current?.setPage(index);
              }}
            >
              {item.key === 'profile' ? (
                <AvatarTabIcon uri={avatarUrl} focused={focused} />
              ) : (
                <IconSymbol
                  size={26}
                  name={item.icon as any}
                  color={focused ? Colors[colorScheme].tint : '#8a9ba8'}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? Colors[colorScheme].tint : '#8a9ba8' },
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131f24',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#22323a',
    backgroundColor: '#0f1c22',
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
