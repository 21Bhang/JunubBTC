import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

const BTC_PER_SSP = process.env.EXPO_PUBLIC_BTC_PER_SSP || "400000000";
const LNBITS_URL = process.env.EXPO_PUBLIC_LNBITS_URL || "(not set)";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Backend</Text>
        <Row label="LNbits URL" value={LNBITS_URL} />

        <Text style={styles.section}>Local Rate</Text>
        <Row label="BTC per SSP" value={BTC_PER_SSP} />

        <Text style={styles.section}>About</Text>
        <Row label="App" value="JunubBTC v0.1.0" />
        <Row label="Network" value="Bitcoin Lightning" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  section: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 14 },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
  },
});
