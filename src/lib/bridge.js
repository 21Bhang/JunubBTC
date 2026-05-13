/**
 * JunubBTC bridge backend client.
 *
 * The backend's job:
 *   POST /v1/payouts  { phone, billNo, sspAmount }
 *     -> { id, sats, invoice, expiresAt, sspPerBtc }
 *   GET  /v1/payouts/:id
 *     -> { id, status: "pending"|"paid"|"expired"|"failed",
 *          paidAt?, settledMs?, payoutStatus?: "queued"|"sent"|"failed",
 *          payoutRef? }
 *
 * The phone NEVER touches the merchant funds — it just deep-links the user's
 * existing Lightning wallet to pay the invoice the backend generated. The
 * backend's webhook then triggers the mobile-money payout (mGURUSH / MTN MoMo
 * / "Wizard of Oz" Telegram for the MVP).
 *
 * If EXPO_PUBLIC_BRIDGE_URL is not set, we fall back to a LOCAL DEMO MODE that
 * generates an invoice directly from LNbits and polls its status — perfect for
 * a Nairobi-conference demo with no backend deployed yet.
 */

import { createInvoice, getPayment } from "./lnbits";
import { sspToSats, validateSspAmount } from "./conversion";
import { getSspPerBtc } from "./rate";

const BRIDGE_URL = process.env.EXPO_PUBLIC_BRIDGE_URL || "";
const BRIDGE_KEY = process.env.EXPO_PUBLIC_BRIDGE_KEY || "";

async function bridge(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(BRIDGE_KEY ? { Authorization: `Bearer ${BRIDGE_KEY}` } : {}),
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
    throw new Error(data?.error || data?.message || `Bridge ${res.status}`);
  }
  return data;
}

/**
 * Create a payout intent. Returns an invoice the user can pay from ANY
 * Lightning wallet on their phone.
 *
 * Destination shapes:
 *   { type: "send",    phone, sspAmount }
 *   { type: "paybill", paybill, account, sspAmount }
 *   { type: "buygoods", till, sspAmount }
 *   { type: "merchant", phone, billNo, sspAmount, merchantId? }   // legacy
 */
export async function createPayout(params) {
  const { type = "merchant", sspAmount } = params;
  const check = validateSspAmount(sspAmount);
  if (!check.ok) throw new Error(check.error);
  if (BRIDGE_URL) {
    return bridge("/v1/payouts", {
      method: "POST",
      body: { ...params, sspAmount: check.value },
    });
  }
  // ---- Local demo mode (no backend) ----
  const { sspPerBtc } = await getSspPerBtc();
  const sats = sspToSats(sspAmount, sspPerBtc);
  if (!sats || sats <= 0) throw new Error("Amount is zero at current rate");
  const memo = memoFor(params);
  const inv = await createInvoice({ amountSats: sats, memo });
  return {
    id: inv.payment_hash,
    sats,
    invoice: inv.payment_request,
    sspPerBtc,
    expiresAt: Date.now() + 10 * 60 * 1000,
    type,
    demo: true,
  };
}

function memoFor(p) {
  const ssp = Number(p.sspAmount || 0).toFixed(2);
  switch (p.type) {
    case "send":
      return `JunubBTC SEND ${ssp} SSP -> ${p.phone}`;
    case "paybill":
      return `JunubBTC PAYBILL ${p.paybill} acct ${p.account} ${ssp} SSP`;
    case "buygoods":
      return `JunubBTC BUYGOODS till ${p.till} ${ssp} SSP`;
    case "merchant":
    default:
      return `JunubBTC bill ${p.billNo || "-"} -> ${p.phone || "-"} (${ssp} SSP)`;
  }
}

/**
 * Poll the status of a payout. Returns settlement timing once paid.
 * @param {string} id
 * @param {{ createdAt?: number }} [opts] - used in demo mode for settledMs calc
 */
export async function getPayout(id, { createdAt } = {}) {
  if (BRIDGE_URL) {
    return bridge(`/v1/payouts/${encodeURIComponent(id)}`);
  }
  // Local demo: LNbits returns { paid: true/false, ... } for the invoice hash.
  const p = await getPayment(id);
  const paid = !!p?.paid;
  return {
    id,
    status: paid ? "paid" : "pending",
    paidAt: paid ? Date.now() : null,
    settledMs: paid && createdAt ? Date.now() - createdAt : null,
    payoutStatus: paid ? "queued" : null, // operator runs the manual payout
    demo: true,
  };
}
