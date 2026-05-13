import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";

export default function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  style,
}) {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "ghost"
        ? "transparent"
        : colors.surface;
  const fg = variant === "primary" ? "#0B0E14" : colors.text;
  const border = variant === "ghost" ? colors.border : "transparent";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
