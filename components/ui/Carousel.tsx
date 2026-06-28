import React from "react";
import { ScrollView } from "react-native";

export function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 pr-4"
      className="-mx-gutter px-gutter"
    >
      {children}
    </ScrollView>
  );
}
