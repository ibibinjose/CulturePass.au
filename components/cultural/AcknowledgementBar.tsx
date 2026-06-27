import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils/cn";

/**
 * Acknowledgement of Country — shown app-wide (footer / home).
 *
 * An *Acknowledgement* of Country can be offered by anyone, recognising the
 * Traditional Custodians of the land. A *Welcome to Country* is different — it
 * is offered BY Traditional Owners and appears per-hub via <WelcomeToCountry>.
 *
 * The three ochre/red/black marks reference First Nations flags and are used
 * only on sanctioned cultural surfaces, never as decoration elsewhere.
 */
export function AcknowledgementBar({ className }: { className?: string }) {
  return (
    <View className={cn("rounded-3xl bg-country-black px-6 py-7 md:px-8", className)}>
      <View className="mb-3.5 flex-row gap-1.5">
        <View className="h-2 w-7 rounded-pill bg-country-red" />
        <View className="h-2 w-7 rounded-pill bg-country-ochre" />
        <View className="h-2 w-7 rounded-pill bg-paper/80" />
      </View>
      <Text variant="overline" className="text-paper/60">
        Acknowledgement of Country
      </Text>
      <Text variant="bodyLarge" className="mt-2.5 max-w-[680px] leading-7 text-paper/90">
        CulturePass Australia acknowledges the Traditional Custodians of the lands and waters
        across this continent, and pays respect to Elders past and present. Sovereignty was never
        ceded. Always was, always will be Aboriginal land.
      </Text>
    </View>
  );
}
