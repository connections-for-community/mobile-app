import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PEACH = '#FFB347';
const DARK_BG = '#131f24';
const DARK_SURFACE = '#1c2b33';
const BORDER_COLOR = '#37464f';
const TEXT_MUTED = '#8a9ba8';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isFormValid = email.trim().length > 0 && password.length > 0 && name.trim().length > 0;

  const handleSignUp = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      Alert.alert('Success', 'Please check your email to confirm your account.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create your profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, styles.inputTop]}>
             <TextInput 
              placeholder="Full Name" 
              placeholderTextColor={TEXT_MUTED}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={[styles.inputContainer, styles.inputMiddle]}>
            <TextInput 
              placeholder="Email" 
              placeholderTextColor={TEXT_MUTED}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={[styles.inputContainer, styles.inputBottom]}>
            <TextInput 
              placeholder="Password" 
              placeholderTextColor={TEXT_MUTED}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye" : "eye-off"} 
                size={24} 
                color={PEACH} 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.signInButton, 
              (!isFormValid || loading) && styles.signInButtonDisabled
            ]}
            onPress={handleSignUp}
            disabled={!isFormValid || loading}
          >
            <Text style={[
              styles.signInButtonText,
              (!isFormValid || loading) && styles.signInButtonTextDisabled
            ]}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {'\n'}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: DARK_BG,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 36,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#FFFFFF',
    textAlign: 'center',
  },
  form: { 
    gap: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_SURFACE,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
  },
  inputTop: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1, // Separator
  },
  inputMiddle: {
    borderBottomWidth: 1,
    borderTopWidth: 0,
  },
  inputBottom: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 0,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  signInButton: {
    backgroundColor: PEACH,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderBottomWidth: 4,
    borderBottomColor: '#E69138',
  },
  signInButtonDisabled: {
    backgroundColor: '#37464f',
    borderBottomColor: '#1c2b33',
  },
  signInButtonText: {
    color: DARK_BG,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  signInButtonTextDisabled: {
    color: '#52656d',
  },
  termsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  termsText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  termsLink: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
