import "server-only";
import { DELIVERY_LOCATIONS, findLocation } from "@/lib/locations";
import { estimateDrive } from "@/lib/routing";

// Distance-based delivery fee:
//   starting price (covers the first few km) + a price per extra kilometre.
// The starting price is the average of published Addis starting prices
// (Zmall ~70, Ride 200 minimum, 2020 market midpoint 75 -> ~115 birr).
// All three numbers can be changed with environment variables.

function setting(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getPricing() {
  return {
    baseFee: setting("DELIVERY_BASE_FEE", 115),
    baseKm: setting("DELIVERY_BASE_KM", 3),
    perKm: setting("DELIVERY_PER_KM", 30),
  };
}

export function feeForKm(km) {
  const { baseFee, baseKm, perKm } = getPricing();
  return baseFee + Math.max(0, Math.ceil(km - baseKm)) * perKm;
}

// Road distance from the restaurant to each neighborhood's centre, cached.
const cache = globalThis.__addis_area_quotes || (globalThis.__addis_area_quotes = new Map());
const CACHE_MS = 6 * 60 * 60 * 1000;

async function areaEstimate(location) {
  if (!location?.center) return null;
  const hit = cache.get(location.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.estimate;
  const estimate = await estimateDrive(location.center);
  if (estimate) cache.set(location.id, { at: Date.now(), estimate });
  return estimate;
}

/**
 * Delivery quote. Uses the customer's map pin when given (exact road
 * distance), otherwise the centre of their neighborhood.
 * Returns { fee, km, minutes, basis: "pin" | "area" | "fixed", estimate }.
 */
export async function quoteDelivery({ location, coordinates, pinEstimate } = {}) {
  const estimate = pinEstimate || (coordinates ? await estimateDrive(coordinates) : null);
  if (estimate) {
    return { fee: feeForKm(estimate.km), km: estimate.km, minutes: estimate.minutes, basis: "pin", estimate };
  }
  const area = findLocation(location);
  const areaQuote = await areaEstimate(area);
  if (areaQuote) {
    return { fee: feeForKm(areaQuote.km), km: areaQuote.km, minutes: areaQuote.minutes, basis: "area", estimate: null };
  }
  // A custom neighborhood without a pin, or routing unavailable: assume ~6 km.
  const fallbackKm = area?.id === "other" || !area ? 6 : 4;
  return { fee: feeForKm(fallbackKm), km: null, minutes: null, basis: "fixed", estimate: null };
}

/** Fee for every neighborhood in the checkout list (pin-less). */
export async function quoteAllAreas() {
  const entries = await Promise.all(
    DELIVERY_LOCATIONS.map(async (location) => [location.name, await quoteDelivery({ location: location.name })])
  );
  return Object.fromEntries(entries.map(([name, quote]) => [name, { fee: quote.fee, km: quote.km, minutes: quote.minutes }]));
}
