import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Login</Text>
      
      <View style={styles.form}>
        <TextInput 
          placeholder="Email" 
          placeholderTextColor="#888"
          style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]} 
        />
        <TextInput 
          placeholder="Password" 
          placeholderTextColor="#888"
          secureTextEntry
          style={[styles.input, { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].icon }]} 
        />
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]}
          onPress={signIn}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  form: { gap: 16 },
  input: { height: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
  button: { height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
