import { useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import DateTimePicker from "react-native-date-picker";

interface DatePickerProps {
  value: string; // ISO string format
  onChange: (date: string) => void;
  label: string;
  mode?: "datetime" | "date" | "time";
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  label,
  mode = "datetime",
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [date, setDate] = useState<Date>(value ? new Date(value) : new Date());
  const [open, setOpen] = useState(false);
  
  // Update local date when value prop changes
  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    }
  }, [value]);

  const handleConfirm = (selectedDate: Date) => {
    setDate(selectedDate);
    onChange(selectedDate.toISOString());
    setOpen(false);
  };

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
      <Text variant="label">{label}</Text>
      <Button
        label={formattedValue}
        variant="outline"
        className="py-4"
        onPress={() => setOpen(true)}
      />
      
      {/* Native date/time picker for iOS/Android */}
      {(Platform.OS === "ios" || Platform.OS === "android") && open && (
        <DateTimePicker
          date={date}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onConfirm={(selectedDate) => {
            handleConfirm(selectedDate);
          }}
          onCancel={() => setOpen(false)}
        />
      )}

      {/* Fallback for web */}
      {Platform.OS === "web" && open && (
        <View className="absolute top-full left-0 right-0 z-10 mt-2 p-4 bg-card rounded-xl shadow-lg border border-linen">
          <DateTimePicker
            date={date}
            mode={mode}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onConfirm={(selectedDate) => {
              handleConfirm(selectedDate);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
          <View className="flex-row justify-end gap-2 mt-3">
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      )}
    </View>
  );
}