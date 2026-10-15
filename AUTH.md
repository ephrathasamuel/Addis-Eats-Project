# Authentication and authorization

## Accounts

- Customers create their own accounts from `/signin?mode=register`. Passwords are stored as salted scrypt hashes in `.addis-data/auth.json`; the password itself is never stored.
- Staff roles are provisioned by server-only `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `STAFF_EMAIL` / `STAFF_PASSWORD`, and `DELIVERY_EMAIL` / `DELIVERY_PASSWORD` environment variables. Each configured password must be at least 12 characters. Customer registration cannot assign a privileged role.
- The `addis_session` cookie is a random, HTTP-only, SameSite=Lax opaque token. The server checks it against the session store and revokes its record on sign-out. The browser-readable legacy role/name cookies are not used for authentication or authorization.
- `.addis-data` is git-ignored. Set `ADDIS_DATA_DIR` to change its location.

## Authorization boundaries

- Customers may read and mutate only their own orders. Order IDs, query parameters, and client cookies do not establish ownership.
- Admins may view all order maps and the business dashboard. Admin-only inventory, finance, and order-edit actions verify the server session.
- Kitchen staff receive unassigned kitchen tickets and tickets assigned to their own account. Kitchen payloads omit customer identity, contact, and destination details. Starting work assigns the ticket to that staff account; only the assigned staff member may finish it.
- Couriers receive the unclaimed ready-for-pickup pool with only the details needed to choose work, plus their own assigned deliveries. Customer contact details are provided only after a courier claims a ticket. Only the assigned courier can share its GPS location or mark it delivered.
- Every order status mutation enforces a permitted state transition on the server. UI visibility is not treated as authorization.
- The dashboard and finance ledger require an administrator session.

## Local storage limitation

The included JSON store supports a single-process local development server. It is not a concurrency-safe or durable multi-instance production database. Before deploying for real customers, replace account/session and order storage with a shared database, configure backups, and provision privileged accounts through a secret manager. There is no email verification, password reset, MFA, or brute-force rate limiting in this demo.

The delivery map accepts a customer-provided location pin and opt-in courier browser GPS. The courier must keep the delivery page open and grant location permission. It does not fabricate movement. Neighborhood travel-time ranges remain static and are not live routing/traffic ETAs; configure and integrate a routing provider before advertising them as live estimates.
