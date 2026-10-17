"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDebounce } from "@/hooks/useDebounce";
import { DishCard } from "@/components/DishCard";

export function SearchBox() {
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);

  // When search term is empty, key is null (no fetch happens).
  // When term exists, key fetches /api/dishes?q=... with keepPreviousData to avoid UI flash.
  const { data: dishes, isValidating } = useSWR(
    debounced.trim() ? `/api/dishes?q=${encodeURIComponent(debounced.trim())}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const isSearching = Boolean(debounced.trim());

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ position: "relative", maxWidth: "480px" }}>
        <input
          id="menu-search-input"
          name="search"
          type="search"
          aria-label="Search dishes"
          placeholder="Search dishes"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem 0.75rem 2.5rem",
            borderRadius: "980px",
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            color: "var(--text)",
            fontSize: "0.95rem",
            boxShadow: "0 2px 8px var(--shadow-color)",
          }}
        />
        <svg
          style={{
            position: "absolute",
            left: "0.9rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "18px",
            height: "18px",
            color: "var(--muted)",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {term && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setTerm("")}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
            title="Clear search"
          >
            x
          </button>
        )}
      </div>

      {isSearching && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              Search results for &ldquo;{debounced}&rdquo;
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {isValidating ? "Updating..." : `${Array.isArray(dishes) ? dishes.length : 0} found`}
            </span>
          </div>

          {Array.isArray(dishes) && dishes.length > 0 ? (
            <div className="dish-grid">
              {dishes.map((dish, idx) => (
                <DishCard key={dish.id} dish={dish} priority={idx < 2} />
              ))}
            </div>
          ) : !isValidating ? (
            <p style={{ color: "var(--muted)", fontStyle: "italic" }}>
              No dishes found matching &ldquo;{debounced}&rdquo;. Try another term.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
