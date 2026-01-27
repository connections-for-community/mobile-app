import { supabase } from '@/utils/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View, ActivityIndicator, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

// Theme colors
const DARK_BG = '#131f24';
const CARD_BG = '#1c2b33';
const TEXT_COLOR = '#ECEDEE';
const TEXT_MUTED = '#8a9ba8';
const PEACH = '#FFB347';

type Event = {
  id: string;
  title: string;
  instructor_name: string;
  description: string;
  date: string;
  upvotes: number;
  comments_count: number;
  image_url?: string;
  created_at: string;
};

// Mock data in case Supabase is empty
const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Advanced React Native Workshop',
    instructor_name: 'Sarah Chen',
    description: 'Deep dive into Reanimated and Gesture Handler. Learn how to build silky smooth animations for your mobile apps.',
    date: '2023-10-25T14:00:00Z',
    upvotes: 342,
    comments_count: 56,
    created_at: '2023-10-20T10:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'Intro to System Design',
    instructor_name: 'Alex Johnson',
    description: 'Preparing for technical interviews? Join us for a comprehensive overview of distributed systems.',
    date: '2023-10-28T18:00:00Z',
    upvotes: 128,
    comments_count: 23,
    created_at: '2023-10-21T09:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Mobile UX/UI Trends 2024',
    instructor_name: 'Design Guild',
    description: 'What is next for mobile design? We explore the new design guidelines from Apple and Google.',
    date: '2023-11-02T16:30:00Z',
    upvotes: 892,
    comments_count: 104,
    created_at: '2023-10-22T11:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d4e?q=80&w=2070&auto=format&fit=crop',
  },
];

const EventCard = ({ event }: { event: Event }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.avatarPlaceholder}>
          <IconSymbol name="house.fill" size={16} color="#fff" />
      </View>
      <View>
        <Text style={styles.instructorName}>{event.instructor_name}</Text>
        <Text style={styles.timestamp}>{new Date(event.created_at).toLocaleDateString()}</Text>
      </View>
    </View>

    <Text style={styles.cardTitle}>{event.title}</Text>
    
    {event.image_url && (
      <Image
        source={{ uri: event.image_url }}
        style={styles.cardImage}
        contentFit="cover"
        transition={200}
      />
    )}
    
    <Text style={styles.cardDescription} numberOfLines={3}>{event.description}</Text>

    <View style={styles.cardFooter}>
      <View style={styles.statChip}>
        <IconSymbol name="sparkles" size={16} color={TEXT_MUTED} />
        <Text style={styles.statText}>{event.upvotes}</Text>
      </View>
      <View style={styles.statChip}>
        <IconSymbol name="message.fill" size={16} color={TEXT_MUTED} />
        <Text style={styles.statText}>{event.comments_count}</Text>
      </View>
      <View style={styles.shareChip}>
         <IconSymbol name="safari.fill" size={16} color={TEXT_MUTED} />
         <Text style={styles.statText}>Share</Text>
      </View>
    </View>
  </View>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error (using mock data):', error.message);
        setEvents(MOCK_EVENTS);
      } else if (data && data.length > 0) {
        setEvents(data);
      } else {
        setEvents(MOCK_EVENTS);
      }
    } catch (e) {
      console.error(e);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
           <View style={styles.mascotPlaceholder}>
              <Text style={{fontSize: 20}}>🐝</Text>
           </View>
           <Text style={styles.headerTitle}>Home</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <IconSymbol name="sparkles" size={24} color={PEACH} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PEACH} />
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={({ item }) => <EventCard event={item} />}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PEACH} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3a42',
    backgroundColor: DARK_BG,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PEACH,
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2b3a42',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PEACH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructorName: {
    color: TEXT_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  timestamp: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  cardTitle: {
    color: TEXT_COLOR,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#2b3a42',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2b3a42',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
  },
});
