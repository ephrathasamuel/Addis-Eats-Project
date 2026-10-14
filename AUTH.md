# AUTH.md - Addis Eats Authentication & Multi-Layer Authorization

## Architecture: The Three Layers of Defense

Authentication verifies who is asking; authorization verifies what they are allowed to do.
In Addis Eats, security is enforced across three distinct layers:

| Route or Action | Layer 1: Middleware | Layer 2: Server Component Guard | Layer 3: Action or Scoped Query Guard | What Each Layer Proves |
|---|---|---|---|---|
| `/menu`, `/menu/[id]` | Public | Public | Public | Fully public and indexable; no auth needed. |
| `/checkout` | `middleware.js` redirects unauthenticated users to `/signin?next=/checkout` | Re-verifies `getSession()` before rendering payment and delivery forms | Form submission (`placeOrder`) verifies session and binds order to session `userId` | Layer 1 provides cheap edge redirection; Layer 2 prevents rendering private UI; Layer 3 guarantees the DB write cannot be forged. |
| `/orders` | `middleware.js` redirects to `/signin?next=/orders` | Checks `getSession()`; redirects if null | Scoped query: calls `getOrdersFor(user.id)`, never accepting an arbitrary ID from search params | Proves that an authenticated user can only view their own past orders. |
| `/kitchen` | `middleware.js` ensures user is signed in | Server Component evaluates `user.role === 'staff'`; renders 403 Forbidden if not staff | Action `updateKitchenStatus` verifies `user.role === 'staff'` before altering kitchen status | Proves role-based access control (RBAC). A customer account cannot view the queue or update dishes. |
| `cancelOrder` action | N/A (Server Action) | N/A | Authenticates caller via `getSession()`, verifies `order.userId === user.id` (or staff) | Proves ownership authorization: user A cannot cancel user B's order even if they know the order ID. |

---

## The Three Attack Scenarios and Mitigations

### Attack 1: Signed Out Console Write Refusal (Bypassing Router Middleware)
- **Attack Vector:** An unauthenticated attacker sends a direct POST request using `fetch` from the browser console or `curl` directly to the `cancelOrder` or `placeOrder` server action endpoint without passing through the Next.js router UI.
- **Why it failed:** Middleware is an edge routing optimization, not the security gatekeeper. The server action executes independently on the server and begins with:
  ```javascript
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Authentication required to perform this action." };
  }
  ```
  Requests lacking a cryptographically valid `addis_session` cookie are instantly refused with an error response.

### Attack 2: Cross-Tenant Ownership Tampering (Writing to Another User's Record)
- **Attack Vector:** An attacker authenticated as Customer A (User ID `usr_almaz`) issues a POST request to cancel or edit an order belonging to Customer B (User ID `usr_dawit`) by specifying order ID `1001`.
- **Why it failed:** Server actions enforce strict ownership checks before committing state changes:
  ```javascript
  const order = getOrder(orderId);
  const isOwner = order.userId === session.id;
  const isAuthorizedStaff = session.role === "staff" || session.role === "admin";
  if (!isOwner && !isAuthorizedStaff) {
    return { ok: false, error: "Unauthorized: You do not have permission to modify this order." };
  }
  ```
  Even with knowledge of a valid order ID, foreign accounts cannot alter or cancel another user's order. Furthermore, `/orders` strictly executes `getOrdersFor(session.id)`, ignoring any client-provided user ID query parameter.

### Attack 3: Open Redirect Vulnerability via Crafted Next Parameter
- **Attack Vector:** A phishing attacker lures a victim to sign in via a manipulated link:
  `/signin?next=https://malicious-external-site.com/steal-token` or `/signin?next=//malicious-site.com`.
- **Why it failed:** The `signIn` action in `app/actions.js` sanitizes the redirect target before invoking `redirect`:
  ```javascript
  let safeNext = "/orders";
  if (typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    safeNext = rawNext;
  }
  redirect(safeNext);
  ```
  Any protocol-relative or absolute external URL fails validation and defaults securely to internal application routes.

---

## Session Security Configuration

- **Cookie Name:** `addis_session`
- **Flags:**
 - `httpOnly: true`: Prevents client-side scripts (XSS) from reading or stealing session data.
 - `secure: true` (in production): Transmitted exclusively over encrypted HTTPS connections.
 - `sameSite: "lax"`: Protects against cross-site request forgery (CSRF) while allowing legitimate top-level navigation.
 - `path: "/"`: Active across all site routes.
