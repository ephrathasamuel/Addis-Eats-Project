"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/components/Providers";
import { getDishByIdSync } from "@/lib/dishes";
import { DishCard } from "@/components/DishCard";

// Client-rendered for the same reason /cart is: favorites live only in this
// browser's localStorage, so there is nothing for the server to prerender.
// Gated behind sign-in (checked the same way AuthStatus does -  the
// non-httpOnly user_name cookie) because favorites are framed as an
// account feature here, even though the data itself stays device-local.
export default function FavoritesPage() {
  const { favorites, hydrated } = useFavorites();
  const [signedIn, setSignedIn] = useState(undefined);

  useEffect(() => {
    setSignedIn(document.cookie.includes("user_name="));
  }, []);

  if (!hydrated || signedIn === undefined) {
    return <p>Loading your favorites…</p>;
  }

  if (!signedIn) {
    return (
      <div className="empty-state">
        <h1>Favorites</h1>
        <p>Sign in to save and view your favorite dishes.</p>
        <Link href="/signin?next=/favorites" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const dishes = favorites.map(getDishByIdSync).filter(Boolean);

  if (dishes.length === 0) {
    return (
      <div className="empty-state">
        <h1>Favorites</h1>
        <p className="empty">You haven&apos;t favorited any dishes yet.</p>
        <Link href="/menu">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Favorites</h1>
      <div className="dish-grid">
        {dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </div>
  );
}
