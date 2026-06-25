import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { OptionCard } from "@/components/ui/OptionCard";
import { Button } from "@/components/ui/Button";

export default function CreateChooser() {
  const router = useRouter();

  return (
    <Screen maxWidth="form" contentClassName="pt-10">
      <Button
        label="← Back"
        variant="ghost"
        size="sm"
        className="mb-6 self-start"
        onPress={() => router.back()}
      />

      <Text variant="overline" tone="ochre">
        Create
      </Text>
      <Text variant="title" className="mt-2">
        What would you like to create?
      </Text>
      <Text variant="body" tone="muted" className="mt-3">
        Start a Hub for a community, council, organisation or venue — or set up a
        public professional profile.
      </Text>

      <View className="mt-8 gap-4">
        <OptionCard
          title="A Hub"
          description="An organiser page for a community, council, organisation, club, venue, business or wellness practice."
          onPress={() => router.push("/create/hub")}
        />
        <OptionCard
          title="A Professional Public Profile"
          description="A public page for an artist, leader, founder, educator or practitioner."
          onPress={() => router.push("/create/professional")}
        />
      </View>
    </Screen>
  );
}
