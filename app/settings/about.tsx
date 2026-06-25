import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

import { Screen, Text, Button, Card, ListRow, Divider } from "@/components/ui";
import { AcknowledgementBar } from "@/components/cultural/AcknowledgementBar";

const SITE = "https://culturepass.au";
const LINKS = [
  { title: "Privacy policy", url: `${SITE}/privacy` },
  { title: "Terms of use", url: `${SITE}/terms` },
  { title: "Contact & support", url: `${SITE}/support` },
];

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

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
        About
      </Text>
      <Text variant="title" className="mt-2">
        CulturePass Australia
      </Text>
      <Text variant="body" tone="muted" className="mt-3">
        Discover communities, events and cultural experiences across Australia —
        grounded in respect for First Nations peoples. Unity in diversity.
      </Text>

      <AcknowledgementBar className="mt-8" />

      <Text variant="overline" tone="faint" className="mb-1 mt-8">
        Legal
      </Text>
      <Card className="px-5 py-1">
        {LINKS.map((link, i) => (
          <View key={link.title}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={link.title} onPress={() => Linking.openURL(link.url)} />
          </View>
        ))}
      </Card>

      <View className="mt-8 items-center">
        <Text variant="caption" tone="faint">
          Version {version}
        </Text>
      </View>
    </Screen>
  );
}
