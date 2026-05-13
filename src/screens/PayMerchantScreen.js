import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { sspToSats, formatSats, formatSsp } from "../lib/conversion";
import { getSspPerBtc } from "../lib/rate";
import { createPayout } from "../lib/bridge";
import { parseMerchantCode } from "../lib/merchantUri";
import { openInExternalWallet } from "../lib/walletLink";

/**
 * Non-custodial remittance bridge: phone+bill+SSP -> backend mints a Lightning
 * invoice -> we deep-link the user's existing Lightning wallet to pay it ->
 * processing screen polls the bridge for settlement and triggers the local
 * mobile-money payout.
 */
export default function PayMerchantScreen({ route, navigation }) {
  const [phone, setPhone] = useState("");
  const [billNo, setBillNo] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [sspAmount, setSspAmount] = useState("");
  const [rate, setRate] = useState(null); // { sspPerBtc, btcUsd, source }
  const [rateLoading, setRateLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Apply scanned merchant QR if present.
  useEffect(() => {
    const raw = route?.params?.scanned;
    if (!raw) return;
    const parsed = parseMerchantCode(raw);
    if (parsed.kind === "merchant") {
      if (parsed.merchantId) setMerchantId(parsed.merchantId);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.billNo) setBillNo(parsed.billNo);
      if (parsed.sspAmount) setSspAmount(String(parsed.sspAmount));
    } else if (parsed.kind === "phone") {
      setPhone(parsed.phone);
    } else if (parsed.kind === "unknown") {
      Alert.alert(
        "Unsupported QR",
        "Scan a JunubBTC merchant QR or enter a phone number manually.",
      );
    }
  }, [route?.params?.scanned]);

  async function refreshRate(force = false) {
    setRateLoading(true);
    try {
      const r = await getSspPerBtc({ force });
      setRate(r);
    } finally {
      setRateLoading(false);
    }
  }

  useEffect(() => {
    refreshRate(false);
  }, []);

  const sats = useMemo(() => {
    if (!rate) return 0;
    return sspToSats(sspAmount, rate.sspPerBtc);
  }, [sspAmount, rate]);

  function validate() {
    if (!/^\+?[0-9][0-9\s-]{6,}$/.test(phone.trim())) {
      Alert.alert("Phone required", "Enter the recipient phone number.");
      return false;
    }
    if (!billNo.trim()) {
      Alert.alert("Bill number", "Enter a bill or reference number.");
      return false;
    }
    const n = Number(sspAmount);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Amount", "Enter the amount in SSP.");
      return false;
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
      const payout = await createPayout({
        phone: phone.trim(),
        billNo: billNo.trim(),
        sspAmount: Number(sspAmount),
        merchantId: merchantId || undefined,
      });
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
        phone: phone.trim(),
        billNo: billNo.trim(),
        sspAmount: Number(sspAmount),
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
        <Text style={styles.title}>Pay with Bitcoin → SSP</Text>
        <Text style={styles.sub}>
          We never hold your BTC. We just bridge your wallet to local mobile
          money.
        </Text>

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
                  {" · "}
                  {rate.source === "env-override"
                    ? "fixed"
                    : rate.source === "offline-fallback"
                      ? "fallback"
                      : "live"}
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
            <Text style={styles.refreshBtnText}>{rateLoading ? "…" : "↻"}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Recipient phone (mGURUSH / MoMo)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+211 9XX XXX XXX"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Bill / reference number</Text>
        <View style={styles.qrRow}>
          <TextInput
            value={billNo}
            onChangeText={setBillNo}
            placeholder="e.g. INV-00421"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable
            onPress={() =>
              navigation.navigate("Scan", { returnTo: "PayMerchant" })
            }
            style={styles.scanBtn}
          >
            <Text style={styles.scanBtnText}>Scan QR</Text>
          </Pressable>
        </View>
        {merchantId ? (
          <Text style={styles.hint}>Merchant ID: {merchantId}</Text>
        ) : null}

        <Text style={styles.label}>Amount (SSP)</Text>
        <TextInput
          value={sspAmount}
          onChangeText={setSspAmount}
          placeholder="5000"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {sspAmount && rate ? (
          <Text style={styles.hint}>
            ≈ {formatSats(sats)} sats at SSP {formatSsp(rate.sspPerBtc)} / BTC
          </Text>
        ) : null}

        <View style={{ height: spacing.lg }} />

        {busy ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            {status ? <Text style={styles.statusText}>{status}</Text> : null}
          </View>
        ) : (
          <>
            <PrimaryButton
              title="Pay with my Lightning wallet"
              onPress={onPay}
            />
            <Text style={styles.footer}>
              Your phone will offer to open Phoenix, Wallet of Satoshi, Muun,
              Strike, Zeus, Breez, Alby or any other installed Lightning wallet.
              Settlement lands here in milliseconds.
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  sub: {
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
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
  refreshBtnText: { color: colors.primary, fontSize: 18, fontWeight: "800" },
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
  qrRow: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  scanBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnText: { color: "#0B0E14", fontWeight: "800" },
  hint: { color: colors.muted, marginTop: spacing.sm, fontSize: 12 },
  center: { alignItems: "center", justifyContent: "center" },
  statusText: { color: colors.muted, marginTop: spacing.sm },
  footer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
