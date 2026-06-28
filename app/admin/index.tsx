import { useEffect, useState, useCallback } from "react";
import { Pressable, useWindowDimensions, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import {
  Badge,
  Button,
  Card,
  Footer,
  Icon,
  Input,
  Screen,
  Text,
} from "@/components/ui";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { supabase } from "@/lib/supabase/client";
import { useMyProfile } from "@/features/profiles/api";

type HubAdminItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  verification_status: "pending" | "verified" | "rejected";
  status: "draft" | "active" | "inactive";
  location_state: string | null;
  location_city: string | null;
};

type ProfileAdminItem = {
  id: string;
  full_name: string;
  location: string | null;
  is_admin: boolean;
  is_public_professional: boolean;
  created_at: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: currentProfile, isLoading: profileLoading } = useMyProfile();

  const [activeTab, setActiveTab] = useState<"hubs" | "users">("hubs");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data lists
  const [hubs, setHubs] = useState<HubAdminItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileAdminItem[]>([]);
  
  // Loading states
  const [dataLoading, setDataLoading] = useState(false);
  const [stats, setStats] = useState({ profiles: 0, hubs: 0, events: 0 });

  // Load stats and lists
  const loadData = useCallback(async () => {
    if (!currentProfile?.is_admin) return;
    setDataLoading(true);
    try {
      // 1. Fetch counts
      const { count: profilesCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: hubsCount } = await supabase.from("hubs").select("*", { count: "exact", head: true });
      const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true });
      setStats({
        profiles: profilesCount || 0,
        hubs: hubsCount || 0,
        events: eventsCount || 0,
      });

      // 2. Fetch hubs list
      const { data: hubsList } = await supabase
        .from("hubs")
        .select("id, name, slug, type, verification_status, status, location_state, location_city")
        .order("created_at", { ascending: false });
      setHubs((hubsList as HubAdminItem[]) || []);

      // 3. Fetch profiles list
      const { data: profilesList } = await supabase
        .from("profiles")
        .select("id, full_name, location, is_admin, is_public_professional, created_at")
        .order("created_at", { ascending: false });
      setProfiles((profilesList as ProfileAdminItem[]) || []);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile?.is_admin) {
      loadData();
    }
  }, [currentProfile, loadData]);

  // Handle Hub verification update
  const updateHubVerification = async (hubId: string, status: "pending" | "verified" | "rejected") => {
    try {
      const { error } = await supabase
        .from("hubs")
        .update({ verification_status: status })
        .eq("id", hubId);
      if (error) throw error;
      setHubs((list) => list.map((h) => (h.id === hubId ? { ...h, verification_status: status } : h)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update hub verification");
    }
  };

  // Handle User Admin status update
  const toggleUserAdmin = async (profileId: string, currentAdminVal: boolean) => {
    // Prevent self-demotion
    if (profileId === currentProfile?.id) {
      alert("You cannot demote yourself from Admin status.");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentAdminVal })
        .eq("id", profileId);
      if (error) throw error;
      setProfiles((list) => list.map((p) => (p.id === profileId ? { ...p, is_admin: !currentAdminVal } : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle admin status");
    }
  };

  // Loading Profile Check
  if (profileLoading) {
    return (
      <Screen contentClassName="items-center justify-center p-20">
        <ActivityIndicator size="large" color={colors.pink} />
      </Screen>
    );
  }

  // Security Check: Gated Access
  if (!currentProfile || !currentProfile.is_admin) {
    return (
      <Screen contentClassName="pt-10 md:pt-16 max-w-md mx-auto" maxWidth="content">
        <Card className="border border-danger/30 bg-terracotta-50/50 p-8 items-center gap-4">
          <Icon name="lock" size={48} color={colors.terracotta} />
          <Text variant="subheading" tone="pink" className="text-center font-display text-xl tracking-tight">
            Access Denied
          </Text>
          <Text variant="caption" tone="muted" className="text-center leading-5">
            This dashboard is restricted to system administrators. Please contact support if you believe this is an error.
          </Text>
          <Button label="Return home" variant="outline" size="sm" className="mt-2" onPress={() => router.replace("/")} />
        </Card>
      </Screen>
    );
  }

  // Filter listings based on tab & query
  const q = searchQuery.toLowerCase().trim();
  const filteredHubs = hubs.filter((h) => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || (h.location_city ?? "").toLowerCase().includes(q));
  const filteredProfiles = profiles.filter((p) => p.full_name.toLowerCase().includes(q) || (p.location ?? "").toLowerCase().includes(q));

  const isWide = width >= 768;
  const cols = isWide ? 3 : 1;

  return (
    <Screen contentClassName="pt-4 md:pt-6" maxWidth="content">
      
      {/* Header */}
      <View className="gap-2 border-b border-linen pb-5 flex-row flex-wrap justify-between items-center">
        <View className="gap-1 flex-1 min-w-[280px]">
          <Text variant="overline" tone="pink">
            System Administration
          </Text>
          <Text className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Admin Dashboard
          </Text>
          <Text className="font-sans text-xs text-ink-faint">
            Manage public hubs verification, system statistics, and security permissions.
          </Text>
        </View>
        <Button label="Refresh Data" variant="outline" size="sm" onPress={loadData} loading={dataLoading} />
      </View>

      {/* Stats Cards Row */}
      <View className="flex-row flex-wrap gap-4 mt-6">
        <Card className={cn("p-5 gap-1.5 border border-linen bg-card", cols === 3 ? "w-[calc(33.33%-11px)]" : "w-full")}>
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">Total Users</Text>
          <Text className="font-display text-2xl font-semibold text-ink">{stats.profiles}</Text>
        </Card>
        <Card className={cn("p-5 gap-1.5 border border-linen bg-card", cols === 3 ? "w-[calc(33.33%-11px)]" : "w-full")}>
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">Total Hubs</Text>
          <Text className="font-display text-2xl font-semibold text-ink">{stats.hubs}</Text>
        </Card>
        <Card className={cn("p-5 gap-1.5 border border-linen bg-card", cols === 3 ? "w-[calc(33.33%-11px)]" : "w-full")}>
          <Text className="text-[10px] font-heading uppercase tracking-widest text-ink-muted">Total Events</Text>
          <Text className="font-display text-2xl font-semibold text-ink">{stats.events}</Text>
        </Card>
      </View>

      {/* Control Panel Section */}
      <View className="mt-8 gap-4">
        {/* Search */}
        <Input
          placeholder={activeTab === "hubs" ? "Search hubs by name, type, or city..." : "Search users by name or location..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Icon name="search" size={16} color={colors.inkMuted} />}
          clearButtonMode="while-editing"
        />

        {/* Tab Selection */}
        <View className="flex-row border-b border-linen/30 pb-px gap-6">
          <Pressable onPress={() => { setActiveTab("hubs"); setSearchQuery(""); }} className="pb-2 relative">
            <Text className={cn("text-xs font-heading", activeTab === "hubs" ? "text-ink font-semibold" : "text-ink-faint")}>
              Hubs Directory ({hubs.length})
            </Text>
            {activeTab === "hubs" && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />}
          </Pressable>
          <Pressable onPress={() => { setActiveTab("users"); setSearchQuery(""); }} className="pb-2 relative">
            <Text className={cn("text-xs font-heading", activeTab === "users" ? "text-ink font-semibold" : "text-ink-faint")}>
              User Accounts ({profiles.length})
            </Text>
            {activeTab === "users" && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />}
          </Pressable>
        </View>
      </View>

      {/* Hubs Tab Panel */}
      {activeTab === "hubs" && (
        <View className="mt-4 gap-3">
          {filteredHubs.length > 0 ? (
            filteredHubs.map((hub) => (
              <Card key={hub.id} className="p-4 border border-linen/60 bg-card flex-row flex-wrap items-center justify-between gap-4">
                <View className="gap-1 flex-1 min-w-[200px]">
                  <Text className="font-display text-sm font-semibold text-ink leading-tight">{hub.name}</Text>
                  <Text className="text-[10px] text-ink-faint uppercase font-heading tracking-wider">
                    {hub.type} · {hub.location_city || "Anywhere"}, {hub.location_state || "AU"}
                  </Text>
                  <View className="flex-row gap-1.5 mt-1">
                    <Badge
                      label={hub.status === "active" ? "Active" : hub.status === "draft" ? "Draft" : "Inactive"}
                      variant={hub.status === "active" ? "success" : "neutral"}
                    />
                    <Badge
                      label={hub.verification_status === "verified" ? "Verified" : hub.verification_status === "rejected" ? "Rejected" : "Verification Pending"}
                      variant={hub.verification_status === "verified" ? "success" : hub.verification_status === "rejected" ? "danger" : "warning"}
                    />
                  </View>
                </View>

                {/* Moderation Actions */}
                <View className="flex-row gap-2">
                  {hub.verification_status !== "verified" && (
                    <Button
                      label="Verify"
                      variant="whatsapp"
                      size="sm"
                      onPress={() => updateHubVerification(hub.id, "verified")}
                    />
                  )}
                  {hub.verification_status !== "rejected" && (
                    <Button
                      label="Reject"
                      variant="outline"
                      size="sm"
                      onPress={() => updateHubVerification(hub.id, "rejected")}
                    />
                  )}
                  {hub.verification_status !== "pending" && (
                    <Button
                      label="Reset"
                      variant="secondary"
                      size="sm"
                      onPress={() => updateHubVerification(hub.id, "pending")}
                    />
                  )}
                </View>
              </Card>
            ))
          ) : (
            <Card className="p-10 items-center mt-2">
              <Text variant="caption" tone="muted">No hubs match the query.</Text>
            </Card>
          )}
        </View>
      )}

      {/* Users Tab Panel */}
      {activeTab === "users" && (
        <View className="mt-4 gap-3">
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map((userItem) => (
              <Card key={userItem.id} className="p-4 border border-linen/60 bg-card flex-row flex-wrap items-center justify-between gap-4">
                <View className="gap-1 flex-1 min-w-[200px]">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-display text-sm font-semibold text-ink leading-tight">{userItem.full_name || "Unnamed User"}</Text>
                    {userItem.is_admin && <Badge label="System Admin" variant="danger" />}
                  </View>
                  <Text className="text-[10px] text-ink-faint uppercase font-heading tracking-wider">
                    Location: {userItem.location || "Not shared"} · Joined: {new Date(userItem.created_at).toLocaleDateString()}
                  </Text>
                  {userItem.is_public_professional && (
                    <View className="mt-1">
                      <Badge label="Public Professional" variant="success" />
                    </View>
                  )}
                </View>

                {/* Account Actions */}
                <View className="flex-row gap-2">
                  <Button
                    label={userItem.is_admin ? "Demote Admin" : "Promote Admin"}
                    variant={userItem.is_admin ? "outline" : "primary"}
                    size="sm"
                    onPress={() => toggleUserAdmin(userItem.id, userItem.is_admin)}
                  />
                </View>
              </Card>
            ))
          ) : (
            <Card className="p-10 items-center mt-2">
              <Text variant="caption" tone="muted">No user accounts match the query.</Text>
            </Card>
          )}
        </View>
      )}

      <Footer className="mt-12 border-t border-linen pt-8" />
    </Screen>
  );
}
