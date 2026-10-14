# DATA.md - Client & Server Data Fetching Strategy

Written to justify every data query, its caching model, key, and refresh behavior in Addis Eats.

| Query or Route | Layer | Cache Key | Refresh or Revalidation Rule | Reasoning |
|---|---|---|---|---|
| `/menu` (initial dish list) | Server Component | N/A (Direct DB/lib call) | Dynamic per-request (reads `searchParams`) | First paint arrives instant and SEO-friendly. No client-side waterfall or empty spinner on initial page load. |
| `/menu` (Search as you type) | Client (SWR) | `debounced ? '/api/dishes?q=' + debounced : null` | On key change, `keepPreviousData: true` | Debouncing (300ms) prevents flooding the server per keystroke. Passing `null` when input is empty halts fetching. `keepPreviousData` retains the current dish list so the UI does not flash or jump between keystrokes. |
| `/menu` (Pagination) | Server & Client | `/api/dishes?page=${page}` / URL `?page=N` | URL driven + `keepPreviousData: true` | Paging in the URL keeps results linkable and shareable. SWR retains prior page items during page transitions. |
| `/menu/[id]` (dish detail) | Server Component | `generateStaticParams` | Static Site Generation (SSG) | All 8 dish IDs are known at build time; instant delivery with zero server load. |
| `/orders/[id]` (Live polling status) | Server + Client (SWR) | `/api/orders/${id}` | `fallbackData: initial`, `refreshInterval: 5000` | The server component renders the initial order record so the visitor sees real data immediately without a loading spinner. Hydrated client SWR polls every 5 seconds to track kitchen & delivery status changes, automatically pausing when terminal state is reached. |
| Placing an order | Server Action (`placeOrder`) | N/A | Form POST -> Redirect | Writes belong in Server Actions, not client query hooks, ensuring progressive enhancement if JavaScript is disabled. |

---

## Decisions & Verification

### 1. Why SWR over useEffect
- **Deduplication:** Multiple components requesting the same key share a single network call.
- **Race condition safety:** If query "tib" finishes after query "tibs", SWR guarantees only the result matching the latest active key is retained.
- **Automatic reconnect/focus:** Automatically refreshes when network reconnects or tab regains focus.

### 2. Zero-Spinner First Paint
By providing `fallbackData: initial` in `OrderStatus.jsx`, SWR uses the server-rendered HTML immediately on mount. Polling begins seamlessly in the background without layout shifts or loader flashes.

### 3. Null Key Pattern
```javascript
const { data } = useSWR(
  debounced ? `/api/dishes?q=${debounced}` : null,
  fetcher,
  { keepPreviousData: true }
);
```
Passing `null` conditionally halts SWR from initiating unneeded network requests when the search box is cleared.
