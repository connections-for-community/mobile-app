import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
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

  const meta = user?.user_metadata || {};

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        
        {/* Helper to show consistent sections */}
        <View style={[styles.section, { backgroundColor: colorScheme === 'dark' ? '#1c2b33' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>My Profile</Text>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Name</Text>
            <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>{meta.full_name || 'N/A'}</Text>
          </View>
          
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Location</Text>
            <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>{meta.location || 'N/A'}</Text>
          </View>

          <View style={styles.separator} />
          
           <View style={styles.row}>
            <Text style={[styles.label, { color: Colors[colorScheme].text }]}>Role</Text>
            <Text style={[styles.value, { color: Colors[colorScheme].icon, textTransform: 'capitalize' }]}>{meta.role || 'Student'}</Text>
          </View>

          {meta.role === 'instructor' && (
            <>
              <View style={styles.separator} />
              <View style={styles.column}>
                <Text style={[styles.label, { color: Colors[colorScheme].text, marginBottom: 4 }]}>Teaching Skills</Text>
                <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>{meta.instructor_skills || 'None listed'}</Text>
              </View>
            </>
          )}
        </View>

         <View style={[styles.section, { backgroundColor: colorScheme === 'dark' ? '#1c2b33' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Interests</Text>
          <View style={styles.chipContainer}>
             {meta.interests?.map((interest: string, index: number) => (
                <View key={index} style={styles.chip}>
                   <Text style={styles.chipText}>{interest}</Text>
                </View>
             )) || <Text style={{color: Colors[colorScheme].icon}}>No interests selected</Text>}
          </View>
        </View>

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
    </ScrollView>
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
  column: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: '#37464f', // simplistic separator
    opacity: 0.2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFB347',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#131f24',
    fontWeight: '600',
    fontSize: 14,
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
