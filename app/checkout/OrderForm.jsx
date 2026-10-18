"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estimateDelivery, placeOrder } from "@/app/actions";
import { DELIVERY_LOCATIONS, isInAddis } from "@/lib/locations";

const PHONE_RE = /^(?:\+251|0)[79]\d{8}$/;

function validatePhone(value) {
  const cleaned = value.replace(/[\s-]/g, "");
  if (!cleaned) return "Phone number is required";
  if (!PHONE_RE.test(cleaned)) return "Enter a valid Ethiopian phone number (e.g. 0911234567 or 0712345678)";
  return null;
}

export default function OrderForm({ itemsRaw, foodSubtotal, initialName = "", kitchenEstimate, areaFees = {}, pricing }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Bole");
  const [customLocation, setCustomLocation] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [drive, setDrive] = useState(null); // road / live-traffic estimate for the attached pin

  const matchedLocation = DELIVERY_LOCATIONS.find((l) => l.name === selectedLocation) || DELIVERY_LOCATIONS[0];
  const isOther = selectedLocation === "Other Neighborhood";
  // Distance-based fee: the exact road distance when a pin is shared,
  // otherwise the distance to the centre of the chosen neighborhood.
  const areaQuote = areaFees[selectedLocation] || null;
  const deliveryFee = deliveryCoordinates && drive?.fee ? drive.fee : areaQuote?.fee ?? matchedLocation.fee;
  const grandTotal = foodSubtotal + deliveryFee;

  function clearError(key) {
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: null }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    const nextErrors = {};
    if (name.trim().length < 2) nextErrors.name = "Name is required";
    const phoneError = validatePhone(phone);
    if (phoneError) nextErrors.phone = phoneError;
    if (isOther && !customLocation.trim()) nextErrors.location = "Please specify your neighborhood or landmark";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const formData = new FormData(event.currentTarget);
    setFormError("");
    startTransition(async () => {
      // On success the action redirects to the confirmation page; it only
      // returns when something needs fixing.
      const result = await placeOrder(formData);
      if (result && !result.ok) {
        if (result.signIn) {
          router.push(`/signin?next=${encodeURIComponent("/cart")}`);
          return;
        }
        setErrors(result.fieldErrors || {});
        setFormError(result.error || (result.fieldErrors ? "Please fix the highlighted fields." : "Could not place the order."));
      }
    });
  }

  function attachCurrentLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location sharing.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInAddis(coords.latitude, coords.longitude)) {
          setDeliveryCoordinates(null);
          setLocationMessage("Your location appears to be outside Addis Ababa, so it was not attached. Your neighborhood and directions below are enough.");
          return;
        }
        setDeliveryCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setDrive(null);
        estimateDelivery(coords.latitude, coords.longitude).then((result) => setDrive(result?.ok ? result : null)).catch(() => {});
        clearError("deliveryCoordinates");
        setLocationMessage(`Location attached (accurate to about ${Math.round(coords.accuracy)} m). Your courier will get directions to this spot.`);
      },
      (error) => {
        setLocating(false);
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. That's okay, location is optional."
            : error.message || "Unable to read your location."
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="order-form">
      <input type="hidden" name="items" value={itemsRaw} />
      <input type="hidden" name="location" value={selectedLocation} />
      <input type="hidden" name="deliveryLatitude" value={deliveryCoordinates?.latitude ?? ""} />
      <input type="hidden" name="deliveryLongitude" value={deliveryCoordinates?.longitude ?? ""} />

      <div className="field">
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          placeholder="Betelhem Abebe"
          required
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && <p id="name-error" className="field-error" role="alert">{errors.name}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone (TeleBirr / Mobile)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clearError("phone");
          }}
          onBlur={() => phone && setErrors((previous) => ({ ...previous, phone: validatePhone(phone) }))}
          placeholder="0912345678"
          required
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
        {errors.phone && <p id="phone-error" className="field-error" role="alert">{errors.phone}</p>}
      </div>

      <div className="field">
        <label htmlFor="location-select">Delivery Neighborhood</label>
        <select
          id="location-select"
          value={selectedLocation}
          onChange={(e) => {
            setSelectedLocation(e.target.value);
            clearError("location");
          }}
        >
          {DELIVERY_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.name}>
              {loc.name} (+{areaFees[loc.name]?.fee ?? loc.fee} ETB delivery
              {areaFees[loc.name]?.km ? ` · ~${areaFees[loc.name].km} km` : ""})
            </option>
          ))}
        </select>
      </div>

      {isOther && (
        <div className="field">
          <label htmlFor="custom-location">Your Neighborhood / Landmark</label>
          <input
            id="custom-location"
            name="customLocation"
            type="text"
            value={customLocation}
            onChange={(e) => {
              setCustomLocation(e.target.value);
              clearError("location");
            }}
            placeholder="e.g. Summit Condominium, Gotera, Kality..."
            required
            autoComplete="address-level3"
          />
          {errors.location && <p className="field-error" role="alert">{errors.location}</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="address-details">Directions for the courier (optional)</label>
        <input
          id="address-details"
          name="addressDetails"
          type="text"
          maxLength={300}
          value={addressDetails}
          onChange={(e) => setAddressDetails(e.target.value)}
          placeholder="Building, floor, gate colour, nearby landmark…"
          autoComplete="street-address"
        />
        {errors.addressDetails && <p className="field-error" role="alert">{errors.addressDetails}</p>}
      </div>

      <div className="location-attach">
        <div className="location-attach__text">
          <strong>Attach your exact location</strong>
          <span className="optional-tag">Optional</span>
          <p>Helps the courier find you faster. Your browser will ask for permission.</p>
        </div>
        <div className="location-attach__actions">
          <button type="button" className="btn-secondary" onClick={attachCurrentLocation} disabled={locating}>
            {locating ? "Finding you…" : deliveryCoordinates ? "Update location" : "Share my location"}
          </button>
          {deliveryCoordinates && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setDeliveryCoordinates(null);
                setLocationMessage("Location removed.");
              }}
            >
              Remove
            </button>
          )}
        </div>
        {locationMessage && <p role="status" className="location-attach__status">{locationMessage}</p>}
        {deliveryCoordinates && (
          <a
            className="location-attach__status"
            href={`https://www.openstreetmap.org/?mlat=${deliveryCoordinates.latitude}&mlon=${deliveryCoordinates.longitude}#map=17/${deliveryCoordinates.latitude}/${deliveryCoordinates.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Check the pin on a map
          </a>
        )}
        {errors.deliveryCoordinates && <p className="field-error" role="alert">{errors.deliveryCoordinates}</p>}
      </div>

      <div className="checkout-fee-box">
        <div className="checkout-fee-box__row">
          <span>Delivery fee ({isOther ? "Other neighborhood" : matchedLocation.name})</span>
          <strong>+{deliveryFee} ETB</strong>
        </div>
        {kitchenEstimate && (
          <div className="checkout-fee-box__row">
            <span>Cooking time</span>
            <strong>about {kitchenEstimate.minutes} min</strong>
          </div>
        )}
        <div className="checkout-fee-box__row">
          <span>Drive time once the food is ready</span>
          <strong>
            {deliveryCoordinates && drive
              ? `about ${drive.estimate.minutes} min`
              : areaQuote?.minutes
              ? `about ${areaQuote.minutes} min`
              : matchedLocation.driveTime}
          </strong>
        </div>
        <p>
          {kitchenEstimate?.basis === "dishes"
            ? `Cooking time is the average our kitchen team has taken for these dishes. `
            : kitchenEstimate?.basis === "kitchen"
            ? "Cooking time is our kitchen team's average. "
            : ""}
          {deliveryCoordinates && drive
            ? `${drive.text}.`
            : "Fee and drive time are for the centre of your neighborhood. Share your location above for your exact address."}
          {pricing && ` Delivery is ${pricing.baseFee} ETB for the first ${pricing.baseKm} km, then ${pricing.perKm} ETB per extra km.`}
        </p>
      </div>

      <div className="checkout-total-row">
        <span>Total (Food + Delivery):</span>
        <strong>{grandTotal} ETB</strong>
      </div>

      {formError && <p className="field-error" role="alert" style={{ marginBottom: "0.75rem" }}>{formError}</p>}

      <button type="submit" disabled={pending} className="primary btn-block checkout-submit-btn" aria-busy={pending}>
        {pending ? "Placing your order…" : `Place order (${grandTotal} ETB)`}
      </button>
    </form>
  );
}
