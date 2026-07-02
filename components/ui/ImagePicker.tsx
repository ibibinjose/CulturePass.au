import { useState } from "react";
import { View, Image as RNImage, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";  // npx expo install expo-image-manipulator

import { Button } from "./Button";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { colors } from "@/lib/theme";
import { uploadData } from "aws-amplify/storage";
import { getAwsIdentityId } from "@/lib/aws/auth";
import { useMediaUrl } from "@/lib/aws/media";

interface ImagePickerProps {
  /** Stored media value — an S3 `media/…` path (or a legacy/external URL). */
  currentImageUrl?: string | null;
  /**
   * Receives the uploaded image's S3 **path** (`media/<identityId>/…`), which is
   * what gets persisted — signed URLs expire, paths don't. Render stored values
   * with `MediaImage`/`Avatar`/`useMediaUrl`. `null` = image removed.
   */
  onImageChange: (path: string | null) => void;
  imageType: "avatar" | "hub" | "event" | "cover";
  folderPath: string;
  label: string;
  helperText: string;
  aspect?: [number, number];
  previewAspectRatio?: number;
}

export function ImagePickerComponent({
  currentImageUrl,
  onImageChange,
  imageType,
  folderPath,
  label,
  helperText,
  aspect = [1, 1],
  previewAspectRatio,
}: ImagePickerProps) {
  // Local preview of a just-picked image; falls back to the stored image
  // (resolved from its S3 path) when nothing new has been picked.
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const currentUrl = useMediaUrl(currentImageUrl);
  const previewUri = localPreviewUri ?? (removed ? null : currentUrl);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      toast.error("Allow media-library access to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      if (selectedImage && selectedImage.uri) {
        // Generate thumbnail using expo-image-manipulator (free, Expo)
        const manipulated = await ImageManipulator.manipulateAsync(
          selectedImage.uri,
          [{ resize: { width: imageType === "avatar" ? 256 : 1024 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        await uploadImage(manipulated.uri);
      }
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      toast.error("Allow camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect,
      quality: 0.7,
    });

    if (!result.canceled) {
      const capturedImage = result.assets[0];
      if (capturedImage && capturedImage.uri) {
        const manipulated = await ImageManipulator.manipulateAsync(
          capturedImage.uri,
          [{ resize: { width: imageType === "avatar" ? 256 : 1024 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        await uploadImage(manipulated.uri);
      }
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      // Storage rules bind `media/{entity_id}/*` writes to the caller's
      // identity-pool id — a user-pool `sub` in the path gets access-denied.
      const identityId = await getAwsIdentityId();
      if (!identityId) throw new Error("Sign in to upload images.");

      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `media/${identityId}/${folderPath}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.jpg`;

      await uploadData({
        path,
        data: blob,
        options: { contentType: "image/jpeg" },
      }).result;

      setLocalPreviewUri(uri);
      setRemoved(false);
      onImageChange(path);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed — please try again.");
      // Keep whatever image was there before; a failed replacement shouldn't
      // clear the existing one.
      setLocalPreviewUri(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setLocalPreviewUri(null);
    setRemoved(true);
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
            style={{ aspectRatio: previewAspectRatio ?? aspect[0] / aspect[1] }}
            className="w-full max-w-[360px] self-center rounded-2xl"
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
              PNG or JPG
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
