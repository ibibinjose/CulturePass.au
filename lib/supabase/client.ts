import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { Database } from "./database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True once real credentials are present. Use to gate network-dependent UI. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Warn, don't throw: a missing .env must not crash the bundle or static
  // render. Screens surface query errors gracefully; placeholders keep
  // createClient from throwing until real values are supplied.
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — " +
      "copy .env.example to .env. Running with non-functional placeholder credentials.",
  );
}

const url = supabaseUrl ?? "http://localhost:54321";
const anonKey = supabaseAnonKey ?? "anon-key-not-configured";

/**
 * Auth session storage.
 * - Native: expo-secure-store (encrypted keychain/keystore).
 * - Web: localStorage (SecureStore is unavailable in the browser).
 *
 * Only the publishable anon key is used in the client. The service_role key
 * must NEVER be bundled into the app.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE; on web the URL session is detected for OAuth/magic-link redirects.
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});
