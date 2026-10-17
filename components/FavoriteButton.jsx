"use client";

import { useFavorites, useSession } from "@/components/Providers";

// A drawn SVG heart, not an emoji character -  outlined when not favorited,
// filled solid when it is. onClick toggles the dish in the favorites list.
export function FavoriteButton({ dish, size = "card" }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useSession();
  const active = isFavorite(dish.id);

  // Favorites are a customer feature; staff and couriers only browse.
  if (user && user.role !== "customer") return null;

  return (
    <button
      type="button"
      className={`favorite-button favorite-button--${size} ${active ? "is-active" : ""}`}
      aria-pressed={active}
      aria-label={active ? `Remove ${dish.name} from favorites` : `Add ${dish.name} to favorites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(dish.id);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.8 4.5 5.1 3.6c2-.5 4.1.3 5.4 2 .5.6 1 1.4 1.5 2.1.5-.7 1-1.5 1.5-2.1 1.3-1.7 3.4-2.5 5.4-2 3.3.9 4.7 4.4 3.1 7.6-2.5 4.7-10 9.3-10 9.3z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
