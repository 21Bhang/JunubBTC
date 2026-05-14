import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { getPayout } from "../lib/bridge";
import { CheckCircle2 } from "lucide-react-native";
import { openInExternalWallet } from "../lib/walletLink";
import { formatSats, formatSsp } from "../lib/conversion";

/**
 * Processing screen — poll the bridge until the Lightning invoice is settled,
 * then flip to a bright green "Payment Successful" state the millisecond it
 * clears (per the 20ms-feel spec). Payout SMS may follow seconds later; we
 * surface its status without blocking the success UI.
 *
 * route.params: {
 *   payout: { id, invoice, sats },
 *   summary?: Array<{label, value}>,   // generic receipt rows
 *   phone?, billNo?, sspAmount?,       // legacy fields (still supported)
 * }
 */
export default function ProcessingScreen({ route, navigation }) {
  const { payout, summary, sspAmount } = route.params || {};
  const [state, setState] = useState("waiting"); // waiting | paid | expired | failed
  const [payoutStatus, setPayoutStatus] = useState(null);
  const [settledMs, setSettledMs] = useState(null);
  const [error, setError] = useState(null);
  const createdAt = useRef(Date.now()).current;
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);
  // Track the current terminal state via a ref so the long-lived polling
  // closure can read fresh values without being recreated.
  const stateRef = useRef("waiting");
  // Guard against overlapping polls when the network is slow.
  const inFlightRef = useRef(false);
  const pollCountRef = useRef(0);

  function isTerminal(s) {
    return s === "paid" || s === "expired" || s === "failed";
  }

  async function tick() {
    if (inFlightRef.current) return;
    if (isTerminal(stateRef.current)) return;
    inFlightRef.current = true;
    try {
      const s = await getPayout(payout.id, { createdAt });
      if (!mountedRef.current) return;
      if (s.status === "paid" && stateRef.current !== "paid") {
        stateRef.current = "paid";
        setState("paid");
        setSettledMs(s.settledMs ?? Date.now() - createdAt);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (s.status === "expired" && stateRef.current !== "expired") {
        stateRef.current = "expired";
        setState("expired");
      } else if (s.status === "failed" && stateRef.current !== "failed") {
        stateRef.current = "failed";
        setState("failed");
      }
      if (s.payoutStatus) setPayoutStatus(s.payoutStatus);
    } catch (e) {
      if (mountedRef.current) setError(e.message || String(e));
    } finally {
      inFlightRef.current = false;
    }
  }

  function schedulePoll() {
    if (!mountedRef.current) return;
    if (isTerminal(stateRef.current)) return;
    // Aggressive polling for the first 30s (every 500ms) so settlement feels
    // instant, then back off to 2s.
    const delay = pollCountRef.current < 60 ? 500 : 2000;
    timeoutRef.current = setTimeout(async () => {
      pollCountRef.current += 1;
      await tick();
      schedulePoll();
    }, delay);
  }

  useEffect(() => {
    mountedRef.current = true;
    // Kick off immediately, then begin the recursive scheduler.
    (async () => {
      await tick();
      schedulePoll();
    })();

    // When the user returns from their wallet app, force an immediate refresh.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") tick();
    });

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reopenWallet() {
    openInExternalWallet(payout.invoice);
  }

  const isPaid = state === "paid";

  return (
    <SafeAreaView
      style={[styles.safe, isPaid && { backgroundColor: colors.success }]}
      edges={["bottom"]}
    >
      <View style={styles.container}>
        {isPaid ? (
          <>
            <CheckCircle2 size={96} color="#0B0E14" strokeWidth={2.5} />
            <Text style={styles.paidTitle}>Payment Successful</Text>
            <Text style={styles.paidSub}>Settled in {settledMs ?? "—"} ms</Text>
            <View style={styles.receipt}>
              {summary && summary.length ? (
                summary.map((r, i) => (
                  <Row key={i} label={r.label} value={r.value} />
                ))
              ) : (
                <>
                  <Row label="Sender ref" value={payout.senderToken} />
                  <Row label="Recipient ref" value={payout.recipientToken} />
                  <Row
                    label="Amount"
                    value={`SSP ${formatSsp(sspAmount)} · ${formatSats(
                      payout.recipientSats ?? payout.sats,
                    )} sats`}
                  />
                  <Row
                    label="JunubBTC fee"
                    value={`${formatSats(payout.feeSats || 0)} sats`}
                  />
                </>
              )}
              <Row
                label="Local payout"
                value={
                  payoutStatus === "sent"
                    ? "Sent to recipient"
                    : payoutStatus === "failed"
                      ? "Failed — operator notified"
                      : "Routing… SMS arrives shortly"
                }
              />
            </View>
            <View style={{ height: spacing.lg }} />
            <PrimaryButton
              title="Done"
              variant="surface"
              onPress={() => navigation.popToTop()}
            />
          </>
        ) : state === "expired" ? (
          <>
            <Text style={styles.title}>Invoice expired</Text>
            <Text style={styles.muted}>
              The Lightning invoice was not paid in time.
            </Text>
            <View style={{ height: spacing.lg }} />
            <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
          </>
        ) : state === "failed" ? (
          <>
            <Text style={styles.title}>Payment failed</Text>
            <Text style={styles.muted}>{error || "Please try again."}</Text>
            <View style={{ height: spacing.lg }} />
            <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.title}>Waiting for your wallet…</Text>
            <Text style={styles.muted}>
              Approve {formatSats(payout.sats)} sats in your Lightning wallet.
              You can come straight back here — we'll detect it instantly.
            </Text>
            <View style={styles.receipt}>
              {summary && summary.length ? (
                summary.map((r, i) => (
                  <Row key={i} label={r.label} value={r.value} />
                ))
              ) : (
                <>
                  <Row label="Sender ref" value={payout.senderToken} />
                  <Row label="Recipient ref" value={payout.recipientToken} />
                  <Row label="Amount" value={`SSP ${formatSsp(sspAmount)}`} />
                  <Row
                    label="You pay"
                    value={`${formatSats(payout.sats)} sats`}
                  />
                  <Row
                    label="JunubBTC fee"
                    value={`${formatSats(payout.feeSats || 0)} sats`}
                  />
                </>
              )}
            </View>
            <View style={{ height: spacing.lg }} />
            <PrimaryButton title="Re-open my wallet" onPress={reopenWallet} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title="Cancel"
              variant="ghost"
              onPress={() => navigation.goBack()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  muted: {
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: "center" },
  bigCheck: {
    fontSize: 96,
    color: "#0B0E14",
    fontWeight: "900",
    lineHeight: 110,
  },
  paidTitle: { color: "#0B0E14", fontSize: 28, fontWeight: "900" },
  paidSub: {
    color: "#0B0E14",
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  receipt: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  rowLabel: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
});
