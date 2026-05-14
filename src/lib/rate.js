/**
 * Live BTC -> SSP rate.
 *
 * Strategy:
 *   1. Fetch BTC price in USD from a public exchange API (Coingecko by default).
 *   2. Multiply by the SSP-per-USD "street rate" — South Sudan has a large gap
 *      between the official central-bank rate and the parallel market rate, so
 *      we let the operator override it via env.
 *
 * Override URLs / rates with:
 *   EXPO_PUBLIC_BTC_USD_URL   (must return JSON { bitcoin: { usd: <num> } } shape
 *                              or { price: <num> })
 *   EXPO_PUBLIC_SSP_PER_USD   (number, default 5200 — 1 USD ≈ 5,200 SSP on the
 *                              South Sudan parallel market — adjust as needed)
 *   EXPO_PUBLIC_SSP_PER_BTC   (number, if set this OVERRIDES the live calculation)
 */

const BTC_USD_URL =
  process.env.EXPO_PUBLIC_BTC_USD_URL ||
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

const SSP_PER_USD = Number(process.env.EXPO_PUBLIC_SSP_PER_USD || 5200);
const SSP_PER_BTC_OVERRIDE = process.env.EXPO_PUBLIC_SSP_PER_BTC
  ? Number(process.env.EXPO_PUBLIC_SSP_PER_BTC)
  : null;

let cache = { rate: null, ts: 0 };
const CACHE_MS = 60_000; // 1 minute

function parseBtcUsd(json) {
  if (!json) return null;
  if (json.bitcoin?.usd) return Number(json.bitcoin.usd);
  if (json.price) return Number(json.price);
  if (json.USD) return Number(json.USD);
  return null;
}

/**
 * Returns the current SSP-per-BTC rate.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ sspPerBtc:number, btcUsd:number|null, source:string, fetchedAt:number }>}
 */
export async function getSspPerBtc({ force = false } = {}) {
  if (SSP_PER_BTC_OVERRIDE) {
    return {
      sspPerBtc: SSP_PER_BTC_OVERRIDE,
      btcUsd: null,
      source: "env-override",
      fetchedAt: Date.now(),
    };
  }
  if (!force && cache.rate && Date.now() - cache.ts < CACHE_MS) {
    return cache.rate;
  }
  try {
    const res = await fetch(BTC_USD_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Rate HTTP ${res.status}`);
    const json = await res.json();
    const btcUsd = parseBtcUsd(json);
    if (!btcUsd) throw new Error("Could not parse BTC/USD price");
    const rate = {
      sspPerBtc: btcUsd * SSP_PER_USD,
      btcUsd,
      source: BTC_USD_URL,
      fetchedAt: Date.now(),
    };
    cache = { rate, ts: Date.now() };
    return rate;
  } catch (e) {
    // Fall back to a conservative hard-coded number so the UI never blocks.
    const fallback = {
      sspPerBtc: 65_000 * SSP_PER_USD, // assume ~$65k BTC if offline
      btcUsd: null,
      source: "offline-fallback",
      fetchedAt: Date.now(),
      error: e.message,
    };
    return fallback;
  }
}
