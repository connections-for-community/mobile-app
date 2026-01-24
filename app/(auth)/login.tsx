import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

const PEACH = '#FFB347';
const DARK_BG = '#131f24';
const DARK_SURFACE = '#1c2b33';
const BORDER_COLOR = '#37464f';
const TEXT_MUTED = '#8a9ba8';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const isFormValid = email.trim().length > 0 && password.length > 0;

  const handleSignIn = () => {
    if (isFormValid) {
      signIn();
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
          <Text style={styles.title}>Enter your details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, styles.inputTop]}>
            <TextInput 
              placeholder="Email, phone, or username" 
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
              !isFormValid && styles.signInButtonDisabled
            ]}
            onPress={handleSignIn}
            disabled={!isFormValid}
          >
            <Text style={[
              styles.signInButtonText,
              !isFormValid && styles.signInButtonTextDisabled
            ]}>
              SIGN IN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotButtonText}>FORGOT PASSWORD</Text>
          </TouchableOpacity>
        </View>

        {/* Social Login Section - pushed to bottom */}
        <View style={styles.socialSection}>
          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconContainer}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH GOOGLE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <View style={[styles.socialIconContainer, styles.facebookIcon]}>
              <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH FACEBOOK</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconContainer}>
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH APPLE</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By signing in, you agree to our{' '}
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
    borderBottomWidth: 1,
  },
  inputBottom: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 1,
  },
  input: { 
    flex: 1,
    height: 54, 
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: 54,
    justifyContent: 'center',
  },
  signInButton: { 
    height: 50, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 16,
    backgroundColor: PEACH,
    borderBottomWidth: 4,
    borderBottomColor: '#E69138',
  },
  signInButtonDisabled: {
    backgroundColor: BORDER_COLOR,
    borderBottomColor: '#2a3940',
  },
  signInButtonText: { 
    color: DARK_BG, 
    fontSize: 15, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  signInButtonTextDisabled: {
    color: TEXT_MUTED,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  forgotButtonText: {
    color: PEACH,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  socialSection: {
    marginTop: 'auto',
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    backgroundColor: 'transparent',
    gap: 10,
  },
  socialIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  facebookIcon: {
    backgroundColor: '#1877F2',
    borderRadius: 13,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  termsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  termsText: {
    color: TEXT_MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  termsLink: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
