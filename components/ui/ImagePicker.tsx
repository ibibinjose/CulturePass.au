import { useState } from "react";
import { View, Alert, Image as RNImage, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Button } from "./Button";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase/client";

interface ImagePickerProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  imageType: "avatar" | "hub" | "event" | "cover";
  folderPath: string;
  label: string;
  helperText: string;
}

export function ImagePickerComponent({
  currentImageUrl,
  onImageChange,
  imageType,
  folderPath,
  label,
  helperText,
}: ImagePickerProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "Please allow access to your media library to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      if (selectedImage && selectedImage.uri) {
        setPreviewUri(selectedImage.uri);
        await uploadImage(selectedImage.uri);
      }
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "Please allow camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const capturedImage = result.assets[0];
      if (capturedImage && capturedImage.uri) {
        setPreviewUri(capturedImage.uri);
        await uploadImage(capturedImage.uri);
      }
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      // Storage RLS requires the first path segment to be the user's id, so
      // uploads must live under `<uid>/…`. Resolve it before uploading.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to upload images.");

      const response = await fetch(uri);
      const blob = await response.blob();

      // Generate unique, per-user filename: <uid>/<folder>/<timestamp>-<rand>.jpg
      const filename = `${user.id}/${folderPath}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.jpg`;

      const { data, error } = await supabase.storage
        .from("media")
        .upload(filename, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(data.path);
      onImageChange(publicUrlData.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", "Failed to upload image. Please try again.");
      onImageChange(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUri(null);
    onImageChange(null);
  };

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="label" className="font-heading">
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {helperText}
        </Text>
      </View>

      {previewUri ? (
        <View className="gap-3">
          <RNImage
            source={{ uri: previewUri }}
            className="aspect-square w-full max-w-[280px] self-center rounded-2xl"
            resizeMode="cover"
          />
          <View className="flex-row flex-wrap gap-2">
            <Button label="Change" variant="outline" size="sm" onPress={pickImage} disabled={uploading} />
            <Button label="Take photo" variant="outline" size="sm" onPress={takePhoto} disabled={uploading} />
            <Button label="Remove" variant="ghost" size="sm" className="ml-auto" onPress={removeImage} disabled={uploading} />
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <Pressable
            onPress={pickImage}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={`Add ${label}`}
            className="items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linen bg-sand/50 px-6 py-10 active:bg-sand"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-card">
              <Icon name="image" size={22} color={colors.inkMuted} />
            </View>
            <Text variant="label" className="font-heading">
              Choose from library
            </Text>
            <Text variant="caption" tone="faint">
              PNG or JPG · square works best
            </Text>
          </Pressable>
          <Button label="Take photo" variant="outline" size="sm" onPress={takePhoto} disabled={uploading} className="self-start" />
        </View>
      )}

      {uploading && (
        <View className="flex-row items-center gap-2">
          <Text variant="caption" tone="muted">
            Uploading…
          </Text>
        </View>
      )}
    </View>
  );
}
