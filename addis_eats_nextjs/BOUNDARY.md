# BOUNDARY.md - Server and Client Component Boundary Architecture

| Component | Side | Why |
|---|---|---|
| `app/layout.js` | server | Owns `html`/`body`, passes `children` into `<Providers>`. No hooks. |
| `components/Header.jsx` | client | Manages dynamic role state and active route navigation. |
| `components/Footer.jsx` | server | Static footer markup. |
| `components/Providers.jsx` | client | Context holding cart state (`useState`) and localStorage persistence. |
| `app/page.js` | server | `async`, queries `getDishes()` at build time. |
| `app/menu/layout.js` | server | Fetches categories directly (`getCategories()`), wraps children in `<Suspense>`. |
| `components/CategoryBar.jsx` | client | Needs `useRouter`/`useSearchParams` and `onClick` handlers. |
| `app/menu/page.js` | server | Composes `<SearchBox />` and `<DishList />`. |
| `app/menu/SearchBox.jsx` | client | `useSWR` search query with `useDebounce`, null key when empty, `keepPreviousData`. |
| `components/DishList.jsx` | server | Queries `getDishes()`, handles paging links via query params. |
| `app/menu/DishCard.jsx` | server | Pure presentation; renders server-side in lists. Forwarded priority prop. |
| `app/menu/[id]/page.js` | server | Statically generated via `generateStaticParams`. |
| `components/AddToCartButton.jsx` | client | `onClick` writes to cart store via `useCart()`. |
| `components/DishImage.jsx` | client | `onError` fallback on image load error. |
| `components/FavoriteButton.jsx` | client | `onClick` toggles favorite in `useFavorites()`. |
| `app/orders/[id]/page.js` | server | Seeds initial order data from DB/orders store to prevent loader on first paint. |
| `app/orders/[id]/OrderStatus.jsx` | client | `useSWR` polling `/api/orders/${id}` every 5s with `fallbackData: initial`. |
| `app/cart/page.js` | client | Cart contents live in browser `localStorage`. |
| `app/checkout/page.js` | server | Form action targeting `placeOrder`. |
| `app/checkout/confirmation/page.js` | server | Renders confirmation and links to `/orders/[id]` live tracking. |
| `app/actions.js` | server (`"use server"`) | `placeOrder`, `cancelOrder`, `signIn`, `signOut`, `updateKitchenStatus`. |
