import {
  getPersonalityLabel,
  PERSONALITY_OPTIONS,
} from "@/constants/personality";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const normalizeUsername = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_]/g, "");

const AVAILABLE_TIMEZONES = [
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Denver",
  "America/Edmonton",
  "America/Phoenix",
  "America/Winnipeg",
  "America/Chicago",
  "America/Toronto",
  "America/Detroit",
  "America/Montreal",
  "America/New_York",
  "America/Halifax",
  "America/St_Johns",
];

export default function SettingsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const deviceTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";

  const meta = user?.user_metadata || {};
  const role = (meta.role as string | undefined) ?? "student";
  const providerAvatarUrl = (meta.avatar_url as string | undefined) ?? null;
  const persistedCustomAvatarUrl =
    (meta.custom_avatar_url as string | undefined) ?? null;

  // Persisted custom avatar URL (public)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(
    persistedCustomAvatarUrl,
  );
  const avatarUrl = customAvatarUrl ?? providerAvatarUrl;

  // Pending avatar (selected but not confirmed)
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personalityModalOpen, setPersonalityModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");
  const [savingSettings, setSavingSettings] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);

  const [savedProfile, setSavedProfile] = useState(() => ({
    full_name: (meta.full_name as string | undefined) ?? "",
    username: (meta.username as string | undefined) ?? "",
    instructor_skills: (meta.instructor_skills as string | undefined) ?? "",
    interests: Array.isArray(meta.interests)
      ? (meta.interests as string[])
      : [],
    personality_type: (meta.personality_type as string | undefined) ?? null,
  }));

  const [draftProfile, setDraftProfile] = useState(savedProfile);
  const [settingsDraft, setSettingsDraft] = useState(() => ({
    profile_visibility:
      (meta.profile_visibility as "public" | "private" | undefined) ?? "public",
    event_reminders_enabled:
      (meta.event_reminders_enabled as boolean | undefined) ?? true,
    message_notifications_enabled:
      (meta.message_notifications_enabled as boolean | undefined) ?? true,
    timezone: (meta.timezone as string | undefined) ?? deviceTimezone,
    measurement_system:
      (meta.measurement_system as "imperial" | "metric" | undefined) ??
      "imperial",
  }));

  const sectionBg = useMemo(
    () => (colorScheme === "dark" ? "#1c2b33" : "#f5f5f5"),
    [colorScheme],
  );

  useEffect(() => {
    const nextSaved = {
      full_name: (meta.full_name as string | undefined) ?? "",
      username: (meta.username as string | undefined) ?? "",
      instructor_skills: (meta.instructor_skills as string | undefined) ?? "",
      interests: Array.isArray(meta.interests)
        ? (meta.interests as string[])
        : [],
      personality_type: (meta.personality_type as string | undefined) ?? null,
    };
    setSavedProfile(nextSaved);
    if (!isEditing) setDraftProfile(nextSaved);
  }, [
    user?.id,
    meta.full_name,
    meta.username,
    meta.instructor_skills,
    meta.personality_type,
    meta.interests,
    isEditing,
  ]);

  useEffect(() => {
    setSettingsDraft({
      profile_visibility:
        (meta.profile_visibility as "public" | "private" | undefined) ??
        "public",
      event_reminders_enabled:
        (meta.event_reminders_enabled as boolean | undefined) ?? true,
      message_notifications_enabled:
        (meta.message_notifications_enabled as boolean | undefined) ?? true,
      timezone: (meta.timezone as string | undefined) ?? deviceTimezone,
      measurement_system:
        (meta.measurement_system as "imperial" | "metric" | undefined) ??
        "imperial",
    });
  }, [
    user?.id,
    meta.profile_visibility,
    meta.event_reminders_enabled,
    meta.message_notifications_enabled,
    meta.timezone,
    meta.measurement_system,
    deviceTimezone,
  ]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error signing out", error.message);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Alert.alert(
              "Account Deleted",
              "Your account has been scheduled for deletion.",
            );
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const currentMeta = user?.user_metadata ?? {};
      const { error } = await supabase.auth.updateUser({
        data: { ...currentMeta, ...settingsDraft },
      });
      if (error) throw error;
      Alert.alert("Updated", "Settings saved.");
    } catch (e: any) {
      console.error("Settings update error:", e);
      Alert.alert("Update failed", e?.message ?? "Could not update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email found for this account.");
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Info", "Please fill out all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Updated", "Password changed.");
    } catch (e: any) {
      console.error("Change password error:", e);
      Alert.alert(
        "Password change failed",
        e?.message ?? "Could not change password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const checkUsernameAvailable = async (username: string) => {
    if (!user?.id) throw new Error("No active session found.");
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .limit(1);

    if (error) throw error;
    return (data?.length ?? 0) === 0;
  };

  const saveProfile = async () => {
    if (!draftProfile.full_name.trim()) {
      Alert.alert("Missing Info", "Please enter your name.");
      return;
    }
    if (!draftProfile.username.trim()) {
      Alert.alert("Missing Info", "Please enter a username.");
      return;
    }

    const nextUsername = normalizeUsername(draftProfile.username.trim());

    setSaving(true);
    try {
      if (nextUsername !== normalizeUsername(savedProfile.username)) {
        const available = await checkUsernameAvailable(nextUsername);
        if (!available) {
          Alert.alert("Username taken", "Please choose a different username.");
          return;
        }
      }

      const currentMeta = user?.user_metadata ?? {};
      const nextProfile = {
        ...currentMeta,
        full_name: draftProfile.full_name.trim(),
        username: nextUsername,
        instructor_skills: draftProfile.instructor_skills.trim(),
        interests: draftProfile.interests,
        personality_type: draftProfile.personality_type || null,
      };

      const { error } = await supabase.auth.updateUser({
        data: nextProfile,
      });
      if (error) throw error;

      setSavedProfile({
        full_name: nextProfile.full_name,
        username: nextProfile.username,
        instructor_skills: nextProfile.instructor_skills,
        interests: nextProfile.interests,
        personality_type: nextProfile.personality_type,
      });

      setIsEditing(false);
      Alert.alert("Updated", "Profile updated.");
    } catch (e: any) {
      console.error("Profile update error:", e);
      Alert.alert("Update failed", e?.message ?? "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (saving) return;
    setDraftProfile(savedProfile);
    setIsEditing(false);
  };

  const beginEdit = () => {
    setDraftProfile(savedProfile);
    setIsEditing(true);
  };

  const updateAvatarMetadata = async (newAvatarUrl: string | null) => {
    const currentMeta = user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: { ...currentMeta, custom_avatar_url: newAvatarUrl },
    });
    if (error) throw error;
  };

  const uploadAvatarToSupabase = async (localUri: string) => {
    if (!user?.id) throw new Error("No active session found.");

    // Fetch the local file into an ArrayBuffer (works without native manipulator)
    const arrayBuffer = await fetch(localUri).then((r) => r.arrayBuffer());

    // Try to detect mime; iOS often gives .jpg/.jpeg/.png
    const lower = localUri.toLowerCase();
    const isPng = lower.endsWith(".png");
    const contentType = isPng ? "image/png" : "image/jpeg";
    const ext = isPng ? "png" : "jpg";

    // Store as: <userId>/avatar_<timestamp>.<ext>
    const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error("Could not generate avatar URL.");

    return data.publicUrl;
  };

  const openGalleryPicker = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to select a profile picture.",
        );
        return;
      }

      // "Resize" happens here via native crop/zoom UI (no dev-client rebuild needed)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // crop/zoom
        aspect: [1, 1], // square avatar
        quality: 1,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      // Open confirm modal
      setPendingAvatarUri(uri);
      setAvatarModalOpen(true);
    } catch (e: any) {
      console.error("Image pick error:", e);
      Alert.alert("Error", e?.message ?? "Could not open photo library.");
    }
  };

  const confirmAvatar = async () => {
    if (!pendingAvatarUri) return;

    setUploading(true);
    try {
      const publicUrl = await uploadAvatarToSupabase(pendingAvatarUri);
      await updateAvatarMetadata(publicUrl);

      setCustomAvatarUrl(publicUrl);
      setAvatarModalOpen(false);
      setPendingAvatarUri(null);

      Alert.alert("Updated", "Profile picture updated.");
    } catch (e: any) {
      console.error("Avatar upload error:", e);
      Alert.alert(
        "Upload failed",
        e?.message ?? "Could not update profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  const cancelAvatar = () => {
    if (uploading) return;
    setAvatarModalOpen(false);
    setPendingAvatarUri(null);
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await updateAvatarMetadata(null);
      setCustomAvatarUrl(null);
      Alert.alert("Updated", "Profile picture removed.");
    } catch (e: any) {
      console.error("Remove avatar error:", e);
      Alert.alert("Error", e?.message ?? "Could not remove profile picture.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: Colors[colorScheme].background },
        ]}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors[colorScheme].text }]}>
            Your Profile
          </Text>
          <View style={styles.headerTabs}>
            <TouchableOpacity
              style={[
                styles.headerTab,
                activeTab === "profile" && styles.headerTabActive,
              ]}
              onPress={() => setActiveTab("profile")}
            >
              <Text
                style={[
                  styles.headerTabText,
                  activeTab === "profile" && styles.headerTabTextActive,
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerTab,
                activeTab === "settings" && styles.headerTabActive,
              ]}
              onPress={() => setActiveTab("settings")}
            >
              <Text
                style={[
                  styles.headerTabText,
                  activeTab === "settings" && styles.headerTabTextActive,
                ]}
              >
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {activeTab === "profile" && (
            <>
              {/* My Profile */}
              <View style={[styles.section, { backgroundColor: sectionBg }]}>
                {/* Profile image form */}
                <View style={styles.avatarRow}>
                  <TouchableOpacity
                    style={[
                      styles.avatarPressable,
                      uploading && { opacity: 0.7 },
                    ]}
                    onPress={openGalleryPicker}
                    disabled={uploading}
                    activeOpacity={0.85}
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons
                          name="person"
                          size={34}
                          color={Colors[colorScheme].icon}
                        />
                      </View>
                    )}

                    <View style={styles.avatarBadge}>
                      {uploading ? (
                        <ActivityIndicator />
                      ) : (
                        <Ionicons name="camera" size={18} color="#131f24" />
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.label,
                        { color: Colors[colorScheme].text },
                      ]}
                    >
                      Profile picture
                    </Text>
                    <Text
                      style={[
                        styles.subLabel,
                        { color: Colors[colorScheme].icon },
                      ]}
                    >
                      Tap to select from your gallery, crop/zoom, then confirm.
                    </Text>

                    {!!avatarUrl && (
                      <TouchableOpacity
                        onPress={removeAvatar}
                        disabled={uploading}
                        style={[
                          styles.removeAvatarBtn,
                          uploading && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.removeAvatarText}>
                          Remove photo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Name
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={draftProfile.full_name}
                      onChangeText={(text) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          full_name: text,
                        }))
                      }
                      placeholder="Full name"
                      placeholderTextColor={Colors[colorScheme].icon}
                      style={[
                        styles.textInput,
                        { color: Colors[colorScheme].text },
                      ]}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.value,
                        { color: Colors[colorScheme].icon },
                      ]}
                    >
                      {savedProfile.full_name || "N/A"}
                    </Text>
                  )}
                </View>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Username
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={draftProfile.username}
                      onChangeText={(text) =>
                        setDraftProfile((prev) => ({
                          ...prev,
                          username: normalizeUsername(text),
                        }))
                      }
                      placeholder="Username"
                      placeholderTextColor={Colors[colorScheme].icon}
                      style={[
                        styles.textInput,
                        { color: Colors[colorScheme].text },
                      ]}
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.value,
                        { color: Colors[colorScheme].icon },
                      ]}
                    >
                      @{savedProfile.username || "not set"}
                    </Text>
                  )}
                </View>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Role
                  </Text>
                  <Text
                    style={[
                      styles.value,
                      {
                        color: Colors[colorScheme].icon,
                        textTransform: "capitalize",
                      },
                    ]}
                  >
                    {role || "Student"}
                  </Text>
                </View>

                <View style={styles.separator} />
                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Personality
                  </Text>
                  {isEditing ? (
                    <Pressable
                      style={[
                        styles.dropdown,
                        { borderColor: Colors[colorScheme].icon },
                      ]}
                      onPress={() => setPersonalityModalOpen(true)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          { color: Colors[colorScheme].text },
                        ]}
                      >
                        {getPersonalityLabel(draftProfile.personality_type)}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={Colors[colorScheme].icon}
                      />
                    </Pressable>
                  ) : (
                    <Text
                      style={[
                        styles.value,
                        { color: Colors[colorScheme].icon },
                      ]}
                    >
                      {getPersonalityLabel(savedProfile.personality_type)}
                    </Text>
                  )}
                </View>

                {role === "instructor" && (
                  <>
                    <View style={styles.separator} />
                    <View style={styles.column}>
                      <Text
                        style={[
                          styles.label,
                          { color: Colors[colorScheme].text, marginBottom: 4 },
                        ]}
                      >
                        Teaching Skills
                      </Text>
                      {isEditing ? (
                        <TextInput
                          value={draftProfile.instructor_skills}
                          onChangeText={(text) =>
                            setDraftProfile((prev) => ({
                              ...prev,
                              instructor_skills: text,
                            }))
                          }
                          placeholder="e.g., Guitar, Pottery, Coding..."
                          placeholderTextColor={Colors[colorScheme].icon}
                          style={[
                            styles.textInput,
                            { color: Colors[colorScheme].text },
                          ]}
                          multiline
                        />
                      ) : (
                        <Text
                          style={[
                            styles.value,
                            { color: Colors[colorScheme].icon },
                          ]}
                        >
                          {savedProfile.instructor_skills || "None listed"}
                        </Text>
                      )}
                    </View>
                  </>
                )}

                <View style={styles.separator} />

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Interests
                </Text>
                <View style={styles.chipContainer}>
                  {isEditing
                    ? AVAILABLE_INTERESTS.map((interest) => {
                        const isSelected =
                          draftProfile.interests.includes(interest);
                        return (
                          <TouchableOpacity
                            key={interest}
                            style={[
                              styles.editChip,
                              isSelected && styles.editChipSelected,
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setDraftProfile((prev) => ({
                                  ...prev,
                                  interests: prev.interests.filter(
                                    (i) => i !== interest,
                                  ),
                                }));
                              } else {
                                setDraftProfile((prev) => ({
                                  ...prev,
                                  interests: [...prev.interests, interest],
                                }));
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.editChipText,
                                isSelected && styles.editChipTextSelected,
                              ]}
                            >
                              {interest}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    : savedProfile.interests?.map((interest, index) => (
                        <View key={`${interest}-${index}`} style={styles.chip}>
                          <Text style={styles.chipText}>{interest}</Text>
                        </View>
                      ))}
                  {!isEditing &&
                    (!savedProfile.interests ||
                      savedProfile.interests.length === 0) && (
                      <Text style={{ color: Colors[colorScheme].icon }}>
                        No interests selected
                      </Text>
                    )}
                </View>

                <View style={styles.separator} />

                <View style={styles.editActions}>
                  {!isEditing ? (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={beginEdit}
                    >
                      <Text style={styles.editButtonText}>EDIT PROFILE</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.editButton, saving && { opacity: 0.7 }]}
                        onPress={saveProfile}
                        disabled={saving}
                      >
                        <Text style={styles.editButtonText}>
                          {saving ? "SAVING..." : "SAVE"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={cancelEdit}
                        disabled={saving}
                      >
                        <Text style={styles.cancelButtonText}>CANCEL</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {/* Account */}
              <View style={[styles.section, { backgroundColor: sectionBg }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Account
                </Text>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Email
                  </Text>
                  <Text
                    style={[styles.value, { color: Colors[colorScheme].icon }]}
                  >
                    {user?.email}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutText}>LOG OUT</Text>
              </TouchableOpacity>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <View style={[styles.section, { backgroundColor: sectionBg }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Security & Privacy
                </Text>

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Profile visibility
                  </Text>
                  <View style={styles.segmented}>
                    <Pressable
                      style={[
                        styles.segment,
                        settingsDraft.profile_visibility === "public" &&
                          styles.segmentActive,
                      ]}
                      onPress={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          profile_visibility: "public",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          settingsDraft.profile_visibility === "public" &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Public
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.segment,
                        settingsDraft.profile_visibility === "private" &&
                          styles.segmentActive,
                      ]}
                      onPress={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          profile_visibility: "private",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          settingsDraft.profile_visibility === "private" &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Private
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.separator} />

                <Text
                  style={[
                    styles.label,
                    { color: Colors[colorScheme].text, marginBottom: 8 },
                  ]}
                >
                  Change password
                </Text>
                <View style={[styles.inputContainer, styles.singleInput]}>
                  <TextInput
                    placeholder="Current password"
                    placeholderTextColor={Colors[colorScheme].icon}
                    style={[styles.input, { color: Colors[colorScheme].text }]}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry
                  />
                </View>
                <View style={[styles.inputContainer, styles.singleInput]}>
                  <TextInput
                    placeholder="New password"
                    placeholderTextColor={Colors[colorScheme].icon}
                    style={[styles.input, { color: Colors[colorScheme].text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
                <View style={[styles.inputContainer, styles.singleInput]}>
                  <TextInput
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors[colorScheme].icon}
                    style={[styles.input, { color: Colors[colorScheme].text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.editButton,
                    passwordLoading && { opacity: 0.7 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  <Text style={styles.editButtonText}>
                    {passwordLoading ? "UPDATING..." : "UPDATE PASSWORD"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.deleteButtonText}>DELETE ACCOUNT</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.section, { backgroundColor: sectionBg }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Notifications
                </Text>

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Event reminders
                  </Text>
                  <Switch
                    value={settingsDraft.event_reminders_enabled}
                    onValueChange={(value) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        event_reminders_enabled: value,
                      }))
                    }
                  />
                </View>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Message notifications
                  </Text>
                  <Switch
                    value={settingsDraft.message_notifications_enabled}
                    onValueChange={(value) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        message_notifications_enabled: value,
                      }))
                    }
                  />
                </View>

                <Text style={styles.helperText}>
                  Notifications are stored now and will activate in a future
                  update.
                </Text>
              </View>

              <View style={[styles.section, { backgroundColor: sectionBg }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Preferences
                </Text>

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Timezone
                  </Text>
                  <Pressable
                    style={[
                      styles.dropdown,
                      { borderColor: Colors[colorScheme].icon },
                    ]}
                    onPress={() => setTimezoneModalOpen(true)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: Colors[colorScheme].text },
                      ]}
                    >
                      {settingsDraft.timezone || deviceTimezone}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={Colors[colorScheme].icon}
                    />
                  </Pressable>
                </View>

                <View style={styles.separator} />

                <View style={styles.row}>
                  <Text
                    style={[styles.label, { color: Colors[colorScheme].text }]}
                  >
                    Measurement system
                  </Text>
                  <View style={styles.segmented}>
                    <Pressable
                      style={[
                        styles.segment,
                        settingsDraft.measurement_system === "imperial" &&
                          styles.segmentActive,
                      ]}
                      onPress={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          measurement_system: "imperial",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          settingsDraft.measurement_system === "imperial" &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Imperial
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.segment,
                        settingsDraft.measurement_system === "metric" &&
                          styles.segmentActive,
                      ]}
                      onPress={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          measurement_system: "metric",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          settingsDraft.measurement_system === "metric" &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Metric
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.editButton,
                    savingSettings && { opacity: 0.7 },
                  ]}
                  onPress={saveSettings}
                  disabled={savingSettings}
                >
                  <Text style={styles.editButtonText}>
                    {savingSettings ? "SAVING..." : "SAVE SETTINGS"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={cancelAvatar}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colorScheme === "dark" ? "#1c2b33" : "#ffffff",
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: Colors[colorScheme].text }]}
            >
              Confirm profile photo
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: Colors[colorScheme].icon },
              ]}
            >
              If it looks good, confirm to save it.
            </Text>

            <View style={styles.previewWrap}>
              {pendingAvatarUri ? (
                <Image
                  source={{ uri: pendingAvatarUri }}
                  style={styles.previewImage}
                />
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                disabled={uploading}
                onPress={cancelAvatar}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  uploading && { opacity: 0.7 },
                ]}
                disabled={uploading}
                onPress={confirmAvatar}
              >
                {uploading ? (
                  <ActivityIndicator color="#131f24" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#131f24" }]}>
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Personality Modal */}
      <Modal
        visible={personalityModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPersonalityModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colorScheme === "dark" ? "#1c2b33" : "#ffffff",
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: Colors[colorScheme].text }]}
            >
              Select personality
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={styles.personalityOption}
                onPress={() => {
                  setDraftProfile((prev) => ({
                    ...prev,
                    personality_type: null,
                  }));
                  setPersonalityModalOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.personalityOptionText,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  Not set
                </Text>
              </TouchableOpacity>

              {PERSONALITY_OPTIONS.map((option) => {
                const selected = draftProfile.personality_type === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.personalityOption,
                      selected && styles.personalityOptionSelected,
                    ]}
                    onPress={() => {
                      setDraftProfile((prev) => ({
                        ...prev,
                        personality_type: option.value,
                      }));
                      setPersonalityModalOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.personalityOptionText,
                        {
                          color: selected
                            ? "#131f24"
                            : Colors[colorScheme].text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => setPersonalityModalOpen(false)}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: Colors[colorScheme].text },
                ]}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Timezone Modal */}
      <Modal
        visible={timezoneModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimezoneModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colorScheme === "dark" ? "#1c2b33" : "#ffffff",
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: Colors[colorScheme].text }]}
            >
              Select timezone
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {AVAILABLE_TIMEZONES.map((tz) => {
                const selected = settingsDraft.timezone === tz;
                return (
                  <TouchableOpacity
                    key={tz}
                    style={[
                      styles.personalityOption,
                      selected && styles.personalityOptionSelected,
                    ]}
                    onPress={() => {
                      setSettingsDraft((prev) => ({ ...prev, timezone: tz }));
                      setTimezoneModalOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.personalityOptionText,
                        {
                          color: selected
                            ? "#131f24"
                            : Colors[colorScheme].text,
                        },
                      ]}
                    >
                      {tz}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => setTimezoneModalOpen(false)}
            >
              <Text
                style={[
                  styles.modalBtnText,
                  { color: Colors[colorScheme].text },
                ]}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 32, fontWeight: "bold" },
  headerTabs: {
    flexDirection: "row",
    gap: 8 as any,
    backgroundColor: "#1c2b33",
    padding: 4,
    borderRadius: 999,
  },
  headerTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerTabActive: {
    backgroundColor: "#FFB347",
  },
  headerTabText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  headerTabTextActive: { color: "#131f24" },

  content: { padding: 20, gap: 24 },

  section: { borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 as any },
  avatarPressable: { position: "relative" },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#e9e9e9",
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFB347",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  removeAvatarBtn: { marginTop: 8, alignSelf: "flex-start" },
  removeAvatarText: { color: "#FF6B6B", fontWeight: "700", fontSize: 12 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  column: { flexDirection: "column", alignItems: "flex-start" },
  separator: { height: 1, backgroundColor: "#37464f", opacity: 0.2 },

  label: { fontSize: 16, fontWeight: "500" },
  subLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  value: { fontSize: 16 },
  textInput: {
    minWidth: 140,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "600",
  },

  dropdown: {
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8 as any,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dropdownText: { fontSize: 14, fontWeight: "700" },

  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 as any },
  chip: {
    backgroundColor: "#FFB347",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { color: "#131f24", fontWeight: "600", fontSize: 14 },
  editChip: {
    backgroundColor: "#1c2b33",
    borderWidth: 1,
    borderColor: "#37464f",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editChipSelected: {
    backgroundColor: "#FFB347",
    borderColor: "#FFB347",
  },
  editChipText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  editChipTextSelected: { color: "#131f24" },

  editActions: { gap: 10 },
  editButton: {
    backgroundColor: "#FFB347",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: { color: "#131f24", fontSize: 14, fontWeight: "800" },
  cancelButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { color: "#FF6B6B", fontSize: 12, fontWeight: "800" },

  signOutButton: {
    backgroundColor: "#FFB347",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { color: "#131f24", fontSize: 16, fontWeight: "800" },

  deleteButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  deleteButtonText: { color: "#FF6B6B", fontSize: 14, fontWeight: "bold" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { borderRadius: 16, padding: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, fontWeight: "600" },

  previewWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#e9e9e9",
  },

  modalActions: { flexDirection: "row", gap: 12 as any, marginTop: 8 },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: { borderWidth: 1, borderColor: "#37464f" },
  modalBtnPrimary: { backgroundColor: "#FFB347" },
  modalBtnText: { fontWeight: "900", fontSize: 14 },

  personalityOption: {
    borderWidth: 1,
    borderColor: "#37464f",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  personalityOptionSelected: {
    backgroundColor: "#FFB347",
    borderColor: "#FFB347",
  },
  personalityOptionText: { fontSize: 14, fontWeight: "700" },

  segmented: {
    flexDirection: "row",
    backgroundColor: "#1c2b33",
    borderRadius: 999,
    padding: 4,
    gap: 6 as any,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentActive: { backgroundColor: "#FFB347" },
  segmentText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  segmentTextActive: { color: "#131f24" },
  helperText: { color: "#8a9ba8", fontSize: 12, marginTop: 8 },
  singleInput: {
    borderRadius: 16,
    marginBottom: 10,
  },
});
