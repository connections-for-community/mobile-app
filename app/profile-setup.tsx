import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  // Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  const themeColors = Colors[colorScheme];

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const uploadAvatar = async (userId: string) => {
    if (!imageBase64) return null;

    try {
      // Decode base64 to array buffer not strictly needed for supabase if we use the standard upload with a blob
      // But React Native + Supabase storage can be tricky.
      // Easiest is to upload the file directly if `uri` is standard.
      // However, `expo-image-picker` gives a URI.
      
      const arrayBuffer = await fetch(avatar!).then(res => res.arrayBuffer());
      const fileExt = avatar!.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;

    } catch (error) {
      console.error('Error uploading avatar: ', error);
      // Fallback: don't block user if avatar fails
      return null;
    }
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
        let avatarUrl = null;
        if (avatar && user) {
            avatarUrl = await uploadAvatar(user.id);
        }

        const now = new Date();
        const socialLinks = {
            instagram: instagram.trim(),
            linkedin: linkedin.trim(),
        };

        const preferences = {
            notifications: notificationsEnabled,
            public_profile: publicProfile,
        };

        // 1. Update Auth Metadata (User Session State)
        // We keep minimal flags here for fast routing/checks
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                onboarding_complete: true,
                bio: bio.trim(), // Keep in metadata for now as fallback/easy access
                avatar_url: avatarUrl, // Keep in metadata for now as fallback/easy access
                updated_at: now,
            },
        });

        if (authError) throw authError;

        // 2. Upsert to Public Profiles Table
        // This ensures data is accessible to other users via proper RLS policies
        const profileUpdates = {
            id: user!.id,
            full_name: user?.user_metadata?.full_name,
            username: user?.user_metadata?.username,
            role: user?.user_metadata?.role || 'student',
            avatar_url: avatarUrl || user?.user_metadata?.avatar_url,
            bio: bio.trim(),
            socials: socialLinks, // Assumes a JSONB column named 'socials'
            personality_type: user?.user_metadata?.personality_type,
            instructor_skills: user?.user_metadata?.instructor_skills, // Ensure specific instructor data is synced
            preferences: preferences, // Assumes a JSONB column named 'preferences' or similar
            updated_at: now,
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileUpdates);

        if (profileError) {
             console.error('Error updating profiles table:', profileError);
             // Verify if table exists or if RLS blocks it. 
             // We won't block the user from entering the app, but we alert them.
             Alert.alert('Profile Warning', 'Your profile details were saved to your account, but the public profile sync failed. Please contact support if this persists.');
        }

        // Navigate to tabs
        router.replace('/(tabs)/home');

    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: themeColors.background }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 40 }]}>
        
        <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>Customize Profile</Text>
            {user?.user_metadata?.personality_type && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{user.user_metadata.personality_type}</Text>
                </View>
            )}
            <Text style={[styles.subtitle, { color: themeColors.icon }]}>
                Make it yours! You can change these later.
            </Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.section}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1c2b33' : '#e0e0e0' }]}>
                        <IconSymbol name="person.2.fill" size={40} color={themeColors.icon} />
                    </View>
                )}
                <View style={styles.editIconContainer}>
                    <IconSymbol name="sparkles" size={16} color="#FFF" />
                </View>
            </TouchableOpacity>
            <Text style={[styles.sectionHelpText, { color: themeColors.icon }]}>Tap to change profile photo</Text>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
            <Text style={[styles.label, { color: themeColors.text }]}>Your Bio</Text>
            <TextInput
                style={[styles.input, styles.textArea, { 
                    color: themeColors.text, 
                    backgroundColor: isDark ? '#1c2b33' : '#f0f0f0',
                    borderColor: isDark ? '#37464f' : '#ddd'
                }]}
                placeholder="Tell the community a bit about yourself..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
                value={bio}
                onChangeText={setBio}
                maxLength={160}
            />
            <Text style={[styles.charCount, { color: themeColors.icon }]}>{bio.length}/160</Text>
        </View>

        {/* Socials Section */}
        <View style={styles.section}>
             <Text style={[styles.label, { color: themeColors.text }]}>Social Links (Optional)</Text>
             
             <View style={styles.inputRow}>
                <IconSymbol name="house.fill" size={20} color={themeColors.icon} /> 
                {/* Note: In a real app we'd use brand icons, using house/generic for now */}
                <TextInput
                    style={[styles.socialInput, { color: themeColors.text, borderBottomColor: isDark ? '#37464f' : '#ddd' }]}
                    placeholder="Instagram Username"
                    placeholderTextColor="#888"
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                />
             </View>

             <View style={styles.inputRow}>
                <IconSymbol name="paperplane.fill" size={20} color={themeColors.icon} />
                <TextInput
                    style={[styles.socialInput, { color: themeColors.text, borderBottomColor: isDark ? '#37464f' : '#ddd' }]}
                    placeholder="LinkedIn URL"
                    placeholderTextColor="#888"
                    value={linkedin}
                    onChangeText={setLinkedin}
                    autoCapitalize="none"
                    keyboardType="url"
                />
             </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
             <Text style={[styles.label, { color: themeColors.text }]}>Preferences</Text>
             
             <View style={styles.switchRow}>
                 <Text style={[styles.switchText, { color: themeColors.text }]}>Enable Notifications</Text>
                 <Switch 
                    value={notificationsEnabled} 
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#767577', true: '#FFB347' }}
                 />
             </View>
             
             <View style={styles.switchRow}>
                 <Text style={[styles.switchText, { color: themeColors.text }]}>Public Profile</Text>
                 <Switch 
                    value={publicProfile} 
                    onValueChange={setPublicProfile}
                    trackColor={{ false: '#767577', true: '#FFB347' }}
                 />
             </View>
        </View>

        <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleFinishSetup}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="#131f24" />
            ) : (
                <Text style={styles.buttonText}>Start Exploring</Text>
            )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  badgeContainer: {
    backgroundColor: '#FFB347',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#131f24',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFB347',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#131f24', // Should match bg
  },
  sectionHelpText: {
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  socialInput: {
    flex: 1,
    height: 48,
    borderBottomWidth: 1,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#FFB347',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131f24',
  },
});
