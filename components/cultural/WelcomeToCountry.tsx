import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils/cn";

interface WelcomeToCountryProps {
  /** The hub's Welcome to Country / acknowledgement statement. */
  statement?: string | null;
  /** Traditional Custodian groups for this place. */
  custodians?: string[] | null;
  className?: string;
}

/**
 * Prominent Welcome to Country block for hub pages — placed high on the page,
 * before the fold, as a sign of respect. Renders nothing if there's nothing to
 * show, so it never displays an empty cultural surface.
 */
export function WelcomeToCountry({ statement, custodians, className }: WelcomeToCountryProps) {
  const hasCustodians = custodians && custodians.length > 0;
  if (!statement && !hasCustodians) return null;

  return (
    <View
      className={cn(
        "rounded-xl border border-eucalyptus-100 bg-eucalyptus-50 px-6 py-6",
        className,
      )}
    >
      <Text variant="overline" tone="eucalyptus">
        {statement ? "Welcome to Country" : "Traditional Custodians"}
      </Text>

      {hasCustodians ? (
        <Text variant="subheading" className="mt-2 text-eucalyptus-700">
          {custodians.join(" • ")}
        </Text>
      ) : null}

      {statement ? (
        <Text variant="bodyLarge" className="mt-3 leading-7 text-ink">
          {statement}
        </Text>
      ) : null}
    </View>
  );
}
