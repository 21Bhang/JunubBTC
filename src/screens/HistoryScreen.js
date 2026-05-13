import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react-native";
import { colors, radius, spacing } from "../theme";
import { listPayments } from "../lib/lnbits";
import { formatSats, formatTxDate } from "../lib/conversion";

/**
 * Transaction history / audit log.
 *
 * Only transactions that actually went through are listed. Pending,
 * cancelled, expired, or failed invoices are filtered out completely — they
 * never appear in history. This guarantees the screen is a clean record of
 * real, settled payments only.
 */
export default function HistoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPayments({ limit: 50 });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    return items
      .filter(isCompleted)
      .slice()
      .sort((a, b) => (b.time || 0) - (a.time || 0));
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Completed transactions</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={visible}
        keyExtractor={(t, i) => t.payment_hash || t.checking_id || String(i)}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.muted}>No completed transactions yet.</Text>
        }
        renderItem={({ item }) => <Row item={item} />}
      />
    </SafeAreaView>
  );
}

/**
 * A transaction counts as "completed" only if it actually settled on the
 * Lightning network. Pending, cancelled, expired, or failed invoices are
 * excluded.
 */
function isCompleted(t) {
  if (!t) return false;
  if (t.pending === true) return false;
  if (t.paid === false) return false;
  if (t.status === "failed" || t.status === "expired") return false;
  // LNbits marks settled invoices with paid=true OR status="success".
  // Some shapes omit both flags but include a preimage; treat those as paid.
  if (t.paid === true) return true;
  if (t.status === "success") return true;
  if (t.preimage && t.preimage !== "0".repeat(64)) return true;
  return false;
}

function Row({ item }) {
  const incoming = (item.amount || 0) > 0;
  const sats = Math.round((item.amount || 0) / 1000);
  const tsLabel = formatTxDate(item.time);
  const DirIcon = incoming ? ArrowDownLeft : ArrowUpRight;

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <DirIcon
          size={18}
          color={incoming ? colors.success : colors.text}
          strokeWidth={2.5}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memo} numberOfLines={1}>
          {item.memo || (incoming ? "Received" : "Sent")}
        </Text>
        <View style={styles.metaRow}>
          <CheckCircle2 size={14} color={colors.success} />
          <Text style={[styles.metaText, { color: colors.success }]}>
            Success
          </Text>
          {tsLabel ? <Text style={styles.metaText}> · {tsLabel}</Text> : null}
        </View>
        {item.payment_hash ? (
          <Text style={styles.hash} numberOfLines={1}>
            {item.payment_hash}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.amount,
          { color: incoming ? colors.success : colors.text },
        ]}
      >
        {incoming ? "+" : ""}
        {formatSats(sats)} sats
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  memo: { color: colors.text, fontSize: 14, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: { color: colors.muted, fontSize: 11 },
  hash: { color: colors.muted, fontSize: 10, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: "800" },
  muted: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
