import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { payInvoice } from "../lib/lnbits";
import { sspToSats } from "../lib/conversion";

// SSP per 1 BTC (i.e. how many South Sudanese Pounds 1 BTC is worth).
const SSP_PER_BTC = Number(process.env.EXPO_PUBLIC_SSP_PER_BTC || 400_000_000);

export default function SendScreen({ route, navigation }) {
  const [invoice, setInvoice] = useState(route?.params?.invoice || "");
  const [sspAmount, setSspAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const estimatedSats = useMemo(
    () => sspToSats(sspAmount, SSP_PER_BTC),
    [sspAmount],
  );

  async function onPay() {
    const trimmed = invoice.trim();
    if (!trimmed.toLowerCase().startsWith("lnbc")) {
      Alert.alert(
        "Invalid",
        "Paste a BOLT11 Lightning invoice (starts with lnbc).",
      );
      return;
    }
    setLoading(true);
    try {
      await payInvoice(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sent", "Payment successful.");
      navigation.goBack();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.label}>Lightning invoice (BOLT11)</Text>
        <TextInput
          value={invoice}
          onChangeText={setInvoice}
          placeholder="lnbc..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={styles.input}
        />

        <Text style={styles.label}>Estimate in SSP (optional)</Text>
        <TextInput
          value={sspAmount}
          onChangeText={setSspAmount}
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {sspAmount ? (
          <Text style={styles.hint}>
            ≈ {estimatedSats} sats at current rate
          </Text>
        ) : null}

        <View style={{ height: spacing.lg }} />

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton title="Pay Invoice" onPress={onPay} />
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
    minHeight: 48,
  },
  hint: { color: colors.muted, marginTop: spacing.sm, fontSize: 12 },
});
