"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useFavorites, useSession } from "@/components/Providers";
import { DishCard } from "@/components/DishCard";

// Favorites stay in this browser's localStorage; authentication is verified
// against the server session rather than a client-controlled cookie.
export default function FavoritesPage() {
  const { favorites, hydrated } = useFavorites();
  const { status, user } = useSession();
  const signedIn = Boolean(user);
  // The live menu, so favorites show current prices and sold-out state.
  const { data: menu } = useSWR(signedIn ? "/api/dishes" : null, fetcher);

  if (!hydrated || status === "loading" || (signedIn && !menu)) {
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

  const dishes = (Array.isArray(menu) ? menu : []).filter((dish) => favorites.includes(dish.id));

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
