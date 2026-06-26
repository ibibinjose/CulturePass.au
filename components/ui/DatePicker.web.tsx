import type { ChangeEvent } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import type { DatePickerProps } from "./DatePicker";

const INPUT_TYPE: Record<NonNullable<DatePickerProps["mode"]>, string> = {
  datetime: "datetime-local",
  date: "date",
  time: "time",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO string → the local value an <input type="datetime-local|date|time"> expects. */
function toInputValue(value: string, mode: NonNullable<DatePickerProps["mode"]>): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (mode === "date") return date;
  if (mode === "time") return time;
  return `${date}T${time}`;
}

/**
 * Web date/time picker. react-native-date-picker is native-only, so on web we
 * fall back to the platform's own <input>. Keeps the same ISO-string contract.
 */
export function DatePicker({
  value,
  onChange,
  label,
  mode = "datetime",
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!v) {
      onChange("");
      return;
    }
    const parsed = new Date(v);
    onChange(Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString());
  };

  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      <input
        type={INPUT_TYPE[mode]}
        value={toInputValue(value, mode)}
        min={minimumDate ? toInputValue(minimumDate.toISOString(), mode) : undefined}
        max={maximumDate ? toInputValue(maximumDate.toISOString(), mode) : undefined}
        onChange={handleChange}
        style={{
          fontFamily: "inherit",
          fontSize: 16,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #E7E0D6",
          backgroundColor: "#FFFFFF",
          color: "#1C1A17",
        }}
      />
    </View>
  );
}
