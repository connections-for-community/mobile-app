import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme].background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: colorScheme === 'dark' ? '#1c2b33' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Account</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Email</Text>
            <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>{user?.email}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>LOG OUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: '#FFB347',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#E69138',
  },
  signOutText: {
    color: '#131f24',
    fontSize: 16,
    fontWeight: '800',
  },
});
