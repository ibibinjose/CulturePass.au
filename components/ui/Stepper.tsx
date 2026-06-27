import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { Text } from "./Text";

interface StepperProps {
  steps: readonly string[];
  current: number;
  className?: string;
}

/** Minimal step progress: a row of bars + "Step n of m — Label". */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <View className={cn("gap-2.5", className)}>
      <View className="flex-row gap-1.5">
        {steps.map((label, i) => (
          <View
            key={label}
            className={cn(
              "h-1.5 flex-1 rounded-pill",
              i < current ? "bg-ink" : i === current ? "bg-ochre-500" : "bg-linen",
            )}
          />
        ))}
      </View>
      <Text variant="overline" tone="muted">
        Step {current + 1} of {steps.length} — {steps[current]}
      </Text>
    </View>
  );
}
