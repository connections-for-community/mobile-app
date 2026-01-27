// TODO: Uncomment when Development Build is ready
import { signInWithApple, signInWithGoogle } from '@/utils/auth-social';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const socialOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.timing(socialOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(socialOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillHideListener.remove();
      keyboardWillShowListener.remove();
    };
  }, [socialOpacity]);
  
  const isFormValid = email.trim().length > 0 && password.length > 0;

  const performSocialLogin = async (providerName: string, loginFunc: () => Promise<any>) => {
    try {
      setLoading(true);
      const result = await loginFunc();
      if (!result) {
        // Cancelled
        setLoading(false);
        return;
      }
      // Success is handled by the auth state listener
      // However, we need to check if onboarding is complete
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && !user.user_metadata?.onboarding_complete) {
        Alert.alert(
          "Account Not Set Up",
          "You haven't finished setting up your account yet. Would you like to do that now?",
          [
            {
              text: "No",
              style: "cancel",
              onPress: async () => {
                await supabase.auth.signOut();
                setLoading(false);
              }
            },
            {
              text: "Yes, Let's Go",
              onPress: () => router.push('/(auth)/sign-up')
            }
          ]
        );
      }
    } catch (e: any) {
      setLoading(false);
      // Ignore "No ID token present!" if likely caused by UI flow interruption or suppression
      if (e.message === 'No ID token present!') return;
      
      Alert.alert(`${providerName} Login Failed`, e.message);
    }
  };

  const handleSignIn = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable 
        style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
        onPress={Keyboard.dismiss}
      >
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
              (!isFormValid || loading) && styles.signInButtonDisabled
            ]}
            onPress={handleSignIn}
            disabled={!isFormValid || loading}
          >
            <Text style={[
              styles.signInButtonText,
              (!isFormValid || loading) && styles.signInButtonTextDisabled
            ]}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotButton}
            onPress={() => Alert.alert('Forgot Password', 'Password recovery is coming soon.')}
          >
            <Text style={styles.forgotButtonText}>FORGOT PASSWORD</Text>
          </TouchableOpacity>
        </View>

        {/* Social Login Section */}
        <Animated.View style={[styles.socialSection, { opacity: socialOpacity }]} pointerEvents="auto">
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => performSocialLogin('Google', signInWithGoogle)}
          >
            <View style={styles.socialIconContainer}>
              <Ionicons name="logo-google" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH GOOGLE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            // Facebook SDK not installed yet
            onPress={() => Alert.alert('Facebook Login', 'Facebook login is not yet configured.')}
          >
            <View style={[styles.socialIconContainer, styles.facebookIcon]}>
              <Ionicons name="logo-facebook" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH FACEBOOK</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => performSocialLogin('Apple', signInWithApple)}
          >
            <View style={styles.socialIconContainer}>
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.socialButtonText}>SIGN IN WITH APPLE</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By signing in, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {'\n'}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </Pressable>
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
  // googleIcon removed as we use Ionicons now
  facebookIcon: {
    // Facebook logo usually needs a background, but for consistency we might just use the icon
    // or keep the background if desired. The previous one had blue bg. 
    // To keep them proportional, let's just make them all transparent with white icon
    // or keep the circle.
    // The previous implementation for FB was inconsistent. 
    // Let's remove specific styles to make them uniform.
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
