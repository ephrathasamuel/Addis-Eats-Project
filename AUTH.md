# Authentication and authorization

- Supabase Auth handles email/password registration, sign-in, confirmation links, and cookie sessions. Configure it as described in [SUPABASE.md](./SUPABASE.md).
- Passwords must contain 6–256 characters. Six-character passwords are weak; longer unique passwords are recommended.
- Every Supabase Auth user receives a `public.profiles` row with the `customer` role by database trigger. Roles are read from the database, never accepted from browser-submitted signup fields.
- The Next.js server verifies Supabase identity, then reads the role from the user's profile under row-level security. Server actions, pages, and APIs enforce roles and order ownership.
- Existing accounts from the previous local JSON auth store are not automatically imported.

## Authorization boundaries

- Customers may read and mutate only their own orders. Order IDs, query parameters, and client cookies do not establish ownership.
- Admins may view all order maps and the business dashboard. Admin-only inventory, finance, and order-edit actions verify the server profile role.
- Kitchen staff receive unassigned kitchen tickets and tickets assigned to their own account. Kitchen payloads omit customer identity, contact, and destination details. Starting work assigns the ticket to that staff account; only the assigned staff member may finish it.
- Couriers receive the unclaimed ready-for-pickup pool with only the details needed to choose work, plus their own assigned deliveries. Customer contact details are provided only after a courier claims a ticket. Only the assigned courier can share its GPS location or mark it delivered.
- Every order status mutation enforces a permitted state transition on the server. UI visibility is not treated as authorization.

The delivery map accepts a customer-provided location pin and opt-in courier browser GPS. The courier must keep the delivery page open and grant location permission. It does not fabricate movement. Neighborhood travel-time ranges remain static and are not live routing/traffic ETAs; configure and integrate a routing provider before advertising them as live estimates.
