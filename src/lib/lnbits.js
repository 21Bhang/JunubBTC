/**
 * Minimal LNbits REST client.
 *
 * Security notes:
 *  - The "invoice/read" key is safe-ish to ship in a mobile app for receiving.
 *  - The "admin" key can spend funds. Do NOT ship it in production builds.
 *    For pay/send flows, route through your own backend that holds the admin key
 *    and exposes a narrow API (e.g. POST /pay with auth + rate limits).
 *  - All endpoints assume your LNbits instance is reachable over HTTPS.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_LNBITS_URL || "https://demo.lnbits.com";
const INVOICE_KEY = process.env.EXPO_PUBLIC_LNBITS_INVOICE_KEY || "";
const ADMIN_KEY = process.env.EXPO_PUBLIC_LNBITS_ADMIN_KEY || "";

async function request(path, { method = "GET", body, key } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-Api-Key": key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `LNbits ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

/** Get wallet balance + metadata. Returns { id, name, balance } (balance in msat). */
export function getWallet() {
  if (!INVOICE_KEY) throw new Error("Missing EXPO_PUBLIC_LNBITS_INVOICE_KEY");
  return request("/api/v1/wallet", { key: INVOICE_KEY });
}

/**
 * Create a Lightning invoice (BOLT11) to receive sats.
 * @param {{ amountSats: number, memo?: string }} opts
 * @returns {Promise<{ payment_hash: string, payment_request: string }>}
 */
export function createInvoice({ amountSats, memo = "JunubBTC" }) {
  if (!INVOICE_KEY) throw new Error("Missing EXPO_PUBLIC_LNBITS_INVOICE_KEY");
  return request("/api/v1/payments", {
    method: "POST",
    key: INVOICE_KEY,
    body: { out: false, amount: amountSats, memo },
  });
}

/**
 * Pay a BOLT11 invoice.
 * WARNING: requires admin key. In production, proxy this through a backend.
 * @param {string} bolt11
 */
export function payInvoice(bolt11) {
  if (!ADMIN_KEY) throw new Error("Missing EXPO_PUBLIC_LNBITS_ADMIN_KEY");
  return request("/api/v1/payments", {
    method: "POST",
    key: ADMIN_KEY,
    body: { out: true, bolt11 },
  });
}

/** Check payment status by payment_hash. */
export function getPayment(paymentHash) {
  if (!INVOICE_KEY) throw new Error("Missing EXPO_PUBLIC_LNBITS_INVOICE_KEY");
  return request(`/api/v1/payments/${paymentHash}`, { key: INVOICE_KEY });
}

/** Recent payments list. */
export function listPayments({ limit = 10 } = {}) {
  if (!INVOICE_KEY) throw new Error("Missing EXPO_PUBLIC_LNBITS_INVOICE_KEY");
  return request(`/api/v1/payments?limit=${limit}`, { key: INVOICE_KEY });
}
