import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { queryClient } from "@/lib/query";
import { colors } from "@/lib/theme";
import { AuthProvider } from "@/features/auth/AuthProvider";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.paper },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
              <Stack.Screen name="create" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="settings" />
              <Stack.Screen
                name="hub/[slug]"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="create/event"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="hub/edit/[slug]"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="event/[id]"
                options={{ animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="my-hubs/index"
                options={{ animation: "slide_from_bottom" }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}