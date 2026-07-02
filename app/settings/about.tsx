import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Constants from "expo-constants";

import { Screen, Text, BackButton, Card, ListRow, Divider } from "@/components/ui";
import { AcknowledgementBar } from "@/components/cultural/AcknowledgementBar";
import { COMPANY } from "@/lib/company";

const LINKS: { title: string; href: Href }[] = [
  { title: "Privacy policy", href: "/legal/privacy" },
  { title: "Terms of use", href: "/legal/terms" },
  { title: "Contact & support", href: "/legal/contact" },
];

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen maxWidth="form" contentClassName="pt-6">
      <BackButton fallbackHref="/settings" className="mb-5" />

      <Text variant="overline" tone="pink">
        About
      </Text>
      <Text variant="title" className="mt-2">
        CulturePass Australia
      </Text>
      <Text variant="lead" className="mt-3">
        Discover communities, events and cultural experiences across Australia —
        grounded in respect for First Nations peoples. Unity in diversity.
      </Text>

      <Text className="mt-4 text-[10px] font-sans italic text-ink-muted">
        “{COMPANY.founderQuote.text}” — {COMPANY.founderQuote.author}
      </Text>

      <AcknowledgementBar className="mt-8" />

      <Text variant="overline" tone="pink" className="mb-2 mt-8">
        Legal
      </Text>
      <Card padded={false} className="px-5">
        {LINKS.map((link, i) => (
          <View key={link.title}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={link.title} onPress={() => router.push(link.href)} />
          </View>
        ))}
      </Card>

      <View className="mt-8 items-center gap-1">
        <Text variant="caption" tone="faint">
          {COMPANY.legalName}
        </Text>
        <Text variant="caption" tone="faint">
          Version {version}
        </Text>
      </View>
    </Screen>
  );
}
