import Decimal from "decimal.js";

// 1 BTC = 100_000_000 sats
export const SATS_PER_BTC = 100_000_000;

/**
 * Per-transaction SSP limits enforced across all payment flows.
 * The minimum prevents dust / fee-eating payments; the maximum caps
 * single-tx exposure for compliance + risk control.
 */
export const SSP_MIN = 50;
export const SSP_MAX = 1_000_000;

/**
 * Coerce arbitrary user / API input into a safe numeric string for Decimal.js.
 *
 * Real-world inputs we have to tolerate without throwing:
 *   - "250,000"      (en-US thousands separators)
 *   - "250 000"      (French / SSP locale)
 *   - "SSP 1,234.50" (copy/paste from receipts)
 *   - "1.234,56"     (European decimal — best-effort: drop the dots)
 *   - "  "  / null / undefined / NaN / "abc"
 *
 * Returns a string Decimal can parse, or "0" when nothing salvageable.
 * NEVER throws.
 */
export function toSafeNumberString(input) {
  if (input == null) return "0";
  if (typeof input === "number") {
    return Number.isFinite(input) ? String(input) : "0";
  }
  let s = String(input).trim();
  if (!s) return "0";
  // Strip currency labels and any whitespace.
  s = s.replace(/[^\d.,\-+eE]/g, "");
  if (!s) return "0";
  // If both separators appear, assume the LAST one is the decimal mark.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // "1.234,56" -> "1234.56"
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,234.56" -> "1234.56"
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only commas: treat as thousands sep ("250,000") unless it looks like
    // a decimal (exactly one comma followed by 1–2 digits).
    const after = s.length - lastComma - 1;
    if (s.indexOf(",") === lastComma && after > 0 && after <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return "0";
  return s;
}

function safeDecimal(input) {
  try {
    return new Decimal(toSafeNumberString(input));
  } catch {
    return new Decimal(0);
  }
}

/**
 * Validate a user-entered SSP amount.
 * @param {number|string} ssp
 * @returns {{ ok:true, value:number } | { ok:false, error:string }}
 */
export function validateSspAmount(ssp) {
  const n = Number(toSafeNumberString(ssp));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Enter an amount in SSP (numbers only)." };
  }
  if (n < SSP_MIN) {
    return { ok: false, error: `Minimum amount is SSP ${SSP_MIN}.` };
  }
  if (n > SSP_MAX) {
    return {
      ok: false,
      error: `Maximum amount per transaction is SSP ${SSP_MAX.toLocaleString(
        "en-US",
      )}.`,
    };
  }
  return { ok: true, value: n };
}

/**
 * Convert sats -> SSP using a given SSP-per-BTC rate.
 * @param {number|string} sats
 * @param {number|string} sspPerBtc - South Sudanese Pounds per 1 BTC
 * @returns {string} SSP amount as a fixed-2 string
 */
export function satsToSsp(sats, sspPerBtc) {
  const s = safeDecimal(sats);
  const rate = safeDecimal(sspPerBtc);
  try {
    return s.mul(rate).div(SATS_PER_BTC).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Convert SSP -> sats using a given SSP-per-BTC rate.
 * Rounds to the nearest whole sat.
 * @param {number|string} ssp
 * @param {number|string} sspPerBtc
 * @returns {number} integer sats
 */
export function sspToSats(ssp, sspPerBtc) {
  const amount = safeDecimal(ssp);
  const rate = safeDecimal(sspPerBtc);
  if (rate.isZero()) return 0;
  try {
    return amount.mul(SATS_PER_BTC).div(rate).round().toNumber();
  } catch {
    return 0;
  }
}

export function formatSats(sats) {
  const n = Number(toSafeNumberString(sats));
  return new Intl.NumberFormat("en-US").format(
    Number.isFinite(n) ? Math.floor(n) : 0,
  );
}

export function formatSsp(ssp) {
  const n = Number(toSafeNumberString(ssp));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/**
 * Friendly transaction timestamp.
 *
 * Accepts either a JS Date, milliseconds, or a Unix-seconds number (LNbits
 * payments use seconds). Returns:
 *   - "Today, 14:32"
 *   - "Yesterday, 09:15"
 *   - "Mon, 18:04"          (within the last 6 days)
 *   - "12 May 2026, 18:04"  (older or future-dated)
 *
 * @param {Date|number|null|undefined} input
 * @returns {string}
 */
export function formatTxDate(input) {
  if (input == null) return "";
  let d;
  if (input instanceof Date) {
    d = input;
  } else {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) return "";
    // LNbits timestamps are in seconds; anything < year-3000 in ms is also
    // < ~3e13, so treat values below ~1e12 as seconds.
    d = new Date(n < 1e12 ? n * 1000 : n);
  }
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const startOfDay = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const wd = d.toLocaleDateString(undefined, { weekday: "short" });
    return `${wd}, ${time}`;
  }
  const date = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date}, ${time}`;
}
