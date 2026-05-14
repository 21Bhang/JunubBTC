/**
 * JunubBTC fee schedule, transfer limits, and anonymisation helpers.
 *
 * Business rules (per spec):
 *   - The app is a non-custodial rail between BTC (Lightning) and SSP
 *     (MoMo / mGURUSH).
 *   - Per-transaction maximum: 370,000 sats (the recipient amount).
 *   - A tiered fee in sats is added to the Lightning invoice and routed to
 *     the JunubBTC operator's bank account by the bridge backend. The app
 *     itself never custodies BTC or sats.
 *   - Sender and recipient identities are NEVER displayed on receipts —
 *     each side is shown a short, deterministic anonymous token derived
 *     from the payment hash so users can reconcile without exposing
 *     phone numbers, names, or account IDs.
 *
 * Fee tiers (recipient amount in sats -> fee in sats):
 *      10 –     1,000 :   5
 *   1,001 –     5,000 :   9
 *   5,001 –    10,000 :  21
 *  10,001 –    50,000 :  84
 *  50,001 –   100,000 : 105
 * 100,001 –   200,000 : 250
 * 200,001 –   370,000 : 303
 */

export const SATS_MIN = 10;
export const SATS_MAX = 370_000;

/**
 * Ordered list of fee tiers. `max` is INCLUSIVE.
 */
export const FEE_TIERS = Object.freeze([
  { min: 10, max: 1_000, fee: 5 },
  { min: 1_001, max: 5_000, fee: 9 },
  { min: 5_001, max: 10_000, fee: 21 },
  { min: 10_001, max: 50_000, fee: 84 },
  { min: 50_001, max: 100_000, fee: 105 },
  { min: 100_001, max: 200_000, fee: 250 },
  { min: 200_001, max: SATS_MAX, fee: 303 },
]);

/**
 * Compute the JunubBTC service fee (in sats) for a transfer of `sats` to a
 * recipient. Returns 0 for amounts below the minimum tier.
 *
 * @param {number|string} sats Recipient amount in sats
 * @returns {number} Fee in sats
 */
export function calculateFeeSats(sats) {
  const raw = typeof sats === "string" ? sats.replace(/[,\s]/g, "") : sats;
  const n = Math.floor(Number(raw) || 0);
  if (!Number.isFinite(n) || n < SATS_MIN) return 0;
  for (const tier of FEE_TIERS) {
    if (n >= tier.min && n <= tier.max) return tier.fee;
  }
  // Above the maximum tier — caller should have rejected, but be defensive.
  return FEE_TIERS[FEE_TIERS.length - 1].fee;
}

/**
 * Validate that a recipient sats amount falls within the JunubBTC rail's
 * supported range (10 – 370,000 sats).
 *
 * @param {number|string} sats
 * @returns {{ok:true, value:number} | {ok:false, error:string}}
 */
export function validateSatsForTransfer(sats) {
  const raw = typeof sats === "string" ? sats.replace(/[,\s]/g, "") : sats;
  const n = Math.floor(Number(raw) || 0);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Amount is zero at the current BTC rate." };
  }
  if (n < SATS_MIN) {
    return { ok: false, error: `Minimum transfer is ${SATS_MIN} sats.` };
  }
  if (n > SATS_MAX) {
    return {
      ok: false,
      error: `Maximum transfer is ${SATS_MAX.toLocaleString(
        "en-US",
      )} sats per transaction.`,
    };
  }
  return { ok: true, value: n };
}

/**
 * Derive a short, opaque token from a seed (typically the Lightning
 * payment hash + a role suffix). The token reveals no PII — it's just a
 * reconcilable reference both parties can quote.
 *
 * Format: "JBT-XXXXXX" (6 uppercase alphanumerics).
 *
 * @param {string} seed
 * @returns {string}
 */
export function makeAnonToken(seed) {
  const s = String(seed || "").replace(/[^a-zA-Z0-9]/g, "");
  if (!s) return "JBT-XXXXXX";
  // Take the last 6 characters of the seed (payment hashes are hex, so
  // these are uniformly distributed).
  const tail = s.slice(-6).toUpperCase().padStart(6, "X");
  return `JBT-${tail}`;
}

/**
 * Mask a phone number for display on receipts. Keeps the last 3 digits.
 */
export function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "•••";
  if (digits.length <= 3) return "•".repeat(digits.length);
  return `••• ••• ${digits.slice(-3)}`;
}

/**
 * Mask a generic identifier (account, paybill, till, bill ref). Keeps the
 * last 4 characters.
 */
export function maskIdentifier(value) {
  const v = String(value || "");
  if (!v) return "••••";
  if (v.length <= 4) return "•".repeat(v.length);
  return "•".repeat(Math.max(0, v.length - 4)) + v.slice(-4);
}
