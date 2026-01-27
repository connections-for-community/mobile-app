import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

const DARK_BG = '#131f24';
const TEXT_COLOR = '#ECEDEE';
const PEACH = '#FFB347';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <IconSymbol name="sparkles" size={64} color={PEACH} />
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find new instructors and communities.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_COLOR,
  },
  subtitle: {
    color: '#8a9ba8',
    fontSize: 16,
  },
});
