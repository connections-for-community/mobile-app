import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  description: string; // This maps to "Overview"
  good_to_know?: string;
  location: string;
  date: string;
  time: string;
  upvotes: number;
  comments_count: number;
  image_url?: string;
  created_at: string;
  is_liked?: boolean;
};

// Mock data in case Supabase is empty
const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Beginner Pottery Class',
    instructor_name: 'Emma Stone',
    description: 'Learn the basics of throwing on the wheel and hand-building techniques. Perfect for complete beginners who want to get their hands dirty.',
    good_to_know: 'Wear clothes you do not mind getting messy.',
    location: 'Community Art Center',
    date: '2026-02-14',
    time: '18:00',
    upvotes: 42,
    comments_count: 12,
    created_at: '2026-01-20T10:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1565193566173-0923d5a63126?q=80&w=2070&auto=format&fit=crop',
    is_liked: false,
  },
  {
    id: '2',
    title: 'Urban Photography Walk',
    instructor_name: 'David Chen',
    description: 'Explore the city streets and learn how to capture stunning urban landscapes. We will cover composition, lighting, and camera settings.',
    good_to_know: 'Bring your own camera (DSLR or smartphone).',
    location: 'Central Plaza Fountain',
    date: '2026-02-20',
    time: '16:30',
    upvotes: 85,
    comments_count: 34,
    created_at: '2026-01-22T09:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=2070&auto=format&fit=crop',
    is_liked: true,
  },
  {
    id: '3',
    title: 'Italian Cooking Night',
    instructor_name: 'Mario Rossi',
    description: 'Master the art of making fresh pasta from scratch. Join us for a fun evening of cooking, eating, and wine tasking.',
    good_to_know: 'Vegetarian options available. Bring an apron.',
    location: 'The Culinary Loft',
    date: '2026-03-05',
    time: '19:00',
    upvotes: 128,
    comments_count: 45,
    created_at: '2026-01-25T11:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=2070&auto=format&fit=crop',
    is_liked: false,
  },
];

const EventCard = ({ event, onPress, onLike, onComment }: { event: Event; onPress: (e: Event) => void; onLike: (e: Event) => void; onComment: (e: Event) => void }) => (
  <TouchableOpacity onPress={() => onPress(event)} style={styles.card} activeOpacity={0.9}>
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
    
    <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
            <IconSymbol name="calendar" size={14} color={PEACH} />
            <Text style={styles.metaText}>{event.date} • {event.time}</Text>
        </View>
        <View style={styles.metaRow}>
            <IconSymbol name="location" size={14} color={PEACH} />
            <Text style={styles.metaText}>{event.location}</Text>
        </View>
    </View>

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
      <TouchableOpacity 
        style={styles.statChip} 
        onPress={() => onLike(event)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol 
            name={event.is_liked ? "heart.fill" : "heart"} 
            size={16} 
            color={event.is_liked ? "#FF4B4B" : TEXT_MUTED} 
        />
        <Text style={[styles.statText, event.is_liked && { color: "#FF4B4B" }]}>{event.upvotes}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.statChip} 
        onPress={() => onComment(event)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol name="bubble.left" size={16} color={TEXT_MUTED} />
        <Text style={styles.statText}>{event.comments_count}</Text>
      </TouchableOpacity>

      <View style={styles.shareChip}>
         <IconSymbol name="square.and.arrow.up" size={16} color={TEXT_MUTED} />
         <Text style={styles.statText}>Share</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  const handleLike = (event: Event) => {
    setEvents(prevEvents => prevEvents.map(e => {
        if (e.id === event.id) {
            const isLiked = !e.is_liked;
            return {
                ...e,
                is_liked: isLiked,
                upvotes: e.upvotes + (isLiked ? 1 : -1)
            };
        }
        return e;
    }));
  };

  const handleComment = (event: Event) => {
    Alert.alert("Comments", `Comments for "${event.title}" are coming soon!\n\nCurrent count: ${event.comments_count}`);
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
          renderItem={({ item }) => (
            <EventCard 
                event={item} 
                onPress={setSelectedEvent} 
                onLike={handleLike}
                onComment={handleComment}
            />
          )}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PEACH} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {selectedEvent && (
        <Modal
            animationType="slide"
            transparent={true}
            visible={!!selectedEvent}
            onRequestClose={() => setSelectedEvent(null)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Event Details</Text>
                        <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.closeButton}>
                            <IconSymbol name="xmark.circle.fill" size={30} color={TEXT_MUTED} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalScroll}>
                        {selectedEvent.image_url && (
                             <Image
                                source={{ uri: selectedEvent.image_url }}
                                style={styles.modalImage}
                                contentFit="cover"
                            />
                        )}
                        <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                        
                        <View style={styles.detailMeta}>
                            <IconSymbol name="person.crop.circle" size={18} color={PEACH} />
                            <Text style={styles.detailMetaText}>{selectedEvent.instructor_name}</Text>
                        </View>
                        <View style={styles.detailMeta}>
                             <IconSymbol name="calendar" size={18} color={PEACH} />
                             <Text style={styles.detailMetaText}>{selectedEvent.date} at {selectedEvent.time}</Text>
                        </View>
                        <View style={styles.detailMeta}>
                             <IconSymbol name="location.fill" size={18} color={PEACH} />
                             <Text style={styles.detailMetaText}>{selectedEvent.location}</Text>
                        </View>

                        <Text style={styles.sectionHeader}>Overview</Text>
                        <Text style={styles.detailText}>{selectedEvent.description}</Text>

                        {selectedEvent.good_to_know && (
                            <>
                                <Text style={styles.sectionHeader}>Good to Know</Text>
                                <Text style={styles.detailText}>{selectedEvent.good_to_know}</Text>
                            </>
                        )}
                        
                        <View style={{height: 40}} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
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
  metaContainer: {
    marginBottom: 12,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DARK_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3a42',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PEACH,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#2b3a42',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    marginBottom: 16,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  detailMetaText: {
    color: '#d1d5db',
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PEACH,
    marginTop: 24,
    marginBottom: 8,
  },
  detailText: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 24,
  },
});
