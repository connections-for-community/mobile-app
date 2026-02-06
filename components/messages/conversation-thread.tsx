import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DARK_BG = "#131f24";
const PANEL_BG = "#1a2a31";
const PANEL_STROKE = "#24363f";
const TEXT_COLOR = "#ECEDEE";
const MUTED_TEXT = "#8a9ba8";
const PEACH = "#FFB347";

const appendCacheBuster = (url?: string | null) => {
  if (!url) return null;
  if (url.includes("t=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ProfileSnippet = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  profile_image_url: string | null;
};

type ConversationThreadProps = {
  conversationId?: string;
  recipientUserId?: string;
  recipientName?: string | null;
};

export function ConversationThread({
  conversationId,
  recipientUserId,
  recipientName,
}: ConversationThreadProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileSnippet>>(
    {},
  );
  const [counterpart, setCounterpart] = useState<ProfileSnippet | null>(null);
  const profileMapRef = useRef(profileMap);
  const counterpartRef = useRef(counterpart);

  const headerSubtitle = useMemo(() => {
    if (counterpart?.full_name) return counterpart.full_name;
    if (recipientName) return recipientName;
    if (counterpart?.username) return `@${counterpart.username}`;
    if (conversationId) return conversationId;
    return "New conversation";
  }, [conversationId, counterpart, recipientName]);

  const headerMeta = useMemo(() => {
    if (counterpart?.username) return `@${counterpart.username}`;
    return null;
  }, [counterpart]);

  useEffect(() => {
    profileMapRef.current = profileMap;
  }, [profileMap]);

  useEffect(() => {
    counterpartRef.current = counterpart;
  }, [counterpart]);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (!conversationId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!isMounted) return;
      if (error) {
        setError(error.message);
      } else {
        setMessages(data ?? []);
      }
      setIsLoading(false);
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    let isMounted = true;

    async function loadParticipants() {
      if (!conversationId || !user) return;

      const { data: memberRows, error: memberError } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (!isMounted) return;
      if (memberError) {
        setError(memberError.message);
        return;
      }

      const userIds = memberRows?.map((row) => row.user_id) ?? [];
      if (userIds.length === 0) return;

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_image_url")
        .in("user_id", userIds);

      if (!isMounted) return;
      if (profileError) {
        setError(profileError.message);
        return;
      }

      const nextMap: Record<string, ProfileSnippet> = {};
      profileRows?.forEach((profile) => {
        nextMap[profile.user_id] = {
          ...profile,
          profile_image_url: appendCacheBuster(profile.profile_image_url),
        };
      });
      setProfileMap(nextMap);

      const other = userIds.find((id) => id !== user.id);
      if (other && nextMap[other]) {
        setCounterpart(nextMap[other]);
      }
    }

    loadParticipants();

    return () => {
      isMounted = false;
    };
  }, [conversationId, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipientProfile() {
      if (conversationId || !recipientUserId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_image_url")
        .eq("user_id", recipientUserId)
        .single();

      if (!isMounted) return;
      if (!error && data) {
        const normalized = {
          ...data,
          profile_image_url: appendCacheBuster(data.profile_image_url),
        };
        setCounterpart(normalized);
        setProfileMap((prev) => ({ ...prev, [normalized.user_id]: normalized }));
      }
    }

    loadRecipientProfile();

    return () => {
      isMounted = false;
    };
  }, [conversationId, recipientUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadOwnProfile() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, profile_image_url")
        .eq("user_id", user.id)
        .single();

      if (!isMounted) return;
      if (!error && data) {
        const normalized = {
          ...data,
          profile_image_url: appendCacheBuster(data.profile_image_url),
        };
        setProfileMap((prev) => ({ ...prev, [normalized.user_id]: normalized }));
      }
    }

    loadOwnProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("profiles:conversation-thread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const nextRecord = payload.new as ProfileSnippet | null;
          if (!nextRecord?.user_id) return;
          const nextProfile = {
            ...nextRecord,
            profile_image_url: appendCacheBuster(nextRecord.profile_image_url),
          };

          const watchedIds = new Set<string>();
          watchedIds.add(user.id);
          if (recipientUserId) watchedIds.add(recipientUserId);
          Object.keys(profileMapRef.current).forEach((id) =>
            watchedIds.add(id),
          );

          if (!watchedIds.has(nextProfile.user_id)) return;

          setProfileMap((prev) => ({
            ...prev,
            [nextProfile.user_id]: {
              ...prev[nextProfile.user_id],
              ...nextProfile,
            },
          }));

          if (counterpartRef.current?.user_id === nextProfile.user_id) {
            setCounterpart((prev) => ({
              ...(prev ?? nextProfile),
              ...nextProfile,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientUserId, user?.id]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((item) => item.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function handleSend() {
    if (!user) return;
    const trimmed = draft.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      if (!recipientUserId) {
        setError("No recipient selected.");
        setIsSending(false);
        return;
      }

      const { data: convoId, error: convoError } = await supabase.rpc(
        "create_direct_conversation",
        { other_user_id: recipientUserId },
      );

      if (convoError || !convoId) {
        setError(convoError?.message ?? "Unable to start a conversation.");
        setIsSending(false);
        return;
      }

      activeConversationId = convoId as string;
    }

    const { data, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        body: trimmed,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (messageError) {
      setError(messageError.message);
      setIsSending(false);
      return;
    }

    setDraft("");
    setIsSending(false);

    if (!conversationId && activeConversationId) {
      router.replace(`/messages/${activeConversationId}`);
      return;
    }

    if (data) {
      setMessages((prev) => [...prev, data]);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Conversation</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
            {headerMeta ? (
              <Text style={styles.subtitleMeta}>{headerMeta}</Text>
            ) : null}
          </View>
          <Pressable
            style={styles.closeButton}
            onPress={() => router.replace("/(tabs)?tab=messages")}
            accessibilityLabel="Close conversation"
          >
            <IconSymbol name="xmark" size={16} color="#0d151a" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <Text style={styles.stateText}>Loading messages...</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.stateText}>
              No messages yet. Start the conversation below.
            </Text>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_id === user?.id;
              const senderProfile =
                profileMap[message.sender_id] ??
                (message.sender_id === user?.id
                  ? {
                      user_id: user?.id ?? "",
                      full_name:
                        (user?.user_metadata?.full_name as
                          | string
                          | undefined) ?? null,
                      username:
                        (user?.user_metadata?.username as string | undefined) ??
                        null,
                      profile_image_url:
                        appendCacheBuster(
                          (user?.user_metadata?.custom_avatar_url as
                            | string
                            | undefined) ??
                            (user?.user_metadata?.avatar_url as
                              | string
                              | undefined) ??
                            null,
                        ),
                    }
                  : undefined);
              const senderName =
                senderProfile?.full_name ?? (isMine ? "You" : "Member");
              const senderUsername = senderProfile?.username
                ? `@${senderProfile.username}`
                : null;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    isMine ? styles.messageRowMine : styles.messageRowTheirs,
                  ]}
                >
                  {!isMine ? (
                    <View
                      style={[
                        styles.avatarBubble,
                        !senderProfile?.profile_image_url &&
                          styles.avatarBubbleFallback,
                      ]}
                    >
                      {senderProfile?.profile_image_url ? (
                        <Image
                          source={{ uri: senderProfile.profile_image_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {senderName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.messageContent,
                      isMine
                        ? styles.messageContentMine
                        : styles.messageContentTheirs,
                    ]}
                  >
                    <Text style={styles.senderText}>{senderName}</Text>
                    <View
                      style={[
                        styles.bubble,
                        isMine ? styles.bubbleMine : styles.bubbleTheirs,
                      ]}
                    >
                      <Text style={styles.bubbleText}>{message.body}</Text>
                    </View>
                    <Text style={styles.timestamp}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {isMine ? (
                    <View
                      style={[
                        styles.avatarBubble,
                        !senderProfile?.profile_image_url &&
                          styles.avatarBubbleFallback,
                      ]}
                    >
                      {senderProfile?.profile_image_url ? (
                        <Image
                          source={{ uri: senderProfile.profile_image_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {senderName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: insets.bottom || 12 }]}>
          <View style={styles.inputWrap}>
            <TextInput
              placeholder="Write a message..."
              placeholderTextColor={MUTED_TEXT}
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
            />
          </View>
          <Pressable
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#0d151a" />
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: TEXT_COLOR,
  },
  subtitle: {
    color: MUTED_TEXT,
    fontSize: 12,
    marginTop: 4,
  },
  subtitleMeta: {
    color: MUTED_TEXT,
    fontSize: 11,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PEACH,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerBadgeText: {
    color: "#0d151a",
    fontWeight: "600",
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    flexGrow: 1,
  },
  stateText: {
    color: MUTED_TEXT,
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  messageRowMine: {
    alignSelf: "flex-end",
    flexDirection: "row",
  },
  messageRowTheirs: {
    alignSelf: "flex-start",
    flexDirection: "row",
  },
  messageContent: {
    maxWidth: "75%",
    gap: 4,
  },
  messageContentMine: {
    alignItems: "flex-end",
  },
  messageContentTheirs: {
    alignItems: "flex-start",
  },
  senderText: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "600",
  },
  senderUsername: {
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "500",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: PEACH,
  },
  bubbleTheirs: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d5dde2",
  },
  bubbleText: {
    color: "#0d151a",
    fontSize: 14,
  },
  timestamp: {
    color: MUTED_TEXT,
    fontSize: 11,
    marginTop: 4,
  },
  errorText: {
    color: "#ffb3b3",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: PANEL_STROKE,
    backgroundColor: DARK_BG,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: PANEL_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PANEL_STROKE,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    color: TEXT_COLOR,
    fontSize: 14,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PEACH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendText: {
    color: "#0d151a",
    fontWeight: "600",
    fontSize: 13,
  },
  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBubbleFallback: {
    backgroundColor: PANEL_STROKE,
  },
  avatarText: {
    color: TEXT_COLOR,
    fontWeight: "700",
    fontSize: 12,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PEACH,
    alignItems: "center",
    justifyContent: "center",
  },
});
