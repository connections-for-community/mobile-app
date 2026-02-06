import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/auth-context';

const DARK_BG = '#131f24';
const PANEL_BG = '#1a2a31';
const PANEL_STROKE = '#24363f';
const TEXT_COLOR = '#ECEDEE';
const MUTED_TEXT = '#8a9ba8';
const PEACH = '#FFB347';
const ACCENT = '#57d1c9';

const appendCacheBuster = (url?: string | null) => {
  if (!url) return null;
  if (url.includes('t=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};


type ConversationRow = {
  id: string;
  type: 'direct' | 'event';
  event_id: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  profile_image_url: string | null;
};

type DirectoryProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  main_skill: string | null;
  wants_to_be_instructor: boolean | null;
  interests: string[] | null;
  profile_image_url: string | null;
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [directProfiles, setDirectProfiles] = useState<Record<string, ProfileRow>>({});
  const [eventTitles, setEventTitles] = useState<
    Record<string, { title: string; image_url: string | null }>
  >({});
  const [directoryProfiles, setDirectoryProfiles] = useState<DirectoryProfile[]>([]);
  const [currentInterests, setCurrentInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const directProfilesRef = useRef(directProfiles);
  const directoryProfilesRef = useRef(directoryProfiles);

  const hydrateConversationMeta = useCallback(
    async (rows: ConversationRow[], currentUserId: string) => {
      const directIds = rows.filter((c) => c.type === 'direct').map((c) => c.id);
      const eventIds = rows
        .filter((c) => c.type === 'event' && c.event_id)
        .map((c) => c.event_id as string);

      if (directIds.length > 0) {
        const { data: memberRows, error: memberError } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', directIds)
          .neq('user_id', currentUserId);

        if (memberError) {
          setError(memberError.message);
        } else {
          const otherUserIds = Array.from(
            new Set(memberRows?.map((row) => row.user_id) ?? [])
          );
          if (otherUserIds.length > 0) {
            const { data: profileRows, error: profileError } = await supabase
              .from('profiles')
              .select('user_id, full_name, username, profile_image_url')
              .in('user_id', otherUserIds);

            if (profileError) {
              setError(profileError.message);
            } else {
              const profileMap: Record<string, ProfileRow> = {};
              profileRows?.forEach((profile) => {
                profileMap[profile.user_id] = {
                  ...profile,
                  profile_image_url: appendCacheBuster(
                    profile.profile_image_url,
                  ),
                };
              });

              const convoToProfile: Record<string, ProfileRow> = {};
              memberRows?.forEach((member) => {
                const profile = profileMap[member.user_id];
                if (profile) {
                  convoToProfile[member.conversation_id] = profile;
                }
              });

              setDirectProfiles(convoToProfile);
            }
          }
        }
      } else {
        setDirectProfiles({});
      }

      if (eventIds.length > 0) {
        const { data: eventRows, error: eventError } = await supabase
          .from('events')
          .select('id, title, image_url')
          .in('id', eventIds);

        if (eventError) {
          setError(eventError.message);
        } else {
          const eventMap: Record<string, { title: string; image_url: string | null }> = {};
          eventRows?.forEach((event) => {
            eventMap[event.id] = {
              title: event.title,
              image_url: event.image_url ?? null,
            };
          });
          setEventTitles(eventMap);
        }
      } else {
        setEventTitles({});
      }
    },
    []
  );

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('conversation_members')
      .select(
        'conversation_id, conversations ( id, type, event_id, created_at )'
      )
      .eq('user_id', user.id);

    if (error) {
      setError(error.message);
      setConversations([]);
      setDirectProfiles({});
      setEventTitles({});
      setIsLoading(false);
      return;
    }

    const rows =
      data
        ?.map((row) => row.conversations)
        .filter(Boolean) as ConversationRow[];
    setConversations(rows ?? []);
    await hydrateConversationMeta(rows ?? [], user.id);
    setIsLoading(false);
  }, [hydrateConversationMeta, user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    directProfilesRef.current = directProfiles;
  }, [directProfiles]);

  useEffect(() => {
    directoryProfilesRef.current = directoryProfiles;
  }, [directoryProfiles]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`conversation_members:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("profiles:messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const nextRecord = payload.new as ProfileRow | null;
          if (!nextRecord?.user_id) return;
          const nextProfile = {
            ...nextRecord,
            profile_image_url: appendCacheBuster(nextRecord.profile_image_url),
          };

          const directMatches = Object.entries(directProfilesRef.current).filter(
            ([, profile]) => profile.user_id === nextProfile.user_id,
          );

          if (directMatches.length > 0) {
            setDirectProfiles((prev) => {
              const next = { ...prev };
              directMatches.forEach(([conversationId]) => {
                next[conversationId] = {
                  ...prev[conversationId],
                  ...nextProfile,
                };
              });
              return next;
            });
          }

          const hasDirectoryMatch = directoryProfilesRef.current.some(
            (profile) => profile.user_id === nextProfile.user_id,
          );

          if (hasDirectoryMatch) {
            setDirectoryProfiles((prev) =>
              prev.map((profile) =>
                profile.user_id === nextProfile.user_id
                  ? { ...profile, ...nextProfile }
                  : profile,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return directoryProfiles.filter((profile) =>
      [
        profile.full_name ?? '',
        profile.username ?? '',
        profile.main_skill ?? '',
        profile.wants_to_be_instructor ? 'instructor' : 'peer',
        ...(profile.interests ?? []),
      ].some((field) =>
        field.toLowerCase().includes(query)
      )
    );
  }, [directoryProfiles, searchQuery]);

  const recommendedUsers = useMemo(() => {
    if (currentInterests.length === 0) return filteredUsers;
    const interestSet = new Set(currentInterests.map((item) => item.toLowerCase()));
    return filteredUsers.filter((profile) =>
      (profile.interests ?? []).some((interest) =>
        interestSet.has(interest.toLowerCase())
      )
    );
  }, [currentInterests, filteredUsers]);

  const instructors = useMemo(
    () => recommendedUsers.filter((profile) => profile.wants_to_be_instructor),
    [recommendedUsers]
  );

  const generalUsers = useMemo(
    () => recommendedUsers.filter((profile) => !profile.wants_to_be_instructor),
    [recommendedUsers]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDirectoryProfiles() {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'user_id, full_name, username, main_skill, wants_to_be_instructor, interests, profile_image_url'
        )
        .eq('is_public', true)
        .neq('user_id', user.id)
        .limit(50);

      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setDirectoryProfiles([]);
      } else {
        setDirectoryProfiles(
          (data ?? []).map((profile) => ({
            ...profile,
            profile_image_url: appendCacheBuster(profile.profile_image_url),
          })),
        );
      }
    }

    loadDirectoryProfiles();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentProfile() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('interests')
        .eq('user_id', user.id)
        .single();

      if (!isMounted) return;
      if (!error && data?.interests) {
        setCurrentInterests(data.interests as string[]);
      }
    }

    loadCurrentProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleStartChat(
    targetUserId: string,
    targetName?: string | null
  ) {
    if (!user) return;
    const directConversationIds = conversations
      .filter((c) => c.type === 'direct')
      .map((c) => c.id);

    if (directConversationIds.length > 0) {
      const { data, error } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .in('conversation_id', directConversationIds)
        .eq('user_id', targetUserId)
        .limit(1);

      if (!error && data && data.length > 0) {
        router.push(`/messages/${data[0].conversation_id}`);
        return;
      }
    }

    const nameParam = targetName ? `&name=${encodeURIComponent(targetName)}` : '';
    router.push(`/messages/new?userId=${targetUserId}${nameParam}`);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>
              Private chats and event group conversations.
            </Text>
          </View>
        </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'direct' && styles.tabActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text
            style={[styles.tabLabel, activeTab === 'direct' && styles.tabText]}
          >
            Direct
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[styles.tabLabel, activeTab === 'groups' && styles.tabText]}
          >
            Event Groups
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'direct' ? (
          <>
            <View style={styles.searchCard}>
              <IconSymbol name="magnifyingglass" size={18} color={MUTED_TEXT} />
              <TextInput
                placeholder="Search people by name, skill, or interest"
                placeholderTextColor={MUTED_TEXT}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    Keyboard.dismiss();
                  }}
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={18}
                    color={MUTED_TEXT}
                  />
                </Pressable>
              ) : null}
            </View>

            {searchQuery.trim().length === 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your conversations</Text>
                <View style={styles.cardList}>
                  {isLoading ? (
                    <Text style={styles.stateText}>Loading conversations...</Text>
                  ) : conversations.filter((c) => c.type === 'direct').length ===
                    0 ? (
                    <Text style={styles.stateText}>
                      No direct conversations yet. Search to start one.
                    </Text>
                  ) : (
                    conversations
                      .filter((c) => c.type === 'direct')
                      .map((chat) => {
                        const profile = directProfiles[chat.id];
                        const displayName = profile?.full_name ?? null;
                        const displayUsername = profile?.username ?? null;
                        const initials =
                          displayName
                            ?.split(' ')
                            .map((part) => part[0])
                            .join('') ??
                          (displayUsername
                            ? displayUsername[0]?.toUpperCase()
                            : 'DM');

                        return (
                          <Pressable
                            key={chat.id}
                            style={styles.card}
                            onPress={() => router.push(`/messages/${chat.id}`)}
                          >
                            <View
                              style={[
                                styles.avatarBubble,
                                !profile?.profile_image_url && styles.avatarAccent,
                                !profile?.profile_image_url &&
                                  styles.avatarBubbleFallback,
                              ]}
                            >
                              {profile?.profile_image_url ? (
                                <Image
                                  source={{ uri: profile.profile_image_url }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <Text style={styles.avatarText}>{initials}</Text>
                              )}
                            </View>
                            <View style={styles.cardBody}>
                              <View style={styles.cardRow}>
                                <Text style={styles.cardTitle}>
                                  {displayName ??
                                    (displayUsername
                                      ? `@${displayUsername}`
                                      : 'Direct chat')}
                                  {displayName && displayUsername ? (
                                    <Text style={styles.cardTitleSub}>
                                      {' '}
                                      @{displayUsername}
                                    </Text>
                                  ) : null}
                                </Text>
                                <Text style={styles.timeText}>
                                  {new Date(chat.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                              <Text style={styles.cardMeta}>
                                Tap to open conversation
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })
                  )}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            ) : null}

            {searchQuery.trim().length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search results</Text>
                {instructors.length > 0 ? (
                  <>
                    <Text style={styles.sectionHint}>Instructors</Text>
                    <View style={styles.cardList}>
                      {instructors.map((profile) => (
                        <View key={profile.user_id} style={styles.card}>
                          <View
                            style={[
                              styles.avatarBubble,
                              !profile.profile_image_url && styles.avatarBubbleFallback,
                            ]}
                          >
                            {profile.profile_image_url ? (
                              <Image
                                source={{ uri: profile.profile_image_url }}
                                style={styles.avatarImage}
                              />
                            ) : (
                              <Text style={styles.avatarText}>
                                {(profile.full_name ?? 'User')
                                  .split(' ')
                                  .map((part) => part[0])
                                  .join('')}
                              </Text>
                            )}
                          </View>
                          <View style={styles.cardBody}>
                            <Text style={styles.cardTitle}>
                              {profile.full_name ??
                                (profile.username ? `@${profile.username}` : 'Unnamed user')}
                              {profile.full_name && profile.username ? (
                                <Text style={styles.cardTitleSub}>
                                  {' '}
                                  @{profile.username}
                                </Text>
                              ) : null}
                            </Text>
                            <Text style={styles.cardMeta}>
                              Instructor
                              {profile.main_skill
                                ? ` · ${profile.main_skill}`
                                : ''}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.pillButton}
                            onPress={() =>
                              handleStartChat(profile.user_id, profile.full_name)
                            }
                          >
                            <Text style={styles.pillText}>Message</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {generalUsers.length > 0 ? (
                  <>
                    <Text style={styles.sectionHint}>People</Text>
                    <View style={styles.cardList}>
                      {generalUsers.map((profile) => (
                        <View key={profile.user_id} style={styles.card}>
                          <View
                            style={[
                              styles.avatarBubble,
                              !profile.profile_image_url && styles.avatarBubbleFallback,
                            ]}
                          >
                            {profile.profile_image_url ? (
                              <Image
                                source={{ uri: profile.profile_image_url }}
                                style={styles.avatarImage}
                              />
                            ) : (
                              <Text style={styles.avatarText}>
                                {(profile.full_name ?? 'User')
                                  .split(' ')
                                  .map((part) => part[0])
                                  .join('')}
                              </Text>
                            )}
                          </View>
                          <View style={styles.cardBody}>
                            <Text style={styles.cardTitle}>
                              {profile.full_name ??
                                (profile.username ? `@${profile.username}` : 'Unnamed user')}
                              {profile.full_name && profile.username ? (
                                <Text style={styles.cardTitleSub}>
                                  {' '}
                                  @{profile.username}
                                </Text>
                              ) : null}
                            </Text>
                            <Text style={styles.cardMeta}>
                              Peer
                              {profile.main_skill
                                ? ` · ${profile.main_skill}`
                                : ''}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.pillButton}
                            onPress={() =>
                              handleStartChat(profile.user_id, profile.full_name)
                            }
                          >
                            <Text style={styles.pillText}>Message</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {instructors.length === 0 && generalUsers.length === 0 ? (
                  <Text style={styles.stateText}>
                    No public profiles match your search.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Auto-created event groups</Text>
              <Text style={styles.sectionHint}>
                Every event automatically spins up a group chat. Attendees join
                the chat the moment they RSVP.
              </Text>
              <View style={styles.cardList}>
                {isLoading ? (
                  <Text style={styles.stateText}>Loading event groups...</Text>
                ) : conversations.filter((c) => c.type === 'event').length ===
                  0 ? (
                  <Text style={styles.stateText}>
                    No event groups yet.
                  </Text>
                ) : (
                  conversations
                    .filter((c) => c.type === 'event')
                    .map((group) => (
                      <Pressable
                        key={group.id}
                        style={styles.card}
                        onPress={() =>
                          router.push(`/messages/${group.id}`)
                        }
                      >
                        <View
                          style={[
                            styles.avatarBubble,
                            !(group.event_id && eventTitles[group.event_id]?.image_url) &&
                              styles.avatarEvent,
                            !(group.event_id && eventTitles[group.event_id]?.image_url) &&
                              styles.avatarBubbleFallback,
                          ]}
                        >
                          {group.event_id &&
                          eventTitles[group.event_id]?.image_url ? (
                            <Image
                              source={{
                                uri: eventTitles[group.event_id]?.image_url ?? '',
                              }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <IconSymbol
                              name="calendar"
                              size={16}
                              color="#0d151a"
                            />
                          )}
                        </View>
                        <View style={styles.cardBody}>
                          <View style={styles.cardRow}>
                            <Text style={styles.cardTitle}>
                              {group.event_id
                                ? eventTitles[group.event_id]?.title ?? 'Event group'
                                : 'Event group'}
                            </Text>
                            <Text style={styles.timeText}>
                              {new Date(group.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text style={styles.cardMeta}>
                            {group.event_id ? 'Event chat' : 'General event chat'}
                          </Text>
                          <Text style={styles.cardMetaMuted}>
                            Tap to open conversation
                          </Text>
                        </View>
                      </Pressable>
                    ))
                )}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_COLOR,
  },
  subtitle: {
    color: MUTED_TEXT,
    fontSize: 15,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PANEL_STROKE,
    backgroundColor: PANEL_BG,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PEACH,
    borderColor: PEACH,
  },
  tabLabel: {
    color: MUTED_TEXT,
    fontWeight: '600',
    fontSize: 14,
  },
  tabText: {
    color: '#0d151a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PANEL_BG,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: PANEL_STROKE,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    color: TEXT_COLOR,
    fontSize: 15,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: TEXT_COLOR,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionHint: {
    color: MUTED_TEXT,
    fontSize: 14,
    marginBottom: 14,
  },
  cardList: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: PANEL_STROKE,
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    color: TEXT_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
  cardTitleSub: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: '500',
  },
  cardMeta: {
    color: MUTED_TEXT,
    fontSize: 13,
  },
  cardMetaMuted: {
    color: '#6d808c',
    fontSize: 12,
  },
  stateText: {
    color: MUTED_TEXT,
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    color: '#ffb3b3',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  timeText: {
    color: MUTED_TEXT,
    fontSize: 12,
  },
  avatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBubbleFallback: {
    backgroundColor: PANEL_STROKE,
  },
  avatarAccent: {
    backgroundColor: PEACH,
  },
  avatarEvent: {
    backgroundColor: ACCENT,
  },
  avatarText: {
    color: TEXT_COLOR,
    fontWeight: '700',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pillButton: {
    backgroundColor: '#0f1c22',
    borderWidth: 1,
    borderColor: PANEL_STROKE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    color: TEXT_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});
