import { Linking, Platform } from "react-native";

/**
 * Try to hand off a BOLT11 invoice to ANY Lightning wallet installed on the
 * device using the universal `lightning:` URI scheme. Wallets such as
 * Phoenix, Muun, Blue Wallet, Wallet of Satoshi, Zeus, Breez, Alby, etc. all
 * register this scheme on iOS and Android, so the OS will present a chooser
 * (or open the default wallet) — exactly the "detect any lightning wallet on
 * my phone" behaviour requested.
 *
 * Returns true if the OS reported it could open the URL.
 */
export async function openInExternalWallet(bolt11) {
  const url = `lightning:${String(bolt11).trim()}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported && Platform.OS === "android") {
      // Android sometimes returns false for canOpenURL on custom schemes;
      // try anyway.
      await Linking.openURL(url);
      return true;
    }
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
