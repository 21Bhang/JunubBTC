/**
 * Parse JunubBTC merchant URIs and static QR payloads.
 *
 * Supported formats (all may be wrapped in `lightning:` / `bitcoin:` prefixes):
 *   1. junubbtc://pay?merchant=12345&phone=%2B2119...&bill=INV-1&amount=5000
 *      (legacy `jubunbtc://` also accepted)
 *   2. https://pay.junubbtc.app/m/12345?bill=INV-1
 *   3. A bare BOLT11 invoice            (lnbc...)
 *   4. A Lightning Address              (shop@domain.com)
 *   5. A bare phone number              (+211 9XX XXX XXX)
 */

import { isBolt11, isLightningAddress, normalizeScanned } from "./lnurl";

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,}$/;

function parseQuery(qs) {
  const out = {};
  if (!qs) return out;
  for (const part of qs.replace(/^\?/, "").split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/**
 * @param {string} raw scanned/pasted text
 * @returns {{
 *   kind: "merchant"|"invoice"|"address"|"phone"|"unknown",
 *   merchantId?: string,
 *   phone?: string,
 *   billNo?: string,
 *   sspAmount?: string,
 *   invoice?: string,
 *   lightningAddress?: string,
 *   raw: string,
 * }}
 */
export function parseMerchantCode(raw) {
  const cleaned = normalizeScanned(raw || "");
  if (!cleaned) return { kind: "unknown", raw: "" };

  // junubbtc://pay?...  (or legacy jubunbtc://)
  const schemeMatch = cleaned.match(/^(?:junubbtc|jubunbtc):\/\/pay\??(.*)$/i);
  if (schemeMatch) {
    const q = parseQuery(schemeMatch[1]);
    return {
      kind: "merchant",
      merchantId: q.merchant || q.m,
      phone: q.phone,
      billNo: q.bill || q.billNo,
      sspAmount: q.amount || q.ssp,
      raw: cleaned,
    };
  }

  // https://pay.junubbtc.app/m/<id>?...  (or legacy jubunbtc)
  const httpsMatch = cleaned.match(
    /^https?:\/\/[^/]*(?:junubbtc|jubunbtc)[^/]*\/m\/([^/?#]+)(\?[^#]*)?/i,
  );
  if (httpsMatch) {
    const q = parseQuery(httpsMatch[2] || "");
    return {
      kind: "merchant",
      merchantId: httpsMatch[1],
      phone: q.phone,
      billNo: q.bill || q.billNo,
      sspAmount: q.amount || q.ssp,
      raw: cleaned,
    };
  }

  if (isBolt11(cleaned))
    return { kind: "invoice", invoice: cleaned, raw: cleaned };
  if (isLightningAddress(cleaned))
    return { kind: "address", lightningAddress: cleaned, raw: cleaned };
  if (PHONE_RE.test(cleaned.replace(/\s/g, "")))
    return { kind: "phone", phone: cleaned, raw: cleaned };

  return { kind: "unknown", raw: cleaned };
}
