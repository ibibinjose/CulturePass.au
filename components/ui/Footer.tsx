import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "./Text";
import { AustralianFlag } from "./AustralianFlag";
import { Pinwheel } from "./Pinwheel";
import { cn } from "@/lib/utils/cn";
import { COMPANY } from "@/lib/company";
import { FOOTER_GROUPS } from "@/lib/navigation";

/**
 * Site footer designed with high-density Swiss typography, deep charcoal ink background,
 * and prominent, respectful Acknowledgement of Country at the heart.
 */
export function Footer({ className }: { className?: string }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  return (
    <View className={cn("gap-6 mt-8", className)}>
      <View className="overflow-hidden rounded-3xl bg-ink p-7 md:p-10 border border-linen/10">
        <View className="gap-9 lg:flex-row lg:justify-between">
          
          {/* Left Block: Acknowledgement of Country */}
          <View className="flex-1 max-w-[600px] gap-4">
            <View className="flex-row gap-1.5">
              <View className="h-1.5 w-6 rounded bg-country-red" />
              <View className="h-1.5 w-6 rounded bg-country-ochre" />
              <View className="h-1.5 w-6 rounded bg-paper/60" />
            </View>
            <Text className="text-[10px] font-heading uppercase tracking-widest text-paper/40">
              Acknowledgement of Country
            </Text>
            <Text className="font-display text-base md:text-lg text-paper leading-7 tracking-tight">
              CulturePass Australia acknowledges the Traditional Custodians of the lands and waters
              across this continent, and pays respect to Elders past and present. Sovereignty was never
              ceded. Always was, always will be Aboriginal land.
            </Text>
          </View>

          {/* Right Block: Brand & Links */}
          <View className="flex-row flex-wrap gap-x-12 gap-y-8 lg:max-w-[480px]">
            {/* Brand summary */}
            <View className="max-w-[220px] gap-3">
              <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-white">
                  <Pinwheel size={20} />
                </View>
                <Text className="font-display text-sm text-paper font-semibold">
                  CulturePass <Text className="text-paper/60">AU</Text>
                </Text>
              </View>
              <Text className="text-[10px] font-sans text-paper/50 leading-4">
                Discover, create and connect through cultural experiences across Australia — with First Nations voices at the centre.
              </Text>
            </View>

            {/* Links Columns */}
            {FOOTER_GROUPS.map((group) => (
              <FooterColumn key={group.title} title={group.title}>
                {group.links.map((link) => (
                  <FooterLink key={link.label} label={link.label} onPress={() => router.push(link.href)} />
                ))}
              </FooterColumn>
            ))}
          </View>
        </View>

        <View className="my-8 h-px w-full bg-paper/10" />

        {/* Bottom Row */}
        <View className="flex-row flex-wrap items-center justify-between gap-4">
          <View className="flex-row items-center gap-3">
            <AustralianFlag width={36} />
            <Text className="font-heading text-xs text-paper/55">
              © {year} {COMPANY.legalName}
            </Text>
          </View>
          <Text className="text-[9px] font-heading uppercase tracking-widest text-country-red">
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
      <Text className="text-[10px] font-heading uppercase tracking-widest text-paper/40">
        {title}
      </Text>
      <View className="gap-2.5">{children}</View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} className="active:opacity-60">
      <Text className="text-xs font-sans text-paper/70">
        {label}
      </Text>
    </Pressable>
  );
}
