import { BeeMascot } from '@/components/bee-mascot';
import { useAuth } from '@/context/auth-context';
import { signInWithApple, signInWithGoogle } from '@/utils/auth-social';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

// Onboarding Steps
const STEP_WELCOME = 0;
const STEP_INTEREST_MODE = 1;
const STEP_QUIZ_Q1 = 2; // Introvert/Extrovert
const STEP_QUIZ_Q2 = 3; // Creative/Logical
const STEP_QUIZ_Q3 = 4; // Indoor/Outdoor
const STEP_SELECT_INTERESTS = 5; // Result/Manual Selection
const STEP_ROLE_SELECTION = 6;
const STEP_INSTRUCTOR_DETAILS = 7;
const STEP_FINAL_DETAILS = 8;
const TOTAL_STEPS = 9;

const AVAILABLE_INTERESTS = [
  'Technology', 'Art', 'Music', 'Cooking', 'Fitness', 
  'Language', 'Business', 'Science', 'Writing', 'Gaming'
];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(STEP_WELCOME);
  
  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [role, setRole] = useState<'student' | 'instructor' | null>(null);
  const [instructorSkills, setInstructorSkills] = useState('');
  const [testAnswer, setTestAnswer] = useState<string | null>(null); // Mock personality test answer
  const [quizAnswers, setQuizAnswers] = useState({ q1: '', q2: '', q3: '' });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsExistingUser(true);
        if (user.email) setEmail(user.email);
        if (user.user_metadata?.full_name) setName(user.user_metadata.full_name);
      }
    });
  }, []);
  
  // Validation: name + username required for all, email + password for non-OAuth
  const hasRequiredFields = name.trim().length > 0 && username.trim().length > 0;
  const isEmailFormValid = hasRequiredFields && email.trim().length > 0 && (isExistingUser || password.length > 0);

  const handleCompleteSignUp = async (method: 'email' | 'google' | 'apple') => {
    // Validate required fields for all methods
    if (!name.trim() || !username.trim()) {
      Alert.alert('Missing Info', 'Please enter your name and username.');
      return;
    }

    setLoading(true);
    try {
      // 2. Prepare Profile Metadata with ALL questionnaire answers
      const interests = selectedInterests.length > 0 ? selectedInterests : [];
      const personalityType = quizAnswers.q1 && quizAnswers.q2 && quizAnswers.q3 
        ? `${quizAnswers.q1}-${quizAnswers.q2}-${quizAnswers.q3}` 
        : null;

      const metadata: Record<string, any> = {
        full_name: name.trim(),
        username: username.trim(),
        role: role || 'student',
        interests,
        onboarding_complete: false, // Set to false so we can redirect to profile setup
      };
      if (personalityType) metadata.personality_type = personalityType;
      if (instructorSkills.trim()) metadata.instructor_skills = instructorSkills.trim();

      // 1. Authenticate
      if (!isExistingUser) {
        if (method === 'email') {
          if (!email.trim() || !password) {
            Alert.alert('Missing Info', 'Please enter your email and password.');
            setLoading(false);
            return;
          }
          
          if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
            setLoading(false);
            return;
          }

          const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata, // Pass ALL metadata here for email signups
            },
          });
          if (error) throw error;

          // If session is null, email confirmation might be on
          if (!signUpData.session && signUpData.user) {
             Alert.alert('Verify Email', 'Please check your inbox to verify your email before logging in.');
             setLoading(false);
             return;
          }
        } else if (method === 'google') {
           const result = await signInWithGoogle();
           if (!result) { setLoading(false); return; } // Cancelled
           // For OAuth, we MUST call updateUser because signUp metadata options don't apply to signInWithIdToken
           const { error } = await supabase.auth.updateUser({ data: metadata });
           if (error) throw error;
        } else if (method === 'apple') {
           const result = await signInWithApple();
           if (!result) { setLoading(false); return; } // Cancelled
           const { error } = await supabase.auth.updateUser({ data: metadata });
           if (error) throw error;
        }
      } else {
        // Existing social user finishing profile
        const { error } = await supabase.auth.updateUser({ data: metadata });
        if (error) throw error;
      }

      // Refresh the user in auth context to get updated metadata
      await refreshUser();

      // Redirect to Profile Setup instead of Home
      router.replace('/profile-setup');
    } catch (e: any) {
      console.error('Sign up error:', e);
      // More helpful error messages
      let errorMessage = e.message;
      if (e.message?.includes('unacceptable')) {
        errorMessage = 'Google authentication failed. Please check that your Google Cloud Console and Supabase configurations match.';
      }
      Alert.alert('Sign Up Failed', errorMessage);
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
          placeholder="Username (e.g. @coolbee123)" 
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
          value={username}
          onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
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
          editable={!isExistingUser}
        />
      </View>
      
      <View style={[styles.inputContainer, styles.inputBottom]}>
        {!isExistingUser ? (
          <>
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
          </>
        ) : (
             <View style={{ padding: 16 }}>
                 <Text style={{ color: TEXT_MUTED }}>Social Account Linked ✓</Text>
             </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.signInButton, 
          (!isEmailFormValid || loading) && styles.signInButtonDisabled
        ]}
        onPress={() => handleCompleteSignUp('email')}
        disabled={!isEmailFormValid || loading}
      >
        <Text style={[
          styles.signInButtonText,
          (!isEmailFormValid || loading) && styles.signInButtonTextDisabled
        ]}>
          {loading ? 'FINISHING UP...' : isExistingUser ? 'COMPLETE PROFILE' : 'CREATE ACCOUNT'}
        </Text>
      </TouchableOpacity>

      {!isExistingUser && (
        <>
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
                <TouchableOpacity 
                  style={[styles.socialButtonSmall, !hasRequiredFields && { opacity: 0.5 }]} 
                  onPress={() => handleCompleteSignUp('google')}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButtonSmall, !hasRequiredFields && { opacity: 0.5 }]} 
                  onPress={() => handleCompleteSignUp('apple')}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButtonSmall, { opacity: 0.5 }]} 
                  onPress={() => Alert.alert('Coming Soon', 'Facebook signup coming soon')}
                >
                  <Ionicons name="logo-facebook" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {!hasRequiredFields && (
              <Text style={{ color: TEXT_MUTED, textAlign: 'center', fontSize: 13, marginTop: 8 }}>
                Fill in your name & username above to enable social sign-up
              </Text>
            )}
        </>
      )}
    </View>
  );

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { textAlign: 'center', fontSize: 32 }]}>Welcome!</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
        I'm <Text style={{ color: PEACH, fontWeight: 'bold' }}>Bee</Text>, your guide to connections.
        {'\n'}Let's get your profile set up in just a few taps!
      </Text>

      <TouchableOpacity 
        style={styles.signInButton}
        onPress={() => setCurrentStep(STEP_INTEREST_MODE)}
      >
        <Text style={styles.signInButtonText}>LET'S GO!</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInterestModeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { textAlign: 'center' }]}>Find your spark</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>How should we find your interests?</Text>
      
      <View style={{ gap: 16 }}>
        <TouchableOpacity 
          style={styles.cardButton}
          onPress={() => setCurrentStep(STEP_SELECT_INTERESTS)}
        >
          <IconSymbol name="sparkles" size={32} color={PEACH} />
          <View style={{ flex: 1 }}>
             <Text style={styles.cardButtonTitle}>I know what I like</Text>
             <Text style={styles.cardButtonDesc}>Pick from a list of topics</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={BORDER_COLOR} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardButton}
          onPress={() => setCurrentStep(STEP_QUIZ_Q1)}
        >
           <IconSymbol name="magnet" size={32} color={PEACH} />
           <View style={{ flex: 1 }}>
             <Text style={styles.cardButtonTitle}>Take a Quiz</Text>
             <Text style={styles.cardButtonDesc}>Let us suggest some for you</Text>
           </View>
           <Ionicons name="chevron-forward" size={24} color={BORDER_COLOR} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleQuizCompletion = (q3Answer: string) => {
    // Determine interests based on 3 answers
    // q1: Introvert/Extrovert
    // q2: Creative/Analytical
    // q3: Chill/Active
    
    // Simple logic engine - only use interests from AVAILABLE_INTERESTS
    const newInterests: string[] = [];
    const { q2 } = quizAnswers;
    const q3 = q3Answer; // latest answer

    if (q2 === 'Creative') newInterests.push('Art', 'Writing', 'Music');
    if (q2 === 'Analytical') newInterests.push('Science', 'Technology', 'Business');
    
    if (q3 === 'Active') newInterests.push('Fitness', 'Cooking'); 
    else newInterests.push('Gaming', 'Language');

    // Ensure we have unique values and filter to only valid interests
    const uniqueInterests = Array.from(new Set(newInterests)).filter(i => AVAILABLE_INTERESTS.includes(i));
    setSelectedInterests(uniqueInterests);
    setCurrentStep(STEP_SELECT_INTERESTS);
  };

  const renderQuizQ1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personality Check (1/3)</Text>
      <Text style={styles.stepSubtitle}>How do you recharge?</Text>
      
      <View style={{ gap: 16 }}>
         <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q1 === 'Introvert' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q1: 'Introvert'}));
            setTimeout(() => setCurrentStep(STEP_QUIZ_Q2), 200);
          }}
        >
          <IconSymbol name="book.fill" size={32} color={quizAnswers.q1 === 'Introvert' ? PEACH : '#FFFFFF'} />
          <View>
             <Text style={styles.cardButtonTitle}>Alone with a book</Text>
             <Text style={styles.cardButtonDesc}>Quiet time is the best time</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q1 === 'Extrovert' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q1: 'Extrovert'}));
            setTimeout(() => setCurrentStep(STEP_QUIZ_Q2), 200);
          }}
        >
           <IconSymbol name="person.3.fill" size={32} color={quizAnswers.q1 === 'Extrovert' ? PEACH : '#FFFFFF'} />
           <View>
             <Text style={styles.cardButtonTitle}>Out with friends</Text>
             <Text style={styles.cardButtonDesc}>Energy comes from people</Text>
           </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuizQ2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personality Check (2/3)</Text>
      <Text style={styles.stepSubtitle}>How do you solve problems?</Text>
      
      <View style={{ gap: 16 }}>
         <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q2 === 'Creative' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q2: 'Creative'}));
            setTimeout(() => setCurrentStep(STEP_QUIZ_Q3), 200);
          }}
        >
          <IconSymbol name="paintpalette.fill" size={32} color={quizAnswers.q2 === 'Creative' ? PEACH : '#FFFFFF'} />
          <View>
             <Text style={styles.cardButtonTitle}>Creatively</Text>
             <Text style={styles.cardButtonDesc}>I follow my intuition</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q2 === 'Analytical' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q2: 'Analytical'}));
            setTimeout(() => setCurrentStep(STEP_QUIZ_Q3), 200);
          }}
        >
           <IconSymbol name="brain.head.profile" size={32} color={quizAnswers.q2 === 'Analytical' ? PEACH : '#FFFFFF'} />
           <View>
             <Text style={styles.cardButtonTitle}>Logically</Text>
             <Text style={styles.cardButtonDesc}>I analyze the data</Text>
           </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuizQ3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personality Check (3/3)</Text>
      <Text style={styles.stepSubtitle}>Pick your perfect weekend</Text>
      
      <View style={{ gap: 16 }}>
         <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q3 === 'Chill' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q3: 'Chill'}));
            handleQuizCompletion('Chill');
          }}
        >
          <IconSymbol name="house.fill" size={32} color={quizAnswers.q3 === 'Chill' ? PEACH : '#FFFFFF'} />
          <View>
             <Text style={styles.cardButtonTitle}>Stay Cozy</Text>
             <Text style={styles.cardButtonDesc}>Movies, games, and snacks</Text>
           </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.cardButton, quizAnswers.q3 === 'Active' && styles.cardButtonSelected]}
          onPress={() => {
            setQuizAnswers(prev => ({...prev, q3: 'Active'}));
             handleQuizCompletion('Active');
          }}
        >
           <IconSymbol name="figure.run" size={32} color={quizAnswers.q3 === 'Active' ? PEACH : '#FFFFFF'} />
           <View>
             <Text style={styles.cardButtonTitle}>Get Moving</Text>
             <Text style={styles.cardButtonDesc}>Hiking, sports, or exploring</Text>
           </View>
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
           {currentStep === STEP_WELCOME && (
             <TouchableOpacity 
               onPress={() => router.replace('/')}
               style={styles.backButton}
             >
               <Ionicons name="close" size={28} color="#FFFFFF" />
             </TouchableOpacity>
           )}
           {currentStep > STEP_WELCOME && (
             <View style={{flexDirection: 'row', alignItems: 'center', width: '100%'}}>
               <TouchableOpacity 
                 onPress={() => {
                   // Handle back navigation for quiz steps
                   if (currentStep === STEP_SELECT_INTERESTS && quizAnswers.q1) {
                     // If we came from quiz, go back to Q3
                     setCurrentStep(STEP_QUIZ_Q3);
                   } else {
                     setCurrentStep(prev => prev - 1);
                   }
                 }}
                 style={{ paddingRight: 16 }}
               >
                 <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
               </TouchableOpacity>
               <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%` }]} />
               </View>
             </View>
           )}
        </View>

        <View style={styles.mascotContainer}>
           <BeeMascot size={currentStep === STEP_WELCOME ? 160 : 120} />
           <View style={styles.speechBubble}>
              <Text style={styles.speechText}>
                {currentStep === STEP_WELCOME && "Bzz! Welcome to Connections!"}
                {currentStep === STEP_INTEREST_MODE && "Let's find your spark."}
                {currentStep === STEP_QUIZ_Q1 && "How do you recharge?"}
                {currentStep === STEP_QUIZ_Q2 && "How do you solve problems?"}
                {currentStep === STEP_QUIZ_Q3 && "Pick your perfect weekend!"}
                {currentStep === STEP_SELECT_INTERESTS && "Pick what you love!"}
                {currentStep === STEP_ROLE_SELECTION && "What's your goal?"}
                {currentStep === STEP_INSTRUCTOR_DETAILS && "Show off your skills!"}
                {currentStep === STEP_FINAL_DETAILS && "Almost there!"}
              </Text>
              <View style={styles.speechArrow} />
           </View>
        </View>

        {currentStep === STEP_WELCOME && renderWelcomeStep()}
        {currentStep === STEP_INTEREST_MODE && renderInterestModeStep()}
        {currentStep === STEP_QUIZ_Q1 && renderQuizQ1()}
        {currentStep === STEP_QUIZ_Q2 && renderQuizQ2()}
        {currentStep === STEP_QUIZ_Q3 && renderQuizQ3()}
        {currentStep === STEP_SELECT_INTERESTS && renderSelectInterestsStep()}
        {currentStep === STEP_ROLE_SELECTION && renderRoleSelectionStep()}
        {currentStep === STEP_INSTRUCTOR_DETAILS && renderInstructorDetailsStep()}
        {currentStep === STEP_FINAL_DETAILS && renderFinalDetailsStep()}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Helper Icon Component (simplified for this file)
function IconSymbol({ name, size, color }: { name: any, size: number, color: string }) {
   // Mapping some custom names if needed, or straight pass through
   const iconName = name === 'house.fill' ? 'home' 
     : name === 'sparkles' ? 'star' // mapped sparkles to star previously, kept for consistency
     : name === 'magnet' ? 'magnet'
     : name === 'questionmark.circle.fill' ? 'help-circle'
     : 'help';
     
   return <Ionicons name={iconName} size={size} color={color} />;
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
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    maxWidth: '80%',
    position: 'relative',
  },
  speechArrow: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  speechText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: DARK_SURFACE,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    gap: 16,
  },
  cardButtonSelected: {
    borderColor: PEACH,
    backgroundColor: PEACH,
  },
  cardButtonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardButtonDesc: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginTop: 2,
  },
  cardButtonTextSelected: {
    color: DARK_BG,
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
