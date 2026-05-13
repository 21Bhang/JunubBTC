import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "./PrimaryButton";
import {
  sspToSats,
  formatSats,
  formatSsp,
  validateSspAmount,
  SSP_MIN,
  SSP_MAX,
} from "../lib/conversion";
import { getSspPerBtc } from "../lib/rate";
import { createPayout } from "../lib/bridge";
import { openInExternalWallet } from "../lib/walletLink";

/**
 * Re-usable BTC -> SSP payment form.
 *
 * Props:
 *   title         string  Screen header
 *   subtitle      string
 *   accent        string  Accent color for the icon badge / button highlight
 *   Icon          React component  Lucide icon component (e.g. ArrowUpRight)
 *   fields        Array<{
 *                   key: string,            // state key
 *                   label: string,
 *                   placeholder: string,
 *                   keyboardType?: string,
 *                   autoCapitalize?: string,
 *                   validate?: (v) => boolean,
 *                   errorText?: string,
 *                 }>
 *   buildPayoutParams(values) => object passed to createPayout
 *   navigation    react-navigation
 *   ctaTitle      string  e.g. "Pay with Lightning"
 *   summaryLines(values, sats, rate) => Array<{label, value}>  (optional)
 */
export default function BtcPaymentForm({
  title,
  subtitle,
  accent = colors.primary,
  icon: IconCmp,
  fields,
  buildPayoutParams,
  navigation,
  ctaTitle = "Pay with my Lightning wallet",
  summaryLines,
}) {
  const initial = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, ""])),
    [fields],
  );
  const [values, setValues] = useState(initial);
  const [rate, setRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    refreshRate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshRate(force) {
    setRateLoading(true);
    try {
      setRate(await getSspPerBtc({ force }));
    } finally {
      setRateLoading(false);
    }
  }

  function setField(k, v) {
    setValues((s) => ({ ...s, [k]: v }));
  }

  const sspKey = fields.find((f) => f.key.toLowerCase().includes("ssp"))?.key;
  const sspAmount = sspKey ? values[sspKey] : "";
  const sats = useMemo(() => {
    if (!rate) return 0;
    return sspToSats(sspAmount, rate.sspPerBtc);
  }, [sspAmount, rate]);

  function validate() {
    for (const f of fields) {
      const v = (values[f.key] || "").trim();
      if (!v) {
        Alert.alert(f.label, `Please enter ${f.label.toLowerCase()}.`);
        return false;
      }
      if (f.validate && !f.validate(v)) {
        Alert.alert(
          f.label,
          f.errorText || `Invalid ${f.label.toLowerCase()}.`,
        );
        return false;
      }
    }
    if (sspKey) {
      const check = validateSspAmount(values[sspKey]);
      if (!check.ok) {
        Alert.alert("Amount", check.error);
        return false;
      }
    }
    if (!rate || !sats) {
      Alert.alert("Rate", "Live rate not loaded yet. Try again.");
      return false;
    }
    return true;
  }

  async function onPay() {
    if (!validate()) return;
    setBusy(true);
    setStatus("Creating invoice…");
    try {
      const payout = await createPayout(buildPayoutParams(values));
      setStatus("Opening your Lightning wallet…");
      const opened = await openInExternalWallet(payout.invoice);
      if (!opened) {
        Alert.alert(
          "No Lightning wallet detected",
          "Install Phoenix, Wallet of Satoshi, Muun, Strike, Zeus or similar — then try again.",
        );
        setBusy(false);
        setStatus("");
        return;
      }
      Haptics.selectionAsync();
      navigation.navigate("Processing", {
        payout,
        summary: summaryLines ? summaryLines(values, payout.sats, rate) : null,
        sspAmount: Number(sspAmount || 0),
      });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Could not start payment", e.message || String(e));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: accent }]}>
            {IconCmp ? (
              <IconCmp size={22} color="#0B0E14" strokeWidth={2.5} />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.rateCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rateLabel}>Live rate</Text>
            {rate ? (
              <>
                <Text style={styles.rateValue}>
                  SSP {formatSsp(rate.sspPerBtc)} / BTC
                </Text>
                <Text style={styles.rateMeta}>
                  {rate.btcUsd
                    ? `BTC $${formatSsp(rate.btcUsd)}`
                    : "offline rate"}
                </Text>
              </>
            ) : (
              <Text style={styles.rateMeta}>loading…</Text>
            )}
          </View>
          <Pressable
            onPress={() => refreshRate(true)}
            style={styles.refreshBtn}
            disabled={rateLoading}
          >
            <Text style={[styles.refreshBtnText, { color: accent }]}>
              {rateLoading ? "…" : "↻"}
            </Text>
          </Pressable>
        </View>

        {fields.map((f) => (
          <View key={f.key}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              value={values[f.key]}
              onChangeText={(v) => setField(f.key, v)}
              placeholder={f.placeholder}
              placeholderTextColor={colors.muted}
              keyboardType={f.keyboardType || "default"}
              autoCapitalize={f.autoCapitalize || "none"}
              autoCorrect={false}
              style={styles.input}
            />
          </View>
        ))}

        {sspAmount && rate ? (
          <Text style={styles.hint}>
            ≈ {formatSats(sats)} sats at SSP {formatSsp(rate.sspPerBtc)} / BTC
          </Text>
        ) : null}

        <Text style={styles.limitHint}>
          Min SSP {SSP_MIN} · Max SSP {SSP_MAX.toLocaleString("en-US")} per
          transaction
        </Text>

        <View style={{ height: spacing.lg }} />

        {busy ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent} />
            {status ? <Text style={styles.statusText}>{status}</Text> : null}
          </View>
        ) : (
          <>
            <PrimaryButton title={ctaTitle} onPress={onPay} />
            <Text style={styles.footer}>
              Your phone will offer to open Phoenix, Wallet of Satoshi, Muun,
              Strike, Zeus, Breez, Alby or any other installed Lightning wallet.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: { fontSize: 22, fontWeight: "900", color: "#0B0E14" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  sub: { color: colors.muted, marginTop: 2 },
  rateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rateLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1 },
  rateValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  rateMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnText: { fontSize: 18, fontWeight: "800" },
  label: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    minHeight: 48,
  },
  hint: { color: colors.muted, marginTop: spacing.sm, fontSize: 12 },
  limitHint: {
    color: colors.muted,
    marginTop: spacing.xs || 6,
    fontSize: 11,
    fontStyle: "italic",
  },
  center: { alignItems: "center", justifyContent: "center" },
  statusText: { color: colors.muted, marginTop: spacing.sm },
  footer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
