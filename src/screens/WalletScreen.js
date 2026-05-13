import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import { listPayments } from "../lib/lnbits";
import { formatSats, formatTxDate } from "../lib/conversion";

export default function WalletScreen() {
  const [txs, setTxs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    listPayments({ limit: 50 })
      .then((p) => setTxs(Array.isArray(p) ? p : []))
      .catch((e) => setError(e.message || String(e)));
  }, []);

  // Only completed payments. Pending / cancelled / expired / failed are hidden.
  const completed = txs.filter((t) => {
    if (!t) return false;
    if (t.pending === true) return false;
    if (t.paid === false) return false;
    if (t.status === "failed" || t.status === "expired") return false;
    if (t.paid === true) return true;
    if (t.status === "success") return true;
    if (t.preimage && t.preimage !== "0".repeat(64)) return true;
    return false;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Transactions</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {completed.length === 0 && !error ? (
          <Text style={styles.muted}>No completed transactions yet.</Text>
        ) : (
          completed.map((t) => (
            <View key={t.payment_hash || t.checking_id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memo} numberOfLines={1}>
                  {t.memo || (t.amount > 0 ? "Received" : "Sent")}
                </Text>
                <Text style={styles.muted}>
                  Success
                  {t.time ? ` • ${formatTxDate(t.time)}` : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  { color: t.amount > 0 ? colors.success : colors.text },
                ]}
              >
                {t.amount > 0 ? "+" : ""}
                {formatSats(Math.round((t.amount || 0) / 1000))}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memo: { color: colors.text, fontSize: 14, fontWeight: "600" },
  amount: { fontSize: 14, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
