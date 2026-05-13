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
 * Validate a user-entered SSP amount.
 * @param {number|string} ssp
 * @returns {{ ok:true, value:number } | { ok:false, error:string }}
 */
export function validateSspAmount(ssp) {
  const n = Number(ssp);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Enter an amount in SSP." };
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
  const s = new Decimal(sats || 0);
  const rate = new Decimal(sspPerBtc || 0);
  return s.mul(rate).div(SATS_PER_BTC).toFixed(2);
}

/**
 * Convert SSP -> sats using a given SSP-per-BTC rate.
 * Rounds to the nearest whole sat.
 * @param {number|string} ssp
 * @param {number|string} sspPerBtc
 * @returns {number} integer sats
 */
export function sspToSats(ssp, sspPerBtc) {
  const amount = new Decimal(ssp || 0);
  const rate = new Decimal(sspPerBtc || 0);
  if (rate.isZero()) return 0;
  return amount.mul(SATS_PER_BTC).div(rate).round().toNumber();
}

export function formatSats(sats) {
  return new Intl.NumberFormat("en-US").format(Math.floor(Number(sats) || 0));
}

export function formatSsp(ssp) {
  const n = Number(ssp) || 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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
