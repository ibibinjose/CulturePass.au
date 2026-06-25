import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AcknowledgementBar } from "@/components/cultural/AcknowledgementBar";
import { HubCard } from "@/features/hubs/HubCard";
import { useHubs } from "@/features/hubs/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyProfile } from "@/features/profiles/api";
import { AUSTRALIAN_STATES } from "@/lib/constants";

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: profile } = useMyProfile();
  const [search, setSearch] = useState("");
  const { data: hubs, isLoading, isError } = useHubs(search ? { search } : {});

  return (
    <Screen contentClassName="pt-10">
      {/* Brand + tagline */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text variant="overline" tone="ochre">
          CulturePass Australia
        </Text>
        {isAuthenticated ? (
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => router.push("/create")} hitSlop={8}>
              <Text variant="label" tone="muted">
                Create
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={8}
              accessibilityLabel="Account and settings"
            >
              <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={32} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
            <Text variant="label" tone="ochre">
              Sign in
            </Text>
          </Pressable>
        )}
      </View>

      {/* Hero */}
      <View className="mb-8 mt-6">
        <Text variant="display" className="max-w-prose">
          Discover culture, close to home.
        </Text>
        <Text variant="bodyLarge" tone="muted" className="mt-4 max-w-prose">
          Find communities, events and cultural experiences across Australia —
          grounded in respect for First Nations peoples. Unity in diversity.
        </Text>
      </View>

      {/* Search */}
      <View className="mb-12 flex-row gap-3">
        <View className="flex-1">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search hubs, communities, places…"
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <Button label="Explore" onPress={() => router.push("/explore")} />
      </View>

      {/* Explore by State */}
      <SectionHeader title="Explore by state" subtitle="Eight states & territories" />
      <View className="mb-12 flex-row flex-wrap gap-3">
        {AUSTRALIAN_STATES.map((state) => (
          <Pressable
            key={state.code}
            onPress={() => router.push(`/state/${state.code}`)}
            className="min-w-[150px] flex-1 grow basis-[150px]"
          >
            <Card padded className="active:bg-sand">
              <Text variant="overline" tone="faint">
                {state.code}
              </Text>
              <Text variant="subheading" className="mt-1">
                {state.name}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      {/* Featured hubs */}
      <SectionHeader
        title={search ? "Results" : "Recently added"}
        subtitle={search ? undefined : "Hubs from across the country"}
      />
      <View className="mb-12 gap-4">
        {isLoading ? (
          <Text variant="caption" tone="faint">
            Loading…
          </Text>
        ) : isError ? (
          <Card>
            <Text variant="caption" tone="muted">
              Couldn’t load hubs right now. Pull to refresh once your Supabase
              project is connected.
            </Text>
          </Card>
        ) : hubs && hubs.length > 0 ? (
          hubs.map((hub) => <HubCard key={hub.slug} hub={hub} />)
        ) : (
          <Card>
            <Text variant="subheading">No hubs yet</Text>
            <Text variant="caption" tone="muted" className="mt-1">
              Be the first to create a hub for your community.
            </Text>
            <Button
              label="Create a hub"
              variant="secondary"
              className="mt-4 self-start"
              onPress={() => router.push("/create/hub")}
            />
          </Card>
        )}
      </View>

      {/* Acknowledgement of Country */}
      <AcknowledgementBar className="mb-6" />
    </Screen>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-5">
      <Text variant="heading">{title}</Text>
      {subtitle ? (
        <Text variant="caption" tone="faint" className="mt-1">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
