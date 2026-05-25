import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowUpRight,
  Receipt,
  Store,
  QrCode,
  CheckCircle2,
} from "lucide-react-native";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { getWallet, listPayments } from "../lib/lnbits";
import { isCompletedPayment } from "../lib/payments";
import { makeAnonToken } from "../lib/fees";
import { formatSats, formatSsp, satsToSsp } from "../lib/conversion";

// SSP per 1 BTC (i.e. how many South Sudanese Pounds 1 BTC is worth).
const SSP_PER_BTC = Number(process.env.EXPO_PUBLIC_SSP_PER_BTC || 400_000_000);

export default function HomeScreen({ navigation }) {
  const [showSsp, setShowSsp] = useState(false);
  const [balanceSats, setBalanceSats] = useState(0);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const wallet = await getWallet();
      // LNbits returns balance in millisats
      setBalanceSats(Math.floor((wallet?.balance || 0) / 1000));
      const payments = await listPayments({ limit: 5 });
      setTxs(Array.isArray(payments) ? payments : []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sspValue = useMemo(
    () => satsToSsp(balanceSats, SSP_PER_BTC),
    [balanceSats],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.brand}>JunubBTC</Text>

        <Pressable
          onPress={() => setShowSsp((v) => !v)}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Balance</Text>
          {showSsp ? (
            <Text style={styles.balanceValue}>SSP {formatSsp(sspValue)}</Text>
          ) : (
            <Text style={styles.balanceValue}>
              {formatSats(balanceSats)} sats
            </Text>
          )}
          <Text style={styles.balanceHint}>tap to toggle</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Pay with Bitcoin</Text>
        <View style={styles.tileGrid}>
          <ActionTile
            color="#3DDC97"
            Icon={ArrowUpRight}
            title="Send Money"
            subtitle="To MoMo / mGURUSH"
            onPress={() => navigation.navigate("SendMoney")}
          />
          <ActionTile
            color="#F2A900"
            Icon={Receipt}
            title="Pay Bill"
            subtitle="Paybill + account"
            onPress={() => navigation.navigate("PayBill")}
          />
          <ActionTile
            color="#5BC0EB"
            Icon={Store}
            title="Buy Goods"
            subtitle="Till number"
            onPress={() => navigation.navigate("BuyGoods")}
          />
          <ActionTile
            color="#B388FF"
            Icon={QrCode}
            title="Scan QR"
            subtitle="Merchant code"
            onPress={() => navigation.navigate("Scan")}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => navigation.navigate("History")}>
            <Text style={styles.linkText}>View all</Text>
          </Pressable>
        </View>
        {(() => {
          // Only show real, completed transactions. Pending, cancelled,
          // expired, or failed invoices are filtered out entirely so the
          // user never sees a payment that didn't actually go through.
          const settled = (txs || []).filter(isCompletedPayment);
          if (settled.length === 0) {
            return (
              <Text style={styles.muted}>No completed transactions yet.</Text>
            );
          }
          return settled.slice(0, 5).map((t) => {
            const incoming = (t.amount || 0) > 0;
            const token = makeAnonToken(t.payment_hash || t.checking_id);
            return (
              <View key={t.payment_hash || t.checking_id} style={styles.txRow}>
                <View style={styles.txIconWrap}>
                  <CheckCircle2 size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txMemo} numberOfLines={1}>
                    {incoming ? "Received" : "Sent"} · {token}
                  </Text>
                  <Text style={[styles.muted, { color: colors.success }]}>
                    Success
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: incoming ? colors.success : colors.text },
                  ]}
                >
                  {incoming ? "+" : ""}
                  {formatSats(Math.round((t.amount || 0) / 1000))} sats
                </Text>
              </View>
            );
          });
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionTile({ color, Icon, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: color, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color }]}>
        <Icon size={20} color="#0B0E14" strokeWidth={2.5} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub} numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  brand: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  balanceValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  balanceHint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  action: { flex: 1 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txMemo: { color: colors.text, fontSize: 14, fontWeight: "600" },
  txAmount: { fontSize: 14, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, marginBottom: spacing.md },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
    marginBottom: spacing.md,
  },
  tile: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: "space-between",
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  tileIconText: { color: "#0B0E14", fontSize: 18, fontWeight: "900" },
  tileTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  tileSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
