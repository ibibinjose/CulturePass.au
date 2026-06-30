import { useState } from "react";
import { View, Image as RNImage, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Button } from "./Button";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { colors } from "@/lib/theme";
import { uploadData, getUrl } from "aws-amplify/storage";
import { getAwsCurrentUserId } from "@/lib/aws/auth";

interface ImagePickerProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
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
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl || null);
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
        setPreviewUri(capturedImage.uri);
        await uploadImage(capturedImage.uri);
      }
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const userId = await getAwsCurrentUserId();
      if (!userId) throw new Error("Sign in to upload images.");

      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `media/${userId}/${folderPath}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.jpg`;

      await uploadData({
        path: filename,
        data: blob,
        options: { contentType: "image/jpeg" },
      }).result;

      const { url } = await getUrl({ path: filename });
      onImageChange(url.toString());
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed — please try again.");
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
