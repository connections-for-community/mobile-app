import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/utils/supabase';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  price: string;
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
    date: 'Sat, Feb 14',
    time: '6:00 pm',
    upvotes: 42,
    comments_count: 12,
    created_at: '2026-01-20T10:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1565193566173-0923d5a63126?q=80&w=2070&auto=format&fit=crop',
    is_liked: false,
    price: 'From $45.00',
  },
  {
    id: '2',
    title: 'Urban Photography Walk',
    instructor_name: 'David Chen',
    description: 'Explore the city streets and learn how to capture stunning urban landscapes. We will cover composition, lighting, and camera settings.',
    good_to_know: 'Bring your own camera (DSLR or smartphone).',
    location: 'Central Plaza Fountain',
    date: 'Sat, Feb 20',
    time: '4:30 pm',
    upvotes: 85,
    comments_count: 34,
    created_at: '2026-01-22T09:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=2070&auto=format&fit=crop',
    is_liked: true,
    price: 'Free',
  },
  {
    id: '3',
    title: 'Italian Cooking Night',
    instructor_name: 'Mario Rossi',
    description: 'Master the art of making fresh pasta from scratch. Join us for a fun evening of cooking, eating, and wine tasking.',
    good_to_know: 'Vegetarian options available. Bring an apron.',
    location: 'The Culinary Loft',
    date: 'Sun, Mar 05',
    time: '7:00 pm',
    upvotes: 128,
    comments_count: 45,
    created_at: '2026-01-25T11:00:00Z',
    image_url: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=2070&auto=format&fit=crop',
    is_liked: false,
    price: 'CA$85.00',
  },
];

const EventCard = ({ event, onPress, onLike, onComment }: { event: Event; onPress: (e: Event) => void; onLike: (e: Event) => void; onComment: (e: Event) => void }) => (
  <TouchableOpacity onPress={() => onPress(event)} style={styles.card} activeOpacity={0.9}>
    {event.image_url && (
      <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.image_url }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          {/* Optional: Add badge overlay if needed */}
      </View>
    )}

    <View style={styles.cardContent}>
        <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
            <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => onComment(event)} hitSlop={10}>
                    <IconSymbol name="square.and.arrow.up" size={20} color={TEXT_COLOR} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onLike(event)} hitSlop={10}>
                    <IconSymbol 
                        name={event.is_liked ? "heart.fill" : "heart"} 
                        size={20} 
                        color={event.is_liked ? "#FF4B4B" : TEXT_COLOR} 
                    />
                </TouchableOpacity>
            </View>
        </View>

        <Text style={styles.metadata}>
            {event.date} • {event.time} • {event.location}
        </Text>

        <Text style={styles.priceText}>{event.price}</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    // This is weirdly mapped to share icon in UI now based on new design request
    // But keeping functionality name generic
    Alert.alert("Share", `Share "${event.title}" with friends!`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.filterButton}>
              <IconSymbol name="sliders.horizontal.3" size={24} color={TEXT_COLOR} />
          </TouchableOpacity>
          <View style={styles.searchBar}>
              <IconSymbol name="magnifyingglass" size={20} color={TEXT_MUTED} />
              <TextInput 
                placeholder="Find things to do" 
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
          </View>
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
            visible={!!selectedEvent}
            onRequestClose={() => setSelectedEvent(null)}
            presentationStyle="fullScreen"
        >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                
                {/* Header Actions Overlay */}
                <View style={styles.detailsHeader}>
                    <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.roundButton}>
                        <IconSymbol name="arrow.left" size={24} color={TEXT_COLOR} />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.roundButton}>
                            <IconSymbol name="square.and.arrow.up" size={20} color={TEXT_COLOR} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.roundButton} onPress={() => handleLike(selectedEvent)}>
                             <IconSymbol 
                                name={selectedEvent.is_liked ? "heart.fill" : "heart"} 
                                size={20} 
                                color={selectedEvent.is_liked ? "#FF4B4B" : TEXT_COLOR} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.detailsScroll}>
                    {selectedEvent.image_url && (
                        <Image
                            source={{ uri: selectedEvent.image_url }}
                            style={styles.detailsImage}
                            contentFit="cover"
                        />
                    )}
                    
                    <View style={styles.detailsContent}>
                        <Text style={styles.detailsTitle}>{selectedEvent.title}</Text>
                        
                        <Text style={styles.detailsSubtext}>
                            {selectedEvent.instructor_name} • {selectedEvent.location}
                        </Text>
                        <Text style={styles.detailsSubtext}>
                            {selectedEvent.date} at {selectedEvent.time}
                        </Text>

                        {/* Social Proof Section */}
                        <TouchableOpacity style={styles.socialProofRow}>
                             <View style={styles.avatarPile}>
                                 <View style={[styles.miniAvatar, { zIndex: 3, backgroundColor: '#FFB347' }]} />
                                 <View style={[styles.miniAvatar, { zIndex: 2, left: 14, backgroundColor: '#4CA1AF' }]} />
                                 <View style={[styles.miniAvatar, { zIndex: 1, left: 28, backgroundColor: '#FF4B4B' }]} />
                                 <View style={[styles.miniIcon, { zIndex: 4 }]}>
                                      <IconSymbol name="lock.fill" size={10} color="#fff" />
                                 </View>
                             </View>
                             <Text style={styles.socialProofText}>See if friends are going</Text>
                             <IconSymbol name="chevron.right" size={16} color={TEXT_COLOR} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Organizer Section */}
                        <View style={styles.organizerRow}>
                             <View style={styles.organizerAvatar}>
                                 {/* Just a placeholder, could use instructor image if available */}
                                 <Text style={{fontSize: 20}}>🐝</Text>
                             </View>
                             <View style={{flex: 1}}>
                                 <Text style={styles.organizerLabel}>By {selectedEvent.instructor_name}</Text>
                             </View>
                             <TouchableOpacity style={styles.followButton}>
                                 <Text style={styles.followButtonText}>Follow</Text>
                             </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Overview</Text>
                        <Text style={styles.detailText}>
                            {selectedEvent.description}
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.readMore}>Read more {'>'}</Text>
                        </TouchableOpacity>
                        
                        <View style={{height: 100}} /> 
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={[styles.detailsFooter, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.priceColumn}>
                        <Text style={styles.footerPrice}>{selectedEvent.price}</Text>
                        <Text style={styles.footerDate}>{selectedEvent.date} at {selectedEvent.time}</Text>
                    </View>
                    <TouchableOpacity style={styles.ticketButton}>
                        <Text style={styles.ticketButtonText}>Get tickets</Text>
                    </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    padding: 10,
    backgroundColor: CARD_BG,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    padding: 16,
    gap: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3a42',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#2b3a42',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: TEXT_COLOR,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  metadata: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginBottom: 8,
  },
  priceText: {
    color: TEXT_COLOR,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  detailsHeader: {
    position: 'absolute',
    top: 50, // Fallback if no safe area
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsScroll: {
    paddingBottom: 0,
  },
  detailsImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#2b3a42',
  },
  detailsContent: {
    padding: 20,
    gap: 12,
  },
  detailsTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    lineHeight: 32,
  },
  detailsSubtext: {
    fontSize: 15,
    color: TEXT_MUTED,
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  avatarPile: {
    flexDirection: 'row',
    width: 50,
    height: 24,
    marginRight: 10,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    borderWidth: 2,
    borderColor: DARK_BG,
  },
  miniIcon: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      bottom: -2,
      left: -2,
  },
  socialProofText: {
      color: TEXT_COLOR,
      fontWeight: '600',
      flex: 1,
      fontSize: 14,
  },
  divider: {
      height: 1,
      backgroundColor: '#2b3a42',
      marginVertical: 12,
  },
  organizerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  organizerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: CARD_BG,
      justifyContent: 'center',
      alignItems: 'center',
  },
  organizerLabel: {
      color: TEXT_COLOR,
      fontWeight: 'bold',
      fontSize: 16,
  },
  followButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: TEXT_COLOR,
  },
  followButtonText: {
      color: TEXT_COLOR,
      fontWeight: '600',
  },
  readMore: {
      color: TEXT_COLOR,
      fontWeight: '600',
      marginTop: 4,
  },
  detailsFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: DARK_BG,
      borderTopWidth: 1,
      borderTopColor: '#2b3a42',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  priceColumn: {
      gap: 4,
  },
  footerPrice: {
      color: TEXT_COLOR,
      fontSize: 18,
      fontWeight: 'bold',
  },
  footerDate: {
      color: TEXT_MUTED,
      fontSize: 13,
  },
  ticketButton: {
      backgroundColor: TEXT_COLOR,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 24,
  },
  ticketButtonText: {
      color: DARK_BG,
      fontWeight: 'bold',
      fontSize: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    marginTop: 12,
    marginBottom: 8,
  },
  detailText: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 24,
  },
});
