import { useState } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { colors } from "@/lib/theme";
import RNDatePicker from "react-native-date-picker";

export interface DatePickerProps {
  value: string; // ISO string format
  onChange: (date: string) => void;
  label: string;
  mode?: "datetime" | "date" | "time";
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Native (iOS/Android) date/time picker. Uses react-native-date-picker's
 * built-in modal — the `modal` + `open` props are required for the
 * onConfirm/onCancel callbacks to fire. (Web uses DatePicker.web.tsx.)
 */
export function DatePicker({
  value,
  onChange,
  label,
  mode = "datetime",
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : new Date();

  const formattedValue = value
    ? new Date(value).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Select date and time";

  return (
    <View className="gap-2">
      <Text variant="label" className="font-heading">
        {label}
      </Text>
      <Button
        label={formattedValue}
        variant="outline"
        className="h-12 justify-start"
        leftIcon={<Icon name="calendar" size={18} color={colors.inkMuted} />}
        onPress={() => setOpen(true)}
      />

      <RNDatePicker
        modal
        open={open}
        date={date}
        mode={mode}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onConfirm={(selectedDate) => {
          setOpen(false);
          onChange(selectedDate.toISOString());
        }}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}
