import { Linking } from "react-native";

/**
 * Try to hand off a BOLT11 invoice to ANY Lightning wallet installed on the
 * device using the universal `lightning:` URI scheme. Wallets such as
 * Phoenix, Muun, Blue Wallet, Wallet of Satoshi, Zeus, Breez, Alby, etc. all
 * register this scheme on iOS and Android, so the OS will present a chooser
 * (or open the default wallet) — exactly the "detect any lightning wallet on
 * my phone" behaviour requested.
 *
 * Implementation note: `Linking.canOpenURL` is unreliable for custom schemes.
 * On iOS it returns false unless the scheme is listed in
 * LSApplicationQueriesSchemes, and on some Android devices it returns false
 * for custom schemes even when a handler is installed. We therefore skip the
 * pre-check and just try to open the URL; failures fall through to the catch.
 *
 * Returns true if the URL was successfully opened.
 */
export async function openInExternalWallet(bolt11) {
  const url = `lightning:${String(bolt11).trim()}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
