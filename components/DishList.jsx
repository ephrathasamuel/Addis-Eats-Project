import { getDishes } from "@/lib/dishes";
import { DishCard } from "@/components/DishCard";
import Link from "next/link";

export async function DishList({ category, page = 1 }) {
  const allDishes = await getDishes(category);

  if (allDishes.length === 0) {
    return <p className="empty">No dishes in this category yet.</p>;
  }

  const limit = 12;
  const total = allDishes.length;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentPage - 1) * limit;
  const paginatedDishes = allDishes.slice(start, start + limit);

  const buildPageUrl = (targetPage) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/menu${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="dish-grid">
        {paginatedDishes.map((dish, idx) => (
          <DishCard key={dish.id} dish={dish} priority={idx < 2} />
        ))}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "1rem",
            marginTop: "2.5rem",
          }}
        >
          {currentPage > 1 ? (
            <Link href={buildPageUrl(currentPage - 1)} className="btn-ghost">
              Previous
            </Link>
          ) : (
            <span
              className="btn-ghost"
              aria-disabled="true"
              style={{ opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" }}
            >
              Previous
            </span>
          )}

          <span style={{ fontSize: "0.95rem", color: "var(--muted)", fontWeight: "500" }}>
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link href={buildPageUrl(currentPage + 1)} className="btn-ghost">
              Next
            </Link>
          ) : (
            <span
              className="btn-ghost"
              aria-disabled="true"
              style={{ opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" }}
            >
              Next
            </span>
          )}
        </div>
      )}
    </div>
  );
}
