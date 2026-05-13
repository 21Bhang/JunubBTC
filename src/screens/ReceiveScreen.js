import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Share,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { createInvoice } from "../lib/lnbits";

export default function ReceiveScreen() {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("JunubBTC payment");
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onGenerate() {
    setError(null);
    const sats = parseInt(amount, 10);
    if (!sats || sats <= 0) {
      setError("Enter an amount in sats");
      return;
    }
    setLoading(true);
    try {
      const inv = await createInvoice({ amountSats: sats, memo });
      setInvoice(inv.payment_request);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        {invoice ? (
          <View style={styles.qrWrap}>
            <View style={styles.qrCard}>
              <QRCode value={invoice} size={240} backgroundColor="#fff" />
            </View>
            <Text style={styles.invoice} selectable numberOfLines={3}>
              {invoice}
            </Text>
            <PrimaryButton
              title="Share"
              variant="ghost"
              onPress={() => Share.share({ message: invoice })}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title="New invoice"
              variant="surface"
              onPress={() => setInvoice(null)}
            />
          </View>
        ) : (
          <>
            <Text style={styles.label}>Amount (sats)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="1000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.label}>Memo</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="What's it for?"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ height: spacing.lg }} />
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton title="Generate Invoice" onPress={onGenerate} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, flex: 1 },
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
  },
  qrWrap: { alignItems: "center" },
  qrCard: {
    backgroundColor: "#fff",
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.lg,
  },
  invoice: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  error: { color: colors.danger, marginTop: spacing.sm },
});
