import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'form' | 'preview' | 'confirmation';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.user_metadata?.role;
  const colorScheme = useColorScheme() ?? 'light';

  // Hard guard: if someone deep-links to /create without being instructor
  if (role !== 'instructor') {
    return <Redirect href="/(tabs)/events" />;
  }

  // Multi-step flow
  const [step, setStep] = useState<Step>('form');

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [overview, setOverview] = useState('');
  const [goodToKnow, setGoodToKnow] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to select a cover image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (localUri: string): Promise<string | null> => {
    try {
      if (!user?.id) throw new Error('No user session');

      const arrayBuffer = await fetch(localUri).then((r) => r.arrayBuffer());
      const filePath = `events/${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
      return data?.publicUrl ?? null;
    } catch (e: any) {
      console.error('Image upload error:', e);
      return null;
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour12 = h % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const handlePreview = () => {
    if (!title || !date || !time || !location) {
      Alert.alert('Missing Fields', 'Please fill in all required fields (Title, Date, Time, Location).');
      return;
    }
    setStep('preview');
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await uploadImageToSupabase(image);
      }

      const instructorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Instructor';

      const eventData = {
        title,
        instructor_id: user?.id,
        instructor_name: instructorName,
        description: overview,
        good_to_know: goodToKnow || null,
        location,
        date: formatDisplayDate(date),
        time: formatDisplayTime(time),
        price: price || 'Free',
        image_url: imageUrl,
        upvotes: 0,
        comments_count: 0,
      };

      const { error } = await supabase.from('events').insert(eventData);

      if (error) {
        throw error;
      }

      setStep('confirmation');
    } catch (e: any) {
      console.error('Event creation error:', e);
      Alert.alert('Error', e?.message || 'Could not create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setOverview('');
    setGoodToKnow('');
    setPrice('');
    setImage(null);
    setStep('form');
  };

  const handleGoHome = () => {
    resetForm();
    router.replace('/(tabs)/home');
  };

  const handleCreateAnother = () => {
    resetForm();
  };

  // Confirmation Success Screen
  if (step === 'confirmation') {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: Colors[colorScheme].background, paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={[styles.successTitle, { color: Colors[colorScheme].text }]}>Event Created!</Text>
        <Text style={[styles.successSubtitle, { color: Colors[colorScheme].icon }]}>
          Your event "{title}" is now live and visible to the community.
        </Text>
        <View style={styles.successButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <Text style={styles.primaryButtonText}>View on Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: Colors[colorScheme].icon }]} onPress={handleCreateAnother}>
            <Text style={[styles.secondaryButtonText, { color: Colors[colorScheme].text }]}>Create Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Preview Screen
  if (step === 'preview') {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 120 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('form')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Preview Event</Text>
            <Text style={[styles.subtitle, { color: Colors[colorScheme].icon }]}>Review your event before publishing.</Text>
          </View>

          {/* Preview Card - mimics home screen event card */}
          <View style={styles.previewCard}>
            {image && (
              <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" />
            )}
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{title}</Text>
              <Text style={styles.previewMeta}>
                {formatDisplayDate(date)} • {formatDisplayTime(time)} • {location}
              </Text>
              <Text style={styles.previewPrice}>{price || 'Free'}</Text>
            </View>
          </View>

          {/* Details Summary */}
          <View style={[styles.detailsSection, { backgroundColor: colorScheme === 'dark' ? '#1c2b33' : '#f5f5f5' }]}>
            <Text style={[styles.detailsLabel, { color: Colors[colorScheme].icon }]}>OVERVIEW</Text>
            <Text style={[styles.detailsText, { color: Colors[colorScheme].text }]}>{overview || 'No description provided.'}</Text>

            {goodToKnow && (
              <>
                <Text style={[styles.detailsLabel, { color: Colors[colorScheme].icon, marginTop: 16 }]}>GOOD TO KNOW</Text>
                <Text style={[styles.detailsText, { color: Colors[colorScheme].text }]}>{goodToKnow}</Text>
              </>
            )}

            <Text style={[styles.detailsLabel, { color: Colors[colorScheme].icon, marginTop: 16 }]}>INSTRUCTOR</Text>
            <Text style={[styles.detailsText, { color: Colors[colorScheme].text }]}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: Colors[colorScheme].background }]}>
          <TouchableOpacity
            style={[styles.secondaryButton, { flex: 1, borderColor: Colors[colorScheme].icon }]}
            onPress={() => setStep('form')}
          >
            <Text style={[styles.secondaryButtonText, { color: Colors[colorScheme].text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 2, opacity: loading ? 0.7 : 1 }]}
            onPress={handleConfirmCreate}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Publishing...' : 'Publish Event'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Form Screen (default)
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Create New Event</Text>
          <Text style={[styles.subtitle, { color: Colors[colorScheme].icon }]}>Share your skills with the community.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Event Title *</Text>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="e.g. Intro to Pottery"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Cover Image</Text>
            <TouchableOpacity onPress={pickImage} style={[styles.imageUpload, { borderColor: Colors[colorScheme].icon }]}>
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} contentFit="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={Colors[colorScheme].icon} />
                  <Text style={{ color: Colors[colorScheme].icon, marginTop: 8 }}>Tap to select an image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Date *</Text>
              <TextInput
                style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#888"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Time *</Text>
              <TextInput
                style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
                placeholder="HH:MM"
                placeholderTextColor="#888"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Location *</Text>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="Address or Venue Name"
              placeholderTextColor="#888"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Price</Text>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="e.g. $45.00 or Free"
              placeholderTextColor="#888"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Overview</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="What will students learn?"
              placeholderTextColor="#888"
              multiline
              numberOfLines={4}
              value={overview}
              onChangeText={setOverview}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Good to Know</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="Age rating, parking, requirements..."
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
              value={goodToKnow}
              onChangeText={setGoodToKnow}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePreview}
          >
            <Text style={styles.primaryButtonText}>Preview Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 24 },
  header: { marginBottom: 32 },
  backButton: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8a9ba8' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  row: { flexDirection: 'row', gap: 16 },
  label: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#FFB347', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#131f24', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { borderWidth: 1, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  imageUpload: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    height: 180,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Preview styles
  previewCard: {
    backgroundColor: '#1c2b33',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  previewContent: {
    padding: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ECEDEE',
    marginBottom: 8,
  },
  previewMeta: {
    fontSize: 14,
    color: '#8a9ba8',
    marginBottom: 8,
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB347',
  },
  detailsSection: {
    borderRadius: 16,
    padding: 20,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(138,155,168,0.2)',
  },
  // Success styles
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  successButtons: {
    width: '100%',
    gap: 12,
  },
});
