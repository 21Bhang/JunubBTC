import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ScanLine, ShieldAlert } from "lucide-react-native";
import { colors, spacing } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

/**
 * QR scanner using expo-camera. Works inside Expo Go (no custom dev build
 * needed) and opens the camera automatically once permission is granted.
 *
 * Behaviour:
 *   - Auto-requests camera permission on mount.
 *   - Detects QR codes (BOLT11, Lightning Address, junubbtc://, https://...).
 *   - If invoked with route.params.returnTo === "PayMerchant" OR if it sees
 *     a JunubBTC merchant URI, returns the scan to PayMerchant.
 *   - Otherwise routes BOLT11 invoices to the Send screen.
 */
export default function ScanScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  // Auto-request permission as soon as the screen opens so the camera
  // appears with no extra tap.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  function onScanned({ data }) {
    if (handledRef.current || !data) return;
    handledRef.current = true;
    const cleaned = String(data)
      .replace(/^lightning:/i, "")
      .replace(/^bitcoin:/i, "")
      .trim();
    const isMerchant =
      /^(?:junubbtc|jubunbtc):\/\//i.test(cleaned) ||
      /^https?:\/\/[^/]*(?:junubbtc|jubunbtc)[^/]*\/m\//i.test(cleaned);
    const returnTo = route?.params?.returnTo;
    if (returnTo === "PayMerchant" || isMerchant) {
      navigation.navigate({
        name: "PayMerchant",
        params: { scanned: cleaned },
        merge: true,
      });
    } else {
      navigation.replace("Send", { invoice: cleaned });
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ShieldAlert size={48} color={colors.primary} />
          <Text style={styles.title}>Camera permission needed</Text>
          <Text style={styles.muted}>
            JunubBTC needs camera access to scan Lightning invoices and merchant
            QR codes. Grant it from{" "}
            {Platform.OS === "ios" ? "Settings" : "App info → Permissions"}.
          </Text>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton title="Grant permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onScanned}
      />
      <View pointerEvents="none" style={styles.frameOverlay}>
        <View style={styles.frame} />
      </View>
      <View style={styles.bottomOverlay} pointerEvents="none">
        <ScanLine size={18} color="#fff" />
        <Text style={styles.overlayText}>Align QR code inside the frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.muted, textAlign: "center" },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  overlayText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    fontSize: 13,
  },
});
