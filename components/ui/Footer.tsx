import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "./Text";
import { AustralianFlag } from "./AustralianFlag";
import { cn } from "@/lib/utils/cn";
import { COMPANY } from "@/lib/company";
import { AcknowledgementBar } from "@/components/cultural/AcknowledgementBar";
import { FOOTER_GROUPS } from "@/lib/navigation";

/** Site footer on the exact WhatsApp brand green (#25D366, the `whatsapp` token). */
export function Footer({ className }: { className?: string }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  return (
    <View className={cn("gap-6", className)}>
      <AcknowledgementBar />

      <View className="overflow-hidden rounded-3xl bg-whatsapp p-7 md:p-10">
        <View className="gap-9 md:flex-row md:justify-between">
          {/* Brand */}
          <View className="max-w-[320px] gap-3">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                <Text className="font-display text-sm text-whatsapp">CP</Text>
              </View>
              <Text className="font-display text-lg text-white">
                CulturePass <Text className="font-display text-lg text-white/75">AU</Text>
              </Text>
            </View>
            <Text variant="caption" className="text-white/85">
              Discover, create and connect through cultural experiences across Australia — with First
              Nations voices at the centre. Unity in diversity.
            </Text>
          </View>

          {/* Link columns */}
          <View className="flex-row flex-wrap gap-x-12 gap-y-8">
            {FOOTER_GROUPS.map((group) => (
              <FooterColumn key={group.title} title={group.title}>
                {group.links.map((link) => (
                  <FooterLink key={link.label} label={link.label} onPress={() => router.push(link.href)} />
                ))}
              </FooterColumn>
            ))}
          </View>
        </View>

        <View className="my-7 h-px w-full bg-white/30" />

        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-row items-center gap-2.5">
            <AustralianFlag width={40} />
            <Text className="font-heading text-sm text-white">
              © {year} {COMPANY.legalName}
            </Text>
          </View>
          <Text variant="overline" className="text-white/85">
            Always was, always will be Aboriginal land
          </Text>
        </View>
      </View>
    </View>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="overline" className="text-white/90">
        {title}
      </Text>
      <View className="gap-2.5">{children}</View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} className="active:opacity-60">
      <Text variant="label" className="text-white/85">
        {label}
      </Text>
    </Pressable>
  );
}
