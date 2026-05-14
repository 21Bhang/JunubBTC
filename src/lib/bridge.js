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
import {
  calculateFeeSats,
  makeAnonToken,
  validateSatsForTransfer,
} from "./fees";

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
    const res = await bridge("/v1/payouts", {
      method: "POST",
      body: { ...params, sspAmount: check.value },
    });
    // If the backend hasn't been upgraded yet to return fee/token fields,
    // compute them client-side so the UI stays consistent.
    const recipientSats = Number(res.recipientSats ?? res.sats ?? 0);
    const feeSats = Number(res.feeSats ?? calculateFeeSats(recipientSats));
    const totalSats = Number(res.totalSats ?? recipientSats + feeSats);
    return {
      ...res,
      recipientSats,
      feeSats,
      totalSats,
      sats: totalSats,
      senderToken: res.senderToken || makeAnonToken(`${res.id}:s`),
      recipientToken: res.recipientToken || makeAnonToken(`${res.id}:r`),
    };
  }
  // ---- Local demo mode (no backend) ----
  const { sspPerBtc } = await getSspPerBtc();
  const recipientSats = sspToSats(sspAmount, sspPerBtc);
  const satsCheck = validateSatsForTransfer(recipientSats);
  if (!satsCheck.ok) throw new Error(satsCheck.error);
  const feeSats = calculateFeeSats(recipientSats);
  const totalSats = recipientSats + feeSats;
  const memo = memoFor(params, totalSats);
  const inv = await createInvoice({ amountSats: totalSats, memo });
  return {
    id: inv.payment_hash,
    sats: totalSats,
    recipientSats,
    feeSats,
    totalSats,
    invoice: inv.payment_request,
    sspPerBtc,
    senderToken: makeAnonToken(`${inv.payment_hash}:s`),
    recipientToken: makeAnonToken(`${inv.payment_hash}:r`),
    expiresAt: Date.now() + 10 * 60 * 1000,
    type,
    demo: true,
  };
}

function memoFor(p, totalSats) {
  // Memos are visible to the Lightning network — keep them free of PII.
  // We log only the anonymous reference number so JunubBTC's bridge can
  // reconcile the payout without leaking the sender's or recipient's
  // identity.
  const total = totalSats != null ? ` (${totalSats} sats)` : "";
  switch (p.type) {
    case "send":
      return `JunubBTC SEND${total}`;
    case "paybill":
      return `JunubBTC PAYBILL${total}`;
    case "buygoods":
      return `JunubBTC BUYGOODS${total}`;
    case "merchant":
    default:
      return `JunubBTC MERCHANT${total}`;
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
