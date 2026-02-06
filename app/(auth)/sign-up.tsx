import { BeeMascot } from "@/components/bee-mascot";
import { getPersonalityLabel } from "@/constants/personality";
import { signInWithApple, signInWithGoogle } from "@/utils/auth-social";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PEACH = "#FFB347";
const DARK_BG = "#131f24";
const DARK_SURFACE = "#1c2b33";
const BORDER_COLOR = "#37464f";
const TEXT_MUTED = "#8a9ba8";

// Password requirements (applies to Email + OAuth completion)
const PASSWORD_MIN_LEN = 8;
const hasNumber = (s: string) => /\d/.test(s);
const hasSpecial = (s: string) => /[^A-Za-z0-9]/.test(s);
const isPasswordValid = (s: string) =>
  s.length >= PASSWORD_MIN_LEN && hasNumber(s) && hasSpecial(s);
const passwordRequirementMessage =
  "Password must be at least 8 characters and include at least 1 number and 1 special character.";

// Onboarding Steps
const STEP_WELCOME = 0;
const STEP_INTEREST_MODE = 1;
const STEP_QUIZ_Q1 = 2;
const STEP_QUIZ_Q2 = 3;
const STEP_QUIZ_Q3 = 4;
const STEP_SELECT_INTERESTS = 5;
const STEP_ROLE_SELECTION = 6;
const STEP_INSTRUCTOR_DETAILS = 7;

// Auth Flow Steps
const STEP_AUTH_CHOICE = 8; // Buttons: Email / Google / Apple
const STEP_EMAIL_FORM = 9; // Email form
const STEP_OAUTH_COMPLETE = 10; // Finish setup after OAuth

const TOTAL_STEPS = 11;

const AVAILABLE_INTERESTS = [
  "Technology",
  "Art",
  "Music",
  "Cooking",
  "Fitness",
  "Language",
  "Business",
  "Science",
  "Writing",
  "Gaming",
];

type AuthMethod = "email" | "google" | "apple" | null;

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Wizard State
  const [currentStep, setCurrentStep] = useState(STEP_WELCOME);

  // History stack for back navigation (prevents walking through skipped steps)
  const [stepHistory, setStepHistory] = useState<number[]>([STEP_WELCOME]);

  const goToStep = (nextStep: number) => {
    setStepHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last === nextStep) return prev;
      return [...prev, nextStep];
    });
    setCurrentStep(nextStep);
  };

  // Back = pop history
  const goBackStep = () => {
    setStepHistory((prev) => {
      if (prev.length <= 1) {
        setCurrentStep(STEP_WELCOME);
        return [STEP_WELCOME];
      }
      const newHistory = prev.slice(0, -1);
      const lastStep = newHistory[newHistory.length - 1];
      setCurrentStep(lastStep);
      return newHistory;
    });
  };

  // Form Data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [role, setRole] = useState<"student" | "instructor" | null>(null);
  const [instructorSkills, setInstructorSkills] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({ q1: "", q2: "", q3: "" });

  // Tracks which interest path the user chose (manual vs quiz)
  const [usedQuizPath, setUsedQuizPath] = useState<boolean | null>(null);

  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user returns mid-flow (e.g., already authenticated via OAuth)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email) setEmail(user.email);
        if (user.user_metadata?.full_name && !name) {
          setName(user.user_metadata.full_name);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Validation ----------
  const isEmailFormValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      username.trim().length > 0 &&
      email.trim().length > 0 &&
      isPasswordValid(password)
    );
  }, [name, username, email, password]);

  const isOAuthCompleteValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      username.trim().length > 0 &&
      isPasswordValid(password)
    );
  }, [name, username, password]);

  // ---------- Weighted Progress (baseline at STEP_INTEREST_MODE = 0%) ----------
  // We define 4 equal "units" of progress starting at STEP_INTEREST_MODE:
  // 1) Interest branch -> converges at Select interests
  //    - manual: 1 jump
  //    - quiz: 4 steps * 0.25 each
  // 2) Select interests -> Role selection (1 unit)
  // 3) Role branch -> converges at Auth choice
  //    - student: 1 jump
  //    - instructor: 2 steps * 0.5 each
  // 4) Auth choice -> final form (Email form or OAuth complete) (1 unit)
  const TOTAL_PROGRESS_UNITS = 4;

  const progressRatio = useMemo(() => {
    let units = 0;

    // Baseline: Interest mode is 0%.
    if (currentStep <= STEP_INTEREST_MODE) return 0;

    // Segment 1: Interest branch (converges at STEP_SELECT_INTERESTS)
    if (currentStep >= STEP_SELECT_INTERESTS) {
      units += 1;
    } else if (usedQuizPath === true) {
      // Quiz path fractional progress
      if (currentStep === STEP_QUIZ_Q1) units += 0.25;
      else if (currentStep === STEP_QUIZ_Q2) units += 0.5;
      else if (currentStep === STEP_QUIZ_Q3) units += 0.75;
    } else {
      // Manual path: nothing until they reach STEP_SELECT_INTERESTS (then +1)
    }

    // Segment 2: Select interests -> Role selection
    if (currentStep >= STEP_ROLE_SELECTION) units += 1;

    // Segment 3: Role branch (converges at STEP_AUTH_CHOICE)
    if (currentStep >= STEP_AUTH_CHOICE) {
      units += 1;
    } else if (currentStep === STEP_INSTRUCTOR_DETAILS) {
      units += 0.5; // instructor has 2 steps to converge (0.5 + 0.5)
    }

    // Segment 4: Auth choice -> final form
    if (currentStep === STEP_EMAIL_FORM || currentStep === STEP_OAUTH_COMPLETE) {
      units += 1;
    }

    // Clamp
    if (units < 0) units = 0;
    if (units > TOTAL_PROGRESS_UNITS) units = TOTAL_PROGRESS_UNITS;

    return units / TOTAL_PROGRESS_UNITS;
  }, [currentStep, usedQuizPath]);

  // ---------- Helpers ----------
  const buildMetadata = () => {
    const interests = selectedInterests.length > 0 ? selectedInterests : [];
    const personalityType =
      quizAnswers.q1 && quizAnswers.q2 && quizAnswers.q3
        ? `${quizAnswers.q1}-${quizAnswers.q2}-${quizAnswers.q3}`
        : null;

    const metadata: Record<string, any> = {
      full_name: name.trim(),
      username: username.trim(),
      role: role || "student",
      interests,
      onboarding_complete: true,
    };

    if (personalityType) {
      metadata.personality_type = personalityType;
      metadata.personality_label = getPersonalityLabel(personalityType);
    }
    if (instructorSkills.trim()) {
      metadata.instructor_skills = instructorSkills.trim();
    }

    return metadata;
  };

  // ---------- Auth Actions ----------
  const handleEmailSignUpAndFinish = async () => {
    if (!name.trim() || !username.trim() || !email.trim()) {
      Alert.alert("Missing Info", "Please enter your name, username, and email.");
      return;
    }
    if (!isPasswordValid(password)) {
      Alert.alert("Password Requirements", passwordRequirementMessage);
      return;
    }

    setLoading(true);
    try {
      const metadata = buildMetadata();

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: metadata },
      });

      if (error) throw error;

      // If session is null, email confirmation might be enabled
      if (!signUpData.session && signUpData.user) {
        Alert.alert(
          "Verify Email",
          "Please check your inbox to verify your email before logging in."
        );
        return;
      }

      Alert.alert("Success", "Profile created! Welcome to Connections.", [
        { text: "OK", onPress: () => router.replace("/(tabs)?tab=home") },
      ]);
    } catch (e: any) {
      console.error("Email sign up error:", e);
      Alert.alert("Sign Up Failed", e?.message ?? "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  const beginOAuth = async (method: "google" | "apple") => {
    setLoading(true);
    try {
      const result =
        method === "google" ? await signInWithGoogle() : await signInWithApple();
      if (!result) return; // cancelled

      // Prefill from authenticated user if available
      const { data } = await supabase.auth.getUser();
      const u = data.user;

      if (u?.email) setEmail(u.email);
      if (u?.user_metadata?.full_name && !name) setName(u.user_metadata.full_name);

      // Force next step: finish setup (name, username, password)
      goToStep(STEP_OAUTH_COMPLETE);
    } catch (e: any) {
      console.error("OAuth error:", e);
      let errorMessage = e?.message ?? "OAuth failed.";
      if (e?.message?.includes("unacceptable")) {
        errorMessage =
          "Authentication failed. Please ensure your OAuth provider configuration matches your Supabase settings.";
      }
      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthFinish = async () => {
    if (!name.trim() || !username.trim()) {
      Alert.alert("Missing Info", "Please enter your name and username.");
      return;
    }
    if (!isPasswordValid(password)) {
      Alert.alert("Password Requirements", passwordRequirementMessage);
      return;
    }

    setLoading(true);
    try {
      const metadata = buildMetadata();

      const { error } = await supabase.auth.updateUser({
        password,
        data: metadata,
      });

      if (error) throw error;

      Alert.alert("Success", "Profile created! Welcome to Connections.", [
        { text: "OK", onPress: () => router.replace("/(tabs)?tab=home") },
      ]);
    } catch (e: any) {
      console.error("OAuth finish error:", e);
      Alert.alert("Finish Setup Failed", e?.message ?? "Could not finish setup.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI: New Steps ----------
  const renderAuthChoiceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>Choose a sign up method.</Text>

      <View style={{ gap: 16 }}>
        <TouchableOpacity
          style={styles.cardButton}
          onPress={() => {
            setAuthMethod("email");
            goToStep(STEP_EMAIL_FORM);
          }}
        >
          <Ionicons name="mail" size={32} color={PEACH} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardButtonTitle}>Continue with Email</Text>
            <Text style={styles.cardButtonDesc}>Use email + password</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={BORDER_COLOR} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardButton, loading && { opacity: 0.6 }]}
          onPress={async () => {
            setAuthMethod("google");
            await beginOAuth("google");
          }}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={32} color={PEACH} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardButtonTitle}>Continue with Google</Text>
            <Text style={styles.cardButtonDesc}>Sign in securely with Google</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={BORDER_COLOR} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardButton, loading && { opacity: 0.6 }]}
          onPress={async () => {
            setAuthMethod("apple");
            await beginOAuth("apple");
          }}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={32} color={PEACH} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardButtonTitle}>Continue with Apple</Text>
            <Text style={styles.cardButtonDesc}>Sign in securely with Apple</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={BORDER_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up, you agree to our <Text style={styles.termsLink}>Terms</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );

  const renderEmailFormStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Sign up with Email</Text>
      <Text style={styles.stepSubtitle}>Create a password for your account.</Text>

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
          onChangeText={(text) =>
            setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ""))
          }
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
        />
      </View>

      <View style={[styles.inputContainer, styles.inputBottom]}>
        <TextInput
          placeholder="Password (8+ chars, 1 number, 1 special)"
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
          (!isEmailFormValid || loading) && styles.signInButtonDisabled,
        ]}
        onPress={handleEmailSignUpAndFinish}
        disabled={!isEmailFormValid || loading}
      >
        <Text
          style={[
            styles.signInButtonText,
            (!isEmailFormValid || loading) && styles.signInButtonTextDisabled,
          ]}
        >
          {loading ? "CREATING..." : "CREATE ACCOUNT"}
        </Text>
      </TouchableOpacity>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up, you agree to our <Text style={styles.termsLink}>Terms</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );

  const renderOAuthCompleteStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Finish setup</Text>
      <Text style={styles.stepSubtitle}>Add your name, username, and a password.</Text>

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
          onChangeText={(text) =>
            setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ""))
          }
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.inputContainer, styles.inputMiddle]}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
          value={email}
          editable={false}
        />
      </View>

      <View style={[styles.inputContainer, styles.inputBottom]}>
        <TextInput
          placeholder="Password (8+ chars, 1 number, 1 special)"
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
          (!isOAuthCompleteValid || loading) && styles.signInButtonDisabled,
        ]}
        onPress={handleOAuthFinish}
        disabled={!isOAuthCompleteValid || loading}
      >
        <Text
          style={[
            styles.signInButtonText,
            (!isOAuthCompleteValid || loading) && styles.signInButtonTextDisabled,
          ]}
        >
          {loading ? "FINISHING..." : "FINISH"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- Existing Steps ----------
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { textAlign: "center", fontSize: 32 }]}>
        Welcome!
      </Text>
      <Text style={[styles.stepSubtitle, { textAlign: "center" }]}>
        I'm <Text style={{ color: PEACH, fontWeight: "bold" }}>Bee</Text>, your guide to connections.
        {"\n"}Let's get your profile set up in just a few taps!
      </Text>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => {
          // baseline becomes interest mode; reset selection flag until they choose path
          setUsedQuizPath(null);
          goToStep(STEP_INTEREST_MODE);
        }}
      >
        <Text style={styles.signInButtonText}>LET'S GO!</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInterestModeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { textAlign: "center" }]}>Find your spark</Text>
      <Text style={[styles.stepSubtitle, { textAlign: "center" }]}>
        How should we find your interests?
      </Text>

      <View style={{ gap: 16 }}>
        <TouchableOpacity
          style={styles.cardButton}
          onPress={() => {
            setUsedQuizPath(false);
            goToStep(STEP_SELECT_INTERESTS);
          }}
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
          onPress={() => {
            setUsedQuizPath(true);
            goToStep(STEP_QUIZ_Q1);
          }}
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
    const newInterests: string[] = [];
    const { q2 } = quizAnswers;
    const q3 = q3Answer;

    if (q2 === "Creative") newInterests.push("Art", "Writing", "Music");
    if (q2 === "Analytical") newInterests.push("Science", "Technology", "Business");

    if (q3 === "Active") newInterests.push("Fitness", "Cooking");
    else newInterests.push("Gaming", "Language");

    const uniqueInterests = Array.from(new Set(newInterests)).filter((i) =>
      AVAILABLE_INTERESTS.includes(i)
    );
    setSelectedInterests(uniqueInterests);

    goToStep(STEP_SELECT_INTERESTS);
  };

  const renderQuizQ1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personality Check (1/3)</Text>
      <Text style={styles.stepSubtitle}>How do you recharge?</Text>

      <View style={{ gap: 16 }}>
        <TouchableOpacity
          style={[
            styles.cardButton,
            quizAnswers.q1 === "Introvert" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q1: "Introvert" }));
            setTimeout(() => goToStep(STEP_QUIZ_Q2), 200);
          }}
        >
          <IconSymbol
            name="book.fill"
            size={32}
            color={quizAnswers.q1 === "Introvert" ? PEACH : "#FFFFFF"}
          />
          <View>
            <Text style={styles.cardButtonTitle}>Alone with a book</Text>
            <Text style={styles.cardButtonDesc}>Quiet time is the best time</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cardButton,
            quizAnswers.q1 === "Extrovert" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q1: "Extrovert" }));
            setTimeout(() => goToStep(STEP_QUIZ_Q2), 200);
          }}
        >
          <IconSymbol
            name="person.3.fill"
            size={32}
            color={quizAnswers.q1 === "Extrovert" ? PEACH : "#FFFFFF"}
          />
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
          style={[
            styles.cardButton,
            quizAnswers.q2 === "Creative" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q2: "Creative" }));
            setTimeout(() => goToStep(STEP_QUIZ_Q3), 200);
          }}
        >
          <IconSymbol
            name="paintpalette.fill"
            size={32}
            color={quizAnswers.q2 === "Creative" ? PEACH : "#FFFFFF"}
          />
          <View>
            <Text style={styles.cardButtonTitle}>Creatively</Text>
            <Text style={styles.cardButtonDesc}>I follow my intuition</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cardButton,
            quizAnswers.q2 === "Analytical" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q2: "Analytical" }));
            setTimeout(() => goToStep(STEP_QUIZ_Q3), 200);
          }}
        >
          <IconSymbol
            name="brain.head.profile"
            size={32}
            color={quizAnswers.q2 === "Analytical" ? PEACH : "#FFFFFF"}
          />
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
          style={[
            styles.cardButton,
            quizAnswers.q3 === "Chill" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q3: "Chill" }));
            handleQuizCompletion("Chill");
          }}
        >
          <IconSymbol
            name="house.fill"
            size={32}
            color={quizAnswers.q3 === "Chill" ? PEACH : "#FFFFFF"}
          />
          <View>
            <Text style={styles.cardButtonTitle}>Stay Cozy</Text>
            <Text style={styles.cardButtonDesc}>Movies, games, and snacks</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cardButton,
            quizAnswers.q3 === "Active" && styles.cardButtonSelected,
          ]}
          onPress={() => {
            setQuizAnswers((prev) => ({ ...prev, q3: "Active" }));
            handleQuizCompletion("Active");
          }}
        >
          <IconSymbol
            name="figure.run"
            size={32}
            color={quizAnswers.q3 === "Active" ? PEACH : "#FFFFFF"}
          />
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
        {AVAILABLE_INTERESTS.map((interest) => {
          const isSelected = selectedInterests.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => {
                if (isSelected) {
                  setSelectedInterests((prev) => prev.filter((i) => i !== interest));
                } else {
                  setSelectedInterests((prev) => [...prev, interest]);
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
        onPress={() => goToStep(STEP_ROLE_SELECTION)}
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
          style={[styles.cardButton, role === "instructor" && styles.cardButtonSelected]}
          onPress={() => setRole("instructor")}
        >
          <IconSymbol name="sparkles" size={32} color={role === "instructor" ? DARK_BG : PEACH} />
          <View>
            <Text
              style={[
                styles.cardButtonTitle,
                role === "instructor" && styles.cardButtonTextSelected,
              ]}
            >
              I have skills to share
            </Text>
            <Text
              style={[
                styles.cardButtonDesc,
                role === "instructor" && styles.cardButtonTextSelected,
              ]}
            >
              Become an instructor and monetize your talent
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardButton, role === "student" && styles.cardButtonSelected]}
          onPress={() => setRole("student")}
        >
          <IconSymbol name="house.fill" size={32} color={role === "student" ? DARK_BG : PEACH} />
          <View>
            <Text
              style={[
                styles.cardButtonTitle,
                role === "student" && styles.cardButtonTextSelected,
              ]}
            >
              I want to discover
            </Text>
            <Text
              style={[
                styles.cardButtonDesc,
                role === "student" && styles.cardButtonTextSelected,
              ]}
            >
              Find events and learn new skills
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.signInButton, !role && styles.signInButtonDisabled]}
        onPress={() => {
          if (role === "instructor") goToStep(STEP_INSTRUCTOR_DETAILS);
          else goToStep(STEP_AUTH_CHOICE);
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
        onPress={() => goToStep(STEP_AUTH_CHOICE)}
        disabled={!instructorSkills}
      >
        <Text style={styles.signInButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- Main Render ----------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Disable iOS swipe-back so our wizard back stack is authoritative */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          {currentStep === STEP_WELCOME && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {currentStep > STEP_WELCOME && (
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <TouchableOpacity onPress={goBackStep} style={{ paddingRight: 16 }}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progressRatio * 100)}%` },
                  ]}
                />
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
              {currentStep === STEP_AUTH_CHOICE && "Choose how you want to sign up."}
              {currentStep === STEP_EMAIL_FORM && "Almost there — create your login."}
              {currentStep === STEP_OAUTH_COMPLETE && "One more step — set your password."}
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

        {currentStep === STEP_AUTH_CHOICE && renderAuthChoiceStep()}
        {currentStep === STEP_EMAIL_FORM && renderEmailFormStep()}
        {currentStep === STEP_OAUTH_COMPLETE && renderOAuthCompleteStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Helper Icon Component
function IconSymbol({
  name,
  size,
  color,
}: {
  name: any;
  size: number;
  color: string;
}) {
  const iconName =
    name === "house.fill"
      ? "home"
      : name === "sparkles"
      ? "star"
      : name === "magnet"
      ? "magnet"
      : name === "questionmark.circle.fill"
      ? "help-circle"
      : name === "book.fill"
      ? "book"
      : name === "person.3.fill"
      ? "people"
      : name === "paintpalette.fill"
      ? "color-palette"
      : name === "brain.head.profile"
      ? "bulb"
      : name === "figure.run"
      ? "walk"
      : "help";

  return <Ionicons name={iconName as any} size={size} color={color} />;
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
    height: 52,
    justifyContent: "center",
  },
  backButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: DARK_SURFACE,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PEACH,
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    maxWidth: "80%",
    position: "relative",
  },
  speechArrow: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFFFFF",
  },
  speechText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  stepContainer: {
    paddingTop: 8,
  },
  stepTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  stepSubtitle: {
    color: TEXT_MUTED,
    fontSize: 16,
    marginBottom: 18,
    lineHeight: 22,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10 as any,
    marginBottom: 18,
  },
  chip: {
    backgroundColor: DARK_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: PEACH,
    borderColor: PEACH,
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chipTextSelected: {
    color: DARK_BG,
    fontWeight: "800",
  },

  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14 as any,
    backgroundColor: DARK_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    borderRadius: 16,
  },
  cardButtonSelected: {
    backgroundColor: PEACH,
    borderColor: PEACH,
  },
  cardButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  cardButtonDesc: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
  cardButtonTextSelected: {
    color: DARK_BG,
  },

  form: {
    marginTop: 8,
  },
  inputContainer: {
    backgroundColor: DARK_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputTop: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  inputMiddle: {
    borderTopWidth: 0,
  },
  inputBottom: {
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  singleInput: {
    borderRadius: 16,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 8,
  },

  signInButton: {
    marginTop: 18,
    backgroundColor: PEACH,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  signInButtonTextDisabled: {
    color: DARK_BG,
  },

  termsContainer: {
    marginTop: 16,
  },
  termsText: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
