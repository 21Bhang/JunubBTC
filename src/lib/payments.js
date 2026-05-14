/**
 * Shared helpers for classifying Lightning payments returned by LNbits.
 *
 * LNbits payment shapes vary slightly between endpoints / versions, so the
 * "is this payment actually completed?" decision is centralised here to keep
 * every screen (Home, Wallet, History) consistent.
 */

/**
 * Returns true only for payments that actually settled on the Lightning
 * network. Pending, cancelled, expired, or failed invoices are excluded.
 *
 * @param {object|null|undefined} t LNbits payment record
 * @returns {boolean}
 */
export function isCompletedPayment(t) {
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
