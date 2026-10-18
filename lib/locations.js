// Delivery neighborhoods, shared by the checkout form (client) and order
// pricing (server). `center` is an approximate point in each area, used to
// work out the road distance (and so the fee) when a customer doesn't share a
// map pin. `fee` and `driveTime` are fallbacks if routing is unavailable.
// Fees are always recomputed on the server.

export const DELIVERY_LOCATIONS = [
  { id: "bole", center: { latitude: 8.9956, longitude: 38.7889 }, name: "Bole", driveTime: "15-20 mins", fee: 50, area: "Edna Mall, Medhanialem, Olympia" },
  { id: "kazanchis", center: { latitude: 9.0187, longitude: 38.7660 }, name: "Kazanchis", driveTime: "15-25 mins", fee: 50, area: "UNECA, Intercontinental, Bambis" },
  { id: "mexico", center: { latitude: 9.0105, longitude: 38.7455 }, name: "Mexico", driveTime: "20-25 mins", fee: 50, area: "Sengatera, Stadium, Kera" },
  { id: "sarbet", center: { latitude: 8.9950, longitude: 38.7395 }, name: "Sarbet", driveTime: "20-25 mins", fee: 50, area: "Old Airport, AU Headquarters, Karl Square" },
  { id: "piassa", center: { latitude: 9.0350, longitude: 38.7525 }, name: "Piassa", driveTime: "25-30 mins", fee: 70, area: "Churchill Ave, Arada, Posta Bet" },
  { id: "gerji", center: { latitude: 9.0013, longitude: 38.8090 }, name: "Gerji", driveTime: "25-35 mins", fee: 70, area: "Imperial, Roba Bakery, Jackros" },
  { id: "megenagna", center: { latitude: 9.0200, longitude: 38.8030 }, name: "Megenagna", driveTime: "20-30 mins", fee: 70, area: "Signal, Shola, Lem Hotel" },
  { id: "cmc", center: { latitude: 9.0230, longitude: 38.8450 }, name: "CMC", driveTime: "35-45 mins", fee: 90, area: "Michael, Tsehay Real Estate, Altad" },
  { id: "lebu", center: { latitude: 8.9550, longitude: 38.7280 }, name: "Lebu", driveTime: "35-45 mins", fee: 90, area: "Jemo, Haile Garment, Varnero" },
  { id: "ayat", center: { latitude: 9.0320, longitude: 38.8740 }, name: "Ayat", driveTime: "40-50 mins", fee: 110, area: "Ayat Zone 2 & 3, Tafo Highway" },
  { id: "other", name: "Other Neighborhood", driveTime: "30-45 mins", fee: 100, area: "Custom neighborhood or landmark" },
];

const OTHER = DELIVERY_LOCATIONS[DELIVERY_LOCATIONS.length - 1];

export function findLocation(name) {
  const key = String(name || "").toLowerCase();
  return DELIVERY_LOCATIONS.find((location) => location.name.toLowerCase() === key) || null;
}

// A custom neighborhood typed by the customer is priced as "Other".
export function getLocationFee(name) {
  return (findLocation(name) || OTHER).fee;
}

export function getLocationDriveTime(name) {
  return (findLocation(name) || OTHER).driveTime;
}

// Rough bounding box around Addis Ababa used to sanity-check map pins.
export const ADDIS_BOUNDS = { minLat: 8.5, maxLat: 9.8, minLng: 38.2, maxLng: 39.2 };

export function isInAddis(latitude, longitude) {
  return (
    latitude >= ADDIS_BOUNDS.minLat &&
    latitude <= ADDIS_BOUNDS.maxLat &&
    longitude >= ADDIS_BOUNDS.minLng &&
    longitude <= ADDIS_BOUNDS.maxLng
  );
}
