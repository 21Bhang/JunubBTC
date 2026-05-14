import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import { FEE_TIERS, SATS_MAX, SATS_MIN } from "../lib/fees";
import { formatSsp, formatSats } from "../lib/conversion";
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
        <Pressable
          style={styles.refreshBtn}
          onPress={() => loadRate(true)}
          disabled={loading}
        >
          <Text style={styles.refreshBtnText}>
            {loading ? "Refreshing…" : "Refresh rate"}
          </Text>
        </Pressable>

        <Text style={styles.section}>JunubBTC fee schedule</Text>
        <Text style={styles.helpText}>
          Per-transaction service fee. JunubBTC never custodies your sats — the
          fee is added to your Lightning invoice and routed by the bridge to
          JunubBTC's bank account.
        </Text>
        {FEE_TIERS.map((t) => (
          <View key={t.min} style={styles.feeRow}>
            <Text style={styles.feeRange}>
              {formatSats(t.min)} – {formatSats(t.max)} sats
            </Text>
            <Text style={styles.feeAmount}>{formatSats(t.fee)} sats</Text>
          </View>
        ))}
        <Text style={styles.helpText}>
          Min transfer: {SATS_MIN} sats · Max transfer:{" "}
          {SATS_MAX.toLocaleString("en-US")} sats per transaction.
        </Text>

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
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feeRange: { color: colors.text, fontSize: 13 },
  feeAmount: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  helpText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  refreshBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: (radius && radius.sm) || 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  refreshBtnText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
});
