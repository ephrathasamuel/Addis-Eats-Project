import "server-only";

// Driving-time estimates from the restaurant to a customer's map pin.
//
// - With GOOGLE_MAPS_API_KEY set (Google Cloud, Routes API enabled), the
//   estimate uses Google's live traffic ("live-traffic").
// - Otherwise it uses the public OSRM road router: real road distance and
//   typical driving time, without traffic ("road").
// - Without a map pin, callers fall back to the neighborhood range.

const DEFAULT_RESTAURANT = { latitude: 8.9963, longitude: 38.7860 }; // Bole Road, Addis Ababa

export function getRestaurantLocation() {
  const latitude = Number(process.env.ADDIS_RESTAURANT_LAT);
  const longitude = Number(process.env.ADDIS_RESTAURANT_LNG);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude
    ? { latitude, longitude }
    : DEFAULT_RESTAURANT;
}

async function fetchWithTimeout(url, options = {}, ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function googleEstimate(from, to, key) {
  const response = await fetchWithTimeout("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.staticDuration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: from } },
      destination: { location: { latLng: to } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!response.ok) return null;
  const route = (await response.json()).routes?.[0];
  if (!route?.duration) return null;
  const seconds = Number(String(route.duration).replace("s", ""));
  const normalSeconds = Number(String(route.staticDuration || route.duration).replace("s", ""));
  return {
    minutes: Math.max(1, Math.round(seconds / 60)),
    km: Math.round((route.distanceMeters / 1000) * 10) / 10,
    trafficDelayMinutes: Math.max(0, Math.round((seconds - normalSeconds) / 60)),
    source: "live-traffic",
  };
}

async function osrmEstimate(from, to) {
  const path = `/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false`;
  let response = null;
  // Prefer HTTPS; some networks block it to this server, so fall back to HTTP.
  for (const base of ["https://router.project-osrm.org", "http://router.project-osrm.org"]) {
    try {
      response = await fetchWithTimeout(base + path, { headers: { "User-Agent": "AddisEats/1.0" } });
      if (response.ok) break;
    } catch {
      response = null;
    }
  }
  if (!response?.ok) return null;
  const route = (await response.json()).routes?.[0];
  if (!route) return null;
  return {
    // OSRM's car times are for empty roads; Addis traffic is rarely that kind.
    minutes: Math.max(1, Math.round((route.duration / 60) * 1.35)),
    km: Math.round((route.distance / 1000) * 10) / 10,
    trafficDelayMinutes: null,
    source: "road",
  };
}

/** Returns { minutes, km, trafficDelayMinutes, source, computedAt } or null. */
export async function estimateDrive(destination) {
  if (!destination || !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) return null;
  const from = getRestaurantLocation();
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const estimate = (key && (await googleEstimate(from, destination, key))) || (await osrmEstimate(from, destination));
    return estimate ? { ...estimate, computedAt: new Date().toISOString() } : null;
  } catch {
    return null;
  }
}

export function describeDrive(estimate) {
  if (!estimate) return null;
  if (estimate.source === "live-traffic") {
    const delay = estimate.trafficDelayMinutes ? `, includes ${estimate.trafficDelayMinutes} min of traffic` : "";
    return `About ${estimate.minutes} min drive (${estimate.km} km), live traffic${delay}`;
  }
  return `About ${estimate.minutes} min drive (${estimate.km} km by road, typical traffic)`;
}
