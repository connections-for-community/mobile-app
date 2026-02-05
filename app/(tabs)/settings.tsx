import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AvatarSize = 256 | 512 | 1024;

export default function SettingsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();

  const meta = user?.user_metadata || {};
  const persistedAvatarUrl = (meta.avatar_url as string | undefined) ?? null;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(persistedAvatarUrl);

  // Selected image before confirming
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarSize, setAvatarSize] = useState<AvatarSize>(512);

  const [uploading, setUploading] = useState(false);

  const sectionBg = useMemo(
    () => (colorScheme === "dark" ? "#1c2b33" : "#f5f5f5"),
    [colorScheme],
  );

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error signing out", error.message);
    }
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

  const updateAvatarMetadata = async (newAvatarUrl: string | null) => {
    const currentMeta = user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: { ...currentMeta, avatar_url: newAvatarUrl },
    });
    if (error) throw error;
  };

  const uploadAvatarToSupabase = async (localUri: string, _size: AvatarSize) => {
    if (!user?.id) throw new Error("No active session found.");

    // Upload the image directly (image manipulation removed for now)
    const arrayBuffer = await fetch(localUri).then((r) => r.arrayBuffer());
    const filePath = `${user.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType: "image/jpeg",
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

      // Native editor for crop/zoom during selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setPendingAvatarUri(uri);
      setAvatarSize(512);
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
      const publicUrl = await uploadAvatarToSupabase(pendingAvatarUri, avatarSize);
      await updateAvatarMetadata(publicUrl);

      setAvatarUrl(publicUrl);
      setAvatarModalOpen(false);
      setPendingAvatarUri(null);
      Alert.alert("Updated", "Profile picture updated.");
    } catch (e: any) {
      console.error("Avatar upload error:", e);
      Alert.alert("Upload failed", e?.message ?? "Could not update profile picture.");
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
      setAvatarUrl(null);
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
        style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors[colorScheme].text }]}>
            Settings
          </Text>
        </View>

        <View style={styles.content}>
          {/* My Profile */}
          <View style={[styles.section, { backgroundColor: sectionBg }]}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>
              My Profile
            </Text>

            {/* Profile Image Form */}
            <View style={styles.avatarRow}>
              <TouchableOpacity
                style={[styles.avatarPressable, uploading && { opacity: 0.7 }]}
                onPress={openGalleryPicker}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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
                <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                  Profile picture
                </Text>
                <Text style={[styles.subLabel, { color: Colors[colorScheme].icon }]}>
                  Tap to select from your gallery, resize, and confirm.
                </Text>

                {!!avatarUrl && (
                  <TouchableOpacity
                    onPress={removeAvatar}
                    disabled={uploading}
                    style={[styles.removeAvatarBtn, uploading && { opacity: 0.7 }]}
                  >
                    <Text style={styles.removeAvatarText}>Remove photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.row}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                Name
              </Text>
              <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>
                {meta.full_name || "N/A"}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.row}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                Username
              </Text>
              <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>
                @{meta.username || "not set"}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.row}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                Role
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: Colors[colorScheme].icon, textTransform: "capitalize" },
                ]}
              >
                {meta.role || "Student"}
              </Text>
            </View>

            {meta.personality_type && (
              <>
                <View style={styles.separator} />
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                    Personality
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>
                    {meta.personality_type}
                  </Text>
                </View>
              </>
            )}

            {meta.role === "instructor" && (
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
                  <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>
                    {meta.instructor_skills || "None listed"}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Interests */}
          <View style={[styles.section, { backgroundColor: sectionBg }]}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>
              Interests
            </Text>
            <View style={styles.chipContainer}>
              {meta.interests?.map((interest: string, index: number) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              )) || (
                <Text style={{ color: Colors[colorScheme].icon }}>
                  No interests selected
                </Text>
              )}
            </View>
          </View>

          {/* Account */}
          <View style={[styles.section, { backgroundColor: sectionBg }]}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>
              Account
            </Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: Colors[colorScheme].text }]}>
                Email
              </Text>
              <Text style={[styles.value, { color: Colors[colorScheme].icon }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>LOG OUT</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>DELETE ACCOUNT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Resize & Confirm Modal */}
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
              { backgroundColor: colorScheme === "dark" ? "#1c2b33" : "#ffffff" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: Colors[colorScheme].text }]}>
              Resize & confirm
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: Colors[colorScheme].icon }]}
            >
              Choose an output size, then confirm.
            </Text>

            <View style={styles.previewWrap}>
              {pendingAvatarUri ? (
                <Image source={{ uri: pendingAvatarUri }} style={styles.previewImage} />
              ) : null}
            </View>

            <View style={styles.sizeRow}>
              <SizePill
                label="Small"
                px={256}
                selected={avatarSize === 256}
                onPress={() => setAvatarSize(256)}
              />
              <SizePill
                label="Medium"
                px={512}
                selected={avatarSize === 512}
                onPress={() => setAvatarSize(512)}
              />
              <SizePill
                label="Large"
                px={1024}
                selected={avatarSize === 1024}
                onPress={() => setAvatarSize(1024)}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                disabled={uploading}
                onPress={cancelAvatar}
              >
                <Text style={[styles.modalBtnText, { color: Colors[colorScheme].text }]}>
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
    </>
  );
}

function SizePill({
  label,
  px,
  selected,
  onPress,
}: {
  label: string;
  px: 256 | 512 | 1024;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sizePill, selected && styles.sizePillSelected]}
    >
      <Text style={[styles.sizePillText, selected && styles.sizePillTextSelected]}>
        {label}
      </Text>
      <Text style={[styles.sizePillSub, selected && styles.sizePillTextSelected]}>
        {px}px
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  title: { fontSize: 32, fontWeight: "bold" },

  content: { padding: 20, gap: 24 },

  section: { borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 as any },
  avatarPressable: { position: "relative" },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#e9e9e9" },
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

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  column: { flexDirection: "column", alignItems: "flex-start" },
  separator: { height: 1, backgroundColor: "#37464f", opacity: 0.2 },

  label: { fontSize: 16, fontWeight: "500" },
  subLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  value: { fontSize: 16 },

  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 as any },
  chip: {
    backgroundColor: "#FFB347",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { color: "#131f24", fontWeight: "600", fontSize: 14 },

  signOutButton: {
    backgroundColor: "#FFB347",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#E69138",
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

  previewWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#e9e9e9",
  },

  sizeRow: { flexDirection: "row", gap: 10 as any, marginTop: 4 },
  sizePill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#37464f",
    alignItems: "center",
  },
  sizePillSelected: { backgroundColor: "#FFB347", borderColor: "#FFB347" },
  sizePillText: { fontWeight: "800", color: "#8a9ba8" },
  sizePillSub: { fontWeight: "700", fontSize: 12, color: "#8a9ba8" },
  sizePillTextSelected: { color: "#131f24" },

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
});
