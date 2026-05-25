import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import { formatSsp } from "../lib/conversion";
import { getSspPerBtc } from "../lib/rate";

const SSP_PER_BTC_OVERRIDE =
  process.env.EXPO_PUBLIC_SSP_PER_BTC || "(live feed)";
const SSP_PER_USD = process.env.EXPO_PUBLIC_SSP_PER_USD || "5200";
const LNBITS_URL = process.env.EXPO_PUBLIC_LNBITS_URL || "(not set)";
const BRIDGE_URL = process.env.EXPO_PUBLIC_BRIDGE_URL || "(demo mode)";

export default function SettingsScreen() {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadRate(force) {
    setLoading(true);
    try {
      setRate(await getSspPerBtc({ force }));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRate(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Live exchange rate</Text>
        <Row
          label="BTC / USD"
          value={
            rate?.btcUsd
              ? `$${formatSsp(rate.btcUsd)}`
              : loading
                ? "loading…"
                : "—"
          }
        />
        <Row label="SSP per USD" value={`SSP ${SSP_PER_USD}`} />
        <Row
          label="SSP per BTC"
          value={
            rate
              ? `SSP ${formatSsp(rate.sspPerBtc)}`
              : loading
                ? "loading…"
                : "—"
          }
        />
        <Row label="Source" value={rate?.source || "—"} />
        <Text style={styles.section}>Privacy</Text>
        <Text style={styles.helpText}>
          Sender and recipient names are never displayed. Every transaction uses
          opaque reference tokens (JBT-XXXXXX) so both sides can reconcile
          without revealing phone numbers, accounts, or names.
        </Text>

        <Text style={styles.section}>Backend</Text>
        <Row label="LNbits URL" value={LNBITS_URL} />
        <Row label="Bridge URL" value={BRIDGE_URL} />
        <Row label="SSP/BTC override" value={SSP_PER_BTC_OVERRIDE} />

        <Text style={styles.section}>About</Text>
        <Row label="App" value="JunubBTC v1.0.0" />
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
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
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
    textAlign: "right",
  },
  helpText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
});
