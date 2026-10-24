"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";

const CartContext = createContext(null);
const FavoritesContext = createContext(null);
const SessionContext = createContext(null);
const LangContext = createContext({ lang: "en", setLang: () => {} });

const CART_KEY = "addis-eats-cart";
const FAVORITES_KEY = "addis-eats-favorites";

export function Providers({ children, initialUser = null, initialLang = "en" }) {
  return (
    <LangProvider initialLang={initialLang}>
      <SessionProvider initialUser={initialUser}>
        <CartProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </CartProvider>
      </SessionProvider>
    </LangProvider>
  );
}

// The visitor's language, chosen with the header switch (see lib/i18n.js).
function LangProvider({ children, initialLang }) {
  const [lang, setLang] = useState(initialLang);
  useEffect(() => setLang(initialLang), [initialLang]);
  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** const tr = useT(); tr("Add to cart") — English unless Amharic was chosen. */
export function useT() {
  const { lang } = useContext(LangContext);
  return useCallback((text, values) => t(lang, text, values), [lang]);
}

// Who is signed in. Seeded by the root layout on the server, then re-checked
// on every navigation so the header and role-aware buttons follow sign-in/out.
function SessionProvider({ children, initialUser }) {
  const pathname = usePathname();
  const [state, setState] = useState({ status: "ready", user: initialUser });

  useEffect(() => {
    setState({ status: "ready", user: initialUser });
  }, [initialUser]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json();
      setState({ status: "ready", user: data?.authenticated ? data.user : null });
    } catch {
      setState((previous) => ({ ...previous, status: "ready" }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <Providers>");
  return ctx;
}

function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Cart contents never leave the browser until checkout -  read/write
  // localStorage only, no fetch, no server round trip.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [items, hydrated]);

  const addItem = useCallback((dish) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.id === dish.id ? { ...i, qty: Math.min(50, i.qty + 1) } : i
        );
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          image: dish.image,
          category: dish.category,
          qty: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id, newQty) => {
    setItems((prev) =>
      newQty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(50, newQty) } : i))
    );
  }, []);

  // Returns the same empty array when already empty so callers can't loop.
  const clearCart = useCallback(() => {
    setItems((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, clearCart, total, hydrated }),
    [items, addItem, updateQty, removeItem, clearCart, total, hydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <Providers>");
  return ctx;
}

// Favorites live in localStorage and remain device-specific rather than
// being synchronized to the signed-in account.
function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FAVORITES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore write failures
    }
  }, [favorites, hydrated]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  const value = useMemo(
    () => ({ favorites, toggleFavorite, isFavorite, hydrated }),
    [favorites, toggleFavorite, isFavorite, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <Providers>");
  return ctx;
}
