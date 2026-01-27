import { signInWithApple, signInWithGoogle } from '@/utils/auth-social';
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
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PEACH = '#FFB347';
const DARK_BG = '#131f24';
const DARK_SURFACE = '#1c2b33';
const BORDER_COLOR = '#37464f';
const TEXT_MUTED = '#8a9ba8';

// Onboarding Steps
const STEP_INTEREST_MODE = 0;
const STEP_SELECT_INTERESTS = 1;
const STEP_PERSONALITY_TEST = 2;
const STEP_ROLE_SELECTION = 3;
const STEP_INSTRUCTOR_DETAILS = 4;
const STEP_FINAL_DETAILS = 5;

const AVAILABLE_INTERESTS = [
  'Technology', 'Art', 'Music', 'Cooking', 'Fitness', 
  'Language', 'Business', 'Science', 'Writing', 'Gaming'
];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(STEP_INTEREST_MODE);
  
  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [role, setRole] = useState<'student' | 'instructor' | null>(null);
  const [instructorSkills, setInstructorSkills] = useState('');
  const [testAnswer, setTestAnswer] = useState<string | null>(null); // Mock personality test answer

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isCredentialsValid = email.trim().length > 0 && password.length > 0 && name.trim().length > 0;

  const handleCompleteSignUp = async (method: 'email' | 'google' | 'apple') => {
    setLoading(true);
    try {
      // 1. Authenticate
      if (method === 'email') {
        if (!isCredentialsValid || !location) return;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
      } else if (method === 'google') {
         const result = await signInWithGoogle();
         if (!result) { setLoading(false); return; } // Cancelled
      } else if (method === 'apple') {
         const result = await signInWithApple();
         if (!result) { setLoading(false); return; } // Cancelled
      }

      // 2. Update Profile Metadata
      const interests = testAnswer 
          ? (testAnswer === 'Introvert' ? ['Reading', 'Art', 'Technology'] : ['Sports', 'Music', 'Travel'])
          : selectedInterests;

      // Update user metadata with profile info
      const { error } = await supabase.auth.updateUser({
        data: {
          location: location || 'Unknown', // Location might be empty if social sign up didn't provide it, need to handle that or ask for it
          role,
          interests,
          instructor_skills: instructorSkills,
          onboarding_complete: true,
        }
      });

      if (error) throw error;
      
      Alert.alert('Success', 'Profile created! Welcome to Connections.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch (e: any) {
      if (e.message !== 'No ID token present!') {
          Alert.alert('Sign Up Failed', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFinalDetailsStep = () => (
    <View style={styles.form}>
       <Text style={styles.stepTitle}>Final Step</Text>
       <Text style={styles.stepSubtitle}>Create your account to save your profile.</Text>

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
          placeholder="Location (e.g. New York, USA)" 
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
          value={location}
          onChangeText={setLocation}
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
          (!isCredentialsValid || !location || loading) && styles.signInButtonDisabled
        ]}
        onPress={() => handleCompleteSignUp('email')}
        disabled={!isCredentialsValid || !location || loading}
      >
        <Text style={[
          styles.signInButtonText,
          (!isCredentialsValid || !location || loading) && styles.signInButtonTextDisabled
        ]}>
          {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </Text>
      </TouchableOpacity>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButtonSmall} onPress={() => handleCompleteSignUp('google')}>
           <Ionicons name="logo-google" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButtonSmall} onPress={() => handleCompleteSignUp('apple')}>
           <Ionicons name="logo-apple" size={24} color="#FFF" />
        </TouchableOpacity>
         <TouchableOpacity style={styles.socialButtonSmall} onPress={() => Alert.alert('Coming Soon', 'Facebook signup coming soon')}>
           <Ionicons name="logo-facebook" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInterestModeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Find your spark</Text>
      <Text style={styles.stepSubtitle}>How should we find your interests?</Text>
      
      <View style={{ gap: 16 }}>
        <TouchableOpacity 
          style={styles.outlineButton}
          onPress={() => setCurrentStep(STEP_SELECT_INTERESTS)}
        >
          <Text style={styles.outlineButtonText}>I KNOW WHAT I LIKE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.outlineButton}
          onPress={() => setCurrentStep(STEP_PERSONALITY_TEST)}
        >
           <Text style={styles.outlineButtonText}>TAKE A PERSONALITY TEST</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSelectInterestsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pick your interests</Text>
      <Text style={styles.stepSubtitle}>Select at least 3 topics</Text>
      
      <View style={styles.chipContainer}>
        {AVAILABLE_INTERESTS.map(interest => {
          const isSelected = selectedInterests.includes(interest);
          return (
            <TouchableOpacity 
              key={interest}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => {
                if (isSelected) {
                  setSelectedInterests(prev => prev.filter(i => i !== interest));
                } else {
                  setSelectedInterests(prev => [...prev, interest]);
                }
              }}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity 
        style={[styles.signInButton, selectedInterests.length < 3 && styles.signInButtonDisabled]}
        onPress={() => setCurrentStep(STEP_ROLE_SELECTION)}
        disabled={selectedInterests.length < 3}
      >
        <Text style={styles.signInButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPersonalityTestStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personality Check</Text>
      <Text style={styles.stepSubtitle}>How do you recharge?</Text>
      
      <View style={{ gap: 16 }}>
         <TouchableOpacity 
          style={[styles.outlineButton, testAnswer === 'Introvert' && styles.outlineButtonSelected]}
          onPress={() => setTestAnswer('Introvert')}
        >
          <Text style={[styles.outlineButtonText, testAnswer === 'Introvert' && styles.outlineButtonTextSelected]}>
            ALONE WITH A BOOK
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.outlineButton, testAnswer === 'Extrovert' && styles.outlineButtonSelected]}
          onPress={() => setTestAnswer('Extrovert')}
        >
           <Text style={[styles.outlineButtonText, testAnswer === 'Extrovert' && styles.outlineButtonTextSelected]}>
            OUT WITH FRIENDS
           </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.signInButton, !testAnswer && styles.signInButtonDisabled]}
        onPress={() => setCurrentStep(STEP_ROLE_SELECTION)}
        disabled={!testAnswer}
      >
        <Text style={styles.signInButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRoleSelectionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Goal</Text>
      <Text style={styles.stepSubtitle}>How do you want to use Connections?</Text>
      
      <View style={{ gap: 16 }}>
        <TouchableOpacity 
          style={[styles.cardButton, role === 'instructor' && styles.cardButtonSelected]}
          onPress={() => setRole('instructor')}
        >
          <IconSymbol name="sparkles" size={32} color={role === 'instructor' ? DARK_BG : PEACH} />
          <View>
             <Text style={[styles.cardButtonTitle, role === 'instructor' && styles.cardButtonTextSelected]}>I have skills to share</Text>
             <Text style={[styles.cardButtonDesc, role === 'instructor' && styles.cardButtonTextSelected]}>Become an instructor and monetize your talent</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.cardButton, role === 'student' && styles.cardButtonSelected]}
          onPress={() => setRole('student')}
        >
          <IconSymbol name="house.fill" size={32} color={role === 'student' ? DARK_BG : PEACH} />
          <View>
             <Text style={[styles.cardButtonTitle, role === 'student' && styles.cardButtonTextSelected]}>I want to discover</Text>
             <Text style={[styles.cardButtonDesc, role === 'student' && styles.cardButtonTextSelected]}>Find events and learn new skills</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.signInButton, !role && styles.signInButtonDisabled]}
        onPress={() => {
          if (role === 'instructor') {
            setCurrentStep(STEP_INSTRUCTOR_DETAILS);
          } else {
            // Student -> Go to Final Step
            setCurrentStep(STEP_FINAL_DETAILS);
          }
        }}
        disabled={!role}
      >
        <Text style={styles.signInButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInstructorDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Instructor Profile</Text>
      <Text style={styles.stepSubtitle}>What are you an expert in?</Text>
      
      <View style={[styles.inputContainer, styles.singleInput]}>
        <TextInput 
          placeholder="e.g., Guitar, Pottery, Coding..." 
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
          value={instructorSkills}
          onChangeText={setInstructorSkills}
        />
      </View>

      <TouchableOpacity 
        style={[styles.signInButton, !instructorSkills && styles.signInButtonDisabled]}
        onPress={() => setCurrentStep(STEP_FINAL_DETAILS)}
        disabled={!instructorSkills}
      >
        <Text style={styles.signInButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  // Main Render
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Header with back button */}
        <View style={styles.header}>
           {currentStep === STEP_INTEREST_MODE && (
             <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
           )}
           {currentStep > STEP_INTEREST_MODE && (
              <View style={styles.progressBar}>
                 <View style={[styles.progressFill, { width: `${(currentStep / 6) * 100}%` }]} />
              </View>
           )}
        </View>

        {currentStep === STEP_INTEREST_MODE && renderInterestModeStep()}
        {currentStep === STEP_SELECT_INTERESTS && renderSelectInterestsStep()}
        {currentStep === STEP_PERSONALITY_TEST && renderPersonalityTestStep()}
        {currentStep === STEP_ROLE_SELECTION && renderRoleSelectionStep()}
        {currentStep === STEP_INSTRUCTOR_DETAILS && renderInstructorDetailsStep()}
        {currentStep === STEP_FINAL_DETAILS && renderFinalDetailsStep()}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Helper Icon Component (simplified for this file)
function IconSymbol({ name, size, color }: { name: any, size: number, color: string }) {
   return <Ionicons name={name === 'house.fill' ? 'home' : name === 'sparkles' ? 'star' : 'help'} size={size} color={color} />;
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: DARK_BG,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: DARK_SURFACE,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PEACH,
  },
  backButton: {
    padding: 4,
  },
  stepContainer: {
    flex: 1,
    gap: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 18,
    color: TEXT_MUTED,
    marginBottom: 24,
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
  singleInput: {
    borderRadius: 16,
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
  outlineButton: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    backgroundColor: 'transparent',
  },
  outlineButtonSelected: {
    borderColor: PEACH,
    backgroundColor: PEACH,
  },
  outlineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButtonTextSelected: {
     color: DARK_BG,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: DARK_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chipSelected: {
    backgroundColor: PEACH,
    borderColor: PEACH,
  },
  chipText: {
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: DARK_BG,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: DARK_SURFACE,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    gap: 16,
  },
  cardButtonSelected: {
    backgroundColor: PEACH,
    borderColor: PEACH,
  },
  cardButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardButtonDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  cardButtonTextSelected: {
    color: DARK_BG,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  dividerText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  socialButtonSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DARK_SURFACE,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
