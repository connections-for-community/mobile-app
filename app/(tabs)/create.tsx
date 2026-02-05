import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.user_metadata?.role;
  const colorScheme = useColorScheme() ?? 'light';

  // Hard guard: if someone deep-links to /create without being instructor
  if (role !== 'instructor') {
    return <Redirect href="/(tabs)/events" />;
  }

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [overview, setOverview] = useState('');
  const [goodToKnow, setGoodToKnow] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCreateEvent = async () => {
    if (!title || !date || !time || !location) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    // TODO: Implement actual Supabase insert
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Event created successfully!');
      setTitle('');
      setDate('');
      setTime('');
      setLocation('');
      setOverview('');
      setGoodToKnow('');
      setImage(null);
    }, 1500);
  };

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
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Event Title</Text>
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
                  <Text style={{ color: Colors[colorScheme].icon }}>Tap to select an image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Date</Text>
              <TextInput
                style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#888"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Time</Text>
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
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Location</Text>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]}
              placeholder="Address or Venue Name"
              placeholderTextColor="#888"
              value={location}
              onChangeText={setLocation}
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
            style={[styles.createButton, loading && { opacity: 0.7 }]}
            onPress={handleCreateEvent}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Event'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8a9ba8' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  row: { flexDirection: 'row', gap: 16 },
  label: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  createButton: { backgroundColor: '#FFB347', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  createButtonText: { color: '#131f24', fontSize: 16, fontWeight: 'bold' },
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
});
