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
    <View className={cn("rounded-lg bg-country-black px-5 py-5", className)}>
      <View className="mb-3 flex-row gap-1.5">
        <View className="h-1.5 w-6 rounded-pill bg-country-red" />
        <View className="h-1.5 w-6 rounded-pill bg-country-ochre" />
        <View className="h-1.5 w-6 rounded-pill bg-paper/80" />
      </View>
      <Text variant="overline" className="text-paper/60">
        Acknowledgement of Country
      </Text>
      <Text variant="body" className="mt-2 text-paper/90">
        CulturePass Australia acknowledges the Traditional Custodians of the lands and waters
        across this continent, and pays respect to Elders past and present. Sovereignty was never
        ceded. Always was, always will be Aboriginal land.
      </Text>
    </View>
  );
}
