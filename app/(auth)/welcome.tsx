import { BeeMascot } from '@/components/bee-mascot';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PEACH = '#FFB347';
const DARK_BG = '#131f24';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <BeeMascot size={180} />
        <Text style={styles.title}>connections</Text>
        <Text style={styles.subtitle}>Learn for free. Forever.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/sign-up')}
        >
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.outlineButtonText}>
            I ALREADY HAVE AN ACCOUNT
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: DARK_BG,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: PEACH,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 19,
    textAlign: 'center',
    color: '#FFFFFF',
    marginTop: 10,
    fontWeight: '500',
    opacity: 0.9,
  },
  footer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PEACH,
    borderBottomWidth: 4,
    borderBottomColor: '#E69138',
  },
  buttonText: {
    color: DARK_BG,
    fontSize: 17,
    fontWeight: 'bold',
  },
  outlineButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#37464f',
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: PEACH,
  },
});
