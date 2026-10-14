"use client";

import { useState } from "react";
import { placeOrder } from "@/app/actions";
import { useCart } from "@/components/Providers";

const DELIVERY_LOCATIONS = [
  { id: "bole", name: "Bole", driveTime: "15-20 mins", fee: 50, area: "Edna Mall, Medhanialem, Olympia" },
  { id: "kazanchis", name: "Kazanchis", driveTime: "15-25 mins", fee: 50, area: "UNECA, Intercontinental, Bambis" },
  { id: "mexico", name: "Mexico", driveTime: "20-25 mins", fee: 50, area: "Sengatera, Stadium, Kera" },
  { id: "sarbet", name: "Sarbet", driveTime: "20-25 mins", fee: 50, area: "Old Airport, AU Headquarters, Karl Square" },
  { id: "piassa", name: "Piassa", driveTime: "25-30 mins", fee: 70, area: "Churchill Ave, Arada, Posta Bet" },
  { id: "gerji", name: "Gerji", driveTime: "25-35 mins", fee: 70, area: "Imperial, Roba Bakery, Jackros" },
  { id: "megenagna", name: "Megenagna", driveTime: "20-30 mins", fee: 70, area: "Signal, Shola, Lem Hotel" },
  { id: "cmc", name: "CMC", driveTime: "35-45 mins", fee: 90, area: "Michael, Tsehay Real Estate, Altad" },
  { id: "lebu", name: "Lebu", driveTime: "35-45 mins", fee: 90, area: "Jemo, Haile Garment, Varnero" },
  { id: "ayat", name: "Ayat", driveTime: "40-50 mins", fee: 110, area: "Ayat Zone 2 & 3, Tafo Highway" },
  { id: "other", name: "Other Neighborhood", driveTime: "30-45 mins", fee: 100, area: "Custom neighborhood or landmark" },
];

export default function OrderForm({ itemsRaw, initialName = "", initialPhone = "", fieldErrors = {} }) {
  const { clearCart } = useCart();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedLocation, setSelectedLocation] = useState("Bole");
  const [customLocation, setCustomLocation] = useState("");
  const [errors, setErrors] = useState(fieldErrors);
  const [pending, setPending] = useState(false);

  let parsedItems = [];
  try {
    parsedItems = JSON.parse(itemsRaw || "[]");
  } catch {
    parsedItems = [];
  }
  const foodSubtotal = parsedItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

  const matchedLocation =
    DELIVERY_LOCATIONS.find((l) => l.name === selectedLocation) || DELIVERY_LOCATIONS[0];
  const currentDriveTime = matchedLocation.driveTime;
  const currentDeliveryFee = matchedLocation.fee;
  const isOther = selectedLocation === "Other Neighborhood";

  const grandTotal = foodSubtotal + currentDeliveryFee;

  function validatePhone(value) {
    const cleaned = value.replace(/[\s-]/g, "");
    if (!cleaned) {
      return "Phone number is required";
    }
    const etPhoneRegex = /^(?:\+251|0)[97]\d{8}$/;
    if (!etPhoneRegex.test(cleaned)) {
      return "Enter a valid Ethiopian phone number (e.g. 0911234567 or 0712345678)";
    }
    return null;
  }

  function handlePhoneBlur() {
    const err = validatePhone(phone);
    setErrors((prev) => ({
      ...prev,
      phone: err,
    }));
  }

  async function handleSubmit(e) {
    if (pending) {
      e.preventDefault();
      return;
    }

    const phoneErr = validatePhone(phone);
    if (!name.trim()) {
      e.preventDefault();
      setErrors((prev) => ({ ...prev, name: "Name is required" }));
      return;
    }
    if (phoneErr) {
      e.preventDefault();
      setErrors((prev) => ({ ...prev, phone: phoneErr }));
      return;
    }

    if (isOther && !customLocation.trim()) {
      e.preventDefault();
      setErrors((prev) => ({ ...prev, location: "Please specify your neighborhood or landmark" }));
      return;
    }

    setPending(true);
  }

  const finalLocationString = isOther
    ? customLocation.trim() || "Addis Ababa"
    : selectedLocation;

  return (
    <form action={placeOrder} onSubmit={handleSubmit} noValidate className="order-form">
      <input type="hidden" name="items" value={itemsRaw} />
      <input type="hidden" name="location" value={finalLocationString} />
      <input type="hidden" name="customLocation" value={customLocation} />
      <input type="hidden" name="estimatedEta" value={currentDriveTime} />
      <input type="hidden" name="deliveryFee" value={currentDeliveryFee} />

      <div className="field">
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
          }}
          placeholder="Betelhem Abebe"
          required
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="field-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone (TeleBirr / Mobile)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
          }}
          onBlur={handlePhoneBlur}
          placeholder="0912345678"
          required
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="field-error" role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      {/* 10 Addis Ababa Neighborhoods + Custom Location Selector */}
      <div className="field">
        <label htmlFor="location-select">Delivery Neighborhood</label>
        <select
          id="location-select"
          value={selectedLocation}
          onChange={(e) => {
            setSelectedLocation(e.target.value);
            if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
          }}
          style={{
            width: "100%",
            padding: "0.75rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        >
          {DELIVERY_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.name}>
              {loc.name} (+{loc.fee} ETB delivery · ~{loc.driveTime} drive)
            </option>
          ))}
        </select>
      </div>

      {/* Custom input if "Other Neighborhood" is selected */}
      {isOther && (
        <div className="field">
          <label htmlFor="custom-location">Enter Your Neighborhood / Landmark</label>
          <input
            id="custom-location"
            type="text"
            value={customLocation}
            onChange={(e) => {
              setCustomLocation(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
            }}
            placeholder="e.g. Summit Condominium, Gotera, Kality..."
            required
            autoComplete="street-address"
          />
          {errors.location && (
            <p className="field-error" role="alert">
              {errors.location}
            </p>
          )}
        </div>
      )}

      {/* Driving Time & Location Delivery Fee Breakdown */}
      <div
        style={{
          padding: "1rem",
          borderRadius: "14px",
          backgroundColor: "var(--brand-light)",
          border: "1px solid var(--border)",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--brand-dark)" }}>
            Location Delivery Fee ({matchedLocation.name}):
          </span>
          <strong style={{ fontSize: "1rem", color: "var(--brand-dark)" }}>
            +{currentDeliveryFee} ETB
          </strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--brand-dark)" }}>
            Estimated Courier Drive Time:
          </span>
          <strong style={{ fontSize: "1rem", color: "var(--brand-dark)" }}>
            {currentDriveTime}
          </strong>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.45, borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
          <strong>Notice:</strong> Estimated delivery time ({currentDriveTime}) accounts for driving time only and does not include kitchen cooking time. Driving begins once kitchen preparation finishes.
        </div>
      </div>

      {/* Price Summary */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          padding: "0.75rem 0",
          borderTop: "1px solid var(--border)",
          fontSize: "1.1rem",
        }}
      >
        <span>Total (Food + Delivery):</span>
        <strong style={{ fontSize: "1.25rem", color: "var(--brand-dark)" }}>
          {grandTotal} ETB
        </strong>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="primary btn-block checkout-submit-btn"
        aria-busy={pending}
      >
        {pending ? "Placing..." : `Place order (${grandTotal} ETB)`}
      </button>
    </form>
  );
}
