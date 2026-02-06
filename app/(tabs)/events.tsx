import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <View style={styles.centeredContent}>
        <IconSymbol name="calendar" size={64} color="#FFB347" />
        <Text style={[styles.title, { color: Colors[colorScheme].text }]}>
          My Events
        </Text>
        <Text style={styles.subtitle}>
          Your upcoming and past events will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8a9ba8' },
});
