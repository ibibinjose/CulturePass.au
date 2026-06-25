import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Cross-platform key/value storage for non-secret data (e.g. wizard drafts).
 * Web uses localStorage; native uses AsyncStorage. For auth tokens use the
 * SecureStore-backed adapter in lib/supabase/client.ts instead.
 */
export const kvStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};
