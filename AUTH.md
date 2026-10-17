# Authentication and authorization

## Who signs in where

| Who | Account lives in | How it is created |
|---|---|---|
| Admin | Local account store (`.addis-data/accounts.json`) | Created automatically on first start (see below) |
| Kitchen staff | Local account store | Admin registers them at `/admin/staff` |
| Delivery couriers | Local account store | Admin registers them at `/admin/staff` (name, phone and photo required) |
| Customers | Supabase Auth when configured, otherwise the local account store | Self-registration at `/signin?mode=register`, or **Continue with Google** (Supabase only) |

Everyone uses the same `/signin` page. There is no role picker and no public
staff sign-up; the server decides the role from the account, never from the
browser. Admin links are only rendered for admin sessions.

### The first admin

When no admin exists the server creates one:

- If `ADDIS_ADMIN_EMAIL` and `ADDIS_ADMIN_PASSWORD` are set, it uses them.
- Otherwise it creates `admin@addiseats.com` / `ChangeMe-Admin1` and the admin
  panel shows a warning until the password is changed from `/profile`.

### Sessions

- Local accounts get an `addis_session` cookie: HTTP-only, `SameSite=Lax`,
  signed with HMAC-SHA256 (`ADDIS_SESSION_SECRET`, or a random secret stored in
  `.addis-data/session-secret.json`). It expires after 14 days.
- Each account has a session version. Changing or resetting a password, or
  removing the account, invalidates every existing cookie for it immediately.
- The cookie is marked `Secure` when the request arrived over HTTPS, so a
  kitchen tablet can still use the app over the local network (`http://`).
- Supabase customers use the normal Supabase cookie session.
- Unsigned cookies such as `user_role` are ignored (older versions trusted them).

### Passwords and PINs

- Passwords: at least 8 characters, stored as scrypt hashes.
- Kitchen PINs: 4 to 6 digits, scrypt-hashed. Used only to credit claims on the
  shared kitchen tablet.
- Six wrong passwords for an email, or six wrong PINs for a cook, lock further
  attempts for 10 minutes.
- Staff change their own password (and kitchen staff their PIN) from `/profile`.
  Admins reset staff passwords and PINs, or remove staff, at `/admin/staff`.

## Google sign-in

Google sign-in runs through Supabase OAuth. Google shows its own account
chooser (`prompt=select_account`) and the profile name comes from the Google
account. The button only appears when Supabase is configured. See
[SUPABASE.md](./SUPABASE.md) for provider setup.

## Kitchen: shared tablet

One tablet stays signed in (any kitchen staff account works; a dedicated
"Kitchen Tablet" staff account is a good choice). On `/kitchen`, switch to
**Shared kitchen tablet**. Cooks select one or more waiting tickets, press
**Claim**, tap their own name and enter their PIN. The ticket is credited to the
cook who entered the PIN, not to the tablet's account, so nobody signs in or
out between orders. Claiming is atomic on the server: if two people claim the
same ticket, only the first succeeds and the other sees who took it.

Cooks with their own phone can use **My device** mode, which credits the
signed-in cook without a PIN. Today's per-cook counts appear beside the board
and on `/admin/staff`.

## Delivery board

Each courier signs in on their own phone. `/delivery` shows the live pool of
orders the kitchen has finished; the first courier to tap **Accept delivery**
gets the order. Customer name, phone, directions and map pin are only revealed
to the courier who accepted it. Once an order is picked up, the customer sees
the courier's name, phone and photo on the order page and live map.

## Authorization boundaries

- Customers read and change only their own orders. Order prices and delivery
  fees are recomputed on the server from the live menu; browser-sent prices are
  ignored, and sold-out or removed dishes are rejected.
- Kitchen tickets never include customer identity, phone or address.
- Kitchen staff and admins can mark dishes sold out; only admins edit the menu,
  finances, orders and staff.
- Only the assigned courier can share GPS for, or complete, a delivery.
- Every status change is validated as an allowed transition on the server. UI
  visibility is never treated as authorization.

The delivery map uses the optional customer location pin and opt-in courier
browser GPS. Neighborhood travel-time ranges are static estimates, not live
traffic-aware ETAs.
