import { useLocalSearchParams } from 'expo-router';
import { ConversationThread } from '@/components/messages/conversation-thread';

export default function NewMessageScreen() {
  const { userId, name } = useLocalSearchParams<{
    userId?: string;
    name?: string;
  }>();
  const recipientUserId = typeof userId === 'string' ? userId : undefined;
  const recipientName = typeof name === 'string' ? name : undefined;

  return (
    <ConversationThread
      recipientUserId={recipientUserId}
      recipientName={recipientName}
    />
  );
}
