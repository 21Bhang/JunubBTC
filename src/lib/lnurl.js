/**
 * Lightning Address + LNURL-pay resolver.
 *
 * A Lightning Address looks like "user@domain.com". It maps to:
 *   https://domain.com/.well-known/lnurlp/user
 * which returns LNURL-pay metadata including a `callback` URL.
 * Hitting `callback?amount=<msat>` returns `{ pr: "lnbc..." }` — a real BOLT11
 * invoice we can pay.
 *
 * This lets a merchant print ONE static QR (their Lightning Address) and the
 * payer chooses the amount on their phone — perfect for SSP-denominated bills.
 */

/** True if string looks like user@domain.tld */
export function isLightningAddress(s) {
  if (typeof s !== "string") return false;
  return /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s.trim());
}

/** True for a BOLT11 invoice (mainnet/testnet/signet/regtest). */
export function isBolt11(s) {
  if (typeof s !== "string") return false;
  return /^ln(bc|tb|bcrt|sb)[0-9a-z]+$/i.test(s.trim());
}

/** Strip common URI prefixes from a scanned/pasted code. */
export function normalizeScanned(raw) {
  if (!raw) return "";
  return String(raw)
    .trim()
    .replace(/^lightning:/i, "")
    .replace(/^bitcoin:/i, "")
    .trim();
}

/**
 * Fetch LNURL-pay params for a Lightning Address.
 * @param {string} address e.g. "alice@getalby.com"
 * @returns {Promise<{callback:string,minSendable:number,maxSendable:number,metadata:string}>}
 */
export async function resolveLightningAddress(address) {
  const [user, domain] = String(address).trim().split("@");
  if (!user || !domain) throw new Error("Invalid Lightning Address");
  const url = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(user)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LNURL lookup failed (${res.status})`);
  const data = await res.json();
  if (data.tag !== "payRequest") throw new Error("Not an LNURL-pay endpoint");
  return data;
}

/**
 * Request a BOLT11 invoice from an LNURL-pay callback for a specific sat amount.
 * @param {object} params LNURL-pay params (from resolveLightningAddress)
 * @param {number} amountSats
 * @returns {Promise<string>} BOLT11 invoice
 */
export async function fetchInvoiceFromLnurl(params, amountSats) {
  const msat = Math.round(Number(amountSats) * 1000);
  if (!Number.isFinite(msat) || msat <= 0) throw new Error("Bad amount");
  if (msat < params.minSendable || msat > params.maxSendable) {
    throw new Error(
      `Amount out of merchant range (${Math.floor(params.minSendable / 1000)}–${Math.floor(
        params.maxSendable / 1000,
      )} sats)`,
    );
  }
  const sep = params.callback.includes("?") ? "&" : "?";
  const res = await fetch(`${params.callback}${sep}amount=${msat}`);
  if (!res.ok) throw new Error(`LNURL callback failed (${res.status})`);
  const data = await res.json();
  if (data.status === "ERROR") throw new Error(data.reason || "LNURL error");
  if (!data.pr) throw new Error("LNURL did not return an invoice");
  return data.pr;
}
