import { ConversationThread } from "@/components/messages/conversation-thread";
import { useLocalSearchParams } from "expo-router";

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const safeConversationId = Array.isArray(conversationId)
    ? conversationId[0]
    : conversationId;

  return <ConversationThread conversationId={safeConversationId} />;
}
